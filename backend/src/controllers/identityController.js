

const { pool } = require("../config/database");
const fs = require("fs/promises");
const path = require("path");

// Private storage: not served through Express static hosting.
const PRIVATE_UPLOAD_DIR = path.resolve(
  __dirname,
  "../../private-identity-documents"
);

async function safeDeleteFile(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Could not delete private identity file:", error.message);
    }
  }
}

function storedFilePath(filename) {
  if (!filename || path.basename(filename) !== filename) return null;
  return path.join(PRIVATE_UPLOAD_DIR, filename);
}

async function hasValidFileSignature(filePath) {
  const handle = await fs.open(filePath, "r");

  try {
    const buffer = Buffer.alloc(8);
    const { bytesRead } = await handle.read(buffer, 0, 8, 0);
    const header = buffer.subarray(0, bytesRead);

    const isPDF =
      header.length >= 5 &&
      header.subarray(0, 5).toString() === "%PDF-";

    const isJPEG =
      header.length >= 3 &&
      header[0] === 0xff &&
      header[1] === 0xd8 &&
      header[2] === 0xff;

    const isPNG =
      header.length >= 8 &&
      header.equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      );

    return isPDF || isJPEG || isPNG;
  } finally {
    await handle.close();
  }
}

// POST /api/identity/submit
// Save only the last four Aadhaar digits and EPIC number.
// Never request or store an Aadhaar OTP.
async function submitIdentity(req, res) {
  try {
    if (req.user.role !== "VOTER") {
      return res.status(403).json({ message: "Voters only." });
    }

    const aadhaarLast4 = String(req.body.aadhaarLast4 || "").trim();
    const epicNumber = String(req.body.epicNumber || "")
      .trim()
      .toUpperCase();

    if (!/^\d{4}$/.test(aadhaarLast4)) {
      return res.status(400).json({
        message: "Enter exactly the last four Aadhaar digits.",
      });
    }

    if (!/^[A-Z0-9/-]{3,30}$/.test(epicNumber)) {
      return res.status(400).json({
        message: "Enter a valid-format Voter ID (EPIC) number.",
      });
    }

    await pool.query(
      `INSERT INTO identity_verifications
        (user_id, aadhaar_last4, epic_number,
         aadhaar_status, voter_id_status, aadhaar_qr_status)
       VALUES (?, ?, ?, 'PENDING', 'PENDING', 'NOT_CHECKED')
       ON DUPLICATE KEY UPDATE
         aadhaar_last4 = VALUES(aadhaar_last4),
         epic_number = VALUES(epic_number),
         aadhaar_status = IF(aadhaar_status = 'VERIFIED',
                             aadhaar_status, 'PENDING'),
         voter_id_status = IF(voter_id_status = 'VERIFIED',
                              voter_id_status, 'PENDING'),
         aadhaar_qr_status = IF(aadhaar_qr_status = 'VERIFIED',
                                aadhaar_qr_status, 'NOT_CHECKED'),
         reviewed_by = NULL,
         reviewed_at = NULL,
         review_notes = NULL`,
      [req.user.id, aadhaarLast4, epicNumber]
    );

    return res.status(200).json({
      message: "Identity details saved. Upload both supporting documents.",
    });
  } catch (error) {
    console.error("submitIdentity:", error);
    return res.status(500).json({
      message: "Could not save identity details.",
    });
  }
}

