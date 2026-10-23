import multer from "multer";

/**
 * Configure multer storage for in-memory processing.
 * Keeps file buffer in memory to clean, chunk, and embed without writing temporary files.
 */
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["application/pdf", "text/plain"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file format. Only PDF and TXT files are accepted."));
    }
  },
});
