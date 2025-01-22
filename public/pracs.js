import {
    auth, setUser, currentUser, setProviders, getPractitioners, getServiceCodes, clinicId,
    getStore, clearStore,
    missingProvidersKey, missingServiceCodes,
    parseValidFloat, createEntryField, leftMargin, bottomMargin
} from './firebase.js';
import {
    islogoutButtonPressed,
    resetlogoutButtonPressed,
    showLoginScreen,
    showUser
} from './footer.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

onAuthStateChanged(auth, (user) => {
    if (user) {
        setUser(user);
        showUser(user)
        populatePracs();
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

let serviceCodes
function populatePracs() {
    const cId = getStore(clinicId);
    const userId = currentUser.email;
    getPractitioners(userId, cId).then((lstProviders) => {
        if (lstProviders.error) {
            alert(lstProviders.error);
        }
        getServiceCodes(currentUser.email, cId).then((lstServiceCodes) => {
            if (lstServiceCodes.error) {
                alert(lstServiceCodes.error);
            }
            serviceCodes = lstServiceCodes.data
            if (lstProviders && lstProviders.data.length > 0) {
                for (const [index, provider] of lstProviders.data.entries()) {
                    let serviceMap = []
                    if (provider.services) {
                        serviceMap = provider.services.reduce((map, service) => {
                            map[service.id] = service.value;
                            return map;
                        }, {});
                    }
                    fillPracs(provider.id, provider.name, provider, serviceMap, false)
                }
            }
            populateMissingPracs();
            highlightMissingServiceCodes();
            fillPracs(null, null, null, null, false)
        });
    })
}

function populateMissingPracs() {
    const missing = getStore(missingProvidersKey);
    if (missing && missing !== 'null' && missing !== 'undefined') {
        displayErrors("Please complete providers details")
        const missingProviders = JSON.parse(missing);
        if (missingProviders && Object.keys(missingProviders).length > 0) {
            for (const key of Object.keys(missingProviders)) {
                fillPracs(null, key, null, null, true)
            }
        }
    }
    clearStore(missingProvidersKey);
}

function highlightMissingServiceCodes() {
    const missing = getStore(missingServiceCodes);
    if (missing && missing !== 'null' && missing !== 'undefined') {
        const missingProvidersServiceCodes = JSON.parse(missing);
        if (missingProvidersServiceCodes && Object.keys(missingProvidersServiceCodes).length > 0) {
            for (const key of Object.keys(missingProvidersServiceCodes)) {
                const providerRows = document.getElementsByClassName('providerRow');
                for (let i = 0; i < providerRows.length; i++) {
                    const nameInput = providerRows[i].getElementsByClassName('name-input')[0];
                    if (nameInput.value === key) {
                        const serviceCodeInputs = providerRows[i].getElementsByClassName('service-code');
                        const serviceNumbers = providerRows[i].getElementsByClassName('percentage-number');
                        for (let j = 0; j < serviceCodeInputs.length; j++) {
                            if (serviceCodeInputs[j].id in missingProvidersServiceCodes[key]) {
                                serviceCodeInputs[j].style.backgroundColor = 'yellow';
                                serviceNumbers[j].style.backgroundColor = 'yellow';
                            }
                        }
                    }
                }
            }
        }
    }
    clearStore(missingServiceCodes);
}

const providerRow = 'providerRow';
const serviceCodeEntry = 'service-code-entry';
const providerForm = 'provider-form';
const idField = 'data-id';
const submitButton = document.getElementById('submitButton');
const cancelButton = document.getElementById('cancelButton');

function fillPracs(pid, pname, details, servicesMap, showAddress) {
    const section = document.createElement('div');
    section.style.display = 'flex';
    section.style.flexWrap = 'wrap';
    section.classList.add(providerRow, 'row');

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.classList.add('name-input');
    nameInput.classList.add(bottomMargin);
    if (pname) {
        nameInput.value = pname;
        if (showAddress) {
            nameInput.style.backgroundColor = 'yellow';
        }
    }
    nameInput.setAttribute(idField, pid);
    section.appendChild(nameInput);

    // Create a new input element for service code
    const serviceCodeInput = addServiceCode(servicesMap);
    section.appendChild(serviceCodeInput);

    // Create a new button element
    const buttonElement = document.createElement('button');
    buttonElement.textContent = 'Delete';
    buttonElement.classList.add('delete', 'button', leftMargin, bottomMargin);
    addDeleteButtonHandler(buttonElement, pid);
    section.appendChild(buttonElement);

    // show address details
    const detailsButton = document.createElement('button');
    detailsButton.textContent = 'Show Details';
    detailsButton.classList.add('details', 'button', leftMargin, bottomMargin);
    section.appendChild(detailsButton);

    const addressContainer = addAddressEntry(details, showAddress);
    serviceCodeInput.parentNode.insertBefore(addressContainer, detailsButton.nextSibling);
    addDetailsButtonHandler(detailsButton, addressContainer);

    const nameEntry = document.getElementById(providerForm);
    nameEntry.appendChild(section);

    // Apply alternating background colors
    const rows = nameEntry.getElementsByClassName('row');
    alternatingBackgroundColours(rows)
 
    const blankLine = document.createElement('div');
    blankLine.classList.add(bottomMargin);
    nameEntry.appendChild(blankLine);
}

function alternatingBackgroundColours(rows)
{
    for (let i = 0; i < rows.length; i++) {
        rows[i].classList.remove('even-row', 'odd-row');
        if (i % 2 === 0) {
            rows[i].classList.add('even-row');
        } else {
            rows[i].classList.add('odd-row');
        }
    }
}

function addDetailsButtonHandler(detailsButton, addressDetailsContainer) {
    detailsButton.addEventListener('click', function () {
        if (addressDetailsContainer.style.display === 'none') {
            addressDetailsContainer.style.display = 'block';
            detailsButton.innerText = 'Hide Details';
        } else {
            addressDetailsContainer.style.display = 'none';
            detailsButton.innerText = 'Show Details';
        }
    });
}

function addDeleteButtonHandler(deleteButton, id) {
    deleteButton.addEventListener('click', async () => {
        const sections = Array.from(form.getElementsByClassName(providerRow));
        const sectionToDelete = sections.find(section => {
            const nameInput = section.querySelector('.name-input');
            return nameInput && nameInput.getAttribute(idField) === id;
        });
        if (sectionToDelete) {
            sectionToDelete.parentElement.removeChild(sectionToDelete);
            const rows = form.getElementsByClassName(providerRow);
            alternatingBackgroundColours(rows)

        } else {
            alert('Please select valid provider to delete');
        }
    });
}

function addServiceCode(servicesMap) {
    const newSection = document.createElement('div');
    newSection.classList.add(serviceCodeEntry);

    for (const id in serviceCodes) {
        const inputContainer = document.createElement('div');
        inputContainer.style.display = 'inline-block';

        const serviceCodeInput = document.createElement('label');
        serviceCodeInput.classList.add('service-code');
        serviceCodeInput.classList.add(bottomMargin, leftMargin);
        serviceCodeInput.textContent = serviceCodes[id].id + "-" + serviceCodes[id].description;
        serviceCodeInput.setAttribute('id', serviceCodes[id].id);
        inputContainer.appendChild(serviceCodeInput);

        const newServiceNumber = document.createElement('input');
        newServiceNumber.type = 'number';
        newServiceNumber.classList.add('percentage-number');
        newServiceNumber.classList.add(bottomMargin, leftMargin);
        newServiceNumber.value = servicesMap && servicesMap[serviceCodes[id].id] !== undefined ? servicesMap[serviceCodes[id].id] : '';
        // Add event listener to prevent arrow key from incrementing/decrementing
        newServiceNumber.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
            }
        });
        inputContainer.appendChild(newServiceNumber);

        const percentageSymbol = document.createElement('span');
        percentageSymbol.textContent = ' %';
        percentageSymbol.classList.add(bottomMargin);
        inputContainer.appendChild(percentageSymbol);
        newSection.appendChild(inputContainer);
    }
    return newSection;
}