// POST /api/identity/documents
// Multipart field names:
// aadhaarDocument and voterIdDocument
async function uploadIdentityDocuments(req, res) {
  const files = [
    ...(req.files?.aadhaarDocument || []),
    ...(req.files?.voterIdDocument || []),
  ];

  const uploadedPaths = files.map((file) => file.path);

  try {
    if (req.user.role !== "VOTER") {
      await Promise.all(uploadedPaths.map(safeDeleteFile));
      return res.status(403).json({ message: "Voters only." });
    }

    const aadhaarFile = req.files?.aadhaarDocument?.[0];
    const voterIdFile = req.files?.voterIdDocument?.[0];

    if (!aadhaarFile || !voterIdFile) {
      await Promise.all(uploadedPaths.map(safeDeleteFile));
      return res.status(400).json({
        message: "Upload both Aadhaar and Voter ID documents.",
      });
    }

    for (const file of files) {
      if (!(await hasValidFileSignature(file.path))) {
        await Promise.all(uploadedPaths.map(safeDeleteFile));
        return res.status(400).json({
          message: "A file is not a valid PDF, JPEG, or PNG document.",
        });
      }
    }

    const [rows] = await pool.query(
      `SELECT aadhaar_document_path, voter_id_document_path,
              aadhaar_status, voter_id_status
       FROM identity_verifications
       WHERE user_id = ?`,
      [req.user.id]
    );

    if (!rows.length) {
      await Promise.all(uploadedPaths.map(safeDeleteFile));
      return res.status(400).json({
        message: "Submit your identity details before uploading documents.",
      });
    }

    const current = rows[0];

    // Prevent replacing documents after either identity has been verified.
    if (
      current.aadhaar_status === "VERIFIED" ||
      current.voter_id_status === "VERIFIED"
    ) {
      await Promise.all(uploadedPaths.map(safeDeleteFile));
      return res.status(409).json({
        message:
          "Documents cannot be replaced after verification. Contact an administrator.",
      });
    }

    await pool.query(
      `UPDATE identity_verifications
       SET aadhaar_document_path = ?,
           voter_id_document_path = ?,
           aadhaar_status = 'PENDING',
           voter_id_status = 'PENDING',
           aadhaar_qr_status = 'NOT_CHECKED',
           aadhaar_qr_checked_at = NULL,
           reviewed_by = NULL,
           reviewed_at = NULL,
           review_notes = NULL
       WHERE user_id = ?`,
      [aadhaarFile.filename, voterIdFile.filename, req.user.id]
    );

    // Delete old files only after the database update succeeds.
    await Promise.all([
      safeDeleteFile(storedFilePath(current.aadhaar_document_path)),
      safeDeleteFile(storedFilePath(current.voter_id_document_path)),
    ]);

    return res.status(200).json({
      message: "Documents uploaded securely for review.",
    });
  } catch (error) {
    await Promise.all(uploadedPaths.map(safeDeleteFile));
    console.error("uploadIdentityDocuments:", error);

    return res.status(500).json({
      message: "Could not upload identity documents.",
    });
  }
}

// GET /api/identity/me
async function getMyIdentityStatus(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT aadhaar_last4, epic_number,
              aadhaar_status, voter_id_status,
              aadhaar_qr_status, submitted_at, reviewed_at,
              review_notes,
              aadhaar_document_path, voter_id_document_path
       FROM identity_verifications
       WHERE user_id = ?`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Identity details have not been submitted.",
      });
    }

    const row = rows[0];

    return res.json({
      aadhaarLast4: row.aadhaar_last4,
      epicNumber: row.epic_number,
      aadhaarStatus: row.aadhaar_status,
      voterIdStatus: row.voter_id_status,
      aadhaarQrStatus: row.aadhaar_qr_status,
      aadhaarDocumentUploaded: Boolean(row.aadhaar_document_path),
      voterIdDocumentUploaded: Boolean(row.voter_id_document_path),
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at,
      reviewNotes: row.review_notes,
    });
  } catch (error) {
    console.error("getMyIdentityStatus:", error);
    return res.status(500).json({
      message: "Could not retrieve identity status.",
    });
  }
}

// GET /api/identity/pending
// Admin-only route.
async function getPendingIdentityReviews(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT iv.user_id, u.name, u.email,
              iv.aadhaar_last4, iv.epic_number,
              iv.aadhaar_status, iv.voter_id_status,
              iv.aadhaar_qr_status,
              iv.aadhaar_document_path,
              iv.voter_id_document_path,
              iv.submitted_at, iv.review_notes
       FROM identity_verifications iv
       JOIN users u ON u.id = iv.user_id
       ORDER BY iv.submitted_at ASC`
    );

    const submissions = rows.map((row) => ({
      userId: row.user_id,
      name: row.name,
      email: row.email,
      aadhaarLast4: row.aadhaar_last4,
      epicNumber: row.epic_number,
      aadhaarStatus: row.aadhaar_status,
      voterIdStatus: row.voter_id_status,
      aadhaarQrStatus: row.aadhaar_qr_status,
      aadhaarDocumentUploaded: Boolean(row.aadhaar_document_path),
      voterIdDocumentUploaded: Boolean(row.voter_id_document_path),
      submittedAt: row.submitted_at,
      reviewNotes: row.review_notes,
    }));

    // Return both names for compatibility with existing admin UI versions.
    return res.json({ submissions, verifications: submissions });
  } catch (error) {
    console.error("getPendingIdentityReviews:", error);
    return res.status(500).json({
      message: "Could not retrieve identity submissions.",
    });
  }
}

