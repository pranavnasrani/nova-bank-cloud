import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase project configuration using your details.
// The API key is now hardcoded as it is intended for client-side use
// and process.env is not available in the browser.
const firebaseConfig = {
  apiKey: "AIzaSyDmFUIS0DnkK1hxNthcPTpblwAFg1WuHJw",
  authDomain: "nova-bank-83d23.firebaseapp.com",
  projectId: "nova-bank-83d23",
  storageBucket: "nova-bank-83d23.appspot.com",
  messagingSenderId: "545942112041",
  appId: "1:545942112041:web:dcb204212f903b858e5938",
  measurementId: "G-GHBYCJ3ZYW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
