
import { useCallback, useEffect, useState } from "react";
import API from "../api";
import IdentityReview from "./IdentityReview";

function AdminDashboard() {
    const [voters, setVoters] = useState([]);
    const [elections, setElections] = useState([]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    const [selectedElection, setSelectedElection] = useState(null);
    const [candidateName, setCandidateName] = useState("");
    const [candidateDescription, setCandidateDescription] = useState("");
    const [candidates, setCandidates] = useState([]);

    const [pageError, setPageError] = useState("");

    // Admin activity log state
    const [activityLogs, setActivityLogs] = useState([]);
    const [activityPage, setActivityPage] = useState(1);
    const [activityPagination, setActivityPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityError, setActivityError] = useState("");

    // Load pending voters and elections
    const loadData = useCallback(async () => {
        try {
            setPageError("");

            const [voterResponse, electionResponse] = await Promise.all([
                API.get("/admin/voters/pending"),
                API.get("/elections")
            ]);

            setVoters(voterResponse.data.voters || []);
            setElections(electionResponse.data.elections || []);
        } catch (error) {
            console.error("Dashboard loading failed:", error);

            setPageError(
                error.response?.data?.message ||
                "Failed to load dashboard data."
            );
        }
    }, []);

    // Load paginated administrator activity logs
    const loadActivityLogs = useCallback(async (page = 1) => {
        setActivityLoading(true);
        setActivityError("");

        try {
            const response = await API.get(
                `/admin/activity-logs?page=${page}&limit=20`
            );

            const logs = response.data.logs || [];
            const pagination = response.data.pagination || {
                page,
                limit: 20,
                total: logs.length,
                totalPages: logs.length > 0 ? 1 : 0
            };

            setActivityLogs(logs);
            setActivityPagination(pagination);
            setActivityPage(pagination.page || page);
        } catch (error) {
            console.error("Activity log loading failed:", error);

            setActivityError(
                error.response?.data?.message ||
                "Failed to load admin activity logs."
            );
        } finally {
            setActivityLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        loadActivityLogs(1);
    }, [loadData, loadActivityLogs]);

    // Approve a voter after identity verification
    const approveVoter = async (userId) => {
        const confirmed = window.confirm(
            "Approve this voter? Both identity statuses must already be VERIFIED."
        );

        if (!confirmed) return;

        try {
            const response = await API.put(
                `/admin/voters/${userId}/approve`
            );

            window.alert(
                `Voter approved. Internal voter ID: ${response.data.voterId}`
            );

            await Promise.all([
                loadData(),
                loadActivityLogs(1)
            ]);
        } catch (error) {
            window.alert(
                error.response?.data?.message ||
                "Failed to approve voter."
            );
        }
    };

    // Create a new election
    const createElection = async (event) => {
        event.preventDefault();

        try {
            await API.post("/elections", {
                title: title.trim(),
                description: description.trim(),
                start_time: startTime || null,
                end_time: endTime || null
            });

            window.alert("Election created successfully.");

            setTitle("");
            setDescription("");
            setStartTime("");
            setEndTime("");

            await Promise.all([
                loadData(),
                loadActivityLogs(1)
            ]);
        } catch (error) {
            window.alert(
                error.response?.data?.message ||
                "Failed to create election."
            );
        }
    };

    // Change election lifecycle status
    const changeStatus = async (electionId, status) => {
        const confirmed = window.confirm(
            `Change election status to ${status}?`
        );

        if (!confirmed) return;

        try {
            await API.put(`/elections/${electionId}/status`, {
                status
            });

            await Promise.all([
                loadData(),
                loadActivityLogs(1)
            ]);

            if (selectedElection?.id === electionId) {
                setSelectedElection((previous) =>
                    previous ? { ...previous, status } : previous
                );
            }
        } catch (error) {
            window.alert(
                error.response?.data?.message ||
                "Failed to update election status."
            );
        }
    };

    // Load candidates belonging to an election
    const loadCandidates = async (electionId) => {
        try {
            const response = await API.get(
                `/elections/${electionId}/candidates`
            );

            setCandidates(response.data.candidates || []);
        } catch (error) {
            console.error("Candidate loading failed:", error);
            window.alert(
                error.response?.data?.message ||
                "Failed to load candidates."
            );
        }
    };

    // Select an election for candidate management
    const selectElection = async (election) => {
        setSelectedElection(election);
        setCandidates([]);

        await loadCandidates(election.id);
    };

    // Add a candidate to the selected election
    const addCandidate = async (event) => {
        event.preventDefault();

        if (!selectedElection) {
            window.alert("Select an election first.");
            return;
        }

        if (!candidateName.trim()) {
            window.alert("Enter the candidate name.");
            return;
        }

        try {
            await API.post(
                `/elections/${selectedElection.id}/candidates`,
                {
                    name: candidateName.trim(),
                    description: candidateDescription.trim()
                }
            );

            window.alert("Candidate added successfully.");

            setCandidateName("");
            setCandidateDescription("");

            await Promise.all([
                loadCandidates(selectedElection.id),
                loadActivityLogs(1)
            ]);
        } catch (error) {
            window.alert(
                error.response?.data?.message ||
                "Failed to add candidate."
            );
        }
    };

    const openElections = elections.filter(
        (election) => election.status === "OPEN"
    ).length;

    const releasedResults = elections.filter(
        (election) => election.status === "RESULTS_RELEASED"
    ).length;

    return (
        <div className="dashboard-shell">
            {/* DASHBOARD HEADER */}
            <header className="dashboard-header">
                <div>
                    <span className="eyebrow">SRR BLOCKEYVOTE</span>
                    <h1>Admin Dashboard</h1>
                    <p>
                        Manage voter identities, registrations, elections,
                        candidates and election status.
                    </p>
                </div>

                <div className="security-badge">
                    🛡️ Administrator
                </div>
            </header>

            {pageError && (
                <div className="system-message" role="alert">
                    {pageError}
                </div>
            )}

            {/* OVERVIEW */}
            <section className="section">
                <div className="section-heading">
                    <div>
                        <span className="section-label">OVERVIEW</span>
                        <h2>Election Control Center</h2>
                    </div>
                </div>

                <div className="admin-stats-grid">
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon">👥</div>
                        <div>
                            <span>Pending Voters</span>
                            <strong>{voters.length}</strong>
                        </div>
                    </div>

                    <div className="admin-stat-card">
                        <div className="admin-stat-icon">🗳️</div>
                        <div>
                            <span>Elections</span>
                            <strong>{elections.length}</strong>
                        </div>
                    </div>

                    <div className="admin-stat-card">
                        <div className="admin-stat-icon">🔓</div>
                        <div>
                            <span>Open Elections</span>
                            <strong>{openElections}</strong>
                        </div>
                    </div>

                    <div className="admin-stat-card">
                        <div className="admin-stat-icon">✅</div>
                        <div>
                            <span>Released Results</span>
                            <strong>{releasedResults}</strong>
                        </div>
                    </div>
                </div>
            </section>

            {/* IDENTITY REVIEW */}
            <IdentityReview />

            {/* ADMIN ACTIVITY LOG */}
            <section className="section">
                <div className="section-heading">
                    <div>
                        <span className="section-label">AUDIT TRAIL</span>
                        <h2>Admin Activity Log</h2>
                        <p>
                            Review recorded administrative actions.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => loadActivityLogs(activityPage)}
                        disabled={activityLoading}
                    >
                        {activityLoading ? "Loading..." : "Refresh"}
                    </button>
                </div>

                {activityError && (
                    <div className="system-message" role="alert">
                        {activityError}
                    </div>
                )}

                {!activityError && activityLoading && activityLogs.length === 0 && (
                    <p>Loading activity logs...</p>
                )}

                {!activityLoading &&
                    !activityError &&
                    activityLogs.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon">📋</div>
                            <h3>No activity logs found</h3>
                            <p>
                                Recorded administrative actions will appear here.
                            </p>
                        </div>
                    )}

                {activityLogs.length > 0 && (
                    <div className="admin-list">
                        {activityLogs.map((log) => (
                            <article
                                className="admin-list-card"
                                key={log.id}
                            >
                                <div className="admin-list-info">
                                    <h3>
                                        {String(log.action || "UNKNOWN")
                                            .replaceAll("_", " ")}
                                    </h3>

                                    <p>
                                        Administrator:{" "}
                                        {log.adminName ||
                                            log.adminId ||
                                            "Unknown"}
                                    </p>

                                    <p>{log.description}</p>

                                    <p>
                                        Entity: {log.entityType || "N/A"}
                                        {log.entityId
                                            ? ` #${log.entityId}`
                                            : ""}
                                    </p>

                                    <p>
                                        {log.createdAt
                                            ? new Date(
                                                log.createdAt
                                            ).toLocaleString()
                                            : "Time unavailable"}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                <div className="section-heading">
                    <span>
                        Page {activityPage} of{" "}
                        {Math.max(1, activityPagination.totalPages)}
                        {" · "}
                        {activityPagination.total} records
                    </span>

                    <div>
                        <button
                            type="button"
                            disabled={
                                activityLoading || activityPage <= 1
                            }
                            onClick={() =>
                                loadActivityLogs(activityPage - 1)
                            }
                        >
                            Previous
                        </button>

                        <button
                            type="button"
                            disabled={
                                activityLoading ||
                                activityPage >= activityPagination.totalPages
                            }
                            onClick={() =>
                                loadActivityLogs(activityPage + 1)
                            }
                        >
                            Next
                        </button>
                    </div>
                </div>
            </section>

            {/* PENDING VOTERS */}
            <section className="section">
                <div className="section-heading">
                    <div>
                        <span className="section-label">
                            VOTER MANAGEMENT
                        </span>
                        <h2>Pending Voters</h2>
                        <p>
                            Review identity statuses before approving a voter.
                        </p>
                    </div>

                    <button type="button" onClick={loadData}>
                        Refresh
                    </button>
                </div>

                {voters.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">✓</div>
                        <h3>No pending voters</h3>
                        <p>
                            There are no pending voter registrations.
                        </p>
                    </div>
                ) : (
                    <div className="admin-list">
                        {voters.map((voter) => (
                            <div
                                className="admin-list-card"
                                key={voter.user_id}
                            >
                                <div className="admin-avatar">
                                    {voter.name?.charAt(0)?.toUpperCase()}
                                </div>

                                <div className="admin-list-info">
                                    <h3>{voter.name}</h3>
                                    <p>{voter.email}</p>

                                    <span className="status-badge pending">
                                        {voter.status}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        approveVoter(voter.user_id)
                                    }
                                >
                                    Approve Voter
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* CREATE ELECTION */}
            <section className="section">
                <div className="section-heading">
                    <div>
                        <span className="section-label">
                            ELECTION MANAGEMENT
                        </span>
                        <h2>Create Election</h2>
                        <p>Configure a new election.</p>
                    </div>
                </div>

                <div className="admin-form-card">
                    <form onSubmit={createElection}>
                        <div className="form-grid">
                            <div className="form-field full">
                                <label htmlFor="election-title">
                                    Election Title
                                </label>

                                <input
                                    id="election-title"
                                    type="text"
                                    placeholder="Enter election title"
                                    value={title}
                                    onChange={(event) =>
                                        setTitle(event.target.value)
                                    }
                                    required
                                />
                            </div>

                            <div className="form-field full">
                                <label htmlFor="election-description">
                                    Description
                                </label>

                                <textarea
                                    id="election-description"
                                    placeholder="Enter election description"
                                    value={description}
                                    onChange={(event) =>
                                        setDescription(event.target.value)
                                    }
                                    rows={4}
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="election-start">
                                    Start Time
                                </label>

                                <input
                                    id="election-start"
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(event) =>
                                        setStartTime(event.target.value)
                                    }
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="election-end">
                                    End Time
                                </label>

                                <input
                                    id="election-end"
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(event) =>
                                        setEndTime(event.target.value)
                                    }
                                />
                            </div>
                        </div>

                        <button type="submit">Create Election</button>
                    </form>
                </div>
            </section>

            {/* ELECTION LIFECYCLE */}
            <section className="section">
                <div className="section-heading">
                    <div>
                        <span className="section-label">
                            ELECTION LIFECYCLE
                        </span>
                        <h2>Elections</h2>
                        <p>Manage election status and candidates.</p>
                    </div>
                </div>

                {elections.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🗳️</div>
                        <h3>No elections created</h3>
                        <p>Create your first election above.</p>
                    </div>
                ) : (
                    <div className="election-grid">
                        {elections.map((election) => (
                            <article
                                className="election-card"
                                key={election.id}
                            >
                                <div className="election-card-top">
                                    <span
                                        className={`status-badge ${
                                            election.status === "OPEN"
                                                ? "success"
                                                : election.status ===
                                                  "RESULTS_RELEASED"
                                                ? "verified"
                                                : "neutral"
                                        }`}
                                    >
                                        {election.status}
                                    </span>
                                </div>

                                <h3>{election.title}</h3>

                                <p>
                                    {election.description ||
                                        "No description available."}
                                </p>

                                <div className="admin-election-actions">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            selectElection(election)
                                        }
                                    >
                                        Manage Candidates
                                    </button>

                                    {election.status === "DRAFT" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                changeStatus(
                                                    election.id,
                                                    "OPEN"
                                                )
                                            }
                                        >
                                            Open Election
                                        </button>
                                    )}

                                    {election.status === "OPEN" && (
                                        <button
                                            type="button"
                                            className="danger-button"
                                            onClick={() =>
                                                changeStatus(
                                                    election.id,
                                                    "CLOSED"
                                                )
                                            }
                                        >
                                            Close Election
                                        </button>
                                    )}

                                    {election.status === "CLOSED" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                changeStatus(
                                                    election.id,
                                                    "RESULTS_RELEASED"
                                                )
                                            }
                                        >
                                            Release Results
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {/* CANDIDATE MANAGEMENT */}
            {selectedElection && (
                <section className="section">
                    <div className="section-heading">
                        <div>
                            <span className="section-label">
                                CANDIDATE MANAGEMENT
                            </span>
                            <h2>{selectedElection.title}</h2>
                            <p>
                                Add and review candidates for this election.
                            </p>
                        </div>

                        <span className="status-badge neutral">
                            {selectedElection.status}
                        </span>
                    </div>

                    <div className="candidate-management-grid">
                        <div className="admin-form-card">
                            <h3>Add Candidate</h3>

                            <form onSubmit={addCandidate}>
                                <div className="form-field">
                                    <label htmlFor="candidate-name">
                                        Candidate Name
                                    </label>

                                    <input
                                        id="candidate-name"
                                        type="text"
                                        placeholder="Enter candidate name"
                                        value={candidateName}
                                        onChange={(event) =>
                                            setCandidateName(
                                                event.target.value
                                            )
                                        }
                                        required
                                    />
                                </div>

                                <div className="form-field">
                                    <label htmlFor="candidate-description">
                                        Description
                                    </label>

                                    <textarea
                                        id="candidate-description"
                                        placeholder="Enter candidate description"
                                        value={candidateDescription}
                                        onChange={(event) =>
                                            setCandidateDescription(
                                                event.target.value
                                            )
                                        }
                                        rows={4}
                                    />
                                </div>

                                <button type="submit">
                                    Add Candidate
                                </button>
                            </form>
                        </div>

                        <div>
                            <h3>Candidates ({candidates.length})</h3>

                            {candidates.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">👤</div>
                                    <h3>No candidates yet</h3>
                                    <p>
                                        Add candidates using the form.
                                    </p>
                                </div>
                            ) : (
                                <div className="candidate-grid">
                                    {candidates.map((candidate) => (
                                        <div
                                            className="candidate-card"
                                            key={candidate.id}
                                        >
                                            <div className="candidate-avatar">
                                                {candidate.name
                                                    ?.charAt(0)
                                                    ?.toUpperCase()}
                                            </div>

                                            <div className="candidate-info">
                                                <h3>{candidate.name}</h3>
                                                <p>
                                                    {candidate.description ||
                                                        "No description provided."}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}

export default AdminDashboard;
