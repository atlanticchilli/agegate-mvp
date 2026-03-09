import type { MethodOption, VerificationResult, VerificationSessionStatus } from "@agegate/shared";
import { getDb } from "../lib/firebase";

export interface StoredVerification {
  id: string;
  siteId: string;
  jurisdiction: string;
  availableMethods: MethodOption[];
  selectedMethod?: string;
  selectedProvider?: string;
  providerSessionUrl?: string;
  providerSessionId?: string;
  status: VerificationSessionStatus;
  userIpHash: string;
  userAgent: string;
  result?: VerificationResult;
  createdAt: number;
  updatedAt: number;
}

function verificationRef(siteId: string, sessionId: string): FirebaseFirestore.DocumentReference {
  return getDb().collection("sites").doc(siteId).collection("verifications").doc(sessionId);
}

export async function createVerificationSession(
  session: Omit<StoredVerification, "createdAt" | "updatedAt">
): Promise<StoredVerification> {
  const now = Date.now();
  const complete: StoredVerification = {
    ...session,
    createdAt: now,
    updatedAt: now
  };
  await verificationRef(session.siteId, session.id).set(complete, { merge: true });
  return complete;
}

export async function getVerificationBySessionId(sessionId: string): Promise<StoredVerification | null> {
  const collectionGroup = await getDb()
    .collectionGroup("verifications")
    .where("id", "==", sessionId)
    .limit(1)
    .get();

  if (collectionGroup.empty) {
    return null;
  }

  return collectionGroup.docs[0].data() as StoredVerification;
}

export async function updateVerification(siteId: string, sessionId: string, updates: Partial<StoredVerification>) {
  await verificationRef(siteId, sessionId).set(
    {
      ...updates,
      updatedAt: Date.now()
    },
    { merge: true }
  );
}

export interface ListVerificationLogsParams {
  siteId: string;
  limit?: number;
  cursor?: number;
  startDateMs?: number;
  endDateMs?: number;
}

export interface ListVerificationLogsResult {
  logs: StoredVerification[];
  nextCursor?: string;
}

export async function listVerificationLogs(
  params: ListVerificationLogsParams
): Promise<ListVerificationLogsResult> {
  const safeLimit = Number.isFinite(params.limit) ? Math.min(Math.max(params.limit ?? 100, 1), 500) : 100;
  let query: FirebaseFirestore.Query = getDb()
    .collection("sites")
    .doc(params.siteId)
    .collection("verifications")
    .orderBy("updatedAt", "desc");

  if (typeof params.startDateMs === "number") {
    query = query.where("updatedAt", ">=", params.startDateMs);
  }
  if (typeof params.endDateMs === "number") {
    query = query.where("updatedAt", "<=", params.endDateMs);
  }
  if (typeof params.cursor === "number" && Number.isFinite(params.cursor)) {
    query = query.startAfter(params.cursor);
  }

  const snapshot = await query.limit(safeLimit).get();
  const logs = snapshot.docs.map((doc) => doc.data() as StoredVerification);
  const lastUpdatedAt = logs.length > 0 ? logs[logs.length - 1].updatedAt : undefined;

  return {
    logs,
    ...(typeof lastUpdatedAt === "number" ? { nextCursor: String(lastUpdatedAt) } : {})
  };
}
