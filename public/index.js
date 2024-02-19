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
    showUser(user);
    initClinics();
    appScreen.style.display = 'block'
}

function showLoginScreen() {
    window.location.href = '/index.html';
}

function showUser(user) {
    authState.innerHTML = `You're logged in as ${user.email} (uid: ${user.uid}) <br> <br>`
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
function createCompanyAddressSection(index, name, address) {
    const section = document.createElement('div');
    section.classList.add('company-address-section');

    const clinicSelector = document.createElement('input');
    clinicSelector.type = 'radio';
    clinicSelector.name = 'clinicSelector';
    clinicSelector.value = index;
    clinicSelector.classList.add('clinicSelector');
    section.appendChild(clinicSelector);

    const companyNameLabel = document.createElement('label');
    companyNameLabel.textContent = 'Clinic Name:';
    section.appendChild(companyNameLabel);
    section.appendChild(document.createElement('br'));

    const companyNameInput = document.createElement('input');
    companyNameInput.type = 'text';
    companyNameInput.classList.add('companyName');
    companyNameInput.name = 'companyName';
    if (name) {
        companyNameInput.value = name;
    }
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
    if (address) {
        addressInput.value = address;
    }
    section.appendChild(addressInput);
    section.appendChild(document.createElement('br'));
    section.appendChild(document.createElement('br'));

    const updateButton = document.createElement('button');
    updateButton.type = 'button';
    updateButton.style.marginRight = '16px';
    updateButton.textContent = 'Update';
    updateButton.classList.add('update');
    section.appendChild(updateButton);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.classList.add('delete');
    section.appendChild(deleteButton);
    section.appendChild(document.createElement('br'));
    section.appendChild(document.createElement('br'));

    form.appendChild(section);
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
            const currentSections = form.getElementsByClassName('company-address-section');
            const nextIndex = currentSections.length;
            const newSection = createCompanyAddressSection(nextIndex, null, null);
        }
    }
});

// Handle the submit button click
submitButton.addEventListener('click', (e) => {
    e.preventDefault();

    const radios = Array.from(form.getElementsByClassName('clinicSelector'));
    const selectedRadio = radios.find(radio => radio.checked);
    if (selectedRadio === undefined) {
        alert('Please select a clinic to continue');
    }
    // Get the form values, exclude empty fields
    const companyNames = Array.from(form.getElementsByClassName('companyName'), input => input.value.trim()).filter(value => value !== '');;
    const addresses = Array.from(form.getElementsByClassName('address'), input => input.value.trim()).filter(value => value !== '');
    // Create an array of company and address objects
    const companies = companyNames.map((name, i) => ({ name: companyNames[i], address: addresses[i] }));
    let companiesArray = companies.map(company => ({
        clinicName: company.name,
        clinicAddress: company.address
    }));

    writeToFirestore(companiesArray)

    // Clear the form
    //form.innerHTML = '';
    //form.appendChild(createCompanyAddressSection());
});

async function writeToFirestore(companiesArray) {
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

        updateDoc(docRef, { clinics: companiesArray })
            .then(() => {
                console.log("Addresses successfully written!");
            })
            .catch((error) => {
                console.error("Error writing document: ", error);
            });
    } catch (error) {
        alert(error.message)
    }
}

async function initClinics() {
    const userId = currentUser.uid;
    const docRef = doc(db, userId, "clinics");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        populateClinic(docSnap);
    } else {
        createCompanyAddressSection(0, null, null)

    }
}

function populateClinic(docSnap) {
    const clinics = docSnap.data().clinics;

    // Populate the radio buttons
    for (const [index, clinic] of clinics.entries()) {
        createCompanyAddressSection(index, clinic.clinicName, clinic.clinicAddress)
    }

    // Add event listeners to the update and delete buttons
    // const updateButtons = document.getElementsByClassName('update');
    // const deleteButtons = document.getElementsByClassName('delete');
    // for (let i = 0; i < updateButtons.length; i++) {
    //     updateButtons[i].addEventListener('click', () => {
    //         // Perform the update action
    //         console.log(`Update button clicked for clinic: ${i}`);
    //     });
    //     deleteButtons[i].addEventListener('click', () => {
    //         // Perform the delete action
    //         console.log(`Delete button clicked for clinic: ${i}`);
    //     });
    // }
}