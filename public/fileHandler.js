import {
    getServiceCodes, currentUser, clinicId, getPractitioners,
    storeStuff, getStore, clearStore,
    missingProvidersKey, missingItemsKey, missingServiceCodes, noItemNrs,
    fileContentsKey, fileNameKey, adjustmentKey, startTrace, stopTrace,
    storeAdjustments, getAdjustments, removeAdjustment,
    getClinics
} from './firebase.js';
import { cloudServiceConfig } from './config.js';
import { displayErrors, clearErrors } from './dashboard.js';

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

async function getCompanyDetails(userId) {
    const selectedOption = clinicDropdown.options[clinicDropdown.selectedIndex];
    const clinics = await getClinics(userId);
    if (clinics.error) {
        displayErrors("Retrieving company details failed: " + result.error.message);
        return null;
    }

    for (const clinic of clinics.data) {
        if (clinic.id === selectedOption.dataset.id) {
            return {
                Name: clinic.name,
                StreetAddress: clinic.address,
                City: clinic.postcode,
                ABN: clinic.abn,
                Email: ""
            };
        }
    }
    return null;
}

function clearOutput() {
    clearErrors();
    document.getElementById('missingProviders').classList.add('hidden');
    document.getElementById('missingItems').classList.add('hidden');
    document.getElementById('missingServiceCodes').classList.add('hidden');
    const providerList = document.getElementById('providerList');
    while (providerList.firstChild) {
        providerList.removeChild(providerList.firstChild);
    }
}

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
            clearStore(adjustmentKey)
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
        displayErrors("Calling invoice processor failed with: " + err);
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
            const companyDetails = await getCompanyDetails(currentUser.email)
            if (result.codeMap && result.procMap) {
                const paymentFile = {
                    FileContent: fileContents,
                    CsvLineStart: 16,
                    CompanyDetails: companyDetails,
                    CodeMap: result.codeMap,
                    PracMap: result.procMap,
                    PracDetails: result.pracDetails,
                    AdjustMap: getAdjustments()
                };

                let fileResult = null;
                const apiCallTrace = startTrace(APICall);
                let response = { ok: true };
                try {
                    response = await fetch(cloudServiceConfig.processFileUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(paymentFile)
                    });
                } catch (error) {
                    stopTrace(apiCallTrace, APICall);
                    return "Failed to call server: " + error.message;
                }
                try {
                    stopTrace(apiCallTrace, APICall);
                    if (!response.ok) {
                        let errorMessage = "HTTP error: " + response.status + " " + response.statusText;
                        const errorText = await response.text();
                        if (errorText) {
                            errorMessage += "<br>" + errorText;
                        }
                        return errorMessage;
                    }
                } catch (error) {
                    return "Failed to process error response " + response.status + " Error: " + error.message;
                }
                try {
                    fileResult = await response.json();
                } catch (error) {
                    return "Returned data is invalid " + error.message;
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
        const PracDetails = {};
        practitioners.forEach(practitioner => {
            PracDetails[practitioner.name] = {
                Name: practitioner.name,
                StreetAddress: practitioner.street,
                City: practitioner.burb,
                ABN: practitioner.abn,
                Email: practitioner.email
            };
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

        return { codeMap: CodeMap, procMap: PracMap, pracDetails: PracDetails, error: null };
    } catch (errorRes) {
        return { codeMap: null, procMap: null, error: errorRes };
    }
}

function generateProviderList(data, stuffMissing) {
    const providerListElement = document.getElementById('providerList');
    providerListElement.innerHTML = ''; // Clear existing content
    data.forEach((value, key) => {
        const providerItem = document.createElement('div');
        providerItem.className = 'bg-white p-4 rounded shadow';

        const providerName = document.createElement('h3');
        providerName.textContent = key;
        providerName.className = 'text-lg font-semibold mb-2';
        providerItem.appendChild(providerName);

        if (value.invoice && value.invoice.length > 0) {
            const viewPdfButton = document.createElement('button');
            viewPdfButton.textContent = 'View PDF';
            viewPdfButton.className = 'btn btn-primary mr-2';
            viewPdfButton.onclick = () => {
                const dataUrl = 'data:application/pdf;base64,' + value.invoice;
                fetch(dataUrl).then(res => res.blob()).then(blob => {
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                });
            };
            providerItem.appendChild(viewPdfButton);

            const adjustmentsButton = document.createElement('button');
            adjustmentsButton.textContent = 'Add Adjustments';
            adjustmentsButton.className = 'btn btn-secondary';
            providerItem.appendChild(adjustmentsButton);

            const adjustmentsContainer = document.createElement('div');
            adjustmentsContainer.style.display = 'none';
            adjustmentsContainer.className = 'mt-4';
            providerItem.appendChild(adjustmentsContainer);

            addAdjustmentsButtonHandler(key, adjustmentsButton, adjustmentsContainer, viewPdfButton);
        }
        else if (!stuffMissing) {
            const errorMessage = document.createElement('p');
            errorMessage.textContent = "Error: No invoice pdf returned";
            errorMessage.className = 'text-red-500';
            providerItem.appendChild(errorMessage);
        }
        providerListElement.appendChild(providerItem);
    });
}

function fillAdjustments(adjustmentsContainer, provider, desc, amount, viewPdfButton) {
    adjustmentsContainer.innerHTML = '';
    const newRow = document.createElement('div');
    newRow.className = 'flex items-center mb-2';

    const descriptionInput = document.createElement('input');
    descriptionInput.type = 'text';
    descriptionInput.className = 'input mr-2 flex-grow';
    descriptionInput.placeholder = 'Description';
    descriptionInput.id = provider;
    if (desc) {
        descriptionInput.value = desc;
        descriptionInput.readOnly = true;
        descriptionInput.classList.add('bg-gray-100');
    }
    newRow.appendChild(descriptionInput);

    const amountInput = document.createElement('input');
    amountInput.type = 'text';
    amountInput.className = 'input mr-2 w-24';
    amountInput.placeholder = 'Amount';
    if (amount) {
        amountInput.value = '$' + (amount / 100).toFixed(2);
        amountInput.readOnly = true;
        amountInput.classList.add('bg-gray-100');
    }
    newRow.appendChild(amountInput);

    const addButton = document.createElement('button');
    addButton.className = 'btn btn-primary';
    addButton.innerText = desc ? 'Delete' : 'Add';
    newRow.appendChild(addButton);

    adjustmentsContainer.appendChild(newRow);

    addButton.onclick = () => {
        clearErrors();
        const provider = descriptionInput.id;
        const description = descriptionInput.value.trim();
        const amount = amountInput.value.trim();
        const dollarRegex = /^-?\$?\d+(\.\d{2})?$/;

        if (addButton.innerText === 'Add') {
            if (description && amount && dollarRegex.test(amount)) {
                if (getAdjustments(provider, description) !== null) {
                    displayErrors('Adjustment already exists');
                    return;
                }
                const amountInCents = Math.round(parseFloat(amount.replace('$', '')) * 100);
                storeAdjustments(provider, description, amountInCents);
                descriptionInput.readOnly = true;
                descriptionInput.classList.add('bg-gray-100');
                amountInput.readOnly = true;
                amountInput.classList.add('bg-gray-100');
                viewPdfButton.style.display = 'none';
                fillAdjustments(adjustmentsContainer, provider, null, null, viewPdfButton);
                addButton.innerText = 'Delete';
            } else {
                displayErrors('Please enter a valid description and dollar amount with no more than 2 decimal places.');
            }
        } else if (addButton.innerText === 'Delete') {
            if (description) {
                removeAdjustment(provider, description);
                newRow.remove();
                addButton.innerText = 'Add';
            }
        }
    }
}

function addAdjustmentsButtonHandler(provider, detailsButton, detailsContainer, viewPdfButton) {
    detailsButton.addEventListener('click', function () {
        if (detailsContainer.style.display === 'none') {
            detailsContainer.style.display = 'block';
            detailsButton.innerText = 'Hide Adjustments';
            const adjustments = getAdjustments(provider);
            if (adjustments && adjustments.length > 0) {
                adjustments.forEach(adjustment => {
                    fillAdjustments(detailsContainer, provider,
                        adjustment.description, adjustment.amount, viewPdfButton);
                });
            }
            fillAdjustments(detailsContainer, provider, null, null, viewPdfButton)
        } else {
            detailsContainer.style.display = 'none';
            detailsButton.innerText = 'Add Adjustments';
            detailsContainer.innerHTML = '';
        }
    });
}
