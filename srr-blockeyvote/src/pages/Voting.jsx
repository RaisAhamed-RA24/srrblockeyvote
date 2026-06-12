import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import Topbar from "../components/Topbar";

function Voting() {
  const navigate = useNavigate();
  const [election, setElection] = useState({
    title: "",
    description: "",
    status: "NO_ELECTION"
  });
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [voteMsg, setVoteMsg] = useState("");
  const [voteMsgType, setVoteMsgType] = useState("");

  const userStr = localStorage.getItem("user");
  const biometricVerified = localStorage.getItem("biometricVerified") === "true";
  const [voterDetails, setVoterDetails] = useState(null);

  useEffect(() => {
    if (!userStr) {
      navigate("/voter/login");
      return;
    }
    const parsed = JSON.parse(userStr);
    setVoterDetails(parsed);
    fetchBallotData(parsed.userId);
  }, [navigate, userStr]);

  const fetchBallotData = async (voterId) => {
    try {
      const electRes = await api.get("/voter/election");
      setElection(electRes.data || { title: "", description: "", status: "NO_ELECTION" });

      const candRes = await api.get("/voter/candidates");
      setCandidates(candRes.data || []);

      // Fetch voter data by querying admin list (since voter role doesn't have list voters endpoint, we fetch via user session)
      // Actually, we can fetch via direct user session if needed, but since we are synchronizing status, let's keep voterDetails updated.
      // If the admin/voters call fails because the voter is not allowed (Voters can't get all voters!), let's catch it.
      // Wait! Voters cannot query /admin/voters! It will return 403 Forbidden!
      // Ah! This is an important detail!
      // In the previous version, there was no RBAC, so anyone could query `/admins/voters`.
      // But now we have middleware `/admin/voters` which restricts access to ADMIN and SUPER_ADMIN.
      // So how do voters know if they have voted?
      // Since the voter logs in and the login response returns `{ hasVoted }` in the user object, and `/voter/vote` returns success, the user object in localStorage is the single source of truth for the voter's `hasVoted` state! So they do NOT need to call `/admin/voters`. We can just read `voterDetails.hasVoted` from the logged in user context!
      // This is a beautiful, secure design.
      
    } catch (err) {
      console.error("Error loading ballot:", err);
    }
  };

  useEffect(() => {
    updateMessage();
  }, [election, voterDetails, biometricVerified, selectedCandidateId]);

  const updateMessage = () => {
    setVoteMsg("");
    setVoteMsgType("");

    if (!voterDetails) {
      setVoteMsg("Login and complete biometric verification to unlock voting.");
      return;
    }

    if (voterDetails.hasVoted) {
      setVoteMsg("Voting Blocked: this voter ID has already cast a vote.");
      setVoteMsgType("error");
      return;
    }

    if (election.status !== "OPEN") {
      setVoteMsg(
        election.status === "NO_ELECTION"
          ? "Currently no elections available."
          : `Voting unavailable while election status is ${election.status}.`
      );
      return;
    }

    if (!biometricVerified) {
      setVoteMsg("Complete biometric verification to proceed.");
      return;
    }

    if (!selectedCandidateId) {
      setVoteMsg("Select one candidate and submit your secure vote.");
      return;
    }
  };

  const handleSelectCandidate = (candidateId) => {
    if (voterDetails?.hasVoted || election.status !== "OPEN" || !biometricVerified) return;
    setSelectedCandidateId(candidateId);
  };

  const handleSubmitVote = async () => {
    if (!voterDetails) return;
    
    // Safety check for duplicate voting
    if (voterDetails.hasVoted) {
      try {
        await api.post("/voter/vote", {
          candidateId: selectedCandidateId
        });
      } catch (err) {
        setVoteMsg("Voting Blocked: duplicate voting attempt recorded.");
        setVoteMsgType("error");
      }
      return;
    }

    try {
      const res = await api.post("/voter/vote", {
        candidateId: selectedCandidateId
      });

      if (res.data.success) {
        // Save receipt details
        localStorage.setItem("confirmedVoteId", res.data.vote.voteId);
        localStorage.setItem("confirmedHash", res.data.vote.blockHash);
        localStorage.setItem("confirmedTimestamp", res.data.vote.timestamp);
        
        // Update user state locally
        const updated = { ...voterDetails, hasVoted: true };
        localStorage.setItem("user", JSON.stringify(updated));
        setVoterDetails(updated);

        navigate("/voter/confirmation");
      }
    } catch (err) {
      setVoteMsg(err.response?.data?.message || "Failed to submit your vote.");
      setVoteMsgType("error");
    }
  };

  const canVote =
    voterDetails &&
    voterDetails.status === "ACTIVE" &&
    !voterDetails.hasVoted &&
    biometricVerified &&
    election.status === "OPEN";

  return (
    <>
      <Topbar />
      <main className="page-section" style={{ marginTop: "40px" }}>
        
        {/* Election Banner */}
        <section className="election-banner">
          <div>
            <h2 id="election-title">
              {election.status !== "NO_ELECTION" ? election.title : "Currently no elections available"}
            </h2>
            <small id="election-description">
              {election.status !== "NO_ELECTION"
                ? election.description
                : "Candidates will appear only after an administrator creates an election and uploads candidates."}
            </small>
          </div>
          <span id="election-status-pill" data-status={election.status}>
            {election.status}
          </span>
        </section>

        {/* Candidate List Selection */}
        <div style={{ marginBottom: "40px" }}>
          {election.status === "NO_ELECTION" ? (
            <p className="empty-state">Currently no elections available. No candidates have been uploaded by administrators.</p>
          ) : candidates.length === 0 ? (
            <p className="empty-state">No candidates are available for this election yet. Candidates will appear after admin upload.</p>
          ) : (
            <div className="candidate-card-grid">
              {candidates.map((cand) => {
                const initials = cand.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                const isSelected = selectedCandidateId === cand.candidateId;

                return (
                  <article 
                    key={cand.candidateId} 
                    className={`candidate-card ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelectCandidate(cand.candidateId)}
                    style={{ cursor: canVote ? "pointer" : "default" }}
                  >
                    <div className="candidate-avatar">{initials}</div>
                    <div>
                      <h3>{cand.name}</h3>
                      <small>{cand.party} | Symbol: {cand.symbol}</small>
                    </div>
                    <p>{cand.manifesto}</p>
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCandidate(cand.candidateId);
                      }}
                      disabled={!canVote}
                    >
                      {isSelected ? "Selected" : "Select Candidate"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Voting submission action bar */}
        <div 
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
            background: "var(--card)",
            padding: "24px",
            borderRadius: "8px",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)"
          }}
        >
          <button
            id="submit-vote"
            type="button"
            className="primary-action"
            disabled={!canVote || !selectedCandidateId}
            onClick={handleSubmitVote}
          >
            Submit Secure Vote
          </button>
          
          {voteMsg && (
            <strong 
              className="inline-message" 
              data-type={voteMsgType}
              style={{
                color: voteMsgType === "error" ? "var(--danger)" : "var(--muted)",
                fontSize: "15px"
              }}
            >
              {voteMsg}
            </strong>
          )}
        </div>

      </main>
    </>
  );
}

export default Voting;
