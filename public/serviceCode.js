import { auth, setUser, currentUser, clinicId } from './firebase.js';
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
        // more data...
    ];
    let cId = localStorage.getItem(clinicId);
    const result = await getServiceCodes(currentUser.uid, cId);
    if (result.error) {
        alert(`Error getting service codes: ${result.error}`);
    }
    if (result.data && result.data.length > 0) {
        data = result.data;
    }
    let tableBody = document.getElementById('servicesTable').getElementsByTagName('tbody')[0];

    data.forEach(item => {
        let itemListString = item.itemList ? item.itemList.join(', ') : '';
        insertServiceCodeRow(tableBody, item.id, item.description, itemListString);
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

// Handle the submit button click
submitButton.addEventListener('click', async (e) => {
    e.preventDefault();

    // Remove all highlights
    let highlightedRows = tableBody.querySelectorAll('tr.highlight');
    highlightedRows.forEach(row => row.classList.remove('highlight'));
    errorBox.textContent = ""; // Clear the error message

    let numberMap = new Map(); // Map to store each number and its associated service code

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
                let allNumbers = itemList.every(num => Number.isFinite(num) && num > 0);
                if (!allNumbers) {
                    row.classList.add('highlight'); // Add class to highlight row
                    throw new Error('All item numbers must be positive numbers');
                }
                // Check if each number in the itemList is unique across all service codes
                itemList.forEach(num => {
                    if (numberMap.has(num)) {
                        row.classList.add('highlight'); // Add class to highlight row
                        throw new Error(`Number ${num} in this row already exists under service code ${numberMap.get(num)}`);
                    }
                    numberMap.set(num, cell0); // Add the number and its associated service code to the map
                });
                return cell0 !== "" && cell1 !== "";
            })
            .map(row => ({
                id: row.cells[0].textContent,
                description: row.cells[1].textContent,
                itemList: getItemList(row)
            }));

        let cId = localStorage.getItem(clinicId);
        const userId = currentUser.uid;
        const errorMsg = await setServiceCodes(userId, cId, serviceCodes)
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
    let numberArray = [];
    if (cell2 !== "") {
        let stringArray = cell2.split(',');
        numberArray = [...new Set(stringArray.map(Number))];
    }
    return numberArray;
}

cancelButton.addEventListener('click', async (e) => {
    e.preventDefault();
    entryComplete();
});

function entryComplete() {
    window.location.href = '/dashboard.html';
}
