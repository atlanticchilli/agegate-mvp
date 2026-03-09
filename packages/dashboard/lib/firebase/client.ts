"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "demo-agegate.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-agegate",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "demo-agegate.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "0",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:0:web:demo"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

if (useEmulators) {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  } catch {
    // Ignore repeated emulator attachment in dev hot-reload.
  }
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8081);
  } catch {
    // Ignore repeated emulator attachment in dev hot-reload.
  }
}
