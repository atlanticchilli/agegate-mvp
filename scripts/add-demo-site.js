#!/usr/bin/env node
/**
 * Add a demo site to Firestore for Vercel testing.
 * Usage: node scripts/add-demo-site.js
 * Requires: packages/api/agegate-mvp-firebase-adminsdk-fbsvc-298a3ed249.json
 */

const admin = require("firebase-admin");
const path = require("path");

const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  "../packages/api/agegate-mvp-firebase-adminsdk-fbsvc-298a3ed249.json"
);

const SITE_KEY = "site_demo4vercel1234567890ab";
const SECRET_KEY = "secret_demo4vercel1234567890abcdef1234567890abcdef";

async function main() {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const now = Date.now();
  const doc = {
    operatorId: "demo-operator",
    name: "Vercel Demo",
    domain: "vm-pisyrtxse9vprh2zgh3qtc.vusercontent.net",
    siteKey: SITE_KEY,
    secretKey: SECRET_KEY,
    providers: [
      { providerId: "selfie", enabled: true, credentials: { clientId: "", clientSecret: "" } }
    ],
    verificationValidityPeriod: 86400,
    createdAt: admin.firestore.Timestamp.fromMillis(now),
    updatedAt: admin.firestore.Timestamp.fromMillis(now)
  };

  const ref = await db.collection("sites").add(doc);
  console.log("Demo site created:");
  console.log("  Document ID:", ref.id);
  console.log("  Site Key:", SITE_KEY);
  console.log("");
  console.log("Use this site key in your Vercel demo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
