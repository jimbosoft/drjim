import {
    getServiceCodes, currentUser, clinicId, getPractitioners,
    setStore, getStore, clearStore, clearAllFileDetails,
    missingProvidersKey, missingItemsKey, missingServiceCodes, noItemNrs,
    fileContentsKey, fileNameKey, startTrace, stopTrace,
    storeAdjustments, getAdjustments, removeAdjustment,
    getClinics, getLogo, isEmailEnabled, updateClinicInvoiceNr
} from './firebase.js';
import { cloudServiceConfig } from './config.js';
import { displayErrors, clearErrors } from './dashboard.js';

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

export async function showLastLoad() {
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
    const clinic = await getCompanyDetails(currentUser.email);
    if (clinic) {
        const invoiceNr = clinic.InvoicePrefix + clinic.InvoiceNumber + clinic.InvoicePostfix
        if (invoiceNr && invoiceNr !== 'null'
            && invoiceNr.length > 0 && invoiceNr !== 'undefined') {
            const invoicePreElement = document.getElementById('invoicePrefix');
            invoicePreElement.textContent = clinic.InvoicePrefix;
            const invoiceNrElement = document.getElementById('invoiceNr');
            invoiceNrElement.value = clinic.InvoiceNumber;
            invoiceNrElement.style.width = `${invoiceNrElement.value.length + 1}ch`;
            const invoicePostElement = document.getElementById('invoicePostfix');
            invoicePostElement.textContent = clinic.InvoicePostfix;
        }
    }
}

async function getCompanyDetails(userId) {
    const lastSelected = getStore(clinicId)
    const clinics = await getClinics(userId);
    if (clinics.error) {
        displayErrors("Retrieving company details failed: " + result.error.message);
        return null;
    }

    for (const clinic of clinics.data) {
        if (clinic.id === lastSelected) {
            const logo = getLogo(clinic.id, "")
            return {
                Name: clinic.name,
                StreetAddress: clinic.address,
                City: clinic.postcode,
                ABN: clinic.abn,
                Email: clinic.email,
                Active: clinic.emailActive,
                Logo: logo.buffer,
                InvoicePrefix: clinic.invoicePrefix,
                InvoiceNumber: clinic.invoiceNumber,
                InvoicePostfix: clinic.invoicePostfix,
                DaysDue: clinic.daysDue,
                AccountCode: clinic.accountCode
            };
        }
    }
    return null;
}

