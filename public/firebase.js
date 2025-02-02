import { firebaseConfig, isLocal } from './config.js'

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
export const app = initializeApp(firebaseConfig);

import { getStorage, ref, uploadBytes, getDownloadURL, getMetadata, deleteObject, connectStorageEmulator, listAll }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';
export const storage = getStorage(app);

import { getAuth, connectAuthEmulator }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
export const auth = getAuth(app);

import {
    connectFirestoreEmulator,
    getFirestore,
    setDoc,
    addDoc,
    doc,
    getDocs,
    getDoc,
    deleteDoc,
    updateDoc,
    collection,
    collectionGroup,
    where,
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js'

export const db = getFirestore(app);

if (isLocal) {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectStorageEmulator(storage, '127.0.0.1', 9199)
    connectFirestoreEmulator(db, 'localhost', 8080)
}

import { getPerformance, trace }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-performance.js';
const perf = getPerformance(app);

export const clinicId = 'clinicId';
export const currentUserName = 'currentUser'
export const currentClinic = 'currentClinic'
export const missingProvidersKey = 'missingProviders'
export const missingItemsKey = 'missingItemsKey'
export const noItemNrs = 'noItemNrs'
export const missingServiceCodes = 'missingServiceCodes'
export const fileContentsKey = 'fileContents';
export const fileNameKey = 'fileName';
export const adjustmentKey = 'adjustments';

export let currentUser = null
export const userKey = 'user'
export function setUser(user) {
    return currentUser = user;
}

export function setStore(key, value) {
    sessionStorage.setItem(key, value);
}
export function clearStore(key) {
    sessionStorage.removeItem(key);
}
export function getStore(key) {
    return sessionStorage.getItem(key);
}
export function clearAllFileDetails() {
    clearStore(fileContentsKey);
    clearStore(fileNameKey);
    clearStore(adjustmentKey);

    clearStore(missingServiceCodes);
    clearStore(noItemNrs);
    clearStore(missingItemsKey);
    clearStore(missingProvidersKey);
}
export function storeAdjustments(provider, desc, val) {
    let adj = JSON.parse(sessionStorage.getItem(adjustmentKey));
    if (!adj) {
        adj = {};
    }
    if (!adj[provider]) {
        adj[provider] = [];
    }
    adj[provider].push({ description: desc.trim(), amount: val });
    sessionStorage.setItem(adjustmentKey, JSON.stringify(adj));
}
// Pass no, one or two parameters, js magic
export function getAdjustments(provider, description) {
    let adj = JSON.parse(sessionStorage.getItem(adjustmentKey));
    if (!adj) {
        return null;
    }
    if (provider === undefined) {
        // No provider specified, return all adjustments
        return adj;
    }
    if (!adj[provider]) {
        return null;
    }
    if (description === undefined) {
        // Provider specified, but no description, return all adjustments for the provider
        return adj[provider];
    }
    // console.log('a:', a.description, ' description:', description)
    // Both provider and description specified, return the specific adjustment
    const adjustments = adj[provider];
    return adjustments.find(a => a.description === description) || null;
}
export function removeAdjustment(provider, desc) {
    let adj = JSON.parse(sessionStorage.getItem(adjustmentKey));
    if (!adj || !adj[provider]) {
        return;
    }
    adj[provider] = adj[provider].filter(a => a.description !== desc);
    if (adj[provider].length === 0) {
        delete adj[provider];
    }
    sessionStorage.setItem(adjustmentKey, JSON.stringify(adj));
}
export function cacheIn(key, userId, clinicId, value) {
    const dataToStore = {
        data: value,
        user: userId,
        clinic: clinicId,
        timestamp: Date.now()
    };
    const jsonString = JSON.stringify(dataToStore);
    setStore(key, jsonString);
}

export function cacheOut(key, userId, clinicId) {
    const jsonString = getStore(key);
    if (jsonString) {
        const val = JSON.parse(jsonString);
        const old = Date.now() - 5 * 60 * 1000
        if (val.user === userId && val.clinic === clinicId && val.timestamp > old) {
            console.log('Found in cache:', key);
            return val.data;
        }
        clearStore(key);
    }
    //console.log('Missed cache:', key);
    return null;
}
export function clearCache(key) {
    clearStore(key);
}
export function clearAllCache(key) {
    clearStore(getClinicsLabel);
    clearStore(getServiceCodeLabel);
    clearStore(getProvidersLabel);
    clearStore(getPractitionersLabel);
}
//////// Funky file caching /////////////////////
async function cacheFileIn(key, id, file) {
    const dataToStore = {
        name: file.name,
        data: await fileToBase64(file),
        timestamp: Date.now()
    };
    const jsonString = JSON.stringify(dataToStore);
    key = key + id.replace(/\s+/g, '_');;
    setStore(key, jsonString);

}
function cacheFileOut(key, id) {
    key = key + id.replace(/\s+/g, '_');
    const jsonString = getStore(key);
    if (jsonString) {
        const val = JSON.parse(jsonString);
        const old = Date.now() - 5 * 60 * 1000
        if (val.timestamp > old) {
            console.log('Found in cache:', key);
            return { file: base64ToFile(val.data, val.name), buffer: val.data };
        }
        clearStore(key);
    }
    return { file: null, buffer: null };
}
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function base64ToFile(base64, fileName) {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], fileName, { type: mime });
}
///////////////////////////////////////////////////////////////
export function startTrace(name) {
    const customTrace = trace(perf, name);
    console.time(name);
    customTrace.start();
    return customTrace;
}
export function stopTrace(customTrace, name) {
    customTrace.stop();
    console.timeEnd(name);
}
//
// if decimalPlaces is negative, ignore
// 
export function parseValidFloat(value, decimalPlaces, lowerLimit, upperLimit) {
    if (value === "") {
        return "";
    }
    const validNumberRegex = /^-?\d+(\.\d+)?$/;

    if (!validNumberRegex.test(value)) {
        return NaN;
    }
    let num = parseFloat(value);
    if (decimalPlaces >= 0) {
        num = parseFloat(num.toFixed(decimalPlaces));
    }
    if ((lowerLimit !== undefined && num < lowerLimit) ||
        (upperLimit !== undefined && num > upperLimit)) {
        return NaN;
    }
    return num;
}
export const leftMargin = 'left-margin';
export const bottomMargin = 'bottom-margin'
export function createEntryField(parent, fieldName, labelText, fieldValue,
    addLeftMargin = true, inputType = 'text') {
    const container = document.createElement('div');
    container.style.display = 'inline-block';

    const label = document.createElement('label');
    label.textContent = labelText;
    label.classList.add(bottomMargin);
    if (addLeftMargin) {
        label.classList.add(leftMargin)
    }
    container.appendChild(label);

    const input = document.createElement('input');
    input.type = inputType;
    input.name = fieldName;
    if (fieldValue) {
        input.value = fieldValue;
    }
    input.classList.add(fieldName)
    input.classList.add(bottomMargin, leftMargin);
    container.appendChild(input);
    if (parent) {
        parent.appendChild(container)
    }
    return { container, input };
}
//
// Future work. Currently implements verifying emails, 
// but sending is still a huge problem. The sender
// needs to have its domain configured to allow 
// mailjet to send on it's behalf, or it will fail the DKIM authentication
// This means I had to remove all email related code
//
export function isEmailEnabled() {
    return false;
}
//-------------------- firestore from here --------------------
const getClinicsLabel = 'getClinics'
export async function getClinics(userId) {
    let ct = null;
    try {
        let clinics = cacheOut(getClinicsLabel, userId, "");
        if (clinics) { return { data: clinics, error: "" }; }
        ct = startTrace(getClinicsLabel);

        const clinicsRef = collection(db, "users", userId, "companyDetails");

        // Get all the documents in the collection
        const querySnapshot = await getDocs(clinicsRef);

        if (querySnapshot.empty) {
            return { data: [], error: "" };
        }
        const listRef = await querySnapshot.docs
        clinics = Array.from(querySnapshot.docs, doc => ({ id: doc.id, ...doc.data() }))

        await Promise.all(clinics.map((clinic) => { getFile(clinic.id, clinic.logoUrl) }));

        cacheIn(getClinicsLabel, userId, "", clinics)
        return { data: clinics, error: "" };
    } catch (error) {
        return { data: null, error: error.message };
    } finally {
        if (ct) { stopTrace(ct, getClinicsLabel); }
    }
}
//
// Remove the clinic no longer in the list 
// and update the clinic details that are in the list
//
export async function setClinics(userId, clinicList, userEmail) {
    try {
        clearCache(getClinicsLabel);
        const userRef = doc(db, "users", userId);
        const clinicsRef = collection(userRef, "companyDetails");
        // Save the user's email
        await setDoc(userRef, { name: userEmail }, { merge: true });

        // Fetch all documents in the companyDetails collection
        const snapshot = await getDocs(clinicsRef);
        const docsInFirestore = snapshot.docs.map(doc => doc.id);

        // Find the documents that are not in the clinicList
        const docsToRemove = docsInFirestore.filter(docId => !clinicList.some(clinic => clinic.id === docId));
        // Delete all the attached service codes and providers in parallel.
        // This stops dangling referrences when the company is deleted
        const serviceCodePromises = docsToRemove.map(docId => setServiceCodes(userId, docId, new Map()));
        const providerPromises = docsToRemove.map(docId => setProviders(userId, docId, []));
        await Promise.all([...serviceCodePromises, ...providerPromises]);
        // Delete the documents that are not in the clinicList
        await Promise.all(docsToRemove.map(docId => deleteDoc(doc(clinicsRef, docId))));
        // Update the documents that are in the clinicList
        await Promise.all(clinicList.map(async clinic => {
            const clinicDetails = clinic.id ? doc(clinicsRef, clinic.id) : doc(clinicsRef);
            return setDoc(clinicDetails, {
                name: clinic.name,
                address: clinic.address,
                abn: clinic.abn,
                postcode: clinic.postcode,
                accountingLine: clinic.accountingLine,
                email: clinic.email,
                emailActive: clinic.emailActive,
                logoUrl: "",
                invoicePrefix: clinic.invoicePrefix,
                invoiceNumber: clinic.invoiceNumber,
                invoicePostfix: clinic.invoicePostfix,
                accountCode: clinic.accountCode,
                daysDue: clinic.daysDue
            }, { merge: true });
        }));
        //
        // Make sure every clininc has default service codes associated with it
        //
        const querySnapshot = await getDocs(clinicsRef);
        for (const clinicDoc of querySnapshot.docs) {
            //
            // Attach the default service codes to the clinic
            // 
            const clinicId = clinicDoc.id;
            const error = await defaultServiceCodes(userId, clinicId);
            if (error) {
                return error;
            }
            // Now get the logo and store it
            //
            const fileUrl = await getFileFromCacheAndStore(clinicId, clinicDoc.data().name);
            if (fileUrl) {
                // Update the document with the new logo URL
                const clinicRef = doc(clinicsRef, clinicId);
                await setDoc(clinicRef, { logoUrl: fileUrl }, { merge: true });
            }
        };
        return "";
    } catch (error) {
        return error.message;
    }
}
export async function updateClinicInvoiceNr(userId, clinicId, invoiceNr) {
    clearCache(getClinicsLabel);
    const clinicDocRef = doc(db, "users", userId, "companyDetails", clinicId);
    await updateDoc(clinicDocRef, {
        invoiceNumber: invoiceNr
    });
}
////////////// logo file handling //////////////////////////
export async function getFileFromCacheAndStore(clinicId, companyName) {
    // Is there a file stored under the clinicId
    let logo = getLogo(clinicId, "")
    // If no, check under company name as new records do not have an id
    if (!logo.data) {
        logo = getLogo("", companyName);
    }
    if (logo.data) {
        await deleteAllStoreFile(clinicId)
        const res = await storeFile(logo.data, clinicId)
        if (res.error) {
            console.log(res.error)
        }
        return res.link;
    }
    return "";
}