// GET /api/identity/:userId/document/:type
// This route must be restricted to ADMIN/SUPER_ADMIN in identityRoutes.js.
async function getIdentityDocument(req, res) {
  try {
    const { userId, type } = req.params;

    if (!["aadhaar", "voterId"].includes(type)) {
      return res.status(400).json({ message: "Invalid document type." });
    }

    const column =
      type === "aadhaar"
        ? "aadhaar_document_path"
        : "voter_id_document_path";

    const [rows] = await pool.query(
      `SELECT ${column} AS filename
       FROM identity_verifications
       WHERE user_id = ?`,
      [userId]
    );

    if (!rows.length || !rows[0].filename) {
      return res.status(404).json({
        message: "Document not found.",
      });
    }

    const filePath = storedFilePath(rows[0].filename);

    if (!filePath) {
      return res.status(400).json({ message: "Invalid stored filename." });
    }

    await fs.access(filePath);

    const extension = path.extname(filePath).toLowerCase();
    const contentTypes = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
    };

    res.set({
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Type": contentTypes[extension] || "application/octet-stream",
      "Content-Disposition": "inline",
    });

    return res.sendFile(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ message: "Stored document is missing." });
    }

    console.error("getIdentityDocument:", error);
    return res.status(500).json({
      message: "Could not open the identity document.",
    });
  }
}

