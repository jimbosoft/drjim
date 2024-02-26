
import { auth, setUser, getClinics } from './firebase.js';
import { islogoutButtonPressed, resetlogoutButtonPressed, showLoginScreen, showUser } from './footer.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

onAuthStateChanged(auth, (user) => {
    if (user) {
        setUser(user);
        //const details = JSON.stringify(user, null, '  ');
        //alert(`${details}`)
        showUser(user)
        initClinics();
    } else {
        // User is signed out
        if (islogoutButtonPressed()) {
            resetlogoutButtonPressed();
        } else {
            alert("Please sign in first")
        }
        showLoginScreen()
    }
});

function toggleDropdown() {
    var dropdown = document.getElementById("dropdown");
    if (dropdown.classList.contains("hidden")) {
        dropdown.classList.remove("hidden");
    } else {
        dropdown.classList.add("hidden");
    }
}

clinicSetup.addEventListener('click', () => {
    window.location.href = '/clinics.html';
});

serviceCodes.addEventListener('click', () => {
    let dropdown = document.getElementById('dropdown');
    let selectedIndex = dropdown.selectedIndex;
    let selectedOption = dropdown.options[selectedIndex];
    let selectedId = selectedOption.dataset.id;

    localStorage.setItem('clinicId', selectedId); 
    window.location.href = '/serviceCode.html';
});

// Get a reference to the dropdown
var dropdown = document.getElementById('dropdown');

function initClinics() {

    getClinics().then((clinics) => {
        if (clinics) {
            addHeader("Please select clinic");
            populateClinic(clinics);
        } else {
            dropdown.classList.add("hidden");
        }
    })
}

function addHeader(headerTxt) {
    // Create a new h2 element
    var h2 = document.createElement('h2');
    h2.textContent = headerTxt;
    // Get the div to which you want to add the h2
    var div = document.getElementById('selectClinic');
    // Add the h2 to the div
    div.insertBefore(h2, div.firstChild);
}

function populateClinic(clinics) {
    for (const [index, clinic] of clinics.entries()) {
        const option = document.createElement('option');
        option.textContent = clinic.clinicName;
        option.dataset.id = clinic.id;
        dropdown.appendChild(option);
    }
    dropdown.classList.remove("hidden");
}