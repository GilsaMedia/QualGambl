// Firebase initialization — reads your config from ../firebase-config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig, isConfigured } from "../firebase-config.js";

let auth = null;
let db = null;

try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  console.error("Firebase failed to initialize:", err);
}

export { auth, db, isConfigured };
