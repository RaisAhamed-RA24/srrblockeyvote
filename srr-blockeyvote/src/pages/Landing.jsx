import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, Fingerprint, Award, Database, BarChart3 } from "lucide-react";
import axios from "axios";
import Topbar from "../components/Topbar";

function Landing() {
  const [election, setElection] = useState({
    title: "",
    description: "",
    status: "NO_ELECTION"
  });

  useEffect(() => {
    fetchLandingData();
  }, []);

  const fetchLandingData = async () => {
    try {
      const electionRes = await axios.get("http://localhost:5000/api/public/election");
      setElection(electionRes.data || { title: "", description: "", status: "NO_ELECTION" });
    } catch (err) {
      console.error("Error loading landing data:", err);
    }
  };

  return (
    <>
      <Topbar />
      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-icon">
            <Shield size={40} />
          </div>
          <h1>SRR BlockeyVote Platform</h1>
          <p>
            A secure digital voting platform combining blockchain immutability and multi-factor biometric scanning to deliver fraud-free, auditable elections.
          </p>
          <div className="hero-actions">
            <Link to="/voter/login" className="primary-action">Ballot Portal Login</Link>
            <Link to="/voter/register" className="secondary-action">Voter Registration</Link>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="feature-grid">
          <article className="feature-card">
            <div className="feature-icon">
              <Database size={24} />
            </div>
            <h2>Blockchain Immutability</h2>
            <p>
              Votes are committed to a cryptographically chained ledger. Transactions are irreversible and fully auditable by public keys.
            </p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">
              <Fingerprint size={24} />
            </div>
            <h2>Biometric Verification</h2>
            <p>
              Simulated Fingerprint and Face Recognition checks verify physical identity at the point of ballot casting, stopping duplicate voting.
            </p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">
              <Award size={24} />
            </div>
            <h2>Role-Based Security</h2>
            <p>
              Strict hierarchical credentials protect administrative actions. Lockouts and re-authentication guards preserve integrity.
            </p>
          </article>
        </section>

        {/* Process Flow Steps */}
        <section className="process-panel" style={{ marginTop: "60px" }}>
          <h2>How BlockeyVote Secures Your Vote</h2>
          <ol className="steps">
            <li>
              <span>1</span>
              <strong>Submit Application</strong>
              <small>Voters submit registration details and proof of identity.</small>
            </li>
            <li>
              <span>2</span>
              <strong>Admin Clearance</strong>
              <small>Election Admin reviews applications and issues Voter credentials.</small>
            </li>
            <li>
              <span>3</span>
              <strong>MFA Scan</strong>
              <small>Simulate biometric physical verification before casting.</small>
            </li>
            <li>
              <span>4</span>
              <strong>Audit Ledger</strong>
              <small>Ballets are hashed, recorded to ledger blocks, and published.</small>
            </li>
          </ol>
        </section>

        {/* Quick Info Dashboard Panel */}
        <section className="page-section" style={{ marginBottom: "80px" }}>
          <div className="two-column" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <article className="panel">
              <h3>Election Status Board</h3>
              <div style={{ marginTop: "16px" }}>
                <strong>Current Election:</strong>
                <p style={{ marginTop: "4px", color: "var(--muted)" }}>
                  {election.status !== "NO_ELECTION" ? election.title : "No elections scheduled."}
                </p>
                {election.status !== "NO_ELECTION" && (
                  <p style={{ fontSize: "14px", color: "var(--muted)", marginTop: "4px" }}>
                    {election.description}
                  </p>
                )}
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "16px" }}>
                  <span>Status:</span>
                  <span id="election-status-pill" data-status={election.status}>
                    {election.status}
                  </span>
                </div>
              </div>
            </article>

            <article className="panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3>Administrative Requests</h3>
                <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "8px" }}>
                  Official observers and election officers can submit credential requests to obtain Admin privileges. Requests are reviewed by the Super Admin.
                </p>
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                <Link to="/admin/register" className="button-like" style={{ flex: 1 }}>Request Admin Access</Link>
                <Link to="/admin/login" className="primary-action" style={{ flex: 1, minHeight: "50px" }}>Admin Portal</Link>
              </div>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}

export default Landing;
