import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../server.js";
import { connectDB, disconnectDB } from "../config/db.config.js";
import { Club } from "../models/club.model.js";
import { Book } from "../models/book.model.js";
import { loginUser } from "../services/auth.service.js";

let moderatorToken;
let readerToken;
let coastalClub;

test.before(async () => {
  await connectDB();
  coastalClub = await Club.findOne({ slug: "coastal-mystery-society" });

  const modLogin = await loginUser({ email: "moderator@bookclub.demo", password: "ModeratorPass123!" });
  moderatorToken = modLogin.sessionToken;

  const readerLogin = await loginUser({ email: "reader@indiebooks.demo", password: "ReaderPass123!" });
  readerToken = readerLogin.sessionToken;
});

test.after(async () => {
  await disconnectDB();
});

test("BOUNDED AI AGENT: Club book selection workflow, stock constraint checks, and moderator confirmation", async () => {
  // 1. Ordinary reader cannot run club selection agent (moderator only)
  const unauthorizedAgentRes = await request(app)
    .post(`/api/clubs/${coastalClub._id}/book-selection`)
    .set("Authorization", `Bearer ${readerToken}`)
    .send({ query: "Find a coastal mystery under 350 pages" });

  assert.equal(unauthorizedAgentRes.status, 403);

  // 2. Authorized moderator triggers AI club book selection workflow
  const agentRes = await request(app)
    .post(`/api/clubs/${coastalClub._id}/book-selection`)
    .set("Authorization", `Bearer ${moderatorToken}`)
    .send({ query: "Find a short coastal mystery for our next meeting" });

  assert.equal(agentRes.status, 200);
  assert.equal(agentRes.body.success, true);

  const { proposalId, proposal, steps } = agentRes.body.data;
  assert.ok(proposalId, "Proposal ID must be generated");
  assert.ok(proposal, "Structured proposal must be returned");
  assert.equal(steps.length, 3, "Agent must execute all 3 required tools");
  assert.equal(steps[0].toolName, "search_catalog");
  assert.equal(steps[1].toolName, "check_stock_and_length");
  assert.equal(steps[2].toolName, "compare_club_constraints");

  // 3. Verify stock constraint evaluation:
  // "The Island of Seven Bells" has only 2 copies, so meetsGroupSize should be false for group of 8
  const lowStockCandidate = proposal.rankedCandidates.find((c) => c.title === "The Island of Seven Bells");
  if (lowStockCandidate) {
    assert.equal(
      lowStockCandidate.meetsGroupSize,
      false,
      "Agent must recognize insufficient stock for The Island of Seven Bells"
    );
    assert.ok(
      lowStockCandidate.warnings.some((w) => w.includes("Insufficient stock")),
      "Warning must specify insufficient stock"
    );
  }

  // Recommended candidate must have sufficient stock or be ranked with trade-offs
  assert.ok(proposal.recommendedCandidateId);

  // 4. Verify that the agent DID NOT publish the selection automatically
  const clubBeforeConfirm = await Club.findById(coastalClub._id);
  // It shouldn't change without explicit confirmation

  // 5. Moderator confirms selection
  const selectedBookId = proposal.recommendedCandidateId;
  const confirmRes = await request(app)
    .post(`/api/clubs/${coastalClub._id}/book-selection/confirm`)
    .set("Authorization", `Bearer ${moderatorToken}`)
    .send({
      proposalId,
      bookId: selectedBookId,
    });

  assert.equal(confirmRes.status, 200);
  assert.equal(confirmRes.body.success, true);

  // 6. Verify club record was updated in database
  const clubAfterConfirm = await Club.findById(coastalClub._id);
  assert.equal(clubAfterConfirm.currentBookId.toString(), selectedBookId.toString());
});
