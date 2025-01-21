import {
    auth, setUser, currentUser, getServiceCodes,
    updateItemNumbers, clinicId,
    getStore, clearStore,
    missingItemsKey, noItemNrs
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
        populateItems();
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

let itemMissing = false;
let noItemNrsMissing = false;
function populateItems() {

    let missingItems;
    let noItemNrsItems;
    ({ isMissing: itemMissing, items: missingItems } = checkForMissingStuff(missingItemsKey));
    ({ isMissing: noItemNrsMissing, items: noItemNrsItems } = checkForMissingStuff(noItemNrs));

    if (itemMissing || noItemNrsMissing) {
        const cId = getStore(clinicId);
        getServiceCodes(currentUser.email, cId).then((lstServiceCodes) => {
            if (lstServiceCodes.error) {
                alert(lstServiceCodes.error);
            }
            const serviceCodes = lstServiceCodes.data

            if (itemMissing) {
                fillItems(missingItems, serviceCodes)
                clearStore(missingItemsKey);
            }
            if (noItemNrsMissing) {
                fillItems(noItemNrsItems, serviceCodes)
                clearStore(noItemNrs);
            }
        });
    } else {
        entryComplete();
    }
}

function checkForMissingStuff(stuff) {
    const missing = getStore(stuff);
    if (missing && missing !== 'null' && missing !== 'undefined') {
        const missingItems = JSON.parse(missing);
        if (missingItems && Object.keys(missingItems).length > 0) {
            return { isMissing: true, items: missingItems };
        }
    }
    return { isMissing: false, items: null };
}

const itemRow = 'itemRow';
const itemForm = 'item-form';
const submitButton = document.getElementById('submitButton');
const cancelButton = document.getElementById('cancelButton');

function fillItems(missingItems, serviceCodes) {

    for (const key of Object.keys(missingItems)) {
        const section = document.createElement('div');
        section.classList.add(itemRow);
        section.style.display = 'flex';
        section.style.flexWrap = 'wrap';
        section.style.justifyContent = 'space-between';

        const itemGroup = document.createElement('div');
        itemGroup.style.display = 'flex';
        itemGroup.style.alignItems = 'center';
        itemGroup.style.marginBottom = '10px';

        const nameLabel = document.createElement('label');
        nameLabel.className = 'name-label';
        nameLabel.style.marginRight = '10px';
        nameLabel.style.minWidth = '7ch';
        nameLabel.style.width = 'auto';
        //nameLabel.style.border = '1px solid black';
        nameLabel.textContent = key;
        itemGroup.appendChild(nameLabel);

        // Create a drop down element
        const selectElement = document.createElement('select');
        selectElement.style.marginLeft = '10px';
        const defaultOptionElement = document.createElement('option');
        defaultOptionElement.value = '';
        defaultOptionElement.textContent = 'Please Select';
        selectElement.appendChild(defaultOptionElement);

        for (const serviceCode of serviceCodes) {
            const optionElement = document.createElement('option');
            optionElement.value = serviceCode.id;
            optionElement.textContent = serviceCode.id;
            selectElement.appendChild(optionElement);
        }
        itemGroup.appendChild(selectElement);

        section.appendChild(itemGroup);

        const nameEntry = document.getElementById(itemForm);
        nameEntry.appendChild(section);
    }
}
submitButton.addEventListener('click', function (e) {
    e.preventDefault();
    const rows = document.querySelectorAll('.itemRow');
    let serviceCodes = Array.from(rows).map(row => {
        const selectElement = row.querySelector('select');
        const serviceCode = selectElement.value;

        // Only add the row if a service code is selected and it isn't the initial "Please Select" value
        if (selectElement.selectedIndex > 0) {
            const itemNumber = row.querySelector('.name-label').textContent;
            return {
                id: serviceCode,
                description: '',
                itemList: [itemNumber]
            };
        }
    }).filter(Boolean); // Remove undefined values

    const cId = getStore(clinicId);
    updateItemNumbers(currentUser.email, cId, serviceCodes)
        .then(() => entryComplete())
        .catch(error => alert(`Error setting practitioners: ${error}`));

});

cancelButton.addEventListener('click', async (e) => {
    e.preventDefault();
    entryComplete();
});

function entryComplete() {
    window.location.href = '/dashboard.html';
}

