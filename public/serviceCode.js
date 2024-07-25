import { auth, setUser, clinicId, currentUser } from './firebase.js';
import {
    islogoutButtonPressed,
    resetlogoutButtonPressed,
    showLoginScreen,
    showUser
} from './footer.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getServiceCodes, setServiceCodes } from './firebase.js';

onAuthStateChanged(auth, (user) => {
    if (user) {
        setUser(user);
        //const details = JSON.stringify(user, null, '  ');
        //alert(`${details}`)
        showUser(user)
        populateServiceCodes();
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

let table = document.getElementById('servicesTable');
let tableBody = table.getElementsByTagName('tbody')[0];

table.addEventListener('input', function () {

    // Get the last row in the table
    let lastRow = tableBody.rows[tableBody.rows.length - 1];

    // Check if all cells in the last row are filled in
    //let allCellsFilled = Array.from(lastRow.cells).every(cell => cell.textContent.trim() !== '');
    let allCellsFilled = lastRow.cells[0].textContent.trim() !== '';
    // If all cells are filled, add a new row
    if (allCellsFilled) {
        insertServiceCodeRow(tableBody)
    }
});

table.addEventListener('click', function (event) {
    // Check if the clicked element is a delete button
    if (event.target.tagName === 'BUTTON' && event.target.textContent === 'Delete') {
        // Get the row that the delete button is in
        let row = event.target.parentNode.parentNode;

        // Delete the row
        tableBody.removeChild(row);
    }
});

async function populateServiceCodes() {
    let data = [
        { id: 'EPC', description: 'EPC Items' },
        { id: 'UVB', description: 'Ultraviolet Phototherapy' },
        { id: 'DEF', description: 'Default' },
        // more data...
    ];
    let cId = localStorage.getItem(clinicId);
    const result = await getServiceCodes(currentUser.email, cId);
    if (result.error) {
        alert(`Error getting service codes: ${result.error}`);
    }
    if (result.data && result.data.length > 0) {
        data = result.data;
    }
    let tableBody = document.getElementById('servicesTable').getElementsByTagName('tbody')[0];

    data.forEach(item => {
        let words = item.itemList ? item.itemList.filter(str => str.trim().indexOf(' ') === -1) : [];
        let sentences = item.itemList ? item.itemList.filter(str => str.trim().indexOf(' ') !== -1) : [];

        let itemListString = words.join(', ');
        insertServiceCodeRow(tableBody, item.id, item.description, itemListString);
        if (sentences.length > 0) {
            fillNoItems(sentences, item.id, data);
        }
    });
    insertServiceCodeRow(tableBody, "", "", "");
}

function insertServiceCodeRow(tableBody, code, description, itemList) {
    let row = tableBody.insertRow();

    let cell1 = row.insertCell();
    cell1.contentEditable = "true";
    cell1.textContent = code;

    let cell2 = row.insertCell();
    cell2.contentEditable = "true";
    cell2.textContent = description;

    let cell3 = row.insertCell();
    cell3.contentEditable = "true";
    cell3.textContent = itemList;

    let cell4 = row.insertCell();
    cell4.className = "no-background";
    let deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    cell4.appendChild(deleteButton);
}

const itemRow = 'itemRow';
const itemForm = 'item-form';

function fillNoItems(missingItems, theCode, serviceCodes) {

    for (const item of missingItems) {
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
        nameLabel.style.marginLeft = '10px';
        nameLabel.style.marginRight = '10px';
        nameLabel.style.width = 'auto';
        //nameLabel.style.border = '1px solid black';
        nameLabel.textContent = item;
        itemGroup.appendChild(nameLabel);

        // Create a drop down element
        const selectElement = document.createElement('select');
        selectElement.style.marginLeft = '15px';
        selectElement.style.minWidth = '100px';

        for (const serviceCode of serviceCodes) {
            const optionElement = document.createElement('option');
            optionElement.value = serviceCode.id;
            optionElement.textContent = serviceCode.id;
            selectElement.appendChild(optionElement);
        }
        //
        // Does that service code still exist?
        //
        const exists = serviceCodes.some(element => element.id === theCode);
        if (exists) {
            selectElement.value = theCode;
        } else {
            const defaultOptionElement = document.createElement('option');
            defaultOptionElement.value = '';
            defaultOptionElement.textContent = 'Please Select';
            selectElement.insertBefore(defaultOptionElement, selectElement.firstChild);
        }

        itemGroup.appendChild(selectElement);
        // Create Delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.style.marginLeft = '10px';
        deleteButton.addEventListener('click', function () {
            section.remove();
        });

        itemGroup.appendChild(deleteButton);
        section.appendChild(itemGroup);

        const nameEntry = document.getElementById(itemForm);
        nameEntry.appendChild(section);
    }
}

// Handle the submit button click
submitButton.addEventListener('click', async (e) => {
    e.preventDefault();

    // Remove all highlights
    let highlightedRows = tableBody.querySelectorAll('tr.highlight');
    highlightedRows.forEach(row => row.classList.remove('highlight'));
    errorBox.textContent = ""; // Clear the error message

    let numberMap = new Map(); // Map to store each number and its associated service code
    let serviceCodesMap = new Map();

    try {
        let serviceCodes = Array.from(tableBody.rows)
            .filter(row => {
                let cell0 = row.cells[0].textContent.trim();
                let cell1 = row.cells[1].textContent.trim();
                if (cell0 !== "" && cell1 === "") {
                    row.classList.add('highlight'); // Add class to highlight row
                    throw new Error('Description cannot be empty if a code is provided');
                }
                //
                // split the comma sperated string into an array of numbers
                // tha must all be positive numbers
                //
                let cell2 = row.cells[2].textContent.trim();
                cell2 = row.cells[2].textContent.trim().replace(/(^,)|(,$)/g, '');
                let itemList = getItemList(row);
                //
                // Check if each item in the itemList is unique across all service codes
                itemList.forEach(num => {
                    if (numberMap.has(num)) {
                        row.classList.add('highlight'); // Add class to highlight row
                        throw new Error(`Number ${num} in this row already exists under service code ${numberMap.get(num)}`);
                    }
                    numberMap.set(num, cell0); // Add the number and its associated service code to the map
                });
                if (cell0 !== "" && cell1 !== "") {
                    serviceCodesMap.set(cell0, {
                        id: cell0,
                        description: cell1,
                        itemList: itemList
                    });
                }
            });

        // Iterate over each item group in the item form
        const itemGroups = document.getElementById(itemForm).querySelectorAll('.' + itemRow);
        itemGroups.forEach(group => {
            const selectedServiceCode = group.querySelector('select').value; // Get the selected service code
            const nameLabel = group.querySelector('.name-label').textContent; // Get the name label text
            if (serviceCodesMap.has(selectedServiceCode)) {
                let serviceCodeObj = serviceCodesMap.get(selectedServiceCode);
                if (!serviceCodeObj.itemList.includes(nameLabel)) {
                    serviceCodeObj.itemList.push(nameLabel);
                }
            } else {
                console.log(`Service code ${selectedServiceCode} does not exist in the map.`);
            }
        });

        let cId = localStorage.getItem(clinicId);
        const userId = currentUser.email;
        const errorMsg = await setServiceCodes(userId, cId, serviceCodesMap)
        if (errorMsg) {
            alert(`Error setting service codes: ${errorMsg}`);
        } else {
            entryComplete();
        }
    } catch (error) {
        errorBox.textContent = error.message; // Display the error message
    }
});

function getItemList(row) {
    let cell2 = row.cells[2].textContent.trim().replace(/(^,)|(,$)/g, '');
    let wordSet = new Set();
    if (cell2 !== "") {
        let stringArray = cell2.split(',');
        // Map to trimmed strings and add to the set to ensure uniqueness
        stringArray.forEach(word => wordSet.add(word.trim()));
    }
    return Array.from(wordSet); // Convert the set back to an array
}

cancelButton.addEventListener('click', async (e) => {
    e.preventDefault();
    entryComplete();
});

function entryComplete() {
    window.location.href = '/dashboard.html';
}
