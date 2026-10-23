import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../server.js";
import { connectDB, disconnectDB } from "../config/db.config.js";
import { User } from "../models/user.model.js";
import { Session } from "../models/session.model.js";

test.before(async () => {
  await connectDB();
});

test.after(async () => {
  await disconnectDB();
});

test("AUTH WORKFLOW: Register, verify email, login, and prevent unauthorized staff self-granting", async () => {
  const uniqueEmail = `testreader_${Date.now()}@example.com`;

  // 1. Register new reader
  const registerRes = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Test Reader",
      email: uniqueEmail,
      password: "TestPassword123!",
    });

  assert.equal(registerRes.status, 201);
  assert.equal(registerRes.body.success, true);
  assert.equal(registerRes.body.data.user.email, uniqueEmail);
  assert.equal(registerRes.body.data.user.emailVerified, false);

  const verificationToken = registerRes.body.data.verificationToken;
  assert.ok(verificationToken, "Verification token should be returned in development");

  // 2. Unverified reader login attempt
  const loginUnverifiedRes = await request(app)
    .post("/api/auth/login")
    .send({
      email: uniqueEmail,
      password: "TestPassword123!",
    });

  assert.equal(loginUnverifiedRes.status, 200);
  const unverifiedToken = loginUnverifiedRes.body.data.sessionToken;

  // 3. Unverified reader cannot reserve copies
  const bookRes = await request(app).get("/api/books?limit=1");
  const sampleBook = bookRes.body.data.books[0];
  const sampleStore = sampleBook.inventorySummary.stores[0];

  const reserveUnverifiedRes = await request(app)
    .post(`/api/books/${sampleBook._id}/reservations`)
    .set("Authorization", `Bearer ${unverifiedToken}`)
    .send({
      storeId: sampleStore.storeId,
      condition: "new",
      format: "paperback",
      quantity: 1,
    });

  assert.equal(reserveUnverifiedRes.status, 403);
  assert.equal(reserveUnverifiedRes.body.code, "EMAIL_NOT_VERIFIED");

  // 4. Verify email
  const verifyRes = await request(app)
    .post("/api/auth/verify-email")
    .send({ token: verificationToken });

  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.body.data.user.emailVerified, true);

  // 5. Sign in verified reader
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({
      email: uniqueEmail,
      password: "TestPassword123!",
    });

  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.body.data.sessionToken);
  const sessionToken = loginRes.body.data.sessionToken;

  // 6. Verified reader GET /api/auth/me
  const meRes = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${sessionToken}`);

  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.data.user.email, uniqueEmail);

  // 7. Ordinary reader cannot grant themselves a privileged staff role
  const selfGrantRes = await request(app)
    .patch(`/api/users/${meRes.body.data.user._id}/staff-role`)
    .set("Authorization", `Bearer ${sessionToken}`)
    .send({
      role: "admin",
      status: "active",
      reason: "Attempting self escalation",
    });

  assert.equal(selfGrantRes.status, 403);
  assert.equal(selfGrantRes.body.success, false);

  // Clean up test user
  await User.deleteOne({ email: uniqueEmail });
  await Session.deleteMany({ userId: meRes.body.data.user._id });
});
