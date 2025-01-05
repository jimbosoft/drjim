# What I learnt so far ... and can't remember

## TODO
* hermit
* preview channels - Firebase serves your web app at a "preview URL", which is a sharable, temporary URL
* get container on AWS to work
* test deploying container in Azure
* test replacing container with lambda in gcp, AWS and Azure
* test replacing firestore with relational db
* test calling firestore from container by using user token

## Insane things about javascript
* a function can return 2 parameters and in the same function it can also return 3, without any error or warning
* size is used for maps and sets and length is used for arrays
* you can call an async function without wait and there will be no warning or error

## About Web UI
The most significant challenge with web interfaces appears to be state management. Web front-ends are essentially complex **state machines**. This complexity arises primarily because each page is stateless and unaware of actions performed on other pages. 
Furthermore, any page can be accessed directly, with no enforced order among them. <br><br>
Consequently, **state machine management emerges as the most crucial feature** to consider when selecting a framework. The visual appeal of web pages, mainly a function of **JavaScript and CSS**, becomes a secondary consideration.

## Data Storage
Building on the previous point, data management presents a major challenge. Using stores like **Firestore, a hierarchical database**, often leads to **unmaintainable code.** While Firestore can be made functional, even the original author may struggle to understand or explain the resulting code. Additionally, attached data requires manual cleanup upon deletion, or else it risks polluting the database with dangling, undeletable data. This solution, while cost-effective, is ultimately **impractical.**
<br><br>
I haven't yet tested whether a relational database would resolve these data management challenges. More investigation and practical testing would be needed to draw a definitive conclusion. An alternative approach might involve building a custom database and storing it in bucket storage. This solution, attempted once in a university final year project, proved successful when database calls were prohibitively slow. However, it's likely only viable for small datasets. Perhaps database management is inherently challenging.

## Backend Processing
Google Cloud Run proved excellent for backend processing, despite some quirks like treating secrets and config identically. Deploying a container was straightforward, with **GCP** providing a publicly accessible URL, greatly simplifying the process.<br><br>
Attempting to deploy the same container on AWS Fargate, however, was nightmarish. **AWS's clunky, outdated, and expensive** infrastructure, still heavily reliant on EC2 instances, struggles to accommodate containers effectively. This experience has made me reluctant to use AWS again.<br><br>
**Lambdas (cloud functions)** have been suggested as a viable alternative. While untested, this approach could work for a stateless backend. However, concerns arise regarding their proprietary nature, lack of transferability between cloud providers, and potential testing difficulties. Despite these reservations, I plan to evaluate this solution across different cloud providers. Ultimately, **"run anywhere" containers** still appear to be the most desirable solution.

## Responsiveness
Surprisingly, responsiveness proved to be a **significant challenge.** Despite database and containers being co-located in the same data center, calls were **unexpectedly slow.** Front-end calls to Firestore took hundreds of milliseconds, and even backend container calls were excruciatingly slow. A backend process taking 50ms could result in a total call time exceeding 300ms, with SSL negotiation alone consuming 100ms.<br><br>
This unexpected performance bottleneck necessitated the implementation of a **front-end caching layer** to minimize backend calls. This solution ties back to the earlier point about state management in web UIs, underscoring the interconnected nature of these challenges.

## Emailing

Implementing an email facility in our SaaS application was not feasible for the following reasons:
1. Domain Requirements: To send emails via an email service like Mailjet, you need to have your own domain. This domain must be configured to allow Mailjet to send emails on its behalf, or the DKIM (DomainKeys Identified Mail) authentication will fail. If these conditions are not met, the sent emails will likely be flagged as spam or, worse, the domain may be blocked.
2. Sender Configuration: It is possible to set up a central domain and configure its email address as the "Sender" (as opposed to the "To" address). However, if the mailing functionality is abused, that domain will be held responsible. This presents a significant risk for a SaaS application.
3. Potential for Abuse: This is the fundamental problem with providing an email solution in a SaaS application - it can potentially be used to spam people. In the simplest case, users could send invoices repeatedly until the server gets blocked.
4. Recipient Verification: Any "To" address needs to be verified. This is typically done by registering the email address with the email service provider (e.g., Mailjet), which then sends out a confirmation email. The recipient must act upon this confirmation before the email address can be used in the "To" field. While this functionality has been implemented in our application, it has been disabled via the isEmailEnabled() function.

These challenges make it difficult to implement a reliable and secure email facility within our SaaS application without exposing ourselves to significant risks.

## Some thoughts on firebase:

### Running firebase

 login:use `<email>`   set the default account to use for this project<br>
 login:ci             generate access token<br>
 init                 start new project<br>
 emulators:start      run locally<br>
 emulators:deploy     --only hosting <br>

 ### Firebase SDK
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
