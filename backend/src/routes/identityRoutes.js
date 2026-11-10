
const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const {
  submitIdentity,
  uploadIdentityDocuments,
  getMyIdentityStatus,
  getPendingIdentityReviews,
  getIdentityDocument,
  reviewIdentity,
  recordManualQrReview,
  getQrAuditHistory,
} = require("../controllers/identityController");

const {
  authenticate,
  authorize,
} = require("../middleware/authMiddleware");
const router = express.Router();

const PRIVATE_UPLOAD_DIR = path.resolve(
  __dirname,
  "../../private-identity-documents"
);

fs.mkdirSync(PRIVATE_UPLOAD_DIR, {
  recursive: true,
  mode: 0o700,
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const extensionByMimeType = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, PRIVATE_UPLOAD_DIR);
  },

  filename: (req, file, callback) => {
    const extension = extensionByMimeType[file.mimetype];

    if (!extension) {
      return callback(new Error("Unsupported document file type."));
    }

    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 2,
    fields: 5,
  },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(
        new Error("Only PDF, JPEG, and PNG files are allowed.")
      );
    }

    callback(null, true);
  },
});

const documentUpload = upload.fields([
  { name: "aadhaarDocument", maxCount: 1 },
  { name: "voterIdDocument", maxCount: 1 },
]);

router.post(
  "/submit",
  authenticate,
  authorize("VOTER"),
  submitIdentity
);

router.post(
  "/documents",
  authenticate,
  authorize("VOTER"),
  documentUpload,
  uploadIdentityDocuments
);
router.post(
  "/:userId/qr-review",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  recordManualQrReview
);
router.get(
  "/me",
  authenticate,
  authorize("VOTER"),
  getMyIdentityStatus
);

router.get(
  "/pending",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  getPendingIdentityReviews
);

router.get(
  "/:userId/document/:type",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  getIdentityDocument
);

router.get(
  "/:userId/qr-audit",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  getQrAuditHistory
);

router.put(
  "/:userId/review",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  reviewIdentity
);

// Handle Multer errors.
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Each document must be 5 MB or smaller."
        : error.code === "LIMIT_FILE_COUNT"
        ? "Upload only the two requested documents."
        : "The document upload could not be processed.";

    return res.status(400).json({ message });
  }

  if (error) {
    return res.status(400).json({
      message: error.message || "Document upload failed.",
    });
  }

  next();
});

module.exports = router;
