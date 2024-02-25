import { auth, setUser, currentUser, db, getClinics } from './firebase.js';
import { 
    islogoutButtonPressed, 
    resetlogoutButtonPressed, 
    showLoginScreen, 
    showUser
} from './footer.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { updateDoc, setDoc, getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

submitButton.addEventListener('click', () => {
    window.location.href = '/dashboard.html';
});

let table = document.getElementById('servicesTable');
let tableBody = table.getElementsByTagName('tbody')[0];

table.addEventListener('input', function() {
    // Get the last row in the table
    let lastRow = tableBody.rows[tableBody.rows.length - 1];

    // Check if all cells in the last row are filled in
    let allCellsFilled = Array.from(lastRow.cells).every(cell => cell.textContent.trim() !== '');

    // If all cells are filled, add a new row
    if (allCellsFilled) {
        insertBlankRow(tableBody)
    }
});

table.addEventListener('click', function(event) {
    // Check if the clicked element is a delete button
    if (event.target.tagName === 'BUTTON' && event.target.textContent === 'Delete') {
        // Get the row that the delete button is in
        let row = event.target.parentNode.parentNode;

        // Delete the row
        tableBody.removeChild(row);
    }
});

function populateServiceCodes() {
    let data = [
        { code: 'EPC', description: 'EPC Items' },
        { code: 'UVB', description: 'Ultraviolet Phototherapy' },
        // more data...
    ];
    let tableBody = document.getElementById('servicesTable').getElementsByTagName('tbody')[0];

    data.forEach(item => {
        let row = tableBody.insertRow();

        let cell1 = row.insertCell();
        cell1.textContent = item.code;
        cell1.contentEditable = "true";

        let cell2 = row.insertCell();
        cell2.textContent = item.description;
        cell2.contentEditable = "true";

        let cell3 = row.insertCell();
        let deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        cell3.appendChild(deleteButton);    
    });
    insertBlankRow(tableBody);
}

function insertBlankRow(tableBody) {
    let row = tableBody.insertRow();

    let cell1 = row.insertCell();
    cell1.contentEditable = "true";

    let cell2 = row.insertCell();
    cell2.contentEditable = "true";

    let cell3 = row.insertCell();
    let deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    cell3.appendChild(deleteButton);    
}