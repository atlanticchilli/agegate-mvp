import { getDb } from "../lib/firebase";

export async function writeAuditEvent(params: {
  siteId: string;
  verificationId: string;
  action: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const verificationRef = getDb()
    .collection("sites")
    .doc(params.siteId)
    .collection("verifications")
    .doc(params.verificationId);

  await verificationRef.collection("audit").add({
    action: params.action,
    details: params.details ?? {},
    timestamp: Date.now()
  });
}
