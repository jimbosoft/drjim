# drjim web application for invoicing

Based on firebase: https://console.firebase.google.com/u/0/project/drjim-f2087/overview

Utilises firestore for NoSQL storeage of the data <br>
Authentication id provided by firebase-ui-auth

## Structure

all files stored in /public <br>

**index.html** is the starting page with the authentication <br>
**firebase.js** is a common js files used by all files and contain common data <br>
all firestore operations are currently in firebase.js, but will be moved into a container running go code and deployed in cloud run <br>
Once loogged in, the home page will be **dashboard.html**. All html files, except index.html, have an associated js file. <br>
From the dashboard.js you can navigate to the other pages<br>
**clinics.html** and **serviceCode.html** etc<br><br>

All pages check if the user is logged in. If yes, the page is rendered

## Config
Config is stored in config.js. It also contains secret keys and can not be stored in the repo and is only available on request.<br>
you need the secret: **config.js** in order to run

## Running firebase

 firebase login:use <email>   set the default account to use for this project<br>
 firebase login:ci             generate access token <br>

### Start a new project
 firebase init                 start new project <br>

### Start the emulator, after login
 firebase emulators:start      run locally <br>
 firebase deploy               --only hosting <br>

## Structure Explanation
### Logo
The logo is uploaded on the Company Details screen. <br>
It is stored in cache and when commit is pressed on the page the comapny details are written to firestore <br>
and the default service codes and the logo are written to the firestore separately <br>

### Company email
The email entered on the company page needs to be verified<br>
This happens when the commit button is pressed and the email address is sent to the backend, <br>
which in turn sends it to mailjet, which will send a activation email to the address<br>
The user of that email address has to "Activate" the account <br>
Any attempt to send email from a non activated email address will be rejected <br>

### What I learnt
[What I learnt](./public/MyJourney.md)

