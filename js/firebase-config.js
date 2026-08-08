// ==========================================
// SKILLCOIN - Firebase Configuration
// ==========================================

// Import Firebase from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { 
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { 
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// ✅ Your Firebase Config (get from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyDizG4SCFJkqvoMNEKgMR9uXjHyEIqr3H4",
  authDomain: "skillcoin-87e0b.firebaseapp.com",
  projectId: "skillcoin-87e0b",
  storageBucket: "skillcoin-87e0b.firebasestorage.app",
  messagingSenderId: "366929805767",
  appId: "1:366929805767:web:d8070af2398cf60ac5d9e2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);

// Export everything we need
export { 
  app, 
  auth, 
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
};

console.log("🔥 Firebase Connected Successfully!");