import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, ShieldAlert, Fingerprint, ShieldCheck, CheckCircle2 } from "lucide-react";
import axios from "axios";
import Topbar from "../components/Topbar";

function VoterDashboard() {
  const navigate = useNavigate();
  const [voter, setVoter] = useState(null);
  const [election, setElection] = useState({ status: "NO_ELECTION", title: "" });
  const [biometricVerified, setBiometricVerified] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!userStr || !token) {
      navigate("/voter/login");
      return;
    }

    const parsedUser = JSON.parse(userStr);
    setVoter(parsedUser);
    setBiometricVerified(localStorage.getItem("biometricVerified") === "true");

    fetchVoterStatus(parsedUser.userId);
  }, [navigate]);

  const fetchVoterStatus = async (voterId) => {
    try {
      // Sync voter status
      const res = await axios.get("http://localhost:5000/api/admins/voters", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const current = res.data.find(v => v.userId === voterId);
      if (current) {
        setVoter(prev => {
          const updated = { ...prev, hasVoted: current.hasVoted, status: current.status };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
      }

      // Fetch election status
      const electRes = await axios.get("http://localhost:5000/api/public/election");
      setElection(electRes.data || { status: "NO_ELECTION", title: "" });
    } catch (err) {
      console.error("Error loading voter dashboard data:", err);
    }
  };

  if (!voter) return <p className="inline-message">Loading dashboard...</p>;

  return (
    <>
      <Topbar />
      <main style={{ marginTop: "40px" }} className="page-section">
        
        {/* Welcome Section */}
        <section 
          style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "32px",
            background: "var(--card)",
            padding: "24px",
            borderRadius: "8px",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div 
              style={{ 
                width: "60px", 
                height: "60px", 
                borderRadius: "50%", 
                background: "var(--soft)", 
                display: "grid", 
                placeItems: "center",
                color: "var(--blue)" 
              }}
            >
              <User size={30} />
            </div>
            <div>
              <span style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 700 }}>Voter Session Active</span>
              <h2 style={{ fontSize: "24px", fontWeight: 800 }}>Welcome, {voter.name}</h2>
              <small style={{ color: "var(--muted)" }}>Voter ID Reference: <strong>{voter.userId}</strong></small>
            </div>
          </div>
          <span className="status-pill approved" style={{ textTransform: "uppercase" }}>{voter.status}</span>
        </section>

        {/* Voting Lifecycle Status */}
        <section className="two-column">
          
          {/* Main Action Block */}
          <article className="panel">
            <h3>Ballot Actions</h3>
            
            {voter.hasVoted ? (
              /* Scenario 1: Already Voted */
              <div style={{ textAlign: "center", paddingBlock: "30px" }}>
                <CheckCircle2 size={56} color="var(--success)" style={{ marginInline: "auto", marginBottom: "16px" }} />
                <h4 style={{ fontSize: "20px", fontWeight: 800, color: "var(--success)" }}>Ballot Cast Completed</h4>
                <p style={{ maxWidth: "440px", marginInline: "auto", color: "var(--muted)", marginTop: "8px", fontSize: "14px" }}>
                  You have successfully submitted your encrypted ballot to the blockchain. Multi-voting protection has locked this Voter ID from further submissions.
                </p>
                <div style={{ marginTop: "24px" }}>
                  <Link to="/results" className="primary-action">View Live Election Charts</Link>
                </div>
              </div>
            ) : election.status !== "OPEN" ? (
              /* Scenario 2: Election not open */
              <div style={{ textAlign: "center", paddingBlock: "30px" }}>
                <ShieldAlert size={56} color="var(--warning)" style={{ marginInline: "auto", marginBottom: "16px" }} />
                <h4>Ballot Portal Unavailable</h4>
                <p style={{ maxWidth: "440px", marginInline: "auto", color: "var(--muted)", marginTop: "8px", fontSize: "14px" }}>
                  {election.status === "NO_ELECTION" 
                    ? "Currently, no active election has been scheduled by election officers."
                    : `Voting portal is currently locked because election status is: ${election.status}.`
                  }
                </p>
              </div>
            ) : !biometricVerified ? (
              /* Scenario 3: Biometrics Needed */
              <div style={{ textAlign: "center", paddingBlock: "30px" }}>
                <Fingerprint size={56} color="var(--blue)" style={{ marginInline: "auto", marginBottom: "16px" }} />
                <h4>Biometric Verification Required</h4>
                <p style={{ maxWidth: "440px", marginInline: "auto", color: "var(--muted)", marginTop: "8px", fontSize: "14px", marginBottom: "20px" }}>
                  To unlock your digital ballot, you must complete the simulated biometric physical check to confirm your identity.
                </p>
                <Link to="/voter/biometric" className="primary-action">Start Biometric Verification</Link>
              </div>
            ) : (
              /* Scenario 4: Ready to Vote */
              <div style={{ textAlign: "center", paddingBlock: "30px" }}>
                <ShieldCheck size={56} color="var(--success)" style={{ marginInline: "auto", marginBottom: "16px" }} />
                <h4>Identity Confirmed & Ballot Unlocked</h4>
                <p style={{ maxWidth: "440px", marginInline: "auto", color: "var(--muted)", marginTop: "8px", fontSize: "14px", marginBottom: "20px" }}>
                  Your biometric check was successful. Access the ballot page to select candidates and commit your secure vote block.
                </p>
                <Link to="/voter/voting" className="primary-action">Access Digital Ballot</Link>
              </div>
            )}
          </article>

          {/* Sidebar Audit details */}
          <article className="panel" style={{ height: "fit-content" }}>
            <h3>Election Constraints</h3>
            <div style={{ marginTop: "16px", display: "grid", gap: "14px" }}>
              <div style={{ padding: "14px", background: "var(--soft)", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <strong>Election Title</strong>
                <p style={{ fontSize: "14px", color: "var(--muted)", marginTop: "4px" }}>
                  {election.status !== "NO_ELECTION" ? election.title : "No Active Election"}
                </p>
              </div>
              <div style={{ padding: "14px", background: "var(--soft)", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <strong>Dual-MFA Biometrics</strong>
                <p style={{ fontSize: "14px", color: "var(--muted)", marginTop: "4px" }}>
                  Your session requires both token logins and biometric hardware scanning to authorize voting tokens.
                </p>
              </div>
            </div>
          </article>

        </section>

      </main>
    </>
  );
}

export default VoterDashboard;