export async function storeFile(file, companyId) {
    if (!file) {
        return { link: "", error: null };
    }
    try {
        const fname = file.name.replace(/\s+/g, '_');
        const storeUrl = `user/${companyId}/${fname}`
        const storageRef = ref(storage, storeUrl);
        await uploadBytes(storageRef, file);
        return { link: storeUrl, error: null };
    } catch (error) {
        return { link: "", error: error.message };
    }
}
export async function deleteStoreFile(file, clinicId) {
    const storageRef = ref(storage, `user/${clinicId}/${file.name}`);
    try {
        await deleteObject(storageRef);
    } catch (error) {
        if (error.code !== 'storage/object-not-found') {
            console.log(`Error deleting stored file: ${error.message}`);
        }
    }
}
export async function deleteAllStoreFile(clinicId) {
    const storageRef = ref(storage, `user/${clinicId}`);
    try {
        const res = await listAll(storageRef);
        const deletePromises = res.items.map(itemRef => deleteObject(itemRef));
        await Promise.all(deletePromises);
    } catch (error) {
        if (error.code !== 'storage/object-not-found') {
            console.log(`Error deleting stored file: ${error.message}`);
        }
    }
}

export async function getFile(clinicId, fileUrl) {
    if (!fileUrl) {
        return { file: "", error: "" };
    }
    try {
        const storageRef = ref(storage, fileUrl);
        const metadata = await getMetadata(storageRef);
        const fileName = metadata.name;
        const url = await getDownloadURL(storageRef);

        const response = await fetch(url);
        if (!response.ok) {
            return { file: "", error: new Error(`Failed to fetch file: ${response.statusText}`) };
        }
        const fileBlob = await response.blob();
        const file = new File([fileBlob], fileName, { type: fileBlob.type });
        await setLogo(clinicId, "", file);
        return { file: fileBlob, error: null };
    } catch (error) {
        return { file: null, error: error.message };
    }
}