export function clearFileDetails() {
    clearOutput();
    clearAllFileDetails();
    document.getElementById('rerunContainer').classList.add('hidden');
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
        clearFileDetails();

        const reader = new FileReader();
        reader.onload = async function (e) {
            const fileContents = e.target.result;
            setStore(fileContentsKey, fileContents);
            setStore(fileNameKey, file.name);
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

const APICall = "SubmitFileAPICall";

async function callDataProcessor(fileContents) {
    return await getProviderDetails(currentUser.email, getStore(clinicId))
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
                    setStore(missingProvidersKey, JSON.stringify(storeVal));
                    stuffMissing = true;
                }
                if (Object.keys(fileResult.noItemNrs).length > 0) {
                    const storeVal = fileResult.noItemNrs
                    setStore(noItemNrs, JSON.stringify(storeVal));
                }
                if (Object.keys(fileResult.missingItemNrs).length > 0) {
                    const storeVal = fileResult.missingItemNrs
                    setStore(missingItemsKey, JSON.stringify(storeVal));
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
                    setStore(missingServiceCodes, JSON.stringify(storeVal));
                    stuffMissing = true;
                }
                const data = fileResult.chargeDetail
                const nextSeqNr = fileResult.invoiceNr
                updateClinicInvoiceNr(currentUser.email, getStore(clinicId), nextSeqNr)
                showLastLoad()
                let dataMap = new Map(Object.entries(data));
                if (dataMap instanceof Map && dataMap.size > 0) {
                    generateProviderList(dataMap, fileResult.invoicePackage, fileResult.xeroFile, stuffMissing, companyDetails, result.pracDetails);
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
                Entity: practitioner.entity,
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
const wrapSection = 'flex-wrap-section';
const bottomMargin = 'bottom-margin';
function generateProviderList(data, zipFile, xeroFile, stuffMissing, companyDetails, pracDetails) {
    const providerListElement = document.getElementById('providerList');

    if (!stuffMissing) {
        const allContainer = document.createElement('div');
        allContainer.classList.add(wrapSection, bottomMargin);

        let but = downloadButton(zipFile, 'Download All', 'invoices.zip')
        if (but) {
            allContainer.appendChild(but);
        }
        const companyName = companyDetails.Name.replace(/\s+/g, '_');
        but = downloadButton(xeroFile, 'Xero File', companyName + "_xero.csv")
        if (but) {
            allContainer.appendChild(but);
        }
        if (isEmailEnabled()) {
            const emailAll = document.createElement('button');
            emailAll.innerText = 'Email All';
            emailAll.className = 'button';
            allContainer.appendChild(emailAll);
        }
        providerListElement.appendChild(allContainer);

        const blankline = document.createElement('div');
        blankline.style.height = '20px';
        providerListElement.appendChild(blankline);
    }

    data.forEach((value, key) => {
        const providerContainer = document.createElement('div');
        providerContainer.classList.add(wrapSection, bottomMargin);

        if (value.invoice && value.invoice.length > 0) {
            const viewPdfLink = document.createElement('a');
            viewPdfLink.innerText = key;
            viewPdfLink.className = 'invoiceLink'; // You can style this as needed
            viewPdfLink.href = '#'; // This prevents the default link behavior
            viewPdfLink.onclick = (event) => {
                event.preventDefault(); // Prevent the default link action
                const dataUrl = 'data:application/pdf;base64,' + value.invoice;
                fetch(dataUrl).then(res => res.blob()).then(blob => {
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    URL.revokeObjectURL(url);
                });
            };
            providerContainer.appendChild(viewPdfLink);

            const adjustmentsButton = document.createElement('button');
            adjustmentsButton.innerText = 'Add Adjustments';
            adjustmentsButton.className = 'button';
            providerContainer.appendChild(adjustmentsButton);
            const adjustmentsContainer = document.createElement('div');
            // initial condition, don't display
            adjustmentsContainer.style.display = 'none';
            // force it being on a new line
            adjustmentsContainer.style.width = '100%';
            providerContainer.appendChild(adjustmentsContainer);
            addAdjustmentsButtonHandler(key, adjustmentsButton, adjustmentsContainer, viewPdfLink);

            if (isEmailEnabled()) {
                const mailButton = document.createElement('button');
                mailButton.innerText = 'Email';
                mailButton.className = 'button';
                providerContainer.appendChild(mailButton);
                addEmailButtonHandler(mailButton, companyDetails, pracDetails[key]);
            }
        }
        else if (!stuffMissing) {
            displayErrors("Error: No invoice pdf returned");
        }
        providerListElement.appendChild(providerContainer);
    });
}

function downloadButton(file, buttonName, downloadFileName) {
    if (file) {
        const downloadAll = document.createElement('button');
        downloadAll.innerText = buttonName;
        downloadAll.className = 'button';
        downloadAll.onclick = () => {
            const dataUrl = 'data:application/zip;base64,' + file;
            fetch(dataUrl).then(res => res.blob()).then(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = downloadFileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            });
        };
        return downloadAll;
    }
    return null;
}

function fillAdjustments(adjustmentsContainer, provider, desc, amount, viewPdfLink) {
    const newRow = document.createElement('div');
    newRow.style.display = 'block';

    // Create Description label and input
    const descriptionLabel = document.createElement('label');
    descriptionLabel.textContent = 'Description';
    descriptionLabel.classList.add('marginer');
    newRow.appendChild(descriptionLabel);

    const descriptionInput = document.createElement('input');
    descriptionInput.type = 'text';
    descriptionInput.setAttribute('id', provider);
    if (desc) {
        descriptionInput.value = desc;
        descriptionInput.readOnly = true;
        descriptionInput.classList.add('readOnly');
    }
    descriptionInput.classList.add('adjustmentDescription', 'marginer');
    newRow.appendChild(descriptionInput);

    // Create Amount label and input
    const amountLabel = document.createElement('label');
    amountLabel.textContent = 'Amount';
    amountLabel.classList.add('marginer');
    newRow.appendChild(amountLabel);

    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    if (amount) {
        amountInput.value = (amount / 100).toFixed(2);
        amountInput.readOnly = true;
        amountInput.classList.add('readOnly');
    }
    amountInput.classList.add('adjustmentAmount', 'marginer');
    // Add event listener to prevent arrow key from incrementing/decrementing
    amountInput.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
        }
    });

    newRow.appendChild(amountInput);

    const addButton = document.createElement('button');
    addButton.innerText = 'Add';
    if (desc) {
        addButton.innerText = 'Delete';
    }
    addButton.className = 'button';
    addButton.style.width = '80px';
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
                // Convert the amount to cents as an integer
                const amountInCents = Math.round(parseFloat(amount.replace('$', '')) * 100);
                storeAdjustments(provider, description, amountInCents);
                descriptionInput.readOnly = true;
                descriptionInput.style.color = 'grey';
                descriptionInput.classList.add('readOnly');
                amountInput.readOnly = true;
                amountInput.classList.add('readOnly');
                viewPdfLink.classList.add('disabled');
                fillAdjustments(adjustmentsContainer, provider, null, null, viewPdfLink);
                addButton.innerText = 'Delete';
            } else {
                displayErrors('Please enter a valid description and dollar amount with no more then 2 digital places.');
            }
        } else if (addButton.innerText === 'Delete') {
            if (description) {
                removeAdjustment(provider, description);
                viewPdfLink.classList.add('disabled');
                newRow.remove();
                addButton.innerText = 'Add';
            }
        }
    };
    addButton.classList.add('adjustmentAddButton', 'marginer');
    newRow.appendChild(addButton);
    adjustmentsContainer.appendChild(newRow);
}

function addAdjustmentsButtonHandler(provider, detailsButton, detailsContainer, viewPdfLink) {
    detailsButton.addEventListener('click', function () {
        if (detailsContainer.style.display === 'none') {
            detailsContainer.style.display = 'block';
            detailsButton.innerText = 'Hide Adjustments';
            const adjustments = getAdjustments(provider);
            if (adjustments && adjustments.length > 0) {
                adjustments.forEach(adjustment => {
                    fillAdjustments(detailsContainer, provider,
                        adjustment.description, adjustment.amount, viewPdfLink);
                });
            }
            fillAdjustments(detailsContainer, provider, null, null, viewPdfLink)
        } else {
            detailsContainer.style.display = 'none';
            detailsButton.innerText = 'Add Adjustments';
            detailsContainer.innerHTML = '';
        }
    });
}

function addEmailButtonHandler(mailButton, companyDetails, pracDetails) {
    mailButton.addEventListener('click', function () {
        console.log("Found " + companyDetails.Email + " " + companyDetails.Active + " " + pracDetails.Email)
        if (!companyDetails.Active) {
            displayErrors("Can not email as company email address " + companyDetails.Email + " has not been verified")
        }
        else if (!pracDetails.Email.trim()) {
            displayErrors("Can not email as provider email is blank")
        }
    });
}
