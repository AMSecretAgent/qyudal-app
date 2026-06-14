// firebase/firebaseConfig.js
// Firebase project configuration — replace ALL values with your own from the Firebase Console
// Go to: Firebase Console → Project Settings → Your apps → SDK setup and configuration

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_AUTH_DOMAIN',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId:             'YOUR_APP_ID',
};

// Initialize Firebase app (singleton — safe to call multiple times)
const app  = initializeApp(firebaseConfig);

// Export auth and firestore instances for use across the app
export const auth = getAuth(app);
export const db   = getFirestore(app);