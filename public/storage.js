
export let currentUser = null
export const userKey = 'user'
export function setUser(user) {
    return currentUser = user;
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