// PUT /api/identity/:userId/review
// Aadhaar VERIFIED is blocked until a trusted verifier has set
// aadhaar_qr_status = VERIFIED. Uploading or viewing a QR is not enough.
async function reviewIdentity(req, res) {
  const { userId } = req.params;
  const aadhaarStatus = String(req.body.aadhaarStatus || "").toUpperCase();
  const voterIdStatus = String(req.body.voterIdStatus || "").toUpperCase();
  const reviewNotes = String(req.body.reviewNotes || "").trim().slice(0, 500);

  const allowedStatuses = ["PENDING", "VERIFIED", "REJECTED"];

  if (
    !allowedStatuses.includes(aadhaarStatus) ||
    !allowedStatuses.includes(voterIdStatus)
  ) {
    return res.status(400).json({
      message: "Statuses must be PENDING, VERIFIED, or REJECTED.",
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT *
       FROM identity_verifications
       WHERE user_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({
        message: "Identity submission not found.",
      });
    }

    const identity = rows[0];

    if (
      aadhaarStatus === "VERIFIED" &&
      (!identity.aadhaar_document_path ||
        identity.aadhaar_qr_status !== "VERIFIED")
    ) {
      await connection.rollback();
      return res.status(400).json({
        message:
          "Aadhaar cannot be verified until the document is uploaded and its secure QR is verified by a trusted verifier.",
      });
    }

    if (
      voterIdStatus === "VERIFIED" &&
      !identity.voter_id_document_path
    ) {
      await connection.rollback();
      return res.status(400).json({
        message: "Upload the Voter ID document before verifying it.",
      });
    }

    await connection.query(
      `UPDATE identity_verifications
       SET aadhaar_status = ?,
           voter_id_status = ?,
           reviewed_by = ?,
           reviewed_at = CURRENT_TIMESTAMP,
           review_notes = ?
       WHERE user_id = ?`,
      [
        aadhaarStatus,
        voterIdStatus,
        req.user.id,
        reviewNotes || null,
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      message: "Identity review saved.",
      aadhaarStatus,
      voterIdStatus,
    });
  } catch (error) {
    await connection.rollback();
    console.error("reviewIdentity:", error);

    return res.status(500).json({
      message: "Could not save identity review.",
    });
  } finally {
    connection.release();
  }
}

async function recordManualQrReview(req, res) {
  const userId = req.params.userId;
  const {
    scannerApp,
    scannerResult,
    detailsMatched,
    photoMatched,
    reviewNotes,
  } = req.body;

  const supportedApps = [
    "UIDAI Aadhaar QR Scanner",
    "mAadhaar",
  ];

  if (!supportedApps.includes(scannerApp)) {
    return res.status(400).json({
      message: "Select a supported UIDAI scanner application.",
    });
  }

  if (!["VERIFIED", "NOT_VERIFIED"].includes(scannerResult)) {
    return res.status(400).json({
      message: "Provide the result displayed by the scanner.",
    });
  }

  if (
    typeof detailsMatched !== "boolean" ||
    typeof photoMatched !== "boolean"
  ) {
    return res.status(400).json({
      message: "Confirm whether the document details and photo match.",
    });
  }

  if (reviewNotes != null && typeof reviewNotes !== "string") {
    return res.status(400).json({
      message: "Review notes must be text.",
    });
  }

  const notes = String(reviewNotes || "").trim().slice(0, 500);

  // Only approve the manual QR check when all three checks pass.
  const verified =
    scannerResult === "VERIFIED" &&
    detailsMatched === true &&
    photoMatched === true;

  const decision = verified ? "VERIFIED" : "REJECTED";
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT aadhaar_document_path
       FROM identity_verifications
       WHERE user_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({
        message: "Identity submission not found.",
      });
    }

    if (!rows[0].aadhaar_document_path) {
      await connection.rollback();
      return res.status(400).json({
        message: "Upload the Aadhaar document before reviewing its QR.",
      });
    }

    await connection.query(
      `INSERT INTO identity_qr_audit
        (user_id, admin_id, scanner_app, scanner_result,
         details_matched, photo_matched, decision, review_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        req.user.id,
        scannerApp,
        scannerResult,
        detailsMatched,
        photoMatched,
        decision,
        notes || null,
      ]
    );

    await connection.query(
      `UPDATE identity_verifications
       SET aadhaar_qr_status = ?,
           aadhaar_qr_checked_at = CURRENT_TIMESTAMP,
           aadhaar_status = ?,
           reviewed_by = ?,
           reviewed_at = CURRENT_TIMESTAMP,
           review_notes = ?
       WHERE user_id = ?`,
      [
        decision,
        decision === "VERIFIED" ? "PENDING" : "REJECTED",
        req.user.id,
        notes || (
          verified
            ? "Admin recorded successful UIDAI scanner-assisted verification."
            : "Scanner result or identity match check failed."
        ),
        userId,
      ]
    );

    await connection.commit();

    return res.json({
      message: verified
        ? "Scanner-assisted QR review recorded. Aadhaar still requires the normal identity review."
        : "QR review recorded as rejected. Aadhaar verification remains blocked.",
      aadhaarQrStatus: decision,
      aadhaarStatus: decision === "VERIFIED" ? "PENDING" : "REJECTED",
      verificationMethod: "ADMIN_ATTESTED_UIDAI_SCANNER",
      automaticCryptographicVerification: false,
    });
  } catch (error) {
    await connection.rollback();
    console.error("recordManualQrReview:", error);

    return res.status(500).json({
      message: "Could not record the QR review.",
    });
  } finally {
    connection.release();
  }
}

/**
 * GET /api/identity/:userId/qr-audit
 * Admin-only: retrieve the QR review audit trail for one voter.
 */
async function getQrAuditHistory(req, res) {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Invalid voter ID.",
      });
    }

    const [rows] = await pool.query(
      `SELECT
         audit.id,
         audit.user_id AS userId,
         audit.admin_id AS adminId,
         admin.name AS adminName,
         audit.scanner_app AS scannerApp,
         audit.scanner_result AS scannerResult,
         audit.details_matched AS detailsMatched,
         audit.photo_matched AS photoMatched,
         audit.decision,
         audit.review_notes AS reviewNotes,
         audit.created_at AS createdAt
       FROM identity_qr_audit audit
       LEFT JOIN users admin ON admin.id = audit.admin_id
       WHERE audit.user_id = ?
       ORDER BY audit.created_at DESC, audit.id DESC`,
      [userId]
    );

    return res.json({ history: rows });
  } catch (error) {
    console.error("getQrAuditHistory:", error);
    return res.status(500).json({
      message: "Could not retrieve QR audit history.",
    });
  }
}

module.exports = {
  submitIdentity,
  uploadIdentityDocuments,
  getMyIdentityStatus,
  getPendingIdentityReviews,
  getIdentityDocument,
  reviewIdentity,
  recordManualQrReview,
  getQrAuditHistory,
};
