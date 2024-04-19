//
// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
// Initialize Firebase
import { firebaseConfig } from './config.js'
export const app = initializeApp(firebaseConfig);

import { getRemoteConfig, fetchAndActivate, getValue, getString } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-remote-config.js'

const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = 1;
let isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
export let env = "local";

if (!isLocal) {
    // Use remote config
    remoteConfig.defaultConfig = {
        "env": "local"
    };

    await fetchAndActivate(remoteConfig);
    env = getString(remoteConfig, "env");
}

import {
    getAuth, connectAuthEmulator
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

export const auth = getAuth(app);

if (env === "local") {
    connectAuthEmulator(auth, "http://localhost:9099");
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
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js'

export const db = getFirestore(app);
if (env === "local") {
    connectFirestoreEmulator(db, 'localhost', 8080)
}

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
                address: clinic.address
            }, { merge: true });
        }));

        return "";
    } catch (error) {
        return error.message;
    }
}

export async function getServiceCodes(userId, docId) {
    try {
        const serviceCodesRef = collection(db, "users", userId, "serviceCodes");
        const querySnapshot = await getDocs(serviceCodesRef);
        if (querySnapshot.empty) {
            return { data: null, error: "" };
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
        return { data: null, error: error.message };
    }
}
//
// Remove the service code no longer in the list 
// and update the service codes that are in the list
//
export async function setServiceCodes(userId, clinicId, serviceCodes) {
    try {
        const serviceCodesRef = collection(db, "users", userId, "serviceCodes");

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
