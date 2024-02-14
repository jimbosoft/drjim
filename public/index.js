//
// This stuff was copied from firebase console, Settings, Apps, Web App, SDK setup and configuration (npm)
//
// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth, connectAuthEmulator, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import {
    connectStorageEmulator,
    getStorage,
    ref,
    uploadString
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js'
import {
    getFirestore,
    collection,
    addDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js'

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app)
connectAuthEmulator(auth, "http://localhost:9099");
connectStorageEmulator(storage, '127.0.0.1', 9199)
const db = getFirestore(app);

console.log(window);

/////////////////////////////////////////////////////////////////////////////
// import * as fui from 'https://www.gstatic.com/firebasejs/ui/6.1.0/firebase-ui-auth.js';
// // Initialize the FirebaseUI Widget using Firebase.
// window.firebase = app.firebase
// var ui = new fui.firebaseui.(auth);
// //var ui = new fui.auth.AuthUI(auth)
// // The start method will wait until the DOM is loaded.
// ui.start('#firebaseui-auth-container', {
//     signInOptions: [
//         {
//             provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
//             requireDisplayName: false
//         }
//     ]
// });
////////////////////////////////////////////////////////////////////////////////
function loginEmailPassword() {
    try {
        signInWithEmailAndPassword(auth, email.value, password.value)
            .then((userCredential) => {
                // Signed in 
                const user = userCredential.user;
                authState.innerHTML = `User ${user.email} is logged in`
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                alert(errorMessage)
            });
    } catch (error) {
        alert(error.message)
    }
}

function logout() {
    currentUser = null
    signOut(auth).then(() => {
        showLoginScreen()
    }).catch((error) => {
        alert(error.message)
    });

}

function createAccount() {
    try {
        createUserWithEmailAndPassword(auth, email.value, password.value)
            .then((userCredential) => {
                // Signed up 
                const user = userCredential.user;
                // ...
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                alert(errorMessage)
            });

    } catch (error) {
        alert(error.message)
    }
}

signupButton.addEventListener('click', createAccount)
loginButton.addEventListener('click', loginEmailPassword)
logoutButton.addEventListener('click', logout)

let currentUser = null
function showApp(user) {
    currentUser = user
    showUser(user)
    hideError()
    loginScreen.style.display = 'none'
    appScreen.style.display = 'block'
}

function hideError() {
    errorPanel.style.display = 'none'
    errorPanel.innerHTML = ''
}

function showLoginScreen() {
    loginScreen.style.display = 'block'
    appScreen.style.display = 'none'
}

function showUser(user) {
    authState.innerHTML = `You're logged in as ${user.email} (uid: ${user.uid}) `
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/auth.user
        const uid = user.uid;
        const details = JSON.stringify(user, null, '  ');
        alert(`${details}`)
        showApp(user)
    } else {
        // User is signed out
        alert(`signed out`)
        showLoginScreen()
    }
});

function uploadFile() {
    try {
        const storageRef = ref(storage, `user/${currentUser.uid}/test.txt`)
        const content = `Hello, World! by ${currentUser.email} on ${new Date().toISOString()}`
        uploadString(storageRef, content).then((snapshot) => {
            alert('File uploaded')
        }).catch((error) => {
            alert(error.message)
        });
        writeToFirestore()
    } catch (error) {
        alert(error.message)
    }
}

uploadButton.addEventListener('click', uploadFile)

async function writeToFirestore() {
    try {
        try {
            const docRef = await addDoc(collection(db, "users"), {
                first: "Ada",
                last: "Lovelace",
                born: 1815
            });
            console.log("Document written with ID: ", docRef.id);
        } catch (error) {
            alert(error.message)
        }

        const userId = currentUser.uid;
        // Create a reference to a collection

        // Create a new document with a unique ID
        collection("users").doc(userId).set({
            name: "John Doe",
            email: "johndoe@example.com",
            age: 30
        });

        const usersRef = collection("users");
        // Add data to an existing document (assuming ID is known)
        usersRef.doc(userId).set({
            phone: "+1234567890"
        });

        // Update specific fields in a document
        usersRef.doc(userId).update({
            age: 31
        });

    } catch (error) {
        alert(error.message)
    }
}
