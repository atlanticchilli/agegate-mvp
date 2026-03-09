import admin from "firebase-admin";

let initialized = false;

function getProjectId(): string {
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "demo-agegate"
  );
}

function ensureInitialized(): void {
  if (initialized) {
    return;
  }

  admin.initializeApp({
    projectId: getProjectId()
  });
  initialized = true;
}

export function getDb(): FirebaseFirestore.Firestore {
  ensureInitialized();
  return admin.firestore();
}

export function getAuth(): admin.auth.Auth {
  ensureInitialized();
  return admin.auth();
}
