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
        initClinics();
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

function initClinics() {
    getClinics().then((clinics) => {
        if (clinics) {
            populateClinic(clinics);
        } else {
            createCompanyAddressSection(0, null, null)
        }
    })
}
///////////////////////////////////////////////////////
// Get a reference to the form and submit button
const form = document.getElementById('company-form');
const submitButton = document.getElementById('submit-button');

// Function to create a new company and address section
function createCompanyAddressSection(index, name, address) {
    const section = document.createElement('div');
    section.classList.add('company-address-section');

    // const clinicSelector = document.createElement('input');
    // clinicSelector.type = 'radio';
    // clinicSelector.name = 'clinicSelector';
    // clinicSelector.value = index;
    // clinicSelector.classList.add('clinicSelector');
    // section.appendChild(clinicSelector);

    const companyNameLabel = document.createElement('label');
    companyNameLabel.textContent = 'Clinic Name:';
    section.appendChild(companyNameLabel);
    section.appendChild(document.createElement('br'));

    const companyNameInput = document.createElement('input');
    companyNameInput.type = 'text';
    companyNameInput.classList.add('companyName');
    companyNameInput.name = 'companyName';
    if (name) {
        companyNameInput.value = name;
    }
    section.appendChild(companyNameInput);
    section.appendChild(document.createElement('br'));

    const addressLabel = document.createElement('label');
    addressLabel.textContent = 'Address:';
    section.appendChild(addressLabel);
    section.appendChild(document.createElement('br'));

    const addressInput = document.createElement('input');
    addressInput.type = 'text';
    addressInput.classList.add('address');
    addressInput.name = 'address';
    if (address) {
        addressInput.value = address;
    }
    section.appendChild(addressInput);
    section.appendChild(document.createElement('br'));
    section.appendChild(document.createElement('br'));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.classList.add('delete');
    section.appendChild(deleteButton);
    section.appendChild(document.createElement('br'));
    section.appendChild(document.createElement('br'));
    addDeleteButtonHandler(deleteButton, index);

    const div = document.getElementById('company-form');
    div.appendChild(section);
    return section;
}

function addDeleteButtonHandler(deleteButton, index) {
    deleteButton.addEventListener('click', () => {
        const clinics = getClinics();
        if (index < clinics.length) {
            // Delete the clinic at the index
            clinics.splice(index, 1);
            writeToFirestore(clinics).then(() => {
                const div = document.getElementById('company-form');
                div.innerHTML = '';
                initClinics();
            })
                .catch((error) => {
                    console.error("Error writing document: ", error);
                });
        } else {
            const sections = Array.from(form.getElementsByClassName('company-address-section'));
            if (index < sections.length - 1) {
                sections[index].parentElement.removeChild(sections[index]);
            } else {
                alert('Please select a filled in clinic to delete');
            }
        }
    });
}
// Listen for input events on the form
form.addEventListener('input', (e) => {
    // If the target of the event is an address input
    if (e.target.classList.contains('address')) {
        // Get the parent section of the input
        const section = e.target.parentElement;

        // If the input is filled in and the section is the last one
        if (e.target.value && section === form.lastElementChild) {
            // Create a new address section and append it to the form
            const currentSections = form.getElementsByClassName('company-address-section');
            const nextIndex = currentSections.length;
            const newSection = createCompanyAddressSection(nextIndex, null, null);
        }
    }
});

// Handle the submit button click
submitButton.addEventListener('click', async(e) => {
    e.preventDefault();

    // const radios = Array.from(form.getElementsByClassName('clinicSelector'));
    // const selectedRadio = radios.find(radio => radio.checked);
    // if (selectedRadio === undefined) {
    //     alert('Please select a clinic to continue');
    // }
    // // Get the form values, exclude empty fields
    const companyNames = Array.from(form.getElementsByClassName('companyName'), input => input.value.trim()).filter(value => value !== '');;
    const addresses = Array.from(form.getElementsByClassName('address'), input => input.value.trim()).filter(value => value !== '');
    // Create an array of company and address objects
    const companies = companyNames.map((name, i) => ({ name: companyNames[i], address: addresses[i] }));
    let companiesArray = companies.map(company => ({
        clinicName: company.name,
        clinicAddress: company.address
    }));

    await writeToFirestore(companiesArray)
    window.location.href = '/dashboard.html';

    // Clear the form
    //form.innerHTML = '';
    //form.appendChild(createCompanyAddressSection());
});

async function writeToFirestore(companiesArray) {
    try {
        const userId = currentUser.uid;
        // Get a reference to the document
        const docRef = doc(db, userId, "clinics");

        // Get the document
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            // If the document does not exist, create it with no data
            await setDoc(docRef, {});
        }

        return updateDoc(docRef, { clinics: companiesArray })
            .then(() => {
                console.log("Addresses successfully written!");
            })
            .catch((error) => {
                console.error("Error writing document: ", error);
            });
    } catch (error) {
        alert(error.message)
    }
}

function populateClinic(clinics) {
    if (clinics) {
        for (const [index, clinic] of clinics.entries()) {
            createCompanyAddressSection(index, clinic.clinicName, clinic.clinicAddress)
        }
    }
    createCompanyAddressSection(0, null, null)
}