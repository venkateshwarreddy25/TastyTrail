import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDGk-2HZKfYO_5CvLOjOa7r8suSERrI464",
  authDomain: "collegecanteenweb.firebaseapp.com",
  projectId: "collegecanteenweb",
  storageBucket: "collegecanteenweb.firebasestorage.app",
  messagingSenderId: "1061155014065",
  appId: "1:1061155014065:web:945731771b3f8e96afe990",
  measurementId: "G-6NTREDLW4N"
};

const app = initializeApp(firebaseConfig);

export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const functions = getFunctions(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export default app;
