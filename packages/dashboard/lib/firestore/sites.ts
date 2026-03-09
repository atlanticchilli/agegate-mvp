"use client";

import type { Site } from "@agegate/shared";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "../firebase/client";
import { defaultProviders, sanitizeProvidersForStorage, type DashboardProviderConfig } from "../providers";
import { generateSecretKey, generateSiteKey } from "../secrets";

export interface DashboardSite extends Omit<Site, "providers"> {
  providers: DashboardProviderConfig[];
}

export interface SiteCreateInput {
  operatorId: string;
  name: string;
  domain: string;
  verificationValidityPeriod: number;
  providers?: DashboardProviderConfig[];
}

export async function listOperatorSites(operatorId: string): Promise<DashboardSite[]> {
  const sitesRef = collection(db, "sites");
  const sitesQuery = query(sitesRef, where("operatorId", "==", operatorId));
  const snapshot = await getDocs(sitesQuery);

  return snapshot.docs.map((siteDoc) => ({
    id: siteDoc.id,
    ...(siteDoc.data() as Omit<DashboardSite, "id">)
  }));
}

export async function createSite(input: SiteCreateInput): Promise<{
  siteId: string;
  siteKey: string;
  secretKey: string;
}> {
  const siteKey = generateSiteKey();
  const secretKey = generateSecretKey();
  const providers = sanitizeProvidersForStorage(input.providers ?? defaultProviders());

  const docRef = await addDoc(collection(db, "sites"), {
    operatorId: input.operatorId,
    name: input.name,
    domain: input.domain,
    siteKey,
    secretKey,
    providers,
    verificationValidityPeriod: input.verificationValidityPeriod,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return {
    siteId: docRef.id,
    siteKey,
    secretKey
  };
}

export async function getSite(siteId: string): Promise<DashboardSite | null> {
  const siteRef = doc(db, "sites", siteId);
  const snapshot = await getDoc(siteRef);
  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<DashboardSite, "id">)
  };
}

export async function updateSite(siteId: string, patch: Partial<DashboardSite>): Promise<void> {
  const siteRef = doc(db, "sites", siteId);
  const providers = patch.providers ? sanitizeProvidersForStorage(patch.providers) : undefined;
  await updateDoc(siteRef, {
    ...patch,
    ...(providers ? { providers } : {}),
    updatedAt: serverTimestamp()
  });
}
