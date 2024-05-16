import { firebaseConfig, isLocal } from './config.js'
export let env = "deploy";
if (isLocal) {
    env = "local"
}

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
export const app = initializeApp(firebaseConfig);

import { getRemoteConfig, fetchAndActivate, getValue, getString } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-remote-config.js'
const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = 1;

import {
    getAuth, connectAuthEmulator
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
export const auth = getAuth(app);

import { getFunctions, httpsCallable, connectFunctionsEmulator  } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';
const functions = getFunctions(app);

if (env === "local") {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
export let currentUser = null
export function setUser(user) {
    currentUser = user
}

/////////////////////////////////////////////////////////////
import {
    connectFirestoreEmulator,
    getFirestore,
    setDoc,
    doc,
    getDocs,
    deleteDoc,
    collection,
    query,
    where,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js'

export const db = getFirestore(app);
if (env === "local") {
    connectFirestoreEmulator(db, 'localhost', 8080)
}

export const clinicId = 'clinicId';

export async function getClinics() {
    try {
        const userId = currentUser.uid;
        const clinicsRef = collection(db, "users", userId, "companyDetails");

        // Get all the documents in the collection
        const querySnapshot = await getDocs(clinicsRef);

        if (querySnapshot.empty) {
            return { data: [], error: "" };
        }
        const listRef = await querySnapshot.docs
        return { data: Array.from(querySnapshot.docs, doc => ({ id: doc.id, ...doc.data() })), error: "" };
    } catch (error) {
        return { data: null, error: error.message };
    }
}
//
// Remove the clinic no longer in the list 
// and update the clinic details that are in the list
//
export async function setClinics(userId, clinicList) {
    try {
        const clinicsRef = collection(db, "users", userId, "companyDetails");

        // Fetch all documents in the companyDetails collection
        const snapshot = await getDocs(clinicsRef);
        const docsInFirestore = snapshot.docs.map(doc => doc.id);

        // Find the documents that are not in the clinicList
        const docsToRemove = docsInFirestore.filter(docId => !clinicList.some(clinic => clinic.id === docId));

        // Delete the documents that are not in the clinicList
        await Promise.all(docsToRemove.map(docId => deleteDoc(doc(clinicsRef, docId))));

        // Update the documents that are in the clinicList
        await Promise.all(clinicList.map(clinic => {
            const clinicDetails = clinic.id ? doc(clinicsRef, clinic.id) : doc(clinicsRef);

            return setDoc(clinicDetails, {
                name: clinic.name,
                address: clinic.address,
                abn: clinic.abn,
                postcode: clinic.postcode,
                accountingLine: clinic.accountingLine
            }, { merge: true });
        }));

        return "";
    } catch (error) {
        return error.message;
    }
}
export async function setPractitioners(userId, clinicId, practitioners) {
    try {
        const practitionersRef = collection(db, "users", userId, "companyDetails", clinicId, "practitioners");

        // Fetch all documents in the practitioners collection
        const snapshot = await getDocs(practitionersRef);
        const docsInFirestore = snapshot.docs.map(doc => doc.id);

        // Find the documents that are not in the practitioners array
        const docsToRemove = docsInFirestore.filter(docId => !practitioners.some(practitioner => practitioner.id === docId));

        // Delete the documents that are not in the practitioners array
        await Promise.all(docsToRemove.map(docId => deleteDoc(doc(practitionersRef, docId))));
 /*        await Promise.all(docsToRemove.map(async (docId) => {
            console.error('docId:', docId);
            const docRef = doc(practitionersRef, docId);
            console.error('docRef:', docRef);
            const servicesRef = collection(docRef, 'services');
            console.error(servicesRef)
            const querySnapshot = await getDocs(servicesRef);
            querySnapshot.forEach((doc) => {
                deleteDoc(doc.ref);
        })})).catch(error => console.error('Failed to delete some documents:', error));
 */
        // Update the documents that are in the practitioners array
        await Promise.all(practitioners.map(async practitioner => {
            const providerDetails = practitioner.id ? doc(practitionersRef, practitioner.id) : doc(practitionersRef);
            await setDoc(providerDetails, {
                name: practitioner.name,
            }, { merge: true });

            // Store services as a collection against each practitioner
            const servicesRef = collection(providerDetails, "services");
            await Promise.all(practitioner.services.map(service => setDoc(doc(servicesRef, service.id), {
                value: service.value
            })));
        }));
        return "";
    } catch (error) {
        return error.message;
    }
}
async function getProviders(userId, clinicId) {
    try {
        const providersRef = collection(db, "users", userId, "companyDetails", clinicId, "practitioners");
        const snapshot = await getDocs(providersRef);
        if (snapshot.empty) {
            return { ref: providersRef, data: [], error: "" };
        }
        return { ref: providersRef, data: Array.from(snapshot.docs, doc => ({ id: doc.id, ...doc.data() })), error: "" };
    } catch (error) {
        return { ref: providersRef, data: [], error: error.message };
    }
}

export async function hasProviders(userId, clinicId) {
    const providers = await getProviders(userId, clinicId)
    if (providers.error) {
        alert(providers.error);
    }
    return providers && providers.data.length > 0;
}

export async function getPractitioners(userId, clinicId) {
    try {
        const providers = await getProviders(userId, clinicId);
        if (providers.error) {
            return { data: null, error: providers.error };
        }
        const snapshot = await getDocs(providers.ref);
        const practitioners = [];
        for (const doc of snapshot.docs) {
            const practitionerData = doc.data();
            const servicesRef = collection(doc.ref, "services");
            const servicesSnapshot = await getDocs(servicesRef);

            const services = servicesSnapshot.docs.map(serviceDoc => ({
                id: serviceDoc.id,
                value: serviceDoc.data().value
            }));

            practitioners.push({
                id: doc.id,
                name: practitionerData.name,
                services: services
            });
        }
        return { data: practitioners, error: null };
    } catch (error) {
        return { data: [], error: error.message };
    }
}
export async function getServiceCodes(userId, clinicId) {
    try {
        const serviceCodesRef = collection(db, "users", userId, "companyDetails", clinicId, "serviceCodes");
        const querySnapshot = await getDocs(serviceCodesRef);
        if (querySnapshot.empty) {
            return { data: [], error: "" };
        }
        const serviceCodes = [];
        for (const doc of querySnapshot.docs) {
            const itemListRef = collection(doc.ref, 'itemList');
            const itemListSnapshot = await getDocs(itemListRef);
            const itemList = itemListSnapshot.docs.map(doc => doc.data().value);
            serviceCodes.push({ id: doc.id, itemList: itemList, ...doc.data() });
        }
        return { data: serviceCodes, error: "" };
    } catch (error) {
        return { data: [], error: error.message };
    }
}

export async function getPractitionerByPracId(userId, clinicId, pracId) {
    try {
        const practitionerRef = doc(db, "users", userId, "companyDetails", clinicId, "practitioners", pracId);
        const docSnap = await getDoc(practitionerRef);
        if (docSnap.exists()) {
            return { data: { id: docSnap.id, ...docSnap.data() }, error: "" };
        } else {
            return { data: null, error: 'No practitioner found for the given id' };
        }
    } catch (error) {
        return { data: null, error: error.message };
    }
}
//
// Remove the service code no longer in the list 
// and update the service codes that are in the list
//
export async function setServiceCodes(userId, clinicId, serviceCodes) {
    try {
        const serviceCodesRef = collection(db, "users", userId, "companyDetails", clinicId, "serviceCodes");

        // Fetch all documents in the serviceCodes collection
        const snapshot = await getDocs(serviceCodesRef);
        const docsInFirestore = snapshot.docs.map(doc => doc.id);

        // Find the documents that are not in the serviceCodes array
        const docsToRemove = docsInFirestore.filter(docId => !serviceCodes.some(serviceCode => serviceCode.id === docId));

        // Delete the documents that are not in the serviceCodes array
        await Promise.all(docsToRemove.map(docId => deleteDoc(doc(serviceCodesRef, docId))));

        // Update the documents that are in the serviceCodes array
        await Promise.all(serviceCodes.map(async serviceCode => {
            const docRef = doc(serviceCodesRef, serviceCode.id);
            setDoc(docRef, {
                description: serviceCode.description
            });
            // Fetch all documents in the itemList collection
            const itemListRef = collection(docRef, 'itemList');
            const itemListSnapshot = await getDocs(itemListRef);
            const itemsInFirestore = itemListSnapshot.docs.map(doc => doc.id);

            // Delete all documents in the itemList collection
            await Promise.all(itemsInFirestore.map(itemId => deleteDoc(doc(itemListRef, itemId))));

            // Add each number in itemList as a document to the itemList collection
            return Promise.all(serviceCode.itemList.map(item =>
                setDoc(doc(itemListRef, String(item)), {
                    value: item
                })
            ));
        }));
        return "";
    } catch (error) {
        return error.message;
    }
}

export async function getServiceCodeByItemNumber(userId, itemNumber) {
    try {
        // Query all itemList collections in the Firestore database
        const querySnapshot = await getDocs(collectionGroup(db, 'itemList'), where('value', '==', itemNumber));

        // If no document was found, return an error
        if (querySnapshot.empty) {
            return { data: null, error: 'No service code found for the given item number' };
        }

        // Get the parent document of the first document in the query results
        const parentDoc = querySnapshot.docs[0].ref.parent.parent;

        // If the parent document does not exist, return an error
        if (!parentDoc) {
            return { data: null, error: 'No service code found for the given item number' };
        }

        // Get the data of the parent document
        const parentDocData = (await getDoc(parentDoc)).data();

        // If the parent document does not have data, return an error
        if (!parentDocData) {
            return { data: null, error: 'No service code found for the given item number' };
        }

        // Return the id and description of the parent document
        return { data: { id: parentDoc.id, description: parentDocData.description }, error: "" };
    } catch (error) {
        return { data: null, error: error.message };
    }
}

export function getSubscription(userId, callback){
    try {
        const currentSeconds = new Date() / 1000;
        const subscriptionQuery = query(collection(db, "users", userId, "subscriptionDetails"), where("dateEnd", ">=", currentSeconds));

        // Listen for real-time updates using onSnapshot
        const unsubscribe = onSnapshot(subscriptionQuery, (querySnapshot) => {
            if (querySnapshot.empty) {
                callback({ data: null, error: 'No subscription found' });
            } else {
                const subscriptionData = querySnapshot.docs[0].data();
                const date = new Date(subscriptionData.dateEnd * 1000).toISOString().slice(0, 10);
                const result = {
                    data: {
                        subscriptionId: querySnapshot.docs[0].id,
                        endDate: date,
                        seatPurchased: subscriptionData.seatPurchased
                    },
                    error: ""
                };
                callback(result);
            }
        });

        // Return the unsubscribe function so the caller can stop listening when needed
        return unsubscribe;
    } catch (error) {
        return { data: null, error: error.message };
    }
}


//------------- Delete collections -------------------------
async function deleteCollection(db, collectionRef, batchSize) {
    const query = collectionRef.limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, batchSize, resolve, reject);
    });
}

async function deleteQueryBatch(db, query, batchSize, resolve, reject) {
    const snapshot = await query.get();

    if (snapshot.size == 0) {
        // When there are no documents left, we are done
        resolve();
        return;
    }

    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    setTimeout(() => {
        deleteQueryBatch(db, query, batchSize, resolve, reject);
    });
}

///////////////////////////////////////////////////////////////
// import {
//     connectStorageEmulator,
//     getStorage,
//     ref,
//     uploadString
// } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js'
//const storage = getStorage(app)
//connectStorageEmulator(storage, '127.0.0.1', 9199)
// function uploadFile() {
//     try {
//         const storageRef = ref(storage, `user/${currentUser.uid}/test.txt`)
//         const content = `Hello, World! by ${currentUser.email} on ${new Date().toISOString()}`
//         uploadString(storageRef, content).then((snapshot) => {
//             console.log('File uploaded')
//         }).catch((error) => {
//             alert(error.message)
//         });
//         writeToFirestore()
//     } catch (error) {
//         alert(error.message)
//     }
// }
