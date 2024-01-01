// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBwOkbL9ujotz6kKVHR2gH4f1ySGPE2kRY",
  authDomain: "kelal-ea589.firebaseapp.com",
  projectId: "kelal-ea589",
  storageBucket: "kelal-ea589.appspot.com",
  messagingSenderId: "99373517475",
  appId: "1:99373517475:web:2f37475c02546684fb4d16",
  measurementId: "G-37FWJH0N60"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);
