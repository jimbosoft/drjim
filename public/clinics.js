import { auth, setUser, currentUser, getClinics, setClinics, 
    createEntryField, leftMargin, bottomMargin } from './firebase.js';
import {
    islogoutButtonPressed,
    resetlogoutButtonPressed,
    showLoginScreen,
    showUser
} from './footer.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { clinicId } from './storage.js';

onAuthStateChanged(auth, (user) => {
    if (user) {
        setUser(user);
        showUser(user)
        populateClinic();
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

function populateClinic() {

    getClinics(currentUser.email).then((result) => {
        if (result.error) {
            alert(result.error);
        }
        const clinics = result.data;
        if (clinics) {
            for (const [index, clinic] of clinics.entries()) {
                createCompanyAddressSection(index, clinic.id, clinic.name, clinic.address, clinic.abn,
                    clinic.postcode, clinic.email, clinic.accountingLine);
            }
        }
        addBlankClinicAtBottom()
    });
}

const addressSection = 'company-address-section'
function addBlankClinicAtBottom() {
    const currentSections = form.getElementsByClassName(addressSection);
    const nextIndex = currentSections.length;
    createCompanyAddressSection(nextIndex, null, null);
}

// Function to create a new company and address section
function createCompanyAddressSection(index, id, name, address, abn, postcode, email, accountingLine) {
    const section = document.createElement('div');
    section.classList.add(addressSection, 'row');

    // don't remove this, it stores the id in a invisible label
    const documentIdLabel = document.createElement('label');
    documentIdLabel.textContent = id;
    documentIdLabel.style.display = 'none';
    documentIdLabel.classList.add('docId');
    section.appendChild(documentIdLabel);
    section.appendChild(document.createElement('br'));

    const companyNameContainer = document.createElement('div');
    const companyNameLabel = document.createElement('label');
    companyNameLabel.textContent = 'Clinic Name:';
    companyNameContainer.appendChild(companyNameLabel);

    const companyNameInput = document.createElement('input');
    companyNameInput.type = 'text';
    companyNameInput.classList.add('companyName', leftMargin, bottomMargin);
    companyNameInput.name = 'companyName';
    if (name) {
        companyNameInput.value = name;
    }
    companyNameContainer.appendChild(companyNameInput);
    section.appendChild(companyNameContainer)

    createEntryField(section, "address", "Street Nr and Name", address, false)
    createEntryField(section, "postcode", "Suburb, State, Postcode", postcode)
    createEntryField(section, "email", "Email", email)
    createEntryField(section, "abn", "ABN", abn)

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.classList.add('delete', leftMargin, bottomMargin);
    companyNameContainer.appendChild(deleteButton);
    addDeleteButtonHandler(deleteButton, index, id);

    const div = document.getElementById('company-form');
    div.appendChild(section);
    // Apply alternating background colors
    const rows = div.getElementsByClassName('row');
    for (let i = 0; i < rows.length; i++) {
        if (i % 2 === 0) {
            rows[i].classList.add('even-row');
        } else {
            rows[i].classList.add('odd-row');
        }
    }
    
    const blankLine = document.createElement('div');
    blankLine.classList.add(bottomMargin);
    div.appendChild(blankLine);

    return section;
}

function addDeleteButtonHandler(deleteButton, index, id) {
    deleteButton.addEventListener('click', async () => {
        const sections = Array.from(form.getElementsByClassName(addressSection));
        if (index < sections.length - 1) {
            sections[index].parentElement.removeChild(sections[index]);
            if (localStorage.getItem(clinicId) === id) {
                localStorage.removeItem(clinicId)
            }
        } else {
            alert('Please select a filled in clinic to delete');
        }
    });
}

const form = document.getElementById('company-form');
form.addEventListener('input', (e) => {
    // If the target of the event is an address input
    if (e.target.classList.contains('companyName')) {
        // Get the parent section of the input
        const section = e.target.closest('.company-address-section');
        // Get all 'section' elements
        const sections = form.getElementsByClassName(addressSection);
        const lastSection = sections[sections.length - 1];

        // If the input is filled in and the section is the last one
        if (e.target.value && section === lastSection) {
            addBlankClinicAtBottom();
        }
    }
});

submitButton.addEventListener('click', async (e) => {
    e.preventDefault();

    // Get the form values, exclude empty fields
    const docNames = Array.from(form.getElementsByClassName('docId'), label => label.textContent);;
    const companyNames = Array.from(form.getElementsByClassName('companyName'), input => input.value.trim()).filter(value => value !== '');;
    const addresses = Array.from(form.getElementsByClassName('address'), input => input.value.trim()).filter(value => value !== '');
    const companyAbn = Array.from(form.getElementsByClassName('abn'), input => input.value.trim()).filter(value => value !== '');
    const companyPostcode = Array.from(form.getElementsByClassName('postcode'), input => input.value.trim()).filter(value => value !== '');
    const accountingLine = Array.from(form.getElementsByClassName('accountingLine'), input => input.value.trim()).filter(value => value !== '');
    const email = Array.from(form.getElementsByClassName('email'), input => input.value.trim()).filter(value => value !== '');

    // Check for duplicate company names
    const nameSet = new Set();
    for (const name of companyNames) {
        if (nameSet.has(name)) {
            alert(`Duplicate company name found: ${name}`);
            return; // Stop form submission
        }
        nameSet.add(name);
    }
    // Create an array of company and address objects
    const companies = companyNames.map((name, i) => ({
        docId: docNames[i], name: companyNames[i], address: addresses[i], abn: companyAbn[i],
        postcode: companyPostcode[i], accountingLine: accountingLine[i], email: email[i]
    }));
    let companiesArray = companies.map(company => ({
        id: company.docId,
        name: company.name || "",
        abn: company.abn || "",
        postcode: company.postcode || "",
        accountingLine: company.accountingLine || "",
        address: company.address || "",
        email: company.email || ""
    }));

    const userId = currentUser.email;
    const errorMsg = await setClinics(userId, companiesArray, currentUser.email);
    if (errorMsg) {
        alert(errorMsg);
    } else {
        entryComplete();
    }

    // Clear the form
    //form.innerHTML = '';
    //form.appendChild(createCompanyAddressSection());
});

cancelButton.addEventListener('click', async (e) => {
    e.preventDefault();
    entryComplete();
});

function entryComplete() {
    window.location.href = '/dashboard.html';
}
