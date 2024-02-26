//
// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth, connectAuthEmulator, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
const firebaseConfig = {
    apiKey: "AIzaSyAmDuJ0yEyvQDVVApiYcqAgp7yaOJkudgA",
    authDomain: "drjim-f2087.firebaseapp.com",
    projectId: "drjim-f2087",
    storageBucket: "drjim-f2087.appspot.com",
    messagingSenderId: "13689300459",
    appId: "1:13689300459:web:f71baf9ca9eb861cdda5ae",
    measurementId: "G-EE0ZDV3F0X"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
connectAuthEmulator(auth, "http://localhost:9099");
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
    updateDoc,
    collection,
    addDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js'

export const db = getFirestore(app);
connectFirestoreEmulator(db, 'localhost', 8080)

export async function getClinics() {
    const userId = currentUser.uid;
    const clinicsRef = collection(db, "users", userId, "companyDetails");

    // Get all the documents in the collection
    const querySnapshot = await getDocs(clinicsRef);

    if (querySnapshot.empty) {
        return null;
    }
    const listRef = await querySnapshot.docs
    // listRef.forEach((doc, index) => {
    //     // Get the data of the document
    //     const data = doc.data();
    //     console.log(`Clinic ${index + 1}: ${data.id} ${data.clinicName} at ${data.clinicAddress}`);
    // });
    return Array.from(querySnapshot.docs, doc => ({ id: doc.id, ...doc.data() }));
}

export async function getServiceCodes(userId, docId){
    const serviceCodesRef = collection(db, "users", userId, "companyDetails", docId, "serviceCodes");
    const querySnapshot = await getDocs(serviceCodesRef);
    if (querySnapshot.empty) {
        return null;
    }
    return Array.from(querySnapshot.docs, doc => ({ id: doc.id, ...doc.data() }));
}

export async function setServiceCodes(userId, clinicId, serviceCodes){
    const serviceCodesRef = collection(db, "users", userId, "companyDetails", clinicId, "serviceCodes");
    await Promise.all(serviceCodes.map(serviceCode => 
        setDoc(doc(db, "users", userId, "companyDetails", clinicId, "serviceCodes", serviceCode.id), {
            description: serviceCode.description
        })
    ));
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
