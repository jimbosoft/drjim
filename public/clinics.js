import {
    auth, setUser, currentUser, getClinics, setClinics,
    createEntryField, leftMargin, bottomMargin,
    getLogo, setLogo, deleteStoreFile, startTrace, stopTrace,
    isEmailEnabled
} from './firebase.js';
import {
    islogoutButtonPressed,
    resetlogoutButtonPressed,
    showLoginScreen,
    showUser
} from './footer.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { clinicId } from './storage.js';
import { cloudServiceConfig } from './config.js';

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
                    clinic.postcode, clinic.email, clinic.emailActive,
                    clinic.invoicePrefix, clinic.invoiceNumber, clinic.invoicePostfix);
            }
        }
        addBlankClinicAtBottom()
    });
}

const addressSection = 'company-address-section'
function addBlankClinicAtBottom() {
    const currentSections = form.getElementsByClassName(addressSection);
    const nextIndex = currentSections.length;
    createCompanyAddressSection(nextIndex);
}

// Function to create a new company and address section
function createCompanyAddressSection(index, id, name, address, abn, postcode, email, emailActive,
                                    invoicePrefix, invoiceNumber, invoicePostfix
) {
    const section = document.createElement('div');
    section.classList.add(addressSection, 'row');

    // don't remove this, it stores the id in a invisible label
    const documentIdLabel = document.createElement('label');
    documentIdLabel.textContent = id;
    documentIdLabel.style.display = 'none';
    documentIdLabel.classList.add('docId');
    section.appendChild(documentIdLabel);

    const companyNameContainer = document.createElement('div');

    createEntryField(companyNameContainer, "companyName", 'Clinic Name:', name, false)
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.classList.add('delete', leftMargin, bottomMargin, 'button');
    companyNameContainer.appendChild(deleteButton);
    addDeleteButtonHandler(deleteButton, index, id);
    section.appendChild(companyNameContainer)

    createEntryField(section, "address", "Street Nr and Name", address, false)
    createEntryField(section, "postcode", "Suburb, State, Postcode", postcode)
    createEntryField(section, "abn", "ABN", abn)

    // Add Invoice Number fields
    const invoiceContainer = document.createElement('div');
    invoiceContainer.classList.add('invoice-number-container');
    createEntryField(invoiceContainer, "invoicePrefix", "Invoice Prefix", invoicePrefix, false);
    if (!invoiceNumber) {
        invoiceNumber = 1;
    }
    createEntryField(invoiceContainer, "invoiceNumber", "Invoice Number", invoiceNumber, true, 'number');
    createEntryField(invoiceContainer, "invoicePostfix", "Invoice Postfix", invoicePostfix, true);
    section.appendChild(invoiceContainer);

    addEmail(section, index, email, emailActive)
    section.appendChild(addLogo(id));
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

function addLogo(id) {
    // Create a container for the logo upload
    const logoContainer = document.createElement('div');
    logoContainer.classList.add('logo-upload-container');

    // Create a label for the file input
    const logoLabel = document.createElement('label');
    logoLabel.textContent = 'Upload Logo (PNG, max 2MB):';
    logoLabel.classList.add('bottom-margin');
    logoContainer.appendChild(logoLabel);

    // Create the file input element
    const logoInput = document.createElement('input');
    logoInput.type = 'file';
    logoInput.accept = 'image/png';
    logoInput.classList.add('left-margin', 'bottom-margin');
    logoContainer.appendChild(logoInput);

    // Create an img element to display the logo
    const logoPreview = document.createElement('img');
    logoPreview.classList.add('logo-preview');
    const logo = getLogo(id, "");
    if (logo.data) {
        logoPreview.src = URL.createObjectURL(logo.data);
        logoPreview.style.display = 'block'; // Ensure the image is visible
    } else {
        logoPreview.style.display = 'none';
    }
    logoContainer.appendChild(logoPreview);

    // Add an event listener to handle file size limitation
    logoInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.size > 2 * 1024 * 1024) { // 2MB size limit
            alert('File size exceeds 2MB. Please upload a smaller file.');
            logoInput.value = ''; // Clear the input
        } else if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                logoPreview.src = e.target.result;
                logoPreview.style.display = 'block'; // Show the img element
            };
            reader.readAsDataURL(file);
        }
    });
    return logoContainer;
}

function addEmail(section, index, email, active) {

    const emailContainer = document.createElement('div');
    const { input: emailInput } = createEntryField(emailContainer, "email", "Email", email, false)
 
    if (isEmailEnabled()) {
        const verifyButton = document.createElement('button');
        verifyButton.type = 'button';
        verifyButton.textContent = 'Verify';
        verifyButton.classList.add('verify', leftMargin, bottomMargin, 'button');
        emailContainer.appendChild(verifyButton);
        const verifyText = document.createElement('span');
        verifyText.classList.add('verify-text', leftMargin);
        emailContainer.appendChild(verifyText);
        setEmailText(active, verifyButton, verifyText, emailInput)
        addVerifyButtonHandler(verifyButton, verifyText, index);
 
        emailInput.addEventListener('input', () => {
            setEmailText(false, verifyButton, verifyText, emailInput)
        });
    }
    section.appendChild(emailContainer);
}

function setEmailText(active, verifyButton, verifyText, emailInput) {
    if (active) {
        verifyButton.style.display = 'none';
        verifyText.textContent = 'Verified';
        verifyText.classList.replace('verify-text', 'email-active');
        emailInput.setAttribute('data-verified', 'true');
    } else {
        verifyButton.style.display = 'inline-block';
        verifyText.textContent = "No invoices can be sent till the email is verified. Press verify and go to the inbox and activate the mailjet account.";
        verifyText.classList.replace('email-active', 'verify-text');
        emailInput.setAttribute('data-verified', 'false');
    }
}