const addressForm = 'address-form';
function addAddressEntry(details, showAddress) {
    const section = document.createElement('div');
    section.style.display = 'inline-block';
    section.classList.add(addressForm);
    if (!showAddress) {
        section.style.display = 'none'; // Initially hidden
    }
    if (details) {
        addAddressDetail(section, details.entity, details.street, details.burb, details.email, details.abn)
    } else {
        addAddressDetail(section, '', '', '', '', '')
    }
    return section
}

function addAddressDetail(parent, entity, street, suburb, email, abn) {
    createEntryField(parent, "entity", "Invoicing Entity", entity, false)
    createEntryField(parent, "street", "Street Nr and Name", street)
    createEntryField(parent, "burb", "Suburb, State, Postcode", suburb)
    createEntryField(parent, "email", "Email", email)
    createEntryField(parent, "abn", "ABN", abn)
}

const form = document.getElementById(providerForm);
document.addEventListener('input', function (e) {
    // If the input event was triggered by a name input field
    if (e.target.classList.contains('name-input')) {

        const section = e.target.closest('.providerRow');
        // Get all 'section' elements
        const sections = form.getElementsByClassName(providerRow);
        const lastSection = sections[sections.length - 1];

        // If the input is filled in and the section is the last one
        if (e.target.value && section === lastSection) {
            fillPracs(null, null, null, null, false);
        }
    }
});

