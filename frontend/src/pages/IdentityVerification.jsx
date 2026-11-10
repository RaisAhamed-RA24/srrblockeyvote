
import { useEffect, useState } from "react";
import API from "../api";

export default function IdentityVerification() {
    const [aadhaarLast4, setAadhaarLast4] = useState("");
    const [epicNumber, setEpicNumber] = useState("");
    const [aadhaarFile, setAadhaarFile] = useState(null);
    const [voterIdFile, setVoterIdFile] = useState(null);

    const [identity, setIdentity] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);

    const loadStatus = async () => {
        try {
            const response = await API.get("/identity/me");
            const data = response.data?.identity || response.data;

            setIdentity(data);
            setError("");
        } catch (err) {
            if (err.response?.status === 404) {
                setIdentity(null);
                setError("");
            } else {
                setError("Unable to load identity status.");
            }
        } finally {
            setCheckingStatus(false);
        }
    };

    useEffect(() => {
        loadStatus();
    }, []);

    const aadhaarStatus =
        identity?.aadhaar_status ||
        identity?.aadhaarStatus ||
        "NOT_SUBMITTED";

    const aadhaarQrStatus =
        identity?.aadhaar_qr_status ||
        identity?.aadhaarQrStatus ||
        "NOT_CHECKED";

    const voterIdStatus =
        identity?.voter_id_status ||
        identity?.voterIdStatus ||
        "NOT_SUBMITTED";

    const isFullyVerified =
        aadhaarStatus === "VERIFIED" &&
        aadhaarQrStatus === "VERIFIED" &&
        voterIdStatus === "VERIFIED";

    const statusLabel = (value) => value || "NOT_SUBMITTED";

    const handleSubmit = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");
        setLoading(true);

        try {
            const response = await API.post("/identity/submit", {
                aadhaarLast4,
                epicNumber: epicNumber.trim().toUpperCase(),
            });

            setMessage(
                response.data?.message || "Identity details saved."
            );

            setAadhaarLast4("");
            setEpicNumber("");

            await loadStatus();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Identity submission failed."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDocumentUpload = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");

        if (!aadhaarFile || !voterIdFile) {
            setError(
                "Please select both Aadhaar and Voter ID documents."
            );
            return;
        }

        if (!identity) {
            setError(
                "Save your identity details before uploading documents."
            );
            return;
        }

        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png",
        ];

        const files = [aadhaarFile, voterIdFile];

        for (const file of files) {
            if (!allowedTypes.includes(file.type)) {
                setError("Only PDF, JPG, and PNG files are allowed.");
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                setError(
                    "Each document must be 5 MB or smaller."
                );
                return;
            }
        }

        setUploading(true);

        try {
            const formData = new FormData();

            formData.append("aadhaarDocument", aadhaarFile);
            formData.append("voterIdDocument", voterIdFile);

            const response = await API.post(
                "/identity/documents",
                formData
            );

            setMessage(
                response.data?.message ||
                "Documents uploaded successfully."
            );

            setAadhaarFile(null);
            setVoterIdFile(null);

            e.target.reset();

            await loadStatus();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Document upload failed."
            );
        } finally {
            setUploading(false);
        }
    };

    if (checkingStatus) {
        return (
            <section className="section">
                <div className="section-heading">
                    <h2>Identity Verification</h2>
                    <p>Loading your verification status...</p>
                </div>
            </section>
        );
    }

    return (
        <section className="section">
            <div className="section-heading">
                <h2>Identity Verification</h2>
                <p>
                    Check your identity verification status and submit
                    documents if required.
                </p>
            </div>

            {message && (
                <p className="success-message" role="status">
                    {message}
                </p>
            )}

            {error && (
                <p className="error-message" role="alert">
                    {error}
                </p>
            )}

            {identity && (
                <div className="security-card">
                    <h3>Verification Status</h3>

                    <p>
                        Aadhaar status:{" "}
                        <strong>{statusLabel(aadhaarStatus)}</strong>
                    </p>

                    <p>
                        Aadhaar secure QR status:{" "}
                        <strong>{statusLabel(aadhaarQrStatus)}</strong>
                    </p>

                    <p>
                        Voter ID status:{" "}
                        <strong>{statusLabel(voterIdStatus)}</strong>
                    </p>

                    <p>
                        Aadhaar document:{" "}
                        <strong>
                            {identity.aadhaar_document_path ||
                            identity.aadhaarDocumentUploaded
                                ? "Uploaded"
                                : "Not uploaded"}
                        </strong>
                    </p>

                    <p>
                        Voter ID document:{" "}
                        <strong>
                            {identity.voter_id_document_path ||
                            identity.voterIdDocumentUploaded
                                ? "Uploaded"
                                : "Not uploaded"}
                        </strong>
                    </p>

                    {(identity.review_notes ||
                        identity.reviewNotes) && (
                        <p>
                            Review note:{" "}
                            {identity.review_notes ||
                                identity.reviewNotes}
                        </p>
                    )}
                </div>
            )}

            {isFullyVerified ? (
                <div className="security-card">
                    <h3>Identity Verification Complete</h3>

                    <p>✓ Aadhaar identity: Verified</p>
                    <p>✓ Aadhaar QR review: Verified</p>
                    <p>✓ Voter ID: Verified</p>

                    <p>
                        Your recorded identity verification checks are
                        complete. No further identity submission is
                        required at this time.
                    </p>
                </div>
            ) : (
                <>
                    <form
                        className="admin-form-card"
                        onSubmit={handleSubmit}
                    >
                        <h3>Step 1: Identity Details</h3>

                        <div className="form-field">
                            <label htmlFor="aadhaarLast4">
                                Last 4 digits of Aadhaar
                            </label>

                            <input
                                id="aadhaarLast4"
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={4}
                                pattern="[0-9]{4}"
                                value={aadhaarLast4}
                                onChange={(e) =>
                                    setAadhaarLast4(
                                        e.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 4)
                                    )
                                }
                                placeholder="1234"
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="epicNumber">
                                Voter ID / EPIC number
                            </label>

                            <input
                                id="epicNumber"
                                type="text"
                                autoComplete="off"
                                maxLength={30}
                                value={epicNumber}
                                onChange={(e) =>
                                    setEpicNumber(
                                        e.target.value.toUpperCase()
                                    )
                                }
                                placeholder="Enter EPIC number"
                                required
                            />
                        </div>

                        <p>
                            Only the last four Aadhaar digits are
                            requested. Never enter your Aadhaar OTP.
                        </p>

                        <button type="submit" disabled={loading}>
                            {loading
                                ? "Submitting..."
                                : "Save Identity Details"}
                        </button>
                    </form>

                    <form
                        className="admin-form-card"
                        onSubmit={handleDocumentUpload}
                    >
                        <h3>Step 2: Upload Identity Documents</h3>

                        <p>
                            Upload clear, readable copies for authorized
                            administrative review.
                        </p>

                        <div className="form-field">
                            <label htmlFor="aadhaarDocument">
                                Aadhaar document (PDF, JPG, or PNG)
                            </label>

                            <input
                                id="aadhaarDocument"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                onChange={(e) =>
                                    setAadhaarFile(
                                        e.target.files?.[0] || null
                                    )
                                }
                                required
                            />

                            {aadhaarFile && (
                                <small>
                                    Selected: {aadhaarFile.name}
                                </small>
                            )}
                        </div>

                        <div className="form-field">
                            <label htmlFor="voterIdDocument">
                                Voter ID document (PDF, JPG, or PNG)
                            </label>

                            <input
                                id="voterIdDocument"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                onChange={(e) =>
                                    setVoterIdFile(
                                        e.target.files?.[0] || null
                                    )
                                }
                                required
                            />

                            {voterIdFile && (
                                <small>
                                    Selected: {voterIdFile.name}
                                </small>
                            )}
                        </div>

                        <p>
                            Maximum file size: 5 MB per document.
                        </p>

                        <button
                            type="submit"
                            disabled={uploading || !identity}
                        >
                            {uploading
                                ? "Uploading..."
                                : "Upload Both Documents"}
                        </button>

                        {!identity && (
                            <p>
                                Save your identity details in Step 1
                                before uploading documents.
                            </p>
                        )}
                    </form>
                </>
            )}
        </section>
    );
}