async function addVerifyButtonHandler(verifyButton, verifyText, index) {
    verifyButton.addEventListener('click', async () => {
        const sections = Array.from(form.getElementsByClassName(addressSection));
        const emailInput = sections[index].querySelector('.email');
        const emailValue = emailInput ? emailInput.value.trim() : '';
        const companyNameInput = sections[index].querySelector('.companyName');
        const companyNameValue = companyNameInput ? companyNameInput.value.trim() : '';
        if (emailValue && companyNameValue) {
            const res = await registerNewEmail(companyNameValue, emailValue);
            if (res.active) {
                setEmailText(true, verifyButton, verifyText, emailInput)
            }
        } else {
            alert('Please fill in company name and email to verify');
        }
    });
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
    const docIds = Array.from(form.getElementsByClassName('docId'), label => label.textContent);;
    const companyNames = Array.from(form.getElementsByClassName('companyName'), input => input.value.trim()).filter(value => value !== '');;
    const addresses = Array.from(form.getElementsByClassName('address'), input => input.value.trim()).filter(value => value !== '');
    const companyAbn = Array.from(form.getElementsByClassName('abn'), input => input.value.trim()).filter(value => value !== '');
    const companyPostcode = Array.from(form.getElementsByClassName('postcode'), input => input.value.trim()).filter(value => value !== '');
    const accountingLine = Array.from(form.getElementsByClassName('accountingLine'), input => input.value.trim()).filter(value => value !== '');
    const emailInputs = Array.from(form.getElementsByClassName('email'));
    const email = emailInputs.map(input => input.value.trim()).filter(value => value !== '');
    const emailActiveStatus = emailInputs.map(input => input.getAttribute('data-verified') === 'true');
    const logoFiles = Array.from(form.querySelectorAll('input[type="file"]')).map(input => input.files[0]);
    const invoicePrefix = Array.from(form.getElementsByClassName('invoicePrefix'), input => input.value.trim()).filter(value => value !== '');
    const invoiceNumber = Array.from(form.getElementsByClassName('invoiceNumber'), input => input.value.trim()).filter(value => value !== '');
    const invoicePostfix = Array.from(form.getElementsByClassName('invoicePostfix'), input => input.value.trim()).filter(value => value !== '');
    const nameSet = new Set();
    for (let i = 0; i < companyNames.length; i++) {
        // Check for duplicate company names and cache the logos
        if (nameSet.has(companyNames[i])) {
            alert(`Duplicate company name found: ${companyNames[i]}`);
            return;
        }
        nameSet.add(companyNames[i]);

        if (docIds[i] && logoFiles[i]) {
            //
            // If there was a previous logo stored under this id, it has to be deleted
            // 
            const { data: storedLogo } = getLogo(docIds[i], "");

            const newLogoUrl = URL.createObjectURL(logoFiles[i]);
            if (storedLogo && newLogoUrl !== URL.createObjectURL(storedLogo)) {
                deleteStoreFile(storedLogo, docIds[i])
            }
        }
        await setLogo(docIds[i], companyNames[i], logoFiles[i]);
    }

    // Create an array of company and address objects
    const companies = companyNames.map((name, i) => ({
        docId: docIds[i], name: companyNames[i], address: addresses[i], abn: companyAbn[i],
        postcode: companyPostcode[i], accountingLine: accountingLine[i],
        email: email[i], emailActive: emailActiveStatus[i],
        logoUrl: "", 
        invoicePrefix: invoicePrefix[i], invoiceNumber: invoiceNumber[i], invoicePostfix: invoicePostfix[i]
    }));
    let companiesArray = companies.map(company => ({
        id: company.docId,
        name: company.name || "",
        abn: company.abn || "",
        postcode: company.postcode || "",
        accountingLine: company.accountingLine || "",
        address: company.address || "",
        email: company.email || "",
        emailActive: company.emailActive || false,
        logoUrl: company.logo || "",
        invoicePrefix: company.invoicePrefix || "",
        invoiceNumber: company.invoiceNumber || "1",
        invoicePostfix: company.invoicePostfix || ""
    }));

    const errorMsg = await setClinics(currentUser.email, companiesArray, currentUser.email);
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

const registerEmailAPICall = "registerEmailAPICall";
async function registerNewEmail(name, email) {
    const apiCallTrace = startTrace(registerEmailAPICall);
    const mailAddress = {
        Email: email,
        Name: name
    }
    const payload = JSON.stringify(mailAddress)
    const res = await httpCall(cloudServiceConfig.registerEmail, payload)
    stopTrace(apiCallTrace, registerEmailAPICall);
    if (res.error) {
        console.log("Register email " + email + " failed with: " + res.error);
    }
    else {
        if (res.resp.status == 202) {
            return { active: true, error: null }
        }
        else if (!res.resp.ok) {
            console.log("Register email " + email + " returned code: " + res.resp);
        }
    }
    return { active: false, error: null }
}

async function httpCall(url, payload) {
    let response = { ok: true };
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: payload
        });
        if (!response.ok) {
            let errorMessage = "HTTP error: " + response.status + " " + response.statusText;
            const errorText = await response.text();
            if (errorText) {
                errorMessage += " " + errorText;
            }
            return { resp: null, error: errorMessage }
        }
        return { resp: response, error: null }
    } catch (error) {
        return { resp: null, error: error.message }
    }
}