export const logoLabel = 'logoLabel';
export function getLogo(clinicId, companyName) {
    const key = clinicId ? clinicId : companyName;
    const { file: fileKind, buffer: bufferKind } = cacheFileOut(logoLabel, key);
    if (fileKind) { return { data: fileKind, buffer: bufferKind }; }
    return { data: "", buffer: "" };
}

export async function setLogo(clinicId, companyName, logo) {
    if (!logo) {
        return;
    }
    const key = clinicId ? clinicId : companyName;
    await cacheFileIn(logoLabel, key, logo);
}
///////////////////////////////////////////////////////////////
async function defaultServiceCodes(userId, clinicId) {
    let empty = false
    try {
        let res = await getOnlyServiceCodes(userId, clinicId)
        if (res.length === 0) {
            empty = true
        }
    } catch (error) {
        empty = true
    }
    if (empty) {
        let data = [
            { id: 'DEF', description: 'Default' },
            { id: 'EPC', description: 'EPC Items' },
            { id: 'CSB', description: 'Consumables' },
            // more data...
        ];
        let sCodes = new Map(data.map(item => [item.id, {
            description: item.description,
            itemList: []
        }]));
        return setServiceCodes(userId, clinicId, sCodes)
    }
}

export async function getOnlyServiceCodes(userId, clinicId) {
    const serviceCodesRef = collection(db, "users", userId, "companyDetails", clinicId, "serviceCodes");
    const querySnapshot = await getDocs(serviceCodesRef);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        description: doc.data().description
    }));
}

