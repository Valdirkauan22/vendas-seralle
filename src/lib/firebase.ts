import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: "AIzaSyAN3oibt-cKSwJCeCR3naIcaXtq0l8K4K0",
  authDomain: "serale-vendas.firebaseapp.com",
  projectId: "serale-vendas",
  storageBucket: "serale-vendas.firebasestorage.app",
  messagingSenderId: "463633651495",
  appId: "1:463633651495:web:118ab23f52407dceac3b02",
  measurementId: "G-DHFEB4ZNJM"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Analytics conditionally
let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((yes) => {
      if (yes) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {});
}

export { analytics };
export default app;