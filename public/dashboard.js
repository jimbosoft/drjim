
import { auth, setUser, getClinics, getServiceCodes, currentUser, clinicId, hasProviders, getPractitioners } from './firebase.js';
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

    getClinics().then((result) => {
        if (result.error) {
            alert(result.error);
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
            serviceCodesSet(clinic.id)
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
        serviceCodesSet(selectedId);
        companySelected(selectedId);
    });
}

function companyWasSetup() {
    clinicDropdown.classList.remove("hidden");
}

function companySelected(companyId) {
    serviceCodes.classList.remove('hidden');
    const fileProcessing = document.getElementById('file-processing');
    fileProcessing.classList.remove('hidden');
}

const providerButton = document.getElementById('practitioners');

function serviceCodesSet(clinicId) {
    getServiceCodes(currentUser.uid, clinicId)
        .then(result => {
            if (result.error) {
                alert(`Error getting service codes: ${result.error}`);
            }
            if (Array.isArray(result.data) && result.data.length > 0) {
                providerButton.classList.remove('hidden');
            } else {
                providerButton.classList.add('hidden');
            }
        })
        .catch(error => {
            console.error(`Error getting service codes: ${error}`);
        });
}
