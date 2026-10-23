import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../server.js";
import { connectDB, disconnectDB } from "../config/db.config.js";
import { User } from "../models/user.model.js";
import { Bookstore } from "../models/bookstore.model.js";
import { Book } from "../models/book.model.js";
import { Inventory } from "../models/inventory.model.js";
import { Reservation } from "../models/reservation.model.js";
import { loginUser } from "../services/auth.service.js";
import bcrypt from "bcryptjs";

let readerToken1;
let readerToken2;
let booksellerToken;
let testBook;
let testStore;
let targetInventory;

test.before(async () => {
  await connectDB();

  // Find or create test store
  testStore = await Bookstore.findOne({ slug: "beacon-hill-books" });
  testBook = await Book.findOne({ title: "The Coastal Tide Murder" });

  // Login demo reader 1
  const login1 = await loginUser({ email: "reader@indiebooks.demo", password: "ReaderPass123!" });
  readerToken1 = login1.sessionToken;

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("ReaderPass123!", salt);
  await User.findOneAndUpdate(
    { email: "reader2@concurrency.test" },
    {
      name: "Reader Two",
      email: "reader2@concurrency.test",
      passwordHash,
      emailVerified: true,
      accountStatus: "active",
    },
    { upsert: true, returnDocument: "after" }
  );

  const login2 = await loginUser({ email: "reader2@concurrency.test", password: "ReaderPass123!" });
  readerToken2 = login2.sessionToken;

  // Login demo bookseller
  const booksellerLogin = await loginUser({ email: "bookseller@beaconhill.demo", password: "BooksellerPass123!" });
  booksellerToken = booksellerLogin.sessionToken;
});

test.after(async () => {
  await disconnectDB();
});

test("INVENTORY & CONCURRENCY: Race condition test for reserving the last available copy", async () => {
  // Set inventory stock to exactly 1 copy on hand, 0 reserved
  targetInventory = await Inventory.findOneAndUpdate(
    {
      bookId: testBook._id,
      storeId: testStore._id,
      condition: "new",
      format: "paperback",
    },
    {
      quantityOnHand: 1,
      quantityReserved: 0,
    },
    { new: true, upsert: true }
  );

  assert.equal(targetInventory.availableQuantity, 1);

  // SIMULTANEOUS CONCURRENT RESERVATION REQUESTS
  // Two readers both request the last copy at the exact same moment
  const [res1, res2] = await Promise.all([
    request(app)
      .post(`/api/books/${testBook._id}/reservations`)
      .set("Authorization", `Bearer ${readerToken1}`)
      .send({
        storeId: testStore._id.toString(),
        condition: "new",
        format: "paperback",
        quantity: 1,
        idempotencyKey: "race_key_reader1_" + Date.now(),
      }),
    request(app)
      .post(`/api/books/${testBook._id}/reservations`)
      .set("Authorization", `Bearer ${readerToken2}`)
      .send({
        storeId: testStore._id.toString(),
        condition: "new",
        format: "paperback",
        quantity: 1,
        idempotencyKey: "race_key_reader2_" + Date.now(),
      }),
  ]);

  const statuses = [res1.status, res2.status].sort();

  // STRICT REQUIREMENT: Exactly one reservation must succeed (201) and the other must fail with conflict (409)
  assert.deepEqual(
    statuses,
    [201, 409],
    "Concurrent reservations for the last copy must result in exactly one 201 Created and one 409 Conflict"
  );

  // Verify inventory state in database: quantityReserved must be exactly 1, available must be 0
  const afterInventory = await Inventory.findById(targetInventory._id);
  assert.equal(afterInventory.quantityReserved, 1);
  assert.equal(afterInventory.availableQuantity, 0);

  // The successful reservation
  const successfulRes = res1.status === 201 ? res1 : res2;
  const reservationId = successfulRes.body.data.reservation._id;

  // TEST IDEMPOTENCY KEY: Submitting the identical reservation with same key must return existing reservation
  const idempotencyKey = successfulRes.request._data.idempotencyKey;
  const duplicateRes = await request(app)
    .post(`/api/books/${testBook._id}/reservations`)
    .set("Authorization", `Bearer ${readerToken1}`)
    .send({
      storeId: testStore._id.toString(),
      condition: "new",
      format: "paperback",
      quantity: 1,
      idempotencyKey,
    });

  assert.equal(duplicateRes.status, 201);
  assert.equal(duplicateRes.body.data.isExisting, true);

  // TEST CANCELLATION RESTORES STOCK
  const winnerToken = res1.status === 201 ? readerToken1 : readerToken2;
  const cancelRes = await request(app)
    .post(`/api/reservations/${reservationId}/cancel`)
    .set("Authorization", `Bearer ${winnerToken}`)
    .send({ reason: "Changed my mind" });

  assert.equal(cancelRes.status, 200);
  assert.equal(cancelRes.body.data.reservation.status, "cancelled");

  // Verify stock was restored
  const restoredInventory = await Inventory.findById(targetInventory._id);
  assert.equal(restoredInventory.quantityReserved, 0);
  assert.equal(restoredInventory.availableQuantity, 1);

  // CANNOT COLLECT A CANCELLED RESERVATION
  const invalidCollectRes = await request(app)
    .post(`/api/reservations/${reservationId}/collection`)
    .set("Authorization", `Bearer ${booksellerToken}`)
    .send({});

  assert.equal(invalidCollectRes.status, 400);
  assert.match(invalidCollectRes.body.message, /Cannot collect reservation/i);
});