const getServiceCodeTrace2 = 'getServiceCodes2'
export async function getServiceCodes2(userId, clinicId) {
    let gst = startTrace(getServiceCodeTrace2);
    try {
        // Step 1: Retrieve service codes
        const serviceCodesRef = collection(db, "users", userId, "companyDetails", clinicId, "serviceCodes");
        const serviceCodesSnapshot = await getDocs(serviceCodesRef);
        gst = startTrace(getServiceCodeTrace2);

        if (serviceCodesSnapshot.empty) {
            return { data: [], error: "" };
        }

        // Step 2: Retrieve all item lists
        const itemListRef = collectionGroup(db, 'itemList');
        const itemListSnapshot = await getDocs(itemListRef);

        // Step 3: Create a map of service code IDs to their item values
        const itemListMap = new Map();
        itemListSnapshot.forEach(doc => {
            const pathParts = doc.ref.path.split('/');
            if (pathParts[1] === userId && pathParts[3] === clinicId) {
                const serviceCodeId = pathParts[5]; // Get the service code ID from the path
                if (!itemListMap.has(serviceCodeId)) {
                    itemListMap.set(serviceCodeId, []);
                }
                itemListMap.get(serviceCodeId).push(doc.data().value);
            }
        });

        // Step 4: Combine service codes with their item lists
        const serviceCodes = serviceCodesSnapshot.docs.map(doc => ({
            id: doc.id,
            description: doc.data().description,
            itemList: itemListMap.get(doc.id) || []
        }));

        return { data: serviceCodes, error: "" };
    } catch (error) {
        return { data: [], error: error.message };
    } finally {
        if (gst) { stopTrace(gst, getServiceCodeTrace2); }
    }
}
const getServiceCodeLabel = 'getServiceCodes'
export async function getServiceCodes(userId, clinicId) {
    let gst = null;
    try {
        let serviceCodes = cacheOut(getServiceCodeLabel, userId, clinicId);
        if (serviceCodes) { return { data: serviceCodes, error: "" }; }
        gst = startTrace(getServiceCodeLabel);

        const serviceCodesList = await getOnlyServiceCodes(userId, clinicId)
        if (serviceCodesList.length === 0) {
            return { data: [], error: "" };
        }

        serviceCodes = await Promise.all(serviceCodesList.map(async (doc) => {
            const itemListRef = collection(db, "users", userId, "companyDetails", clinicId, "serviceCodes", doc.id, 'itemList');
            const itemListSnapshot = await getDocs(itemListRef);
            const itemList = itemListSnapshot.docs.map(itemDoc => itemDoc.data().value);

            return {
                id: doc.id,
                itemList: itemList,
                ...doc
            };
        }));
        cacheIn(getServiceCodeLabel, userId, clinicId, serviceCodes)
        return { data: serviceCodes, error: "" };
    } catch (error) {
        return { data: [], error: error.message };
    } finally {
        if (gst) { stopTrace(gst, getServiceCodeLabel); }
    }
}
//
// Remove the service code no longer in the list 
// and update the service codes that are in the list
//
export async function setServiceCodes(userId, clinicId, serviceCodesMap) {
    try {
        clearCache(getServiceCodeLabel);
        const serviceCodesRef = collection(db, "users", userId, "companyDetails", clinicId, "serviceCodes");
        // Fetch all documents in the serviceCodes collection
        const snapshot = await getDocs(serviceCodesRef);
        const docsInFirestore = snapshot.docs.map(doc => doc.id);

        // Find the documents that are not in the serviceCodes array
        const docsToRemove = docsInFirestore.filter(docId => !serviceCodesMap.has(docId));

        // Delete the documents that are not in the serviceCodes array and attached items
        await Promise.all(docsToRemove.map(async (docId) => {
            const docRef = doc(serviceCodesRef, docId);
            const itemsRef = collection(docRef, 'itemList');
            const querySnapshot = await getDocs(itemsRef);
            querySnapshot.forEach((doc) => {
                deleteDoc(doc.ref);
            })
            deleteDoc(docRef);
        })).catch(error => { return `Failed to delete some service codes: ${error}` });

        const serviceCodes = [];
        // Update the documents that are in the serviceCodes array
        for (const [key, value] of serviceCodesMap) {
            const docRef = doc(serviceCodesRef, key);
            await setDoc(docRef, {
                description: value.description
            });

            // Add the item to the serviceCodes array
            serviceCodes.push({
                id: key,
                description: value.description,
                itemList: value.itemList // Assuming itemList is a property of value
            });
        }
        await setItemNumbers(serviceCodesRef, serviceCodes, false);
        return "";
    } catch (error) {
        return error.message;
    }
}

