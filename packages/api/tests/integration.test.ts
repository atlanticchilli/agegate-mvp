import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/index";
import { getDb } from "../src/lib/firebase";

const app = createApp();
const siteId = "site-test";
const siteKey = "site_key_test";

async function seedSite(): Promise<void> {
  await getDb().collection("sites").doc(siteId).set({
    operatorId: "op-1",
    name: "Test Site",
    domain: "example.test",
    siteKey,
    secretKey: "super-secret-signing-key",
    providers: [
      {
        providerId: "mock",
        credentials: {
          clientId: "mock-client",
          clientSecret: "mock-secret"
        },
        enabled: true
      },
      {
        providerId: "verifymyage",
        credentials: {
          clientId: "unused",
          clientSecret: "unused"
        },
        enabled: false
      }
    ],
    verificationValidityPeriod: 3600,
    createdAt: {
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0
    }
  });
}

async function clearData(): Promise<void> {
  await getDb().recursiveDelete(getDb().collection("sites").doc(siteId));
}

async function createFirebaseIdToken(): Promise<string> {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
  const response = await fetch(
    `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        email: "logs-viewer@example.com",
        password: "Test12345!",
        returnSecureToken: true
      })
    }
  );

  const responseText = await response.text();
  assert.equal(response.ok, true, responseText);
  const payload = JSON.parse(responseText) as { idToken: string };
  return payload.idToken;
}

test.before(async () => {
  process.env.NODE_ENV = "test";
  await clearData();
  await seedSite();
});

test.after(async () => {
  await clearData();
});

test("core flow: create -> verify -> callback -> status", async () => {
  const createResponse = await request(app)
    .post("/api/session/create")
    .set("x-forwarded-for", "81.2.69.142")
    .set("user-agent", "integration-test")
    .send({ siteKey });

  assert.equal(createResponse.status, 200, JSON.stringify(createResponse.body));
  assert.ok(createResponse.body.sessionId);
  assert.ok(Array.isArray(createResponse.body.availableMethods));
  assert.ok(createResponse.body.config?.verificationValidityPeriod);

  const sessionId = String(createResponse.body.sessionId);
  const mockMethod = createResponse.body.availableMethods.find(
    (method: { provider: string; method: string }) => method.provider === "mock"
  );
  assert.ok(mockMethod);

  const verifyResponse = await request(app).post("/api/session/verify").send({
    sessionId,
    selectedMethod: mockMethod.method,
    selectedProvider: "mock"
  });
  assert.equal(verifyResponse.status, 200, JSON.stringify(verifyResponse.body));
  assert.equal(typeof verifyResponse.body.verificationUrl, "string");

  const callbackResponse = await request(app).post("/api/callback/mock").send({
    sessionId,
    result: "pass",
    method: mockMethod.method
  });
  assert.equal(callbackResponse.status, 200, JSON.stringify(callbackResponse.body));

  const statusResponse = await request(app).get(`/api/session/${sessionId}/status`);
  assert.equal(statusResponse.status, 200, JSON.stringify(statusResponse.body));
  assert.equal(statusResponse.body.status, "verified");
  assert.equal(statusResponse.body.verified, true);
  assert.equal(statusResponse.body.ageCategory, "adult");
  assert.equal(typeof statusResponse.body.token, "string");
});

test("logs endpoints require Firebase ID token and return records", async () => {
  const verificationId = `seed-${Date.now()}`;
  await getDb()
    .collection("sites")
    .doc(siteId)
    .collection("verifications")
    .doc(verificationId)
    .set({
      id: verificationId,
      siteId,
      jurisdiction: "GB",
      availableMethods: [],
      status: "verified",
      userIpHash: "seed",
      userAgent: "seed",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

  const unauthorized = await request(app).get(`/api/logs?siteId=${siteId}`);
  assert.equal(unauthorized.status, 401);

  const idToken = await createFirebaseIdToken();
  const logsResponse = await request(app)
    .get(`/api/logs?siteId=${siteId}`)
    .set("authorization", `Bearer ${idToken}`);

  assert.equal(logsResponse.status, 200);
  assert.ok(Array.isArray(logsResponse.body.logs));
  assert.ok(logsResponse.body.logs.length >= 1);
  assert.ok(["string", "undefined"].includes(typeof logsResponse.body.nextCursor));

  const exportResponse = await request(app)
    .get(`/api/logs/export?siteId=${siteId}`)
    .set("authorization", `Bearer ${idToken}`);
  assert.equal(exportResponse.status, 200);
  assert.match(String(exportResponse.text), /sessionId,status,verified/);
});
