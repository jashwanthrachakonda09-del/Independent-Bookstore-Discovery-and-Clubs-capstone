import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../server.js";
import { connectDB, disconnectDB } from "../config/db.config.js";
import { Book } from "../models/book.model.js";
import { ReadingProgress } from "../models/reading-progress.model.js";
import { loginUser } from "../services/auth.service.js";

let readerToken;
let coastalBook;

test.before(async () => {
  await connectDB();
  coastalBook = await Book.findOne({ title: "The Coastal Tide Murder" });

  const login = await loginUser({ email: "reader@indiebooks.demo", password: "ReaderPass123!" });
  readerToken = login.sessionToken;
});

test.after(async () => {
  await disconnectDB();
});

test("SPOILER-AWARE RAG: Reader boundary enforcement, citation tracking, and anti-hallucination", async () => {
  // 1. Ensure reader has progress set to Chapter 4 (progress_limited)
  await request(app)
    .patch("/api/reading-progress")
    .set("Authorization", `Bearer ${readerToken}`)
    .send({
      bookId: coastalBook._id.toString(),
      currentChapter: 4,
      spoilerMode: "progress_limited",
      maximumPermittedChapter: 4,
    });

  // 2. Query asking for the ending (Chapter 10 climax)
  const endingQueryRes = await request(app)
    .post("/api/book-chat")
    .set("Authorization", `Bearer ${readerToken}`)
    .send({
      bookId: coastalBook._id.toString(),
      query: "Tell me how the book ends and who the killer is.",
    });

  assert.equal(endingQueryRes.status, 200);
  assert.equal(
    endingQueryRes.body.data.spoilerBlocked,
    true,
    "Assistant must block ending revelation for progress-limited reader"
  );
  assert.match(
    endingQueryRes.body.data.answer,
    /respect your spoiler preferences/i,
    "Response must cite reader's spoiler settings"
  );

  // 3. Query within permitted boundary (Chapter 1 to 4)
  const permittedQueryRes = await request(app)
    .post("/api/book-chat")
    .set("Authorization", `Bearer ${readerToken}`)
    .send({
      bookId: coastalBook._id.toString(),
      query: "What is the setting and what was Julian's pocket watch stopped at in Chapter 3?",
    });

  assert.equal(permittedQueryRes.status, 200);
  assert.ok(permittedQueryRes.body.data.answer);
  assert.ok(Array.isArray(permittedQueryRes.body.data.citations));

  // 4. Query for completely unmentioned information (no hallucination)
  const unsupportedQueryRes = await request(app)
    .post("/api/book-chat")
    .set("Authorization", `Bearer ${readerToken}`)
    .send({
      bookId: coastalBook._id.toString(),
      query: "What was the brand of bicycle Julian rode to school in 1995?",
    });

  assert.equal(unsupportedQueryRes.status, 200);
  assert.match(
    unsupportedQueryRes.body.data.answer,
    /(could not find enough information|offline mode)/i,
    "Assistant must declare lack of information rather than fabricating plot details"
  );
});
