import { auth, setUser, currentUser, db, getClinics } from './firebase.js';
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
    let allCellsFilled = Array.from(lastRow.cells).every(cell => cell.textContent.trim() !== '');

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
    let clinicId = localStorage.getItem('clinicId');
    let oldData = await getServiceCodes(currentUser.uid, clinicId);
    if (oldData) {
        data = oldData;
    }
    let tableBody = document.getElementById('servicesTable').getElementsByTagName('tbody')[0];

    data.forEach(item => {
        insertServiceCodeRow(tableBody, item.id, item.description);
    });
    insertServiceCodeRow(tableBody, "", "");
}

function insertServiceCodeRow(tableBody, code, description) {
    let row = tableBody.insertRow();

    let cell1 = row.insertCell();
    cell1.contentEditable = "true";
    cell1.textContent = code;

    let cell2 = row.insertCell();
    cell2.contentEditable = "true";
    cell2.textContent = description;

    let cell3 = row.insertCell();
    let deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    cell3.appendChild(deleteButton);
}

// Handle the submit button click
submitButton.addEventListener('click', async (e) => {
    e.preventDefault();

    let serviceCodes = Array.from(tableBody.rows)
        .filter(row => row.cells[0].textContent.trim() !== "" && row.cells[1].textContent.trim() !== "")
        .map(row => ({
            id: row.cells[0].textContent,
            description: row.cells[1].textContent
        }));

    let clinicId = localStorage.getItem('clinicId');
    const userId = currentUser.uid;
    await setServiceCodes(userId, clinicId, serviceCodes)

    window.location.href = '/dashboard.html';
});
