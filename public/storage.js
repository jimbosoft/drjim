export let currentUser = null
export const userKey = 'user'
export function setUser(user) {
    //
    // Invalid input
    //
    if (!user || user == 'null' || user == 'undefined') {
        console.log('setUser called with invalid user')
        return null
    }
    //
    // Set user if none is set
    //
    let u = localStorage.getItem(userKey);
    if (u && u !== 'null' && u !== 'undefined') {
         u = JSON.parse(u);
        //
        // New user
        //
        if (u.email !== user.email) {
            console.log('User changed!')
            return null
        }
    }
    localStorage.setItem(userKey, JSON.stringify(user));
    currentUser = user
    return user
}

export function getUser() {
    let u = localStorage.getItem(userKey);
    if (u && u !== 'null' && u !== 'undefined') {
        currentUser = JSON.parse(u);
        return currentUser
    }
    return null
}

export function clearUser() {
    localStorage.removeItem(userKey);
    currentUser = null
}
export const clinicId = 'clinicId';

export function setClinicId(id) {
    localStorage.setItem(clinicId, id);
}
export function getClinicId() {
    return localStorage.getItem(clinicId);
}
export function clearClinicId() {
    localStorage.removeItem(clinicId);
}
