
import { auth, setUser, getClinics, getServiceCodes, currentUser, clinicId } from './firebase.js';
import { islogoutButtonPressed, resetlogoutButtonPressed, showLoginScreen, showUser } from './footer.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { cloudServiceConfig } from './config.js';

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

practitioners.addEventListener('click', () => {
    window.location.href = '/practitioners.html';
});
var dropdown = document.getElementById('dropdown');

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('csvFile');
const providerButton = document.getElementById('practitioners');

dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('bg-gray-200');
    dropZone.style.cursor = 'copy'; 
});

dropZone.addEventListener('dragleave', function (e) {
    dropZone.classList.remove('bg-gray-200');
    dropZone.style.cursor = 'default'; 
});
dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('bg-gray-200');
    fileInput.files = e.dataTransfer.files;
    const file = fileInput.files[0];
    if (file) {
        handleInputFile(file)
    }
});

document.getElementById('uploadButton').addEventListener('click', function () {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    if (file) {
        handleInputFile(file)
    } else {
        console.log('No file selected');
    }
});
/*
json payload

    {
        "FileContent": "your_file_content",
        "CsvLineStart": 16,
        "CompanyName": "Vermont Medical Clinic",
        "CodeMap": [
            {
                "code1": ["123", "456"]
            },
            {
                "code2": ["789", "012"]
            }
        ],
        "PracMap":
          {
            "Doctor1": {"code1":"50", "code2":"20"},
            "DOctor2": {"code1":"40", "code2":"30"}
          }
    }
    {
        "FileContent": "your_file_content",
        "CsvLineStart": 16,
        "CompanyName": "Vermont Medical Clinic",
        "CodeMap": [
            {
                "code1": ["123", "456"]
            },
            {
                "code2": ["789", "012"]
            }
        ],
        "PracMap":
          {
            "Doctor1": {"code1":"50", "code2":"20"},
            "DOctor2": {"code1":"40", "code2":"30"}
          }
    }
*/
async function handleInputFile(file) {
    if (file) {
        const reader = new FileReader();
        reader.onload = async function (e) {
            const fileContents = e.target.result;
            const paymentFile = {
                fileContent: fileContents,
                serviceCodes: ['code1', 'code2'] // replace with actual service codes
            };
            const response = await fetch(cloudServiceConfig.processFileUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentFile)
            });

            if (!response.ok) {
                console.error('HTTP error', response.status);
            } else {
                const result = await response.json();
                //document.getElementById('output').textContent = result.fileContent;
                document.getElementById('output').innerHTML = result.fileContent.replace(/\n/g, '<br>');
            }

            console.log('File contents:', fileContents);
        };
        reader.readAsText(file);
    } else {
        console.log('No file selected');
    }
}

function initClinics() {

    getClinics().then((result) => {
        if (result.error) {
            alert(result.error);
        }
        const clinics = result.data;
        if (clinics && clinics.length > 0) {
            populateClinic(clinics);
        } else {
            dropdown.classList.add("hidden");
            localStorage.setItem(clinicId, null);
        }
    })
}

function populateClinic(clinics) {
    const lastSelected = localStorage.getItem(clinicId);
   
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.textContent = 'Please select company';
    if (!lastSelected || lastSelected === 'null') {
        dropdown.appendChild(defaultOption);
    } else {
        companySelected();
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
        dropdown.appendChild(option);
    }

    // Remove default option when a selection is made
    dropdown.addEventListener('change', function () {
        if (defaultOption.parentNode) {
            defaultOption.remove();
        }
        let selectedIndex = dropdown.selectedIndex;
        let selectedOption = dropdown.options[selectedIndex];
        let selectedId = selectedOption.dataset.id;
        localStorage.setItem(clinicId, selectedId);
        serviceCodesSet(selectedId);
        companySelected();
    });
}
function companyWasSetup() {
    dropdown.classList.remove("hidden");
}

function companySelected() {
    serviceCodes.classList.remove('hidden');
}

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
