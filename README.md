# drjim web application for invoicing

Based on firebase: https://console.firebase.google.com/u/0/project/drjim-f2087/overview

Utilises Auth and firestore for NoSQL storeage of the data <br>
Authentication id provided by firebase-ui-auth

## Structure

all files stored in /public <br>

**index.html** is the starting page with the authentication <br>
**firebase.js** is a common js files used by all files and contain common data <br>
all firestore operations are currently in firebase.js, but will be moved into a container running go code and deployed in cloud run <br>
Once loogged in the hme page will be **dashboard.html**. All html files, except index.html, have an associated js file. <br>
From the dashboard.js you can navigate to the other pages<br>
**clinics.html** and **serviceCode.html** etc<br><br>

All pages check if the user is logged in. If yes, the page is rendered

## Config
Used **Remote Config** key **env** to know if it is running locally against emulators, with value **"local"** or is deployed in the cloud (not "local")<br><br>
## Running firebase

 firebase login:use <email>   set the default account to use for this project<br>
 firebase login:ci             generate access token <br>

 firebase init                 start new project <br>

 firebase emulators:start      run locally <br>
 firebase deploy               --only hosting <br>

[What I learnt](./public/MyJourney.md)