submitButton.addEventListener('click', async (e) => {
    e.preventDefault();
    const providerRows = document.getElementsByClassName(providerRow);
    const providers = [];

    const nameSet = new Set();
    let clearToClear = true;
    for (let i = 0; i < providerRows.length; i++) {
        const nameInput = providerRows[i].getElementsByClassName('name-input')[0];
        const pracName = nameInput.value.trim();
        // The last row will always be empty
        if (pracName !== '') {
            const noSpaceName = pracName.replace(/\s+/g, '');
            if (nameSet.has(noSpaceName)) {
                alert(`Duplicate provider name found: ${pracName}`);
                return;
            }
            nameSet.add(noSpaceName);

            let idValue = nameInput.getAttribute('data-id');
            idValue = (idValue === 'null' || idValue === null) ? '' : idValue;
            const entity = providerRows[i].getElementsByClassName('entity')[0].value.trim();
            const street = providerRows[i].getElementsByClassName('street')[0].value.trim();
            const burb = providerRows[i].getElementsByClassName('burb')[0].value.trim();
            const email = providerRows[i].getElementsByClassName('email')[0].value.trim();
            const abn = providerRows[i].getElementsByClassName('abn')[0].value.trim();

            const providerData = {
                id: idValue,
                name: pracName,
                entity: entity,
                street: street,
                burb: burb,
                email: email,
                abn: abn,
                services: []
            };

            const serviceCodeInputs = providerRows[i].getElementsByClassName('service-code');
            const serviceNumbers = providerRows[i].getElementsByClassName('percentage-number');

            for (let j = 0; j < serviceCodeInputs.length; j++) {
                const value = serviceNumbers[j].value;
                if (value !== '') {
                    const numericValue = parseValidFloat(value, 2, 0, 100);
                    if (isNaN(numericValue)) {
                        // Highlight the field with the error
                        serviceNumbers[j].style.backgroundColor = 'red';
                        displayErrors(`Error: Service number value must be blank or between 0 and 100. Found: ${value}`);
                        notError = false;
                        clearToClear = false;
                    } else {
                        serviceNumbers[j].style.backgroundColor = '';
                        providerData.services.push({
                            id: serviceCodeInputs[j].id,
                            value: value
                        });
                    }
                }
            }
            providers.push(providerData);
        }
    }
    const cId = getStore(clinicId);
    const userId = currentUser.email;
    setProviders(userId, cId, providers)
        .then(() => { if (clearToClear) { entryComplete() } })
        .catch(error => displayErrors(`Error setting practitioners: ${error}`));
});

cancelButton.addEventListener('click', async (e) => {
    e.preventDefault();
    entryComplete();
});

function entryComplete() {
    window.location.href = '/dashboard.html';
}
function displayErrors(error) {
    messageOutput.innerText = error
    messageOutput.style.color = 'red';
}
