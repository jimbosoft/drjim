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
    connectFirestoreEmulator,
    getFirestore,
    setDoc,
    doc,
    getDoc,
    updateDoc,
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
connectFirestoreEmulator(db, 'localhost', 8080)

function logout() {
    currentUser = null
    signOut(auth).then(() => {
        showLoginScreen()
    }).catch((error) => {
        alert(error.message)
    });
}
logoutButton.addEventListener('click', logout)

let currentUser = null
function showApp(user) {
    currentUser = user
    showUser(user)
    appScreen.style.display = 'block'
}

function showLoginScreen() {
    window.location.href = '/index.html';
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
        //alert(`${details}`)
        showApp(user)
    } else {
        // User is signed out
        alert("Please sign in first")
        showLoginScreen()
    }
});

function uploadFile() {
    try {
        const storageRef = ref(storage, `user/${currentUser.uid}/test.txt`)
        const content = `Hello, World! by ${currentUser.email} on ${new Date().toISOString()}`
        uploadString(storageRef, content).then((snapshot) => {
            console.log('File uploaded')
        }).catch((error) => {
            alert(error.message)
        });
        writeToFirestore()
    } catch (error) {
        alert(error.message)
    }
}
///////////////////////////////////////////////////////
// Get a reference to the form and submit button
const form = document.getElementById('company-form');
const submitButton = document.getElementById('submit-button');

// Function to create a new company and address section
function createCompanyAddressSection() {
    const section = document.createElement('div');
    section.classList.add('company-address-section');

    const companyNameLabel = document.createElement('label');
    companyNameLabel.textContent = 'Company Name:';
    section.appendChild(companyNameLabel);
    section.appendChild(document.createElement('br'));

    const companyNameInput = document.createElement('input');
    companyNameInput.type = 'text';
    companyNameInput.classList.add('companyName');
    companyNameInput.name = 'companyName';
    section.appendChild(companyNameInput);
    section.appendChild(document.createElement('br'));

    const addressLabel = document.createElement('label');
    addressLabel.textContent = 'Address:';
    section.appendChild(addressLabel);
    section.appendChild(document.createElement('br'));

    const addressInput = document.createElement('input');
    addressInput.type = 'text';
    addressInput.classList.add('address');
    addressInput.name = 'address';
    section.appendChild(addressInput);
    section.appendChild(document.createElement('br'));
    section.appendChild(document.createElement('br'));

    return section;
}

// Listen for input events on the form
form.addEventListener('input', (e) => {
    // If the target of the event is an address input
    if (e.target.classList.contains('address')) {
        // Get the parent section of the input
        const section = e.target.parentElement;

        // If the input is filled in and the section is the last one
        if (e.target.value && section === form.lastElementChild) {
            // Create a new address section and append it to the form
            const newSection = createCompanyAddressSection();
            form.appendChild(newSection);
        }
    }
});

// Handle the submit button click
submitButton.addEventListener('click', (e) => {
    e.preventDefault();

    // Get the form values, exclude empty fields
    const companyNames = Array.from(form.getElementsByClassName('companyName'), input => input.value.trim()).filter(value => value !== '');;
    const addresses = Array.from(form.getElementsByClassName('address'), input => input.value.trim()).filter(value => value !== '');
    // Create an array of company and address objects
    const companies = companyNames.map((name, i) => ({ name: companyNames[i], address: addresses[i] }));

    writeToFirestore(companies)

    // Clear the form
    form.innerHTML = '';
    form.appendChild(createCompanyAddressSection());
});

async function writeToFirestore(companies) {
    try {
        const userId = currentUser.uid;
        // Get a reference to the document
        const docRef = doc(db, userId, "clinics");

        // Get the document
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            // If the document does not exist, create it with no data
            await setDoc(docRef, {});
        }

        for (const company of companies) {
            //console.log(`${company.name} ${company.address}`);
            updateDoc(docRef, {
                clinicName: company.name,
                clinicAddress: company.address
            }).then(() => {
                console.log("Address successfully written!");
            }).catch((error) => {
                console.error("Error writing document: ", error);
            });
        };
    } catch (error) {
        alert(error.message)
    }
}
