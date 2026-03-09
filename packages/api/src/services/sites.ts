import type { Site } from "@agegate/shared";
import { getDb } from "../lib/firebase";

export async function getSiteBySiteKey(siteKey: string): Promise<Site | null> {
  const query = await getDb()
    .collection("sites")
    .where("siteKey", "==", siteKey)
    .limit(1)
    .get();

  if (query.empty) {
    return null;
  }

  const doc = query.docs[0];
  return {
    id: doc.id,
    ...(doc.data() as Omit<Site, "id">)
  };
}

export async function getSiteById(siteId: string): Promise<Site | null> {
  const doc = await getDb().collection("sites").doc(siteId).get();
  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...(doc.data() as Omit<Site, "id">)
  };
}
