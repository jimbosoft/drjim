
import { auth, setUser, getClinics } from './firebase.js';
import { islogoutButtonPressed, resetlogoutButtonPressed, showLoginScreen, showUser } from './footer.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

onAuthStateChanged(auth, (user) => {
    if (user) {
        setUser(user);
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

clinicSetup.addEventListener('click', () => {
    window.location.href = '/clinics.html';
});

serviceCodes.addEventListener('click', () => {
    window.location.href = '/serviceCode.html';
});

// Get a reference to the dropdown
var dropdown = document.getElementById('dropdown');
dropdown.addEventListener('change', function () {
    let selectedIndex = dropdown.selectedIndex;
    let selectedOption = dropdown.options[selectedIndex];
    let selectedId = selectedOption.dataset.id;

    localStorage.setItem('clinicId', selectedId);
});

function initClinics() {

    getClinics().then((result) => {
        if (result.error) {
            alert(result.error);
        }
        const clinics = result.data;
        if (clinics && clinics.length > 0) {
            if (clinics.length > 1) {
                addHeader("Please select clinic:");
            }
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
    // Add a Tailwind CSS class to the h2
    h2.classList.add('mb-2');
     // Get the div to which you want to add the h2
    var div = document.getElementById('selectClinic');
    // Add the h2 to the div
    div.insertBefore(h2, div.firstChild);
}

function populateClinic(clinics) {
    const lastSelected = localStorage.getItem('clinicId');
    for (const [index, clinic] of clinics.entries()) {
        const option = document.createElement('option');
        option.textContent = clinic.name;
        option.dataset.id = clinic.id;
        if (clinic.id === lastSelected) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    }
    dropdown.classList.remove("hidden");
}