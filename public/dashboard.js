
import { auth, setUser, getClinics } from './firebase.js';
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

// Get a reference to the dropdown
var dropdown = document.getElementById('dropdown');
dropdown.addEventListener('change', function () {
    let selectedIndex = dropdown.selectedIndex;
    let selectedOption = dropdown.options[selectedIndex];
    let selectedId = selectedOption.dataset.id;

    localStorage.setItem('clinicId', selectedId);
});

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('csvFile');

dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('bg-gray-200');
    dropZone.style.cursor = 'copy'; // Add this line
});

dropZone.addEventListener('dragleave', function (e) {
    dropZone.classList.remove('bg-gray-200');
    dropZone.style.cursor = 'default'; // Add this line
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
