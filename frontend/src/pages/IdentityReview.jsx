
import { useEffect, useState } from "react";
import API from "../api";

const IdentityReview = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingUserId, setSavingUserId] = useState(null);
    const [savingQrUserId, setSavingQrUserId] = useState(null);
    const [loadingAuditUserId, setLoadingAuditUserId] = useState(null);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [reviewForms, setReviewForms] = useState({});
    const [qrForms, setQrForms] = useState({});
    const [qrAuditHistory, setQrAuditHistory] = useState({});

    // Audit history is collapsed by default for every voter.
    const [expandedAuditUserId, setExpandedAuditUserId] = useState(null);

    const statusOptions = [
        { value: "PENDING", label: "Pending" },
        { value: "VERIFIED", label: "Verified" },
        { value: "REJECTED", label: "Rejected" },
    ];

    const getValue = (item, snakeCase, camelCase) =>
        item[snakeCase] ?? item[camelCase];

    const getQrForm = (userId) =>
        qrForms[userId] || {
            scannerApp: "UIDAI Aadhaar QR Scanner",
            scannerResult: "NOT_VERIFIED",
            detailsMatched: false,
            photoMatched: false,
            reviewNotes: "",
        };

    const loadReviews = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await API.get("/identity/pending");

            const items =
                response.data.submissions ||
                response.data.verifications ||
                response.data.reviews ||
                [];

            setReviews(items);

            setReviewForms((previous) => {
                const next = { ...previous };

                items.forEach((item) => {
                    const userId = item.user_id ?? item.userId;

                    if (userId == null) return;

                    next[userId] = {
                        aadhaarStatus:
                            item.aadhaar_status ||
                            item.aadhaarStatus ||
                            "PENDING",
                        voterIdStatus:
                            item.voter_id_status ||
                            item.voterIdStatus ||
                            "PENDING",
                        reviewNotes:
                            item.review_notes ||
                            item.reviewNotes ||
                            "",
                    };
                });

                return next;
            });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Could not load identity submissions."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReviews();
    }, []);

    const updateForm = (userId, field, value) => {
        setReviewForms((previous) => ({
            ...previous,
            [userId]: {
                ...(previous[userId] || {}),
                [field]: value,
            },
        }));
    };

    const openDocument = async (userId, type) => {
        setError("");

        try {
            const response = await API.get(
                `/identity/${userId}/document/${type}`,
                { responseType: "blob" }
            );

            const contentType =
                response.headers["content-type"] || "application/pdf";

            const blob = new Blob([response.data], {
                type: contentType,
            });

            const objectUrl = URL.createObjectURL(blob);
            const openedWindow = window.open(objectUrl, "_blank");

            if (!openedWindow) {
                URL.revokeObjectURL(objectUrl);

                setError(
                    "The document window was blocked. Allow pop-ups and try again."
                );

                return;
            }

            window.setTimeout(
                () => URL.revokeObjectURL(objectUrl),
                60000
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to open this document. Check your admin access."
            );
        }
    };

    const saveReview = async (userId) => {
        const form = reviewForms[userId];

        if (!form) return;

        const confirmed = window.confirm(
            "Save these review statuses? Only mark documents VERIFIED after appropriate checks."
        );

        if (!confirmed) return;

        setSavingUserId(userId);
        setError("");
        setMessage("");

        try {
            const response = await API.put(
                `/identity/${userId}/review`,
                {
                    aadhaarStatus: form.aadhaarStatus,
                    voterIdStatus: form.voterIdStatus,
                    reviewNotes: form.reviewNotes,
                }
            );

            setMessage(
                response.data.message ||
                `Identity review saved for user ${userId}.`
            );

            await loadReviews();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to save identity review."
            );
        } finally {
            setSavingUserId(null);
        }
    };

    const updateQrForm = (userId, field, value) => {
        setQrForms((previous) => ({
            ...previous,
            [userId]: {
                ...getQrFormFromState(previous, userId),
                [field]: value,
            },
        }));
    };

    const getQrFormFromState = (forms, userId) =>
        forms[userId] || {
            scannerApp: "UIDAI Aadhaar QR Scanner",
            scannerResult: "NOT_VERIFIED",
            detailsMatched: false,
            photoMatched: false,
            reviewNotes: "",
        };

    const loadQrAuditHistory = async (userId) => {
        setLoadingAuditUserId(userId);
        setError("");

        try {
            const response = await API.get(
                `/identity/${userId}/qr-audit`
            );

            setQrAuditHistory((previous) => ({
                ...previous,
                [userId]: response.data.history || [],
            }));
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Could not load QR audit history."
            );
        } finally {
            setLoadingAuditUserId(null);
        }
    };

    const toggleAuditHistory = async (userId) => {
        if (expandedAuditUserId === userId) {
            setExpandedAuditUserId(null);
            return;
        }

        setExpandedAuditUserId(userId);

        // Load history only when it has not already been fetched.
        if (!Object.prototype.hasOwnProperty.call(qrAuditHistory, userId)) {
            await loadQrAuditHistory(userId);
        }
    };

    const saveQrReview = async (userId) => {
        const form = qrForms[userId];

        if (!form) {
            setError("Complete the QR review form first.");
            return;
        }

        if (
            !window.confirm(
                "Confirm that you personally checked the scanner result and compared the identity details and photograph?"
            )
        ) {
            return;
        }

        setSavingQrUserId(userId);
        setError("");
        setMessage("");

        try {
            const response = await API.post(
                `/identity/${userId}/qr-review`,
                {
                    scannerApp: form.scannerApp,
                    scannerResult: form.scannerResult,
                    detailsMatched: form.detailsMatched,
                    photoMatched: form.photoMatched,
                    reviewNotes: form.reviewNotes,
                }
            );

            setMessage(
                response.data.message || "QR review recorded."
            );

            setQrForms((previous) => ({
                ...previous,
                [userId]: {
                    ...getQrFormFromState(previous, userId),
                    scannerResult: "NOT_VERIFIED",
                    detailsMatched: false,
                    photoMatched: false,
                    reviewNotes: "",
                },
            }));

            await loadReviews();

            // Refresh the audit data without expanding the section.
            await loadQrAuditHistory(userId);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Could not save the QR review."
            );
        } finally {
            setSavingQrUserId(null);
        }
    };

    const renderAuditHistory = (userId) => {
        if (loadingAuditUserId === userId) {
            return <p>Loading QR audit history...</p>;
        }

        if (!Object.prototype.hasOwnProperty.call(qrAuditHistory, userId)) {
            return <p>QR audit history has not been loaded yet.</p>;
        }

        const history = qrAuditHistory[userId];

        if (!history || history.length === 0) {
            return <p>No QR audit records found for this voter.</p>;
        }

        return (
            <div style={{ overflowX: "auto", marginTop: "12px" }}>
                {history.map((audit) => (
                    <div
                        key={audit.id}
                        style={{
                            border: "1px solid var(--border-color, #ddd)",
                            borderRadius: "8px",
                            padding: "12px",
                            marginBottom: "10px",
                        }}
                    >
                        <p>
                            <strong>Decision:</strong>{" "}
                            {audit.decision || "Unknown"}
                        </p>

                        <p>
                            <strong>Scanner:</strong>{" "}
                            {audit.scannerApp || "Unknown"}
                        </p>

                        <p>
                            <strong>Scanner result:</strong>{" "}
                            {audit.scannerResult || "Unknown"}
                        </p>

                        <p>
                            <strong>Details matched:</strong>{" "}
                            {Boolean(audit.detailsMatched) ? "Yes" : "No"}
                        </p>

                        <p>
                            <strong>Photo matched:</strong>{" "}
                            {Boolean(audit.photoMatched) ? "Yes" : "No"}
                        </p>

                        <p>
                            <strong>Reviewed by:</strong>{" "}
                            {audit.adminName ||
                                (audit.adminId != null
                                    ? `Admin ID ${audit.adminId}`
                                    : "Unknown")}
                        </p>

                        <p>
                            <strong>Date:</strong>{" "}
                            {audit.createdAt
                                ? new Date(audit.createdAt).toLocaleString()
                                : "Unknown"}
                        </p>

                        <p>
                            <strong>Notes:</strong>{" "}
                            {audit.reviewNotes || "No notes"}
                        </p>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <section className="section">
            <div className="section-heading">
                <div>
                    <span className="section-label">
                        IDENTITY MANAGEMENT
                    </span>

                    <h2>Aadhaar &amp; Voter ID Review</h2>

                    <p>
                        Review submitted identity details and documents
                        before approving voter registration.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={loadReviews}
                    disabled={loading}
                >
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {error && (
                <div className="system-message" role="alert">
                    {error}
                </div>
            )}

            {message && (
                <div className="system-message" role="status">
                    {message}
                </div>
            )}

            {loading ? (
                <div className="empty-state">
                    <p>Loading identity submissions...</p>
                </div>
            ) : reviews.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">✓</div>
                    <h3>No identity submissions</h3>
                    <p>New voter submissions will appear here.</p>
                </div>
            ) : (
                <div className="admin-list">
                    {reviews.map((item) => {
                        const userId = getValue(
                            item,
                            "user_id",
                            "userId"
                        );

                        if (userId == null) return null;

                        const form = reviewForms[userId] || {
                            aadhaarStatus:
                                item.aadhaar_status ||
                                item.aadhaarStatus ||
                                "PENDING",
                            voterIdStatus:
                                item.voter_id_status ||
                                item.voterIdStatus ||
                                "PENDING",
                            reviewNotes:
                                item.review_notes ||
                                item.reviewNotes ||
                                "",
                        };

                        const aadhaarUploaded = Boolean(
                            getValue(
                                item,
                                "aadhaar_document_path",
                                "aadhaarDocumentUploaded"
                            )
                        );

                        const voterIdUploaded = Boolean(
                            getValue(
                                item,
                                "voter_id_document_path",
                                "voterIdDocumentUploaded"
                            )
                        );

                        const qrStatus =
                            getValue(
                                item,
                                "aadhaar_qr_status",
                                "aadhaarQrStatus"
                            ) || "NOT_CHECKED";

                        const qrIsVerified =
                            String(qrStatus).toUpperCase() === "VERIFIED";

                        const qrForm = getQrForm(userId);

                        return (
                            <article
                                className="admin-list-card"
                                key={userId}
                                style={{
                                    alignItems: "stretch",
                                    flexWrap: "wrap",
                                    gap: "16px",
                                }}
                            >
                                <div className="admin-avatar">
                                    {item.name?.charAt(0)?.toUpperCase() || "V"}
                                </div>

                                {/* VOTER DETAILS AND DOCUMENTS */}
                                <div
                                    className="admin-list-info"
                                    style={{ flex: "1 1 220px" }}
                                >
                                    <h3>{item.name || "Voter"}</h3>

                                    <p>
                                        {item.email || "No email provided"}
                                    </p>

                                    <p>
                                        Aadhaar ending: ****
                                        {getValue(
                                            item,
                                            "aadhaar_last4",
                                            "aadhaarLast4"
                                        ) || "----"}
                                    </p>

                                    <p>
                                        Voter ID / EPIC:{" "}
                                        {getValue(
                                            item,
                                            "epic_number",
                                            "epicNumber"
                                        ) || "Not provided"}
                                    </p>

                                    <p>
                                        Aadhaar QR status:{" "}
                                        <strong>{qrStatus}</strong>
                                    </p>

                                    <p>
                                        Submitted:{" "}
                                        {getValue(
                                            item,
                                            "submitted_at",
                                            "submittedAt"
                                        )
                                            ? new Date(
                                                  getValue(
                                                      item,
                                                      "submitted_at",
                                                      "submittedAt"
                                                  )
                                              ).toLocaleString()
                                            : "Unknown"}
                                    </p>

                                    <div style={{ marginTop: "12px" }}>
                                        <p>
                                            Aadhaar document:{" "}
                                            <strong>
                                                {aadhaarUploaded
                                                    ? "Uploaded"
                                                    : "Not uploaded"}
                                            </strong>
                                        </p>

                                        <button
                                            type="button"
                                            disabled={!aadhaarUploaded}
                                            onClick={() =>
                                                openDocument(userId, "aadhaar")
                                            }
                                        >
                                            View Aadhaar Document
                                        </button>
                                    </div>

                                    <div style={{ marginTop: "12px" }}>
                                        <p>
                                            Voter ID document:{" "}
                                            <strong>
                                                {voterIdUploaded
                                                    ? "Uploaded"
                                                    : "Not uploaded"}
                                            </strong>
                                        </p>

                                        <button
                                            type="button"
                                            disabled={!voterIdUploaded}
                                            onClick={() =>
                                                openDocument(userId, "voterId")
                                            }
                                        >
                                            View Voter ID Document
                                        </button>
                                    </div>
                                </div>

                                {/* IDENTITY REVIEW */}
                                <div style={{ flex: "1 1 220px" }}>
                                    <div className="form-field">
                                        <label htmlFor={`aadhaar-${userId}`}>
                                            Aadhaar review status
                                        </label>

                                        <select
                                            id={`aadhaar-${userId}`}
                                            value={form.aadhaarStatus}
                                            onChange={(e) =>
                                                updateForm(
                                                    userId,
                                                    "aadhaarStatus",
                                                    e.target.value
                                                )
                                            }
                                        >
                                            {statusOptions.map((option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor={`epic-${userId}`}>
                                            Voter ID review status
                                        </label>

                                        <select
                                            id={`epic-${userId}`}
                                            value={form.voterIdStatus}
                                            onChange={(e) =>
                                                updateForm(
                                                    userId,
                                                    "voterIdStatus",
                                                    e.target.value
                                                )
                                            }
                                        >
                                            {statusOptions.map((option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor={`notes-${userId}`}>
                                            Review notes
                                        </label>

                                        <textarea
                                            id={`notes-${userId}`}
                                            rows="3"
                                            maxLength={500}
                                            placeholder="Optional review notes"
                                            value={form.reviewNotes}
                                            onChange={(e) =>
                                                updateForm(
                                                    userId,
                                                    "reviewNotes",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        disabled={savingUserId === userId}
                                        onClick={() => saveReview(userId)}
                                    >
                                        {savingUserId === userId
                                            ? "Saving..."
                                            : "Save Review"}
                                    </button>
                                </div>

                                {/* QR REVIEW */}
                                {qrIsVerified ? (
                                    <div
                                        className="security-card"
                                        style={{
                                            flex: "1 1 100%",
                                            borderTop:
                                                "1px solid var(--border-color, #ddd)",
                                            paddingTop: "16px",
                                        }}
                                    >
                                        <h3>
                                            ✓ Aadhaar QR Review Completed
                                        </h3>

                                        <p>
                                            Recorded QR review status:{" "}
                                            <strong>VERIFIED</strong>
                                        </p>

                                        <p>
                                            The QR review has already been
                                            recorded as verified. The review
                                            form is hidden to keep this screen
                                            compact.
                                        </p>
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            flex: "1 1 100%",
                                            borderTop:
                                                "1px solid var(--border-color, #ddd)",
                                            paddingTop: "16px",
                                        }}
                                    >
                                        <h3>
                                            Scanner-Assisted Aadhaar QR Review
                                        </h3>

                                        <p>
                                            Use the official UIDAI scanner or
                                            mAadhaar to check the Secure QR.
                                            Record the result you observed.
                                            This form does not independently
                                            authenticate the QR.
                                        </p>

                                        <div className="form-field">
                                            <label
                                                htmlFor={`scanner-app-${userId}`}
                                            >
                                                Scanner application
                                            </label>

                                            <select
                                                id={`scanner-app-${userId}`}
                                                value={qrForm.scannerApp}
                                                onChange={(e) =>
                                                    updateQrForm(
                                                        userId,
                                                        "scannerApp",
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="UIDAI Aadhaar QR Scanner">
                                                    UIDAI Aadhaar QR Scanner
                                                </option>

                                                <option value="mAadhaar">
                                                    mAadhaar
                                                </option>
                                            </select>
                                        </div>

                                        <div className="form-field">
                                            <label
                                                htmlFor={`scanner-result-${userId}`}
                                            >
                                                Result displayed by the scanner
                                            </label>

                                            <select
                                                id={`scanner-result-${userId}`}
                                                value={qrForm.scannerResult}
                                                onChange={(e) =>
                                                    updateQrForm(
                                                        userId,
                                                        "scannerResult",
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="NOT_VERIFIED">
                                                    Not verified / failed
                                                </option>

                                                <option value="VERIFIED">
                                                    Scanner reported verified
                                                </option>
                                            </select>
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        qrForm.detailsMatched
                                                    }
                                                    onChange={(e) =>
                                                        updateQrForm(
                                                            userId,
                                                            "detailsMatched",
                                                            e.target.checked
                                                        )
                                                    }
                                                />{" "}
                                                Identity details match the
                                                presented evidence
                                            </label>
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        qrForm.photoMatched
                                                    }
                                                    onChange={(e) =>
                                                        updateQrForm(
                                                            userId,
                                                            "photoMatched",
                                                            e.target.checked
                                                        )
                                                    }
                                                />{" "}
                                                Photograph matches the person
                                                being verified
                                            </label>
                                        </div>

                                        <div className="form-field">
                                            <label
                                                htmlFor={`qr-notes-${userId}`}
                                            >
                                                QR review notes
                                            </label>

                                            <textarea
                                                id={`qr-notes-${userId}`}
                                                rows={2}
                                                maxLength={500}
                                                value={qrForm.reviewNotes}
                                                onChange={(e) =>
                                                    updateQrForm(
                                                        userId,
                                                        "reviewNotes",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Record the outcome without unnecessary Aadhaar data"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            disabled={
                                                savingQrUserId === userId
                                            }
                                            onClick={() =>
                                                saveQrReview(userId)
                                            }
                                        >
                                            {savingQrUserId === userId
                                                ? "Recording..."
                                                : "Record QR Review"}
                                        </button>
                                    </div>
                                )}

                                {/* COLLAPSIBLE QR AUDIT HISTORY */}
                                <div
                                    style={{
                                        flex: "1 1 100%",
                                        borderTop:
                                            "1px solid var(--border-color, #ddd)",
                                        paddingTop: "16px",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "12px",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <div>
                                            <h3>QR Audit History</h3>
                                            <p>
                                                Previously recorded QR review
                                                decisions.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            disabled={
                                                loadingAuditUserId === userId
                                            }
                                            onClick={() =>
                                                toggleAuditHistory(userId)
                                            }
                                        >
                                            {loadingAuditUserId === userId
                                                ? "Loading history..."
                                                : expandedAuditUserId === userId
                                                    ? "Hide History"
                                                    : "Show History"}
                                        </button>
                                    </div>

                                    {expandedAuditUserId === userId && (
                                        <div style={{ marginTop: "12px" }}>
                                            {renderAuditHistory(userId)}
                                        </div>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <p
                className="muted-action"
                style={{ marginTop: "16px" }}
            >
                Aadhaar cannot be marked VERIFIED until a trusted QR
                verifier confirms authenticity. Document uploads and
                visual inspection alone do not establish official UIDAI
                or Election Commission verification.
            </p>
        </section>
    );
};

export default IdentityReview;
