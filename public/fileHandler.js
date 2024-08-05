import {
    getServiceCodes, currentUser, clinicId, getPractitioners,
    storeStuff, getStore, clearStore,
    missingProvidersKey, missingItemsKey, missingServiceCodes, noItemNrs,
    fileContentsKey, fileNameKey, startTrace, stopTrace
} from './firebase.js';
import { cloudServiceConfig } from './config.js';

var clinicDropdown = document.getElementById('clinicDropdown');

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('csvFile');

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

fileInput.addEventListener('change', function () {
    const file = fileInput.files[0];
    if (file) {
        handleInputFile(file)
    } else {
        console.log('No file selected');
    }
});

document.getElementById('rerunButton').addEventListener('click', function () {
    const fileContents = getStore(fileContentsKey);
    if (fileContents && fileContents !== 'null'
        && fileContents.length > 0 && fileContents !== 'undefined') {
        processFile(fileContents);
    }
    else {
        clearStore(fileContents);
        document.getElementById('rerunButton').classList.add('hidden');
    }
});

export function showLastLoad() {
    const fileContents = getStore(fileContentsKey);
    const fileName = getStore(fileNameKey);
    if (fileContents && fileContents !== 'null'
        && fileContents.length > 0 && fileContents !== 'undefined') {
        document.getElementById('rerunContainer').classList.remove('hidden');
    }
    if (fileName && fileName !== 'null'
        && fileName.length > 0 && fileName !== 'undefined') {
        document.getElementById('fileName').textContent = fileName;
    }
}

function getCompanyName() {
    const selectedOption = clinicDropdown.options[clinicDropdown.selectedIndex];
    return selectedOption.textContent;
}

function clearOutput() {
    messageOutput.innerHTML = '';
    if (resultOutput.firstChild) {
        resultOutput.removeChild(resultOutput.firstChild);
    }
    document.getElementById('missingProviders').classList.add('hidden');
    document.getElementById('missingItems').classList.add('hidden');
    document.getElementById('missingServiceCodes').classList.add('hidden');
    const providerList = document.getElementById('providerList');
    while (providerList.firstChild) {
        providerList.removeChild(providerList.firstChild);
    }
}
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
        clearOutput();
        clearStore(missingProvidersKey);
        clearStore(missingItemsKey);

        const reader = new FileReader();
        reader.onload = async function (e) {
            const fileContents = e.target.result;
            storeStuff(fileContentsKey, fileContents);
            storeStuff(fileNameKey, file.name);
            showLastLoad();
            processFile(fileContents);
        };
        reader.readAsText(file);
    } else {
        console.log('No file selected');
    }
}

async function processFile(fileContents) {
    clearOutput();
    var progressBar = document.getElementById('progress-bar');
    progressBar.style.display = 'block';
    const err = await callDataProcessor(fileContents);
    if (err && err !== '') {
        messageOutput.innerHTML = err;
    }
    progressBar.style.display = 'none';
}

const APICall = "APICall";

