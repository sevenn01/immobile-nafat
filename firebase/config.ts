
// FIX: Use Firebase v9 compat imports to support v8 syntax.
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgFzoQVo72efNbTRYMO76h5oms3QPhGK4",
  authDomain: "deeppos-system.firebaseapp.com",
  projectId: "deeppos-system",
  storageBucket: "deeppos-system.firebasestorage.app",
  messagingSenderId: "538229284129",
  appId: "1:538229284129:web:dc44844164e091e90ff260",
  measurementId: "G-9HWEF3CL2T"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize Cloud Firestore and get a reference to the service
export const db = firebase.firestore();

// FIX: Enable long polling to prevent "Could not reach Cloud Firestore backend" 
// errors caused by WebSocket/gRPC connection issues in some environments.
db.settings({
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false
});
