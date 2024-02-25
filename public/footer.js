
import { auth, setUser } from './firebase.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

let logoutButtonPressed = false;
export function islogoutButtonPressed() {
    return logoutButtonPressed
}
export function resetlogoutButtonPressed() {
    logoutButtonPressed = false
}
export function showUser(user) {
    authState.innerHTML = `You're logged in as ${user.email} (uid: ${user.uid}) <br> <br>`
}
export function showLoginScreen() {
    window.location.href = '/index.html';
}
export function logout() {
    setUser(null)
    signOut(auth).then(() => {
        showLoginScreen()
    }).catch((error) => {
        alert(error.message)
    });
}

logoutButton.addEventListener('click', () => {
    logoutButtonPressed = true;
    logout();
});
