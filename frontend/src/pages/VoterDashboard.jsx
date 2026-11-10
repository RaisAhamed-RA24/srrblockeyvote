
import { useEffect, useState } from "react";
import {
    startRegistration,
    startAuthentication,
} from "@simplewebauthn/browser";
import API from "../api";
import IdentityVerification from "./IdentityVerification";

function VoterDashboard() {
    const [elections, setElections] = useState([]);
    const [selectedElection, setSelectedElection] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [results, setResults] = useState(null);

    const [authMessage, setAuthMessage] = useState("");
    const [electionMessage, setElectionMessage] = useState("");

    const [voteId, setVoteId] = useState(null);
    const [transactionHash, setTransactionHash] = useState(null);

    const [biometricRegistered, setBiometricRegistered] = useState(false);
    const [biometricVerified, setBiometricVerified] = useState(false);
    const [votingInProgress, setVotingInProgress] = useState(false);

    const loadElections = async () => {
        try {
            const response = await API.get("/elections");
            setElections(response.data.elections || []);
        } catch (error) {
            console.error("Load elections error:", error);
            setElectionMessage(
                error.response?.data?.message ||
                "Failed to load elections."
            );
        }
    };

    useEffect(() => {
        loadElections();
    }, []);

    const registerBiometric = async () => {
        try {
            setAuthMessage("Starting biometric registration...");

            const optionsResponse = await API.post(
                "/webauthn/register/options"
            );

            const registrationResponse = await startRegistration({
                optionsJSON: optionsResponse.data.options,
            });

            const verifyResponse = await API.post(
                "/webauthn/register/verify",
                { response: registrationResponse }
            );

            if (verifyResponse.data.success) {
                setBiometricRegistered(true);
                setAuthMessage("Biometric registration successful.");
            } else {
                setAuthMessage(
                    "Biometric registration could not be completed."
                );
            }
        } catch (error) {
            console.error("Biometric registration error:", error);
            setAuthMessage(
                error.response?.data?.message ||
                error.message ||
                "Biometric registration failed."
            );
        }
    };

    const verifyBiometric = async () => {
        try {
            setAuthMessage("Starting biometric verification...");

            const optionsResponse = await API.post(
                "/webauthn/authenticate/options"
            );

            const authenticationResponse = await startAuthentication({
                optionsJSON: optionsResponse.data.options,
            });

            const verifyResponse = await API.post(
                "/webauthn/authenticate/verify",
                { response: authenticationResponse }
            );

            if (verifyResponse.data.success) {
                setBiometricVerified(true);
                setAuthMessage("Biometric verification successful.");
                return true;
            }

            setBiometricVerified(false);
            setAuthMessage("Biometric verification failed.");
            return false;
        } catch (error) {
            console.error("Biometric verification error:", error);
            setBiometricVerified(false);
            setAuthMessage(
                error.response?.data?.message ||
                error.message ||
                "Biometric verification failed."
            );
            return false;
        }
    };

    const viewCandidates = async (election) => {
        if (
            selectedElection?.id === election.id &&
            selectedElection?.status === "OPEN" &&
            !results &&
            !loadingCandidates
        ) {
            setSelectedElection(null);
            setCandidates([]);
            setElectionMessage("");
            return;
        }

        setSelectedElection(election);
        setCandidates([]);
        setResults(null);
        setElectionMessage("");
        setAuthMessage("");
        setVoteId(null);
        setTransactionHash(null);
        setBiometricVerified(false);
        setLoadingCandidates(true);

        try {
            const response = await API.get(
                `/elections/${election.id}/candidates`
            );

            const loadedCandidates = response.data.candidates || [];
            setCandidates(loadedCandidates);

            if (loadedCandidates.length === 0) {
                setElectionMessage(
                    `No candidates are available for "${election.title}".`
                );
            }
        } catch (error) {
            console.error("Load candidates error:", error);
            setElectionMessage(
                error.response?.data?.message ||
                "Failed to load candidates."
            );
        } finally {
            setLoadingCandidates(false);
        }
    };

    const castVote = async (candidateId) => {
        if (!selectedElection || votingInProgress) {
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to vote for this candidate? You may not be able to change your vote."
        );

        if (!confirmed) {
            return;
        }

        setVotingInProgress(true);
        setElectionMessage("");
        setAuthMessage("");

        try {
            const verified = await verifyBiometric();

            if (!verified) {
                return;
            }

            setElectionMessage("Biometric verified. Casting your vote...");

            const response = await API.post(
                `/elections/${selectedElection.id}/vote`,
                { candidateId }
            );

            setElectionMessage(
                response.data.message ||
                "Vote submitted successfully."
            );

            setVoteId(response.data.voteId ?? null);
            setTransactionHash(
                response.data.transactionHash ?? null
            );

            setCandidates([]);
            setSelectedElection(null);
            setResults(null);

            await loadElections();
        } catch (error) {
            console.error("Cast vote error:", error);

            setElectionMessage(
                error.response?.data?.message ||
                "Failed to cast vote."
            );
        } finally {
            setVotingInProgress(false);
        }
    };

    const viewResults = async (election) => {
        setSelectedElection(election);
        setResults(null);
        setCandidates([]);
        setLoadingCandidates(false);
        setBiometricVerified(false);
        setElectionMessage("");

        try {
            const response = await API.get(
                `/elections/${election.id}/results`
            );

            setResults(response.data);
        } catch (error) {
            console.error("Load results error:", error);

            setResults(null);
            setElectionMessage(
                error.response?.data?.message ||
                "Results are not available."
            );
        }
    };

    return (
        <div className="dashboard-shell">
            {/* HEADER */}
            <header className="dashboard-header">
                <div>
                    <span className="eyebrow">SRR BLOCKEYVOTE</span>
                    <h1>Voter Dashboard</h1>
                    <p>
                        Digital voting with identity review, biometric
                        authentication and blockchain transaction records.
                    </p>
                </div>

                <div className="security-badge">
                    🔐 Secure Voting
                </div>
            </header>

            {/* IDENTITY VERIFICATION */}
            <IdentityVerification />

            {/* SECURITY STATUS */}
            <section className="section">
                <div className="section-heading">
                    <div>
                        <span className="section-label">SECURITY</span>
                        <h2>Authentication Status</h2>
                    </div>
                </div>

                {authMessage && (
                    <div className="system-message" role="status">
                        <strong>{authMessage}</strong>
                    </div>
                )}

                <div className="security-grid">
                    <div className="security-card">
                        <div className="security-icon">🔐</div>

                        <div className="security-card-content">
                            <h3>Biometric Authentication</h3>

                            {biometricRegistered ? (
                                <>
                                    <span className="status-badge success">
                                        ✓ Registered
                                    </span>

                                    <p>
                                        Your device authenticator is
                                        registered.
                                    </p>

                                    {biometricVerified && (
                                        <span className="status-badge verified">
                                            ✓ Verified for this session
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <span className="status-badge pending">
                                        Not Registered
                                    </span>

                                    <p>
                                        Register your device authenticator
                                        before voting.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={registerBiometric}
                                    >
                                        Register Biometric
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="security-card">
                        <div className="security-icon">⛓️</div>

                        <div className="security-card-content">
                            <h3>Blockchain Security</h3>

                            <span className="status-badge success">
                                Transaction Recording
                            </span>

                            <p>
                                Successful votes may include a blockchain
                                transaction hash when recording succeeds.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* AVAILABLE ELECTIONS */}
            <section className="section">
                <div className="section-heading">
                    <div>
                        <span className="section-label">ELECTIONS</span>
                        <h2>Available Elections</h2>
                        <p>
                            Select an open election to participate, or view
                            results when the administrator releases them.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={loadElections}
                    >
                        Refresh
                    </button>
                </div>

                {/* ELECTION MESSAGES STAY HERE */}
                {electionMessage && (
                    <div className="system-message" role="status">
                        <strong>{electionMessage}</strong>
                    </div>
                )}

                {elections.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🗳️</div>
                        <h3>No elections available</h3>
                        <p>
                            There are currently no elections to display.
                        </p>
                    </div>
                ) : (
                    <div className="election-grid">
                        {elections.map((election) => {
                            const isSelected =
                                selectedElection?.id === election.id;

                            const isShowingCandidates =
                                isSelected &&
                                election.status === "OPEN" &&
                                !results;

                            const isShowingResults =
                                isSelected &&
                                Boolean(results);

                            return (
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

                                    {/* ELECTION ACTIONS */}
                                    <div className="election-actions">
                                        {election.status === "OPEN" && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    viewCandidates(election)
                                                }
                                                disabled={
                                                    loadingCandidates &&
                                                    isSelected
                                                }
                                            >
                                                {loadingCandidates &&
                                                isSelected
                                                    ? "Loading..."
                                                    : isShowingCandidates
                                                    ? "Hide Candidates"
                                                    : "View Candidates"}
                                            </button>
                                        )}

                                        {election.status ===
                                            "RESULTS_RELEASED" && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    viewResults(election)
                                                }
                                            >
                                                View Results
                                            </button>
                                        )}

                                        {election.status !== "OPEN" &&
                                            election.status !==
                                                "RESULTS_RELEASED" && (
                                                <span className="muted-action">
                                                    Voting unavailable
                                                </span>
                                            )}
                                    </div>

                                    {/* CANDIDATES INSIDE THE SELECTED CARD */}
                                    {isShowingCandidates && (
                                        <div className="selected-candidates">
                                            <h3>Candidates</h3>

                                            {loadingCandidates ? (
                                                <p>
                                                    Loading candidates...
                                                </p>
                                            ) : candidates.length > 0 ? (
                                                <div className="candidate-grid">
                                                    {candidates.map(
                                                        (candidate) => (
                                                            <article
                                                                className="candidate-card"
                                                                key={candidate.id}
                                                            >
                                                                <div className="candidate-avatar">
                                                                    {candidate.name
                                                                        ?.charAt(0)
                                                                        ?.toUpperCase()}
                                                                </div>

                                                                <div className="candidate-info">
                                                                    <h3>
                                                                        {candidate.name}
                                                                    </h3>
                                                                    <p>
                                                                        {candidate.description ||
                                                                            "Candidate"}
                                                                    </p>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        castVote(
                                                                            candidate.id
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        votingInProgress
                                                                    }
                                                                >
                                                                    {votingInProgress
                                                                        ? "Processing..."
                                                                        : "Vote"}
                                                                </button>
                                                            </article>
                                                        )
                                                    )}
                                                </div>
                                            ) : (
                                                !loadingCandidates && (
                                                    <p>
                                                        No candidates are
                                                        available for this
                                                        election.
                                                    </p>
                                                )
                                            )}

                                            <p className="muted-action">
                                                Your device authenticator
                                                will be requested before
                                                your vote is submitted.
                                            </p>
                                        </div>
                                    )}

                                    {/* RESULTS INSIDE THE SELECTED CARD */}
                                    {isShowingResults && (
                                        <div className="selected-candidates">
                                            <h3>Election Results</h3>

                                            {(results.results || []).length >
                                            0 ? (
                                                <div className="results-grid">
                                                    {results.results.map(
                                                        (result) => (
                                                            <article
                                                                className="result-card"
                                                                key={
                                                                    result.candidate_id
                                                                }
                                                            >
                                                                <div className="result-rank">
                                                                    #
                                                                </div>

                                                                <div className="result-info">
                                                                    <h3>
                                                                        {result.candidate_name}
                                                                    </h3>
                                                                    <span>
                                                                        Candidate
                                                                    </span>
                                                                </div>

                                                                <div className="result-votes">
                                                                    <strong>
                                                                        {result.vote_count}
                                                                    </strong>
                                                                    <span>
                                                                        votes
                                                                    </span>
                                                                </div>
                                                            </article>
                                                        )
                                                    )}
                                                </div>
                                            ) : (
                                                <p>
                                                    No results are available
                                                    to display.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* BLOCKCHAIN CONFIRMATION */}
            {transactionHash && (
                <section className="section">
                    <div className="blockchain-card">
                        <div className="blockchain-header">
                            <div className="blockchain-icon">⛓️</div>

                            <div>
                                <span className="section-label">
                                    BLOCKCHAIN CONFIRMATION
                                </span>
                                <h2>Vote Successfully Recorded</h2>
                            </div>
                        </div>

                        <div className="confirmation-grid">
                            <div className="confirmation-item">
                                <span>Vote ID</span>
                                <strong>#{voteId ?? "N/A"}</strong>
                            </div>

                            <div className="confirmation-item">
                                <span>Transaction Hash</span>
                                <code>{transactionHash}</code>
                            </div>
                        </div>

                        <div className="confirmation-message">
                            ✓ The vote request returned a transaction hash.
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}

export default VoterDashboard;
