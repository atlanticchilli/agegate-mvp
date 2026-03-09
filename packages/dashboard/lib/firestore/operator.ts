"use client";

import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/client";

export interface OperatorProfile {
  uid: string;
  email: string;
  displayName: string;
  companyName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function getOrCreateOperatorProfile(input: {
  uid: string;
  email: string;
}): Promise<OperatorProfile> {
  const profileRef = doc(db, "operators", input.uid);
  const profileSnapshot = await getDoc(profileRef);
  if (profileSnapshot.exists()) {
    return profileSnapshot.data() as OperatorProfile;
  }

  const payload: OperatorProfile = {
    uid: input.uid,
    email: input.email,
    displayName: "",
    companyName: ""
  };

  await setDoc(profileRef, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return payload;
}

export async function updateOperatorProfile(
  uid: string,
  patch: Partial<Pick<OperatorProfile, "displayName" | "companyName">>
): Promise<void> {
  const profileRef = doc(db, "operators", uid);
  await updateDoc(profileRef, {
    ...patch,
    updatedAt: serverTimestamp()
  });
}
