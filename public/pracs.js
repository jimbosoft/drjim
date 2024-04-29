import { auth, setUser, currentUser, setPractitioners, getPractitioners } from './firebase.js';
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
        //addServiceCode();
        //populatePracs();
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

const providerSection = 'provider-section';
const providerName = 'provider-name';
const providerForm = 'provider-form';
const pracId = 'pracId';
const practitionersForm = 'practitioners-form';
const submitButton = document.getElementById('submitButton');
const cancelButton = document.getElementById('cancelButton');

function populatePracs() {
    const clinicId = localStorage.getItem('clinicId');
    const userId = currentUser.uid;
    getPractitioners(userId, clinicId).then((lstProviders) => {
        if (lstProviders.error) {
            alert(lstProviders.error);
        }
        const namesList = document.getElementById('names');

 /*        for (const provider of lstProviders.data) {
            const li = document.createElement('li');
            li.textContent = provider.name; // Assuming provider is a string
            // Store the ID of the provider in the data-id attribute
            li.setAttribute('data-id', provider.id); // Assuming provider is an object with an id property

            // Add an event listener to the list item
            li.addEventListener('click', function () {
                // Remove the 'highlight' class from all list items
                const listItems = namesList.getElementsByTagName('li');
                for (let i = 0; i < listItems.length; i++) {
                    listItems[i].classList.remove('highlight');
                }

                // Add the 'highlight' class to the clicked list item
                this.classList.add('highlight');

                // Notify your JavaScript code that a list item was clicked
                console.log(`List item clicked: ${this.textContent}`);
            });
            namesList.appendChild(li);
        }
 */    });
}
document.addEventListener('input', function (event) {
    // If the input event was triggered by a name input field
    if (event.target.classList.contains('name-input')) {
        if (event.target.value.length === 1) {
            const nameEntry = event.target.parentElement;
            const nameList = nameEntry.parentElement;

            // Create a new name entry
            const newNameEntry = document.createElement('div');
            newNameEntry.classList.add('name-entry');
            newNameEntry.innerHTML = `
            <input type="text" class="name-input" placeholder="Enter new name">
            <select class="service-code"></select>
            <input type="number" class="percentage-number">
            <span>%</span>
            <button>Delete</button>      
        `;

            // Append the new name entry to the name list
            nameList.appendChild(newNameEntry);
        }
    }

    // If the input event was triggered by a service number input field
    else if (event.target.classList.contains('percentage-number')) {
        if (event.target.value.length === 1) {
            const nameEntry = event.target.parentElement;
            const deleteButton = nameEntry.querySelector('button');

            // Create a new service code dropdown and number input field
            const newServiceCode = document.createElement('select');
            newServiceCode.classList.add('service-code');

            const newServiceNumber = document.createElement('input');
            newServiceNumber.type = 'number';
            newServiceNumber.classList.add('percentage-number');
            const percentageSymbol = document.createElement('span');
            percentageSymbol.textContent = ' %';
                        // Append the new service code dropdown and number input field to the name entry
            nameEntry.insertBefore(newServiceCode, deleteButton);
            nameEntry.insertBefore(newServiceNumber, deleteButton);
            nameEntry.insertBefore(percentageSymbol, deleteButton);
        }
    }
});

function addServiceCode() {
    const serviceCodes = document.getElementById('service-codes');
    const template = document.getElementById('service-code-template');
    const clone = template.content.cloneNode(true);

    const input = clone.querySelector('input');
    input.addEventListener('blur', function () {
        if (this.value !== '' && this.parentNode.nextSibling === null) {
            addServiceCode();
        }
    });

    input.addEventListener('input', function () {
        if (this.value <= 0) {
            this.value = '';
        }
    });

    const button = clone.querySelector('button');
    button.addEventListener('click', function () {
        serviceCodes.removeChild(this.parentNode);
    });

    serviceCodes.appendChild(clone);
}

submitButton.addEventListener('click', async (e) => {
    e.preventDefault();

    const listItems = document.querySelectorAll('#names li');
    // Create an array of the text content of the list items
    const providers = Array.from(listItems).map(li =>
    ({
        name: li.textContent.trim(),
        id: li.getAttribute('data-id')
    }));
    const clinicId = localStorage.getItem('clinicId');
    const userId = currentUser.uid;
    setPractitioners(userId, clinicId, providers)
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

