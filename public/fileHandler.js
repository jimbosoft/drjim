import { getServiceCodes, currentUser, clinicId, getPractitioners,
    storeStuff, getStore, clearStore, 
    missingProvidersKey, missingItemsKey, missingServiceCodes, noItemNrs, fileContentsKey, fileNameKey
 } from './firebase.js';
import { cloudServiceConfig } from './config.js';

var clinicDropdown = document.getElementById('clinicDropdown');

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('csvFile');

dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('bg-gray-200');
    dropZone.style.cursor = 'copy';
});

dropZone.addEventListener('dragleave', function (e) {
    dropZone.classList.remove('bg-gray-200');
    dropZone.style.cursor = 'default';
});
dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('bg-gray-200');
    fileInput.files = e.dataTransfer.files;
    const file = fileInput.files[0];
    if (file) {
        handleInputFile(file)
    }
});

document.getElementById('uploadButton').addEventListener('click', function () {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    if (file) {
        handleInputFile(file)
    } else {
        console.log('No file selected');
    }
});

document.getElementById('rerunButton').addEventListener('click', function () {
    const fileContents = getStore(fileContentsKey);
    if (fileContents && fileContents !== 'null'
        && fileContents.length > 0 && fileContents !== 'undefined') {
        processFile(fileContents);
    }
    else {
        clearStore(fileContents);
        document.getElementById('rerunButton').classList.add('hidden');
    }
});

export function showLastLoad() {
    const fileContents = getStore(fileContentsKey);
    const fileName = getStore(fileNameKey);
    if (fileContents && fileContents !== 'null'
        && fileContents.length > 0 && fileContents !== 'undefined') {
        document.getElementById('rerunContainer').classList.remove('hidden');
    }
    if (fileName && fileName !== 'null'
        && fileName.length > 0 && fileName !== 'undefined') {
        document.getElementById('fileName').textContent = fileName;
    }
}

function getCompanyName() {
    const selectedOption = clinicDropdown.options[clinicDropdown.selectedIndex];
    return selectedOption.textContent;
}

/*
json payload
    {
        "FileContent": "your_file_content",
        "CsvLineStart": 16,
        "CompanyName": "Vermont Medical Clinic",
        "CodeMap": [
            {
                "code1": ["123", "456"]
            },
            {
                "code2": ["789", "012"]
            }
        ],
        "PracMap":
          {
            "Doctor1": {"code1":"50", "code2":"20"},
            "DOctor2": {"code1":"40", "code2":"30"}
          }
    }
*/
const messageOutput = document.getElementById("messageOutput")
const resultOutput = document.getElementById("resultOutput")
async function handleInputFile(file) {
    if (file) {
        messageOutput.innerHTML = '';
        if (resultOutput.firstChild) {
            resultOutput.removeChild(resultOutput.firstChild);
        }
        //document.getElementById('missingProviders').classList.add('hidden');
        //document.getElementById('missingItemsKey').classList.add('hidden');
        clearStore(missingProvidersKey);
        clearStore(missingItemsKey);

        const reader = new FileReader();
        reader.onload = async function (e) {
            const fileContents = e.target.result;
            storeStuff(fileContentsKey, fileContents);
            storeStuff(fileNameKey, file.name);
            showLastLoad();
            processFile(fileContents);
        };
        reader.readAsText(file);
    } else {
        console.log('No file selected');
    }
}

