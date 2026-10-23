import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "../config/db.config.js";
import { User } from "../models/user.model.js";
import { StaffMembership } from "../models/staff-membership.model.js";
import { Bookstore } from "../models/bookstore.model.js";
import { Book } from "../models/book.model.js";
import { Inventory } from "../models/inventory.model.js";
import { Club } from "../models/club.model.js";
import { ClubMembership } from "../models/club-membership.model.js";
import { Meeting } from "../models/meeting.model.js";
import { Discussion } from "../models/discussion.model.js";
import { CatalogSource } from "../models/catalog-source.model.js";
import { Chunk } from "../models/chunk.model.js";
import { Document } from "../models/document.model.js";
import { ReadingList } from "../models/reading-list.model.js";
import { ReadingProgress } from "../models/reading-progress.model.js";
import { generateQueryEmbedding } from "../services/generate-embeddings.service.js";
import { bookstoresSeed, booksSeed, clubsSeed, demoUsersSeed } from "./seed-data.js";

/**
 * Main database seed script.
 * Populates 30+ books, 4 bookstores, store-specific stock, demo users, clubs, meetings, and RAG chunks.
 */
export async function runSeed() {
  console.log("🌱 Starting database seed...");
  await connectDB();

  // 1. Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    StaffMembership.deleteMany({}),
    Bookstore.deleteMany({}),
    Book.deleteMany({}),
    Inventory.deleteMany({}),
    Club.deleteMany({}),
    ClubMembership.deleteMany({}),
    Meeting.deleteMany({}),
    Discussion.deleteMany({}),
    CatalogSource.deleteMany({}),
    Chunk.deleteMany({}),
    Document.deleteMany({}),
    ReadingList.deleteMany({}),
    ReadingProgress.deleteMany({}),
  ]);
  console.log("🧹 Cleared existing collections.");

  // 2. Insert Bookstores
  const createdStores = await Bookstore.insertMany(bookstoresSeed);
  const storeMap = {};
  createdStores.forEach((store) => {
    storeMap[store.slug] = store;
  });
  console.log(`✅ Seeded ${createdStores.length} independent bookstores.`);

  // 3. Insert Books with Embeddings
  console.log("🧠 Generating book embeddings for semantic discovery...");
  const booksToInsert = [];
  for (const book of booksSeed) {
    const textToEmbed = `${book.title}. ${book.description} Themes: ${(book.themes || []).join(", ")}. Genres: ${(book.genres || []).join(", ")}. Moods: ${(book.moods || []).join(", ")}`;
    let embedding = [];
    try {
      embedding = await generateQueryEmbedding(textToEmbed);
    } catch {
      embedding = new Array(768).fill(0.01);
    }
    booksToInsert.push({
      ...book,
      embedding,
      embeddingModel: "nomic-embed-text:latest",
    });
  }
  const createdBooks = await Book.insertMany(booksToInsert);
  console.log(`✅ Seeded ${createdBooks.length} diverse catalog books with vector embeddings.`);

  // 4. Insert Store-Specific Inventory with variations
  console.log("📦 Creating store-specific physical inventory records...");
  const inventoryToInsert = [];

  for (let i = 0; i < createdBooks.length; i++) {
    const book = createdBooks[i];
    const isSpecialLowStockCase = book.title === "The Island of Seven Bells"; // Has insufficient stock for club of 8
    const isZeroStockCase = book.title === "Shadows on Heron Island"; // Zero stock across all stores

    for (const store of createdStores) {
      let onHand = 0;
      let reserved = 0;
      let price = 16.99 + (i % 6);

      if (isZeroStockCase) {
        onHand = 0;
        reserved = 0;
      } else if (isSpecialLowStockCase) {
        // Only 1 copy at Beacon Hill, 1 copy at Powell's, 0 at others (total 2 copies across all stores)
        if (store.slug === "beacon-hill-books" || store.slug === "powells-corner-books") {
          onHand = 1;
        } else {
          onHand = 0;
        }
      } else {
        // Normal stock variations: 2 to 10 copies on hand
        onHand = ((i * 3 + store.name.length) % 9) + 2;
        reserved = i % 3 === 0 ? 1 : 0;
      }

      inventoryToInsert.push({
        bookId: book._id,
        storeId: store._id,
        condition: i % 4 === 0 ? "used_like_new" : "new",
        format: "paperback",
        quantityOnHand: onHand,
        quantityReserved: reserved,
        price,
        pickupWindows: "Ready for pickup within 2 business hours.",
      });

      // Add occasional hardcover / used collector copy
      if (i % 5 === 0) {
        inventoryToInsert.push({
          bookId: book._id,
          storeId: store._id,
          condition: "collector",
          format: "hardcover",
          quantityOnHand: 1,
          quantityReserved: 0,
          price: 32.0,
          pickupWindows: "Stored in locked case. In-store inspection welcomed.",
        });
      }
    }
  }
  await Inventory.insertMany(inventoryToInsert);
  console.log(`✅ Seeded ${inventoryToInsert.length} store-specific inventory records.`);

  // 5. Insert Demo Users with Hashed Passwords
  console.log("👤 Creating demo user accounts for Reader, Bookseller, Moderator, and Admin...");
  const userMap = {};
  const salt = await bcrypt.genSalt(10);

  for (const demoUser of demoUsersSeed) {
    const passwordHash = await bcrypt.hash(demoUser.password, salt);
    const user = await User.create({
      name: demoUser.name,
      email: demoUser.email.toLowerCase(),
      passwordHash,
      emailVerified: demoUser.emailVerified,
      isSystemAdmin: demoUser.isSystemAdmin,
      accountStatus: "active",
    });
    userMap[demoUser.role] = user;
    userMap[demoUser.email] = user;
  }

  // 6. Assign Staff Memberships
  // Evelyn Bookseller -> Beacon Hill Books
  const booksellerUser = userMap["bookseller@beaconhill.demo"];
  const beaconHillStore = storeMap["beacon-hill-books"];
  await StaffMembership.create({
    userId: booksellerUser._id,
    role: "bookseller",
    storeId: beaconHillStore._id,
    status: "active",
  });

  // 7. Insert Reading Clubs
  console.log("📖 Setting up reading clubs, meetings, and discussions...");
  const createdClubs = [];
  const moderatorUser = userMap["moderator@bookclub.demo"];
  const readerUser = userMap["reader@indiebooks.demo"];

  for (const clubData of clubsSeed) {
    const club = await Club.create({
      ...clubData,
      createdBy: moderatorUser._id,
      currentBookId: createdBooks[0]._id, // "The Coastal Tide Murder"
    });
    createdClubs.push(club);

    // Moderator membership
    await ClubMembership.create({
      clubId: club._id,
      userId: moderatorUser._id,
      role: "moderator",
      status: "active",
    });

    // Reader membership
    await ClubMembership.create({
      clubId: club._id,
      userId: readerUser._id,
      role: "member",
      status: "active",
    });
  }

  const coastalClub = createdClubs[0];

  // Assign staff membership for moderator
  await StaffMembership.create({
    userId: moderatorUser._id,
    role: "moderator",
    clubId: coastalClub._id,
    status: "active",
  });

  // 8. Create Club Meetings
  // Upcoming meeting in 10 days
  const upcomingMeeting = await Meeting.create({
    clubId: coastalClub._id,
    title: "Discussing Chapters 1 to 5 of The Coastal Tide Murder",
    scheduledAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    timezone: "America/New_York",
    durationMinutes: 75,
    bookId: createdBooks[0]._id,
    readingTarget: "Chapters 1 through 5",
    targetChapter: 5,
    agenda: "1. Introductions and first impressions.\n2. Atmospheric coastal setting.\n3. The drowned friend's journal clue.\n4. Suspect list brainstorm.",
    status: "upcoming",
    createdBy: moderatorUser._id,
  });

  // Past meeting
  await Meeting.create({
    clubId: coastalClub._id,
    title: "Previous Book Wrap-up: Dead Calm on the Reach",
    scheduledAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    timezone: "America/New_York",
    durationMinutes: 60,
    bookId: createdBooks[8]._id,
    readingTarget: "Full Book",
    targetChapter: 15,
    agenda: "Final discussion and rating.",
    status: "completed",
    createdBy: moderatorUser._id,
  });

  // 9. Create Discussions (with spoiler tags and moderation examples)
  await Discussion.create({
    clubId: coastalClub._id,
    meetingId: upcomingMeeting._id,
    authorId: moderatorUser._id,
    content: "Welcome everyone to our new reading cycle! Please remember to tag your posts if you discuss clues beyond Chapter 3.",
    hasSpoilers: false,
    spoilerChapter: 0,
    status: "visible",
  });

  await Discussion.create({
    clubId: coastalClub._id,
    meetingId: upcomingMeeting._id,
    authorId: readerUser._id,
    content: "I just finished Chapter 2! The description of the lighthouse horn blowing in the thick fog is so vivid.",
    hasSpoilers: false,
    spoilerChapter: 2,
    status: "visible",
  });

  await Discussion.create({
    clubId: coastalClub._id,
    meetingId: upcomingMeeting._id,
    authorId: readerUser._id,
    content: "Warning for Chapter 4: Leo finds an old rusted key inside the tackle box! Could this open the boathouse?",
    hasSpoilers: true,
    spoilerChapter: 4,
    spoilerSummary: "Finds key inside tackle box in Chapter 4",
    status: "visible",
  });

  // Moderated discussion example with recorded reason
  await Discussion.create({
    clubId: coastalClub._id,
    meetingId: upcomingMeeting._id,
    authorId: userMap["Noah Unverified"]?._id || readerUser._id,
    content: "Spam message promoting external ticket sales for an unrelated concert.",
    hasSpoilers: false,
    status: "hidden",
    moderationReason: "Unsolicited promotional spam violating club discussion conduct guidelines.",
    moderatedBy: moderatorUser._id,
    moderatedAt: new Date(),
  });

  // 10. Seed Approved Excerpts & Documents for Grounded RAG
  console.log("📑 Indexing approved excerpts and store policies for spoiler-aware RAG...");
  const coastalBook = createdBooks[0]; // The Coastal Tide Murder

  const policyDoc = await Document.create({
    title: "Beacon Hill Books Store Policy & Pickup Guidelines",
    originalName: "beacon_hill_policy.txt",
    fileType: "text/plain",
    documentType: "store_policy",
    storeId: beaconHillStore._id,
    processingStatus: "ready",
    chunkCount: 2,
    uploadedBy: booksellerUser._id,
  });

  const excerptDoc = await Document.create({
    title: "The Coastal Tide Murder - Approved Reader's Guide & Excerpts",
    originalName: "coastal_tide_excerpts.txt",
    fileType: "text/plain",
    documentType: "book_excerpt",
    bookId: coastalBook._id,
    processingStatus: "ready",
    chunkCount: 4,
    uploadedBy: booksellerUser._id,
  });

  // Chunks for Beacon Hill policy
  const policyChunk1 = "Beacon Hill Books & Cafe maintains a 48-hour hold window for all confirmed reader reservations. Customers must present a valid government or student ID matching the reservation name, or provide their reservation confirmation number. If copies are not collected within 48 hours, holds automatically expire and items return to open shelves.";
  const policyChunk2 = "Pickup hours at Beacon Hill Books are Tuesday through Saturday from 10:00 AM to 6:00 PM, and Sunday from 12:00 PM to 5:00 PM. The cafe counter does not handle book holds; please visit the main register on the first floor.";

  await Chunk.create({
    documentId: policyDoc._id,
    storeId: beaconHillStore._id,
    chunkIndex: 0,
    chunkText: policyChunk1,
    embedding: await generateQueryEmbedding(policyChunk1),
    embeddingModel: "nomic-embed-text:latest",
    spoilerLevel: "none",
    scope: "public",
  });

  await Chunk.create({
    documentId: policyDoc._id,
    storeId: beaconHillStore._id,
    chunkIndex: 1,
    chunkText: policyChunk2,
    embedding: await generateQueryEmbedding(policyChunk2),
    embeddingModel: "nomic-embed-text:latest",
    spoilerLevel: "none",
    scope: "public",
  });

  // Chunks for The Coastal Tide Murder with chapter & spoiler tagging
  const ch1Text = "Chapter 1: The fog rolled off Penobscot Bay like cold cotton wool. From the lantern gallery of Heron Head Light, Leo watched the swells crash against Black Ledge. It had been twelve years since Julian last set foot in town, but the telegram in Leo's pocket was postmarked yesterday from the harbor post office: 'Meet me at the tide pool where we buried the cedar box.'";
  const ch3Text = "Chapter 3: Low tide revealed the salt-crusted timber of the old cannery pier. When the diver surfaced, he carried a rusted tackle box tied with fisherman's twine. Inside lay Julian's brass pocket watch, stopped at precisely twenty-four minutes past midnight, and a wet ledger page with three names crossed out in indelible blue ink.";
  const ch10Text = "Chapter 10: Major Climax (SPOILER): In the storm cellar beneath the abandoned cannery, Leo confronts Arthur Pendelton. The ledger names were not victims, but silent partners in the offshore smuggling ring. Julian had not drowned by accident; he had been trapped in the sea cave when the floodgate was deliberately lowered.";

  await Chunk.create({
    documentId: excerptDoc._id,
    bookId: coastalBook._id,
    chunkIndex: 0,
    chunkText: ch1Text,
    embedding: await generateQueryEmbedding(ch1Text),
    embeddingModel: "nomic-embed-text:latest",
    chapter: 1,
    pageNumber: 12,
    spoilerLevel: "none",
    scope: "public",
  });

  await Chunk.create({
    documentId: excerptDoc._id,
    bookId: coastalBook._id,
    chunkIndex: 1,
    chunkText: ch3Text,
    embedding: await generateQueryEmbedding(ch3Text),
    embeddingModel: "nomic-embed-text:latest",
    chapter: 3,
    pageNumber: 48,
    spoilerLevel: "mild",
    scope: "public",
  });

  await Chunk.create({
    documentId: excerptDoc._id,
    bookId: coastalBook._id,
    chunkIndex: 2,
    chunkText: ch10Text,
    embedding: await generateQueryEmbedding(ch10Text),
    embeddingModel: "nomic-embed-text:latest",
    chapter: 10,
    pageNumber: 260,
    spoilerLevel: "ending",
    scope: "public",
  });

  // 11. Reading Lists & Progress for Clara Reader
  console.log("📚 Setting up reading lists and progress checkpoints for Clara Reader...");
  const wantToReadList = await ReadingList.create({
    ownerId: readerUser._id,
    name: "Want to Read",
    description: "My TBR pile from indie bookstore browsing.",
    visibility: "private",
    isDefaultSystemList: true,
    books: [
      { bookId: createdBooks[1]._id, addedAt: new Date(), notes: "Recommended for fans of maritime mysteries" },
      { bookId: createdBooks[10]._id, addedAt: new Date(), notes: "Tea garden fantasy with found family" },
    ],
  });

  const currentlyReadingList = await ReadingList.create({
    ownerId: readerUser._id,
    name: "Currently Reading",
    description: "Books in my bag this week.",
    visibility: "private",
    isDefaultSystemList: true,
    books: [{ bookId: coastalBook._id, addedAt: new Date(), notes: "For the Coastal Mystery Society meeting" }],
  });

  await ReadingList.create({
    ownerId: readerUser._id,
    name: "Finished",
    description: "Books completed this year.",
    visibility: "private",
    isDefaultSystemList: true,
    books: [{ bookId: createdBooks[8]._id, addedAt: new Date(), notes: "Loved the sea reach setting!" }],
  });

  // Reading progress for Clara on The Coastal Tide Murder (Currently on Chapter 4, progress_limited)
  await ReadingProgress.create({
    readerId: readerUser._id,
    bookId: coastalBook._id,
    status: "reading",
    currentPage: 64,
    currentChapter: 4,
    spoilerMode: "progress_limited",
    maximumPermittedChapter: 4,
    maximumPermittedPage: 64,
    visibility: "club",
    privateNotes: "Suspecting Arthur or the harbor master. Need to re-read Chapter 3 clue.",
  });

  console.log("🎉 Database seeding completed successfully!");
  console.log("-------------------------------------------------------------------");
  console.log("DEMO ACCOUNTS READY:");
  console.log("1. Reader:      reader@indiebooks.demo      | Pass: ReaderPass123!     (Email Verified)");
  console.log("2. Unverified:  unverified@indiebooks.demo  | Pass: ReaderPass123!     (Unverified Email)");
  console.log("3. Bookseller:  bookseller@beaconhill.demo  | Pass: BooksellerPass123! (Beacon Hill Books)");
  console.log("4. Moderator:   moderator@bookclub.demo     | Pass: ModeratorPass123!  (Coastal Mystery Society)");
  console.log("5. Admin:       admin@indiebooks.demo       | Pass: AdminPass123!      (System Administrator)");
  console.log("-------------------------------------------------------------------");

  await disconnectDB();
}

// Execute seed if run directly
if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  runSeed().catch((err) => {
    console.error("Seed execution failed:", err);
    process.exit(1);
  });
}
