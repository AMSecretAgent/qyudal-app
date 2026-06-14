// firebase/authService.js
// All Firebase Authentication + Firestore user-storage logic lives here.
// Import these functions wherever you need auth actions.

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { auth, db } from './firebaseconfig';

// ─── SIGN UP ─────────────────────────────────────────────────────
// Creates a Firebase Auth account, then writes the user's profile
// to Firestore under /users/{uid}.
export async function signUp(email, password, name, age) {
  // Step 1 — create the auth account
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid        = credential.user.uid;

  // Step 2 — write the user profile to Firestore
  await setDoc(doc(db, 'users', uid), {
    email,
    name:      name.trim(),
    age:       parseInt(age, 10),
    createdAt: serverTimestamp(),   // server-side timestamp for consistency
  });

  return credential.user;
}

// ─── LOG IN ──────────────────────────────────────────────────────
// Signs in an existing user with email + password.
// Returns the Firebase User object on success.
export async function logIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// ─── LOG OUT ─────────────────────────────────────────────────────
export async function logOut() {
  await signOut(auth);
}

// ─── GET USER PROFILE FROM FIRESTORE ────────────────────────────
// Fetches the stored profile data for a given uid.
// Returns null if the document does not exist.
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// ─── AUTH STATE LISTENER ─────────────────────────────────────────
// Pass a callback that receives the current Firebase User (or null).
// Call the returned unsubscribe() function to stop listening.
export function subscribeToAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}