function processFile(fileContents) {
    getProviderDetails(currentUser.uid, localStorage.getItem(clinicId)).then(async (result) => {
        if (result.error) {
            alert(result.error);
            return
        }
        const companyName = getCompanyName();
        if (result.codeMap && result.procMap) {
            const paymentFile = {
                FileContent: fileContents,
                CsvLineStart: 16,
                CompanyName: companyName,
                CodeMap: result.codeMap,
                PracMap: result.procMap
            };
            const response = await fetch(cloudServiceConfig.processFileUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentFile)
            });

            if (!response.ok) {
                response.text().then(text => {
                    messageOutput.innerHTML =
                        "HTTP error: " + response.status + "<br>"
                        + "Reason: " + text;
                });
                return;
            }

            let fileResult
            try {
                fileResult = await response.json();
            } catch (error) {
                console.error('Error:', error);
            }
            let data = fileResult.chargeDetail
            let output = '';
            if (Array.isArray(data)) {
                let table = document.createElement('table');
                let headerRow = document.createElement('tr');
                for (let key in data[0]) {
                    if (key === 'msg') {
                        continue;
                    }
                    let headerCell = document.createElement('th');
                    headerCell.innerHTML = key;
                    headerRow.appendChild(headerCell);
                }
                table.appendChild(headerRow);

                data.forEach(item => {
                    if (item.msg) {
                        output += '&nbsp;' + item.msg + '<br>';
                    } else {
                        let row = document.createElement('tr');
                        for (let key in item) {
                            let cell = document.createElement('td');
                            if (key === 'error') {
                                continue;
                            } else if (key === 'service') {
                                cell.innerHTML = 'Code: ' + item[key].code + ', Percentage: ' + item[key].percentage;
                            } else {
                                cell.innerHTML = item[key];
                            }
                            row.appendChild(cell);
                        }
                        table.appendChild(row);
                    }
                });
                resultOutput.appendChild(table);
                messageOutput.innerHTML = output;
            }
            if (Object.keys(fileResult.missingProviders).length > 0) {
                document.getElementById('missingProvidersTxt').textContent = 'There are missing providers in the file';
                document.getElementById('missingProviders').classList.remove('hidden');
                const storeVal = fileResult.missingProviders
                storeStuff(missingProvidersKey, JSON.stringify(storeVal));
            }
            if (Object.keys(fileResult.noItemNrs).length > 0) {
                const storeVal = fileResult.noItemNrs
                storeStuff(noItemNrs, JSON.stringify(storeVal));
            }
            if (Object.keys(fileResult.missingItemNrs).length > 0){
                const storeVal = fileResult.missingItemNrs
                storeStuff(missingItemsKey, JSON.stringify(storeVal));  
            }
            if (Object.keys(fileResult.missingItemNrs).length > 0 || Object.keys(fileResult.noItemNrs).length > 0) {
                document.getElementById('missingItemsTxt').textContent = 'There are missing items in the file';
                document.getElementById('missingItems').classList.remove('hidden');
            }
            if (Object.keys(fileResult.missingServiceCodes).length > 0) {
                document.getElementById('missingServiceCodesTxt').textContent = 'There are missing service code cuts in the file';
                document.getElementById('missingServiceCodes').classList.remove('hidden');
                const storeVal = fileResult.missingServiceCodes
                storeStuff(missingServiceCodes, JSON.stringify(storeVal));
            }
         }
    });
}

async function getProviderDetails(userId, clinicId) {
    try {
        // Fetch practitioners
        const practitionersResult = await getPractitioners(userId, clinicId);
        if (practitionersResult.error) {
            return { codeMap: null, procMap: null, error: practitionersResult.error };
        }
        const practitioners = practitionersResult.data;
        // Fetch service codes
        const serviceCodesResult = await getServiceCodes(userId, clinicId);
        if (serviceCodesResult.error) {
            return { codeMap: null, procMap: null, error: serviceCodesResult.error };
        }
        const serviceCodes = serviceCodesResult.data;

        // Format practitioners data for PracMap
        const PracMap = {};
        practitioners.forEach(practitioner => {
            const services = {};
            practitioner.services.forEach(service => {
                services[service.id] = service.value;
            });
            PracMap[practitioner.name] = services;
        });
        // Format service codes data for CodeMap
        // as a map of service code id to an array of item codes
        const CodeMap = serviceCodes.reduce((map, serviceCode) => {
            map[serviceCode.id] = serviceCode.itemList.map(item => item.toString());
            return map;
        }, {});
        return { codeMap: CodeMap, procMap: PracMap, error: null };
    } catch (errorRes) {
        return { codeMap: null, procMap: null, error: errorRes };
    }
}
