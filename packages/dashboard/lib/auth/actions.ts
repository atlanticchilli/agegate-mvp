"use client";

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { auth } from "../firebase/client";

export async function signupWithEmail(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(auth, email, password);
}

export async function loginWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