async function callDataProcessor(fileContents) {
     return await getProviderDetails(currentUser.email, localStorage.getItem(clinicId))
        .then(async (result) => {
             if (result.error) {
                return result.error;
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
   
                let fileResult = null;
                const apiCallTrace = startTrace(APICall);
                try {
                    const response = await fetch(cloudServiceConfig.processFileUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(paymentFile)
                    });
                    stopTrace(apiCallTrace, APICall);
                    if (!response.ok) {
                        response.text().then(text => {
                            return "HTTP error: " + response.status + " "
                                + response.statusText + "<br>"
                                + "Reason: " + text;
                        });
                    }
                    try {
                        fileResult = await response.json();
                    } catch (error) {
                        return "Returned data is invalid " + error.message;
                    }

                } catch (error) {
                    stopTrace(apiCallTrace, APICall);
                    return "Failed to call server: " + error.message;
                }
                let stuffMissing = false;
                if (Object.keys(fileResult.missingProviders).length > 0) {
                    document.getElementById('missingProvidersTxt').textContent = 'There are missing providers in the file';
                    document.getElementById('missingProviders').classList.remove('hidden');
                    const storeVal = fileResult.missingProviders
                    storeStuff(missingProvidersKey, JSON.stringify(storeVal));
                    stuffMissing = true;
                }
                if (Object.keys(fileResult.noItemNrs).length > 0) {
                    const storeVal = fileResult.noItemNrs
                    storeStuff(noItemNrs, JSON.stringify(storeVal));
                }
                if (Object.keys(fileResult.missingItemNrs).length > 0) {
                    const storeVal = fileResult.missingItemNrs
                    storeStuff(missingItemsKey, JSON.stringify(storeVal));
                }
                if (Object.keys(fileResult.missingItemNrs).length > 0 || Object.keys(fileResult.noItemNrs).length > 0) {
                    document.getElementById('missingItemsTxt').textContent = 'There are missing items in the file';
                    document.getElementById('missingItems').classList.remove('hidden');
                    stuffMissing = true;
                }
                if (Object.keys(fileResult.missingServiceCodes).length > 0) {
                    document.getElementById('missingServiceCodesTxt').textContent = 'There are missing service code cuts in the file';
                    document.getElementById('missingServiceCodes').classList.remove('hidden');
                    const storeVal = fileResult.missingServiceCodes
                    storeStuff(missingServiceCodes, JSON.stringify(storeVal));
                    stuffMissing = true;
                }
                const data = fileResult.chargeDetail
                let dataMap = new Map(Object.entries(data));
                if (dataMap instanceof Map && dataMap.size > 0) {
                    generateProviderList(dataMap, stuffMissing);
                }

            }
            return ""
        });
}

async function getProviderDetails(userId, clinicId) {
    try {
        // Run getPractitioners and getServiceCodes in parallel
        const [practitionersResult, serviceCodesResult] = await Promise.all([
            getPractitioners(userId, clinicId),
            getServiceCodes(userId, clinicId)
        ]);

        // Check for errors
        if (practitionersResult.error) {
            return { codeMap: null, procMap: null, error: practitionersResult.error };
        }
        if (serviceCodesResult.error) {
            return { codeMap: null, procMap: null, error: serviceCodesResult.error };
        }

        const practitioners = practitionersResult.data;
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
        const CodeMap = serviceCodes.reduce((map, serviceCode) => {
            map[serviceCode.id] = serviceCode.itemList.map(item => item.toString());
            return map;
        }, {});

        return { codeMap: CodeMap, procMap: PracMap, error: null };
    } catch (errorRes) {
        return { codeMap: null, procMap: null, error: errorRes };
    }
}

function generateProviderList(data, stuffMissing) {
    const providerListElement = document.getElementById('providerList');
    data.forEach((value, key) => {
        const providerContainer = document.createElement('div');
        providerContainer.className = 'provider-container';

        const providerName = document.createElement('div');
        providerName.innerText = key;
        providerName.className = 'provider-name';
        providerContainer.appendChild(providerName);

        if (value.invoice && value.invoice.length > 0) {
            const viewPdfButton = document.createElement('button');
            viewPdfButton.innerText = 'View PDF';
            viewPdfButton.className = 'button';
            viewPdfButton.onclick = () => {
                const dataUrl = 'data:application/pdf;base64,' + value.invoice;
                fetch(dataUrl).then(res => res.blob()).then(blob => {
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                });
            };
            providerContainer.appendChild(viewPdfButton);

            const adjustmentsButton = document.createElement('button');
            adjustmentsButton.innerText = 'Add Adjustments';
            adjustmentsButton.className = 'button';
            adjustmentsButton.onclick = () => { };
            providerContainer.appendChild(adjustmentsButton);
        }
        else if (!stuffMissing) {
            messageOutput.innerText =
                "Error: No invoice pdf returned";
        }
        providerListElement.appendChild(providerContainer);
    });
}
