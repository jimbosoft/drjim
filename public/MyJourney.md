# What I learnt so far ... and can't remember

## TODO
* hermit
* authenticate with email and google
* identify single site or multi site user
* upload a csv, parse and put into firestore
* display content
* modify content an load down again

* preview channels

## insane things about javascript
* a function can return 2 parameters and in the same function it can also return 3, without any error or warning
* size is used for maps and sets and length is used for arrays
* you can call an async function without wait and there will be no warning or error

## Running firebase

 login:use <email>   set the default account to use for this project
 login:ci             generate access token

 init                 start new project

 emulators:start      run locally
 deploy               --only hosting 

 ## Firebase SDK
 Copy the dependancies into index.js:
 firebase console, Settings, Apps, Web App, SDK setup and configuration (npm)

 ## Firestore
 Unit of storage is a document<br>
 documents live in collections<br>
 const db = getFirestore(app);<br>
 const docRef = doc(db, userId, "clinics"); or doc(db, "collectionName/documentName")<br>
 ### setDoc 
 will create the doc if it does not exist and replace it if it does
 ### updateDoc 
 will update the doc but fail if it does not exist OR use
 setDoc(db, "{some: json}", {merge:true}); 
 ### addDoc  
 collectionRef = collection(db, 'greatCollection'); netDoc = addDoc(collectionRef, "{some: json}") will create a random doc id. returns a doc referrenc so you can ask the id netDoc.path
 ### getDoc 
const snapshotUnsubscribe = getDoc(docRef, (docSnapshot) =>
id (docSnapshot.exists() {
    const docData = docSnapshot.data()
    JSON.stringify(docData)
}))
at the right time snapShotUnsubscribe();
### query 
const dataQuery = query(
    collection(db, 'collectionName')
    where('drink', '==', 'latte'),
    sort ...
    limit(10)
) this rquires a custom index

const querySnapShot = await getDocs(datQuery);
const allDocs = querySnapShot.ForEach((snap) =>
{snap.data})

### onSnapshot 
onSnapshot(dataQuery, (querySnapShot) => {
    JSON.stringify(querySnapshot.docs.map((e) => e.data())));})

### subCollections
https://firebase.google.com/docs/firestore/data-model





