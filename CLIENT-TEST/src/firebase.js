// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

// This is the correct format for client-side Firebase config
const firebaseConfig = {
  apiKey: "n7MPNHLXCEGSVu239DBBP4c8AmxXz3bQ8VrYa5fh",
  authDomain: "test-websocket-951a0.firebaseapp.com",
  databaseURL: "https://test-websocket-951a0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "test-websocket-951a0",
  storageBucket: "test-websocket-951a0.appspot.com",
  messagingSenderId: "364613913133",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, onValue };