export async function setProviders(userId, clinicId, practitioners) {
    try {
        clearCache(getProvidersLabel);
        clearCache(getPractitionersLabel);

        const practitionersRef = collection(db, "users", userId, "companyDetails", clinicId, "practitioners");

        // Fetch all documents in the practitioners collection
        const snapshot = await getDocs(practitionersRef);
        const docsInFirestore = snapshot.docs.map(doc => doc.id);

        // Find the documents that are not in the practitioners array
        const docsToRemove = docsInFirestore.filter(docId => !practitioners.some(practitioner => practitioner.id === docId));

        // Delete the documents that are not in the practitioners array
        await Promise.all(docsToRemove.map(async (docId) => {
            const docRef = doc(practitionersRef, docId);
            const servicesRef = collection(docRef, 'services');
            const querySnapshot = await getDocs(servicesRef);
            querySnapshot.forEach((doc) => {
                deleteDoc(doc.ref);
            })
            deleteDoc(docRef)
        })).catch(error => { return `Failed to delete some providers: ${error}` });

        // Update the documents that are in the practitioners array
        await Promise.all(practitioners.map(async practitioner => {
            const providerDetails = practitioner.id ? doc(practitionersRef, practitioner.id) : doc(practitionersRef);
            try {
                await setDoc(providerDetails, {
                    name: practitioner.name,
                    entity: practitioner.entity,
                    street: practitioner.street,
                    burb: practitioner.burb,
                    email: practitioner.email,
                    abn: practitioner.abn,

                }, { merge: true });
            } catch (error) {
                return `Error setting document for practitioner: ${practitioner.name}  ${error}`;
            }

            // Store services as a collection against each practitioner
            const servicesRef = collection(providerDetails, "services");
            await Promise.all(practitioner.services.map(async service => {
                if (service.value === "") {
                    // Remove the service if value is an empty string
                    await deleteDoc(doc(servicesRef, service.id));
                } else {
                    await setDoc(doc(servicesRef, service.id), { value: service.value });
                }
            }));
        }));
        return "";
    } catch (error) {
        return error.message;
    }
}
const getProvidersLabel = 'getProviders'
async function getProviders(userId, clinicId) {
    let gpt = null;
    try {
        let providers = cacheOut(getProvidersLabel, userId, clinicId);
        if (providers) { return { data: providers, error: "" }; }
        gpt = startTrace(getProvidersLabel);

        const providersRef = collection(db, "users", userId, "companyDetails", clinicId, "practitioners");
        const snapshot = await getDocs(providersRef);
        if (snapshot.empty) {
            return { data: [], error: "" };
        }
        providers = Array.from(snapshot.docs, doc => ({ id: doc.id, ...doc.data() }));
        cacheIn(getProvidersLabel, userId, clinicId, providers)
        return { data: providers, error: "" };
    } catch (error) {
        return { data: [], error: error.message };
    }
    finally {
        if (gpt) { stopTrace(gpt, getProvidersLabel); }
    }
}

