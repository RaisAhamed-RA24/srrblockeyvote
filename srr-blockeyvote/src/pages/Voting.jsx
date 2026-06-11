import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
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

  const loggedInVoter = localStorage.getItem("loggedInVoter");
  const loggedInVoterId = localStorage.getItem("loggedInVoterId");
  const biometricVerified = localStorage.getItem("biometricVerified") === "true";
  const [voterDetails, setVoterDetails] = useState(null);

  useEffect(() => {
    fetchBallotData();
  }, []);

  const fetchBallotData = async () => {
    try {
      const electRes = await axios.get("http://localhost:5000/api/voters/election");
      setElection(electRes.data || { title: "", description: "", status: "NO_ELECTION" });

      const candRes = await axios.get("http://localhost:5000/api/voters/candidates");
      setCandidates(candRes.data || []);

      if (loggedInVoterId) {
        const votersRes = await axios.get("http://localhost:5000/api/admins/voters");
        const currentV = votersRes.data.find(v => v.voterId === loggedInVoterId);
        setVoterDetails(currentV);
      }
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

    if (!loggedInVoterId) {
      setVoteMsg("Login and complete biometric verification to unlock voting.");
      return;
    }

    if (voterDetails && voterDetails.hasVoted) {
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
    if (!loggedInVoterId) return;
    
    // Safety check for duplicate voting
    if (voterDetails && voterDetails.hasVoted) {
      try {
        await axios.post("http://localhost:5000/api/voters/vote", {
          voterId: loggedInVoterId,
          candidateId: selectedCandidateId
        });
      } catch (err) {
        setVoteMsg("Voting Blocked: duplicate voting attempt recorded.");
        setVoteMsgType("error");
        // Refetch voter details to sync state
        fetchBallotData();
      }
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/voters/vote", {
        voterId: loggedInVoterId,
        candidateId: selectedCandidateId
      });

      if (res.data.success) {
        // Save receipt information
        localStorage.setItem("confirmedVoteId", res.data.vote.voteId);
        localStorage.setItem("confirmedHash", res.data.vote.blockHash);
        localStorage.setItem("confirmedTimestamp", res.data.vote.timestamp);
        
        // Mark voter as hasVoted in local storage object
        if (voterDetails) {
          const updated = { ...voterDetails, hasVoted: true };
          localStorage.setItem("loggedInVoter", JSON.stringify(updated));
        }

        navigate("/confirmation");
      }
    } catch (err) {
      setVoteMsg(err.response?.data?.message || "Failed to submit your vote.");
      setVoteMsgType("error");
      fetchBallotData();
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
