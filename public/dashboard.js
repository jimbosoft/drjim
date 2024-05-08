
import { auth, setUser, getClinics, getServiceCodes, currentUser, clinicId, hasProviders, getPractitioners } from './firebase.js';
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
var clinicDropdown = document.getElementById('clinicDropdown');

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
*/
const messageOutput = document.getElementById("messageOutput")
const resultOutput = document.getElementById("resultOutput")
async function handleInputFile(file) {
    if (file) {
        messageOutput.innerHTML = '';
        if (resultOutput.firstChild) {
            resultOutput.removeChild(resultOutput.firstChild);
        }
        const reader = new FileReader();
        reader.onload = async function (e) {
            const fileContents = e.target.result;
            getProviderDetails(currentUser.uid, localStorage.getItem(clinicId)).then(async (result) => {
                if (result.error) {
                    alert(result.error);
                    return
                }
                const companyName = getCompanyName();
                if (result.codeMap && result.procMap) {
                    const paymentFile = {
                        FileContent: fileContents,
                        CsvLineStart: 16,
                        CompanyName: companyName,
                        CodeMap: result.codeMap,
                        PracMap: result.procMap
                    };
                    const response = await fetch(cloudServiceConfig.processFileUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(paymentFile)
                    });

                    if (!response.ok) {
                        response.text().then(text => {
                            messageOutput.innerHTML =
                                "HTTP error: " + response.status + "<br>"
                                + "Reason: " + text;
                        });
                        return;
                    }

                    let data
                    try {
                        data = await response.json();
                    } catch (error) {
                        console.error('Error:', error);
                    }
                    let output = '';
                    if (Array.isArray(data)) {
                        let table = document.createElement('table');
                        let headerRow = document.createElement('tr');
                        for (let key in data[0]) {
                            if (key === 'error') {
                                continue;
                            }
                            let headerCell = document.createElement('th');
                            headerCell.innerHTML = key;
                            headerRow.appendChild(headerCell);
                        }
                        table.appendChild(headerRow);

                        data.forEach(item => {
                            if (item.error && item.error.msg) {
                                output += '&nbsp;' + item.error.msg + '<br>';
                            } else {
                                let row = document.createElement('tr');
                                for (let key in item) {
                                    let cell = document.createElement('td');
                                    if (key === 'error') {
                                        continue;
                                    } else if (key === 'service') {
                                        cell.innerHTML = 'Code: ' + item[key].code + ', Percentage: ' + item[key].percentage;
                                    } else {
                                        cell.innerHTML = item[key];
                                    }
                                    row.appendChild(cell);
                                }
                                table.appendChild(row);
                            }
                            //------------------------------------
                        });
                        resultOutput.appendChild(table);
                        messageOutput.innerHTML = output;
                    }
                }
            });
        };
        reader.readAsText(file);
    } else {
        console.log('No file selected');
    }
}

export async function getProviderDetails(userId, clinicId) {
    try {
        // Fetch practitioners
        const practitionersResult = await getPractitioners(userId, clinicId);
        if (practitionersResult.error) {
            return { codeMap: null, procMap: null, error: practitionersResult.error };
        }
        const practitioners = practitionersResult.data;
        // Fetch service codes
        const serviceCodesResult = await getServiceCodes(userId, clinicId);
        if (serviceCodesResult.error) {
            return { codeMap: null, procMap: null, error: serviceCodesResult.error };
        }
        const serviceCodes = serviceCodesResult.data;

        // Format practitioners data for PracMap
        const PracMap = {};
        practitioners.forEach(practitioner => {
            const services = {};
            practitioner.services.forEach(service => {
                services[service.id] = service.value;
            });
            PracMap[practitioner.name] = services;
        });
        // Format service codes data for CodeMap
        // as a map of service code id to an array of item codes
        const CodeMap = serviceCodes.reduce((map, serviceCode) => {
            map[serviceCode.id] = serviceCode.itemList.map(item => item.toString());
            return map;
        }, {});
        return { codeMap: CodeMap, procMap: PracMap, error: null };
    } catch (errorRes) {
        return { codeMap: null, procMap: null, error: errorRes };
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
            clinicDropdown.classList.add("hidden");
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
function getCompanyName() {
    const selectedOption = clinicDropdown.options[clinicDropdown.selectedIndex];
    return selectedOption.textContent;
}
function companyWasSetup() {
    clinicDropdown.classList.remove("hidden");
}

function companySelected(companyId) {
    serviceCodes.classList.remove('hidden');
    hasProviders(currentUser.uid, companyId).then((gotProviders) => {
        if (gotProviders) {
            const fileProcessing = document.getElementById('file-processing');
            fileProcessing.classList.remove('hidden');
        }
    });
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
