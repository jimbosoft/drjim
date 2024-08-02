
import { auth, setUser, getClinics, getOnlyServiceCodes, currentUser, clinicId } from './firebase.js';
import { islogoutButtonPressed, resetlogoutButtonPressed, showLoginScreen, showUser } from './footer.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { showLastLoad } from './fileHandler.js';
onAuthStateChanged(auth, (user) => {
    if (user) {
        setUser(user);
        showUser(user)
        initClinics();
        showLastLoad();
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

practitioners.addEventListener('click', () => {
    window.location.href = '/practitioners.html';
});

document.getElementById('missingProvidersButton').addEventListener('click', function () {
    window.location.href = 'practitioners.html';
});

document.getElementById('missingItemsButton').addEventListener('click', function () {
    window.location.href = 'items.html';
});

document.getElementById('missingServiceCodesButton').addEventListener('click', function () {
    window.location.href = 'practitioners.html';
});

function initClinics() {

    getClinics(currentUser.email).then((result) => {
        if (result.error) {
            displayErrors(result.error);
        }
        const clinics = result.data;
        if (clinics && clinics.length > 0) {
            populateClinic(clinics);
        } else {
            clinicDropdown.classList.add("hidden");
            localStorage.removeItem(clinicId);
        }
    })
}

function populateClinic(clinics) {
    //
    // If there is only one = auto selection
    //
    if (clinics.length == 1) {
        localStorage.setItem(clinicId, clinics[0].id);
    }

    const lastSelected = localStorage.getItem(clinicId);

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.textContent = 'Please select company';
    if (!lastSelected || lastSelected === 'null') {
        clinicDropdown.appendChild(defaultOption);
    } else {
        companySelected(lastSelected);
    }

    for (const [index, clinic] of clinics.entries()) {
        companyWasSetup();
        const option = document.createElement('option');
        option.textContent = clinic.name;
        option.dataset.id = clinic.id;
        if (clinic.id === lastSelected) {
            option.selected = true;
         }
        clinicDropdown.appendChild(option);
    }

    // Remove default option when a selection is made
    clinicDropdown.addEventListener('change', function () {
        if (defaultOption.parentNode) {
            defaultOption.remove();
        }
        let selectedIndex = clinicDropdown.selectedIndex;
        let selectedOption = clinicDropdown.options[selectedIndex];
        let selectedId = selectedOption.dataset.id;
        localStorage.setItem(clinicId, selectedId);
        companySelected(selectedId);
    });
}

function companyWasSetup() {
    clinicDropdown.classList.remove("hidden");
}

function companySelected(companyId) {
    document.getElementById('serviceCodes').classList.remove('hidden');
    document.getElementById('practitioners').classList.remove('hidden');
    document.getElementById('file-processing').classList.remove('hidden');
}

function displayErrors(error) {
    messageOutput.innerText = error
 }
