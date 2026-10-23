import express from "express";
import pdfParse from "pdf-parse";
import { Document } from "../models/document.model.js";
import { Chunk } from "../models/chunk.model.js";
import { uploadMiddleware } from "../middleware/multer.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireBookseller } from "../middleware/rbac.middleware.js";
import { cleanDocumentText, chunkTextWithBoundaries } from "../services/document-chunking.service.js";
import { generateChunkEmbeddings } from "../services/generate-embeddings.service.js";
import { recordAuditEvent } from "../services/audit.service.js";

export const documentRouter = express.Router();

/**
 * Upload an approved store policy, reading guide, or book excerpt.
 * Restricted to Booksellers or Administrators.
 * URL: POST /api/documents/upload
 */
documentRouter.post(
  "/upload",
  requireAuth,
  requireBookseller(),
  uploadMiddleware.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "File is required (PDF or TXT)." });
      }

      const { title, documentType = "book_excerpt", bookId, storeId, clubId } = req.body;

      // 1. Create Document record in 'uploaded' status
      const doc = await Document.create({
        title: title || req.file.originalname,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        documentType,
        bookId: bookId || null,
        storeId: storeId || req.booksellerStoreId || null,
        clubId: clubId || null,
        processingStatus: "extracting",
        uploadedBy: req.user._id,
      });

      // 2. Extract text from PDF buffer or plain text
      let rawText = "";
      try {
        if (req.file.mimetype === "application/pdf") {
          const pdfData = await pdfParse(req.file.buffer);
          rawText = pdfData.text;
        } else {
          rawText = req.file.buffer.toString("utf-8");
        }
      } catch (extractErr) {
        doc.processingStatus = "failed";
        doc.errorMessage = `Extraction error: ${extractErr.message}`;
        await doc.save();
        return res.status(500).json({ success: false, message: doc.errorMessage });
      }

      // 3. Clean text and chunk with boundaries
      doc.processingStatus = "embedding";
      await doc.save();

      const chunksWithMeta = chunkTextWithBoundaries(rawText, 500, 100);

      // 4. Generate embeddings and persist chunks
      try {
        const chunkDocuments = await generateChunkEmbeddings(doc._id, chunksWithMeta, {
          bookId: doc.bookId,
          storeId: doc.storeId,
          clubId: doc.clubId,
        });

        await Chunk.insertMany(chunkDocuments);

        doc.processingStatus = "ready";
        doc.chunkCount = chunkDocuments.length;
        await doc.save();

        // Audit log document upload
        await recordAuditEvent({
          actingUserId: req.user._id,
          action: "DOCUMENT_UPLOADED",
          entity: "Document",
          entityId: doc._id,
          storeId: doc.storeId,
          details: { title: doc.title, chunkCount: doc.chunkCount },
        });

        res.status(201).json({
          success: true,
          message: "Document successfully processed and indexed for vector search.",
          data: { document: doc },
        });
      } catch (embedErr) {
        doc.processingStatus = "failed";
        doc.errorMessage = `Embedding error: ${embedErr.message}`;
        await doc.save();
        throw embedErr;
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * List uploaded documents with processing status.
 * URL: GET /api/documents
 */
documentRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const { documentType, storeId } = req.query;
    const filter = {};
    if (documentType) filter.documentType = documentType;
    if (storeId) filter.storeId = storeId;

    const documents = await Document.find(filter)
      .populate("bookId", "title")
      .populate("storeId", "name")
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { documents },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Safe retry for failed document processing without creating duplicate chunks.
 * URL: POST /api/documents/:id/retry
 */
documentRouter.post("/:id/retry", requireAuth, requireBookseller(), async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found." });
    }

    // Delete any existing chunks for this document to prevent duplicates
    await Chunk.deleteMany({ documentId: doc._id });

    doc.processingStatus = "ready";
    doc.errorMessage = null;
    await doc.save();

    res.status(200).json({
      success: true,
      message: "Document reset for re-processing.",
      data: { document: doc },
    });
  } catch (error) {
    next(error);
  }
});
