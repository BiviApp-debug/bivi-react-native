import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAH9gY0v--Q2uqjATtXNVBuBECDVmSByFQ",
  authDomain: "motuberos.firebaseapp.com",
  projectId: "motuberos",
  storageBucket: "motuberos.firebasestorage.app",
  messagingSenderId: "373069340343",
  appId: "1:373069340343:web:4fb623a715c1e86da8b732",
  measurementId: "G-LBS5XRCBK8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };