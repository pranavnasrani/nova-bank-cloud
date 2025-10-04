import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: Replace this with your own Firebase project configuration.
// You can find this in your Firebase project settings.
const firebaseConfig = {
  apiKey: process.env.FIRESTORE_API_KEY,
  authDomain: "nova-bank-83d23.firebaseapp.com",
  projectId: "nova-bank-83d23",
  storageBucket: "nova-bank-83d23.firebasestorage.app",
  messagingSenderId: "545942112041",
  appId: "1:545942112041:web:dcb204212f903b858e5938"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