export async function hasProviders(userId, clinicId) {
    const providers = await getProviders(userId, clinicId)
    if (providers.error) {
        alert(providers.error);
    }
    return providers && !providers.data ? false : providers.data.length > 0;
}

const getPractitionersLabel = 'getPractitioners'
export async function getPractitioners(userId, clinicId) {
    let getPractitionersT = null;
    try {
        let practitioners = cacheOut(getPractitionersLabel, userId, clinicId);
        if (practitioners) { return { data: practitioners, error: "" }; }
        getPractitionersT = startTrace(getPractitionersLabel);

        const providers = await getProviders(userId, clinicId);
        if (providers.error) {
            return { data: null, error: providers.error };
        }

        const practitionersPromises = providers.data.map(async (doc) => {
            const servicesRef = collection(db, "users", userId, "companyDetails", clinicId, "practitioners", doc.id, "services");
            const servicesSnapshot = await getDocs(servicesRef);

            const services = servicesSnapshot.docs.map(serviceDoc => ({
                id: serviceDoc.id,
                value: serviceDoc.data().value
            }));

            return {
                id: doc.id,
                name: doc.name,
                entity: doc.entity,
                street: doc.street,
                burb: doc.burb,
                email: doc.email,
                abn: doc.abn,
                services: services
            };
        });

        practitioners = await Promise.all(practitionersPromises);
        cacheIn(getPractitionersLabel, userId, clinicId, practitioners)
        return { data: practitioners, error: "" };

    } catch (error) {
        return { data: [], error: error.message };
    } finally {
        if (getPractitionersT) { stopTrace(getPractitionersT, getPractitionersLabel); }
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

export async function updateItemNumbers(userId, clinicId, serviceCodes) {
    try {
        clearCache(getServiceCodeLabel);
        const serviceCodesRef = collection(db, "users", userId, "companyDetails", clinicId, "serviceCodes");
        await setItemNumbers(serviceCodesRef, serviceCodes, true);
        return "";
    } catch (error) {
        return error.message;
    }
}

async function setItemNumbers(serviceCodesRef, serviceCodes, updateItems = false) {
    try {
        await Promise.all(serviceCodes.map(async serviceCode => {
            const docRef = doc(serviceCodesRef, serviceCode.id);
            const itemListRef = collection(docRef, 'itemList');
            const itemListSnapshot = await getDocs(itemListRef);
            const itemsInFirestore = itemListSnapshot.docs.map(doc => doc.id);

            // If updateItems is true, add the items from the service code list to the existing items
            if (updateItems) {
                const existingItems = itemsInFirestore.map(itemId => parseInt(itemId));
                const newItems = serviceCode.itemList.filter(item => !existingItems.includes(item));

                // Add new items to the itemList collection
                await Promise.all(newItems.map(item =>
                    addDoc(itemListRef, {
                        value: item
                    })
                ));
            } else {
                // Delete all documents in the itemList collection
                await Promise.all(itemsInFirestore.map(itemId => deleteDoc(doc(itemListRef, itemId))));

                // Add each number in itemList as a document to the itemList collection
                await Promise.all(serviceCode.itemList.map(item =>
                    addDoc(itemListRef, {
                        value: item
                    })
                ));
            }
        }));
    } catch (error) {
        return `Error in setItemNumbers: ${error}`;
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
