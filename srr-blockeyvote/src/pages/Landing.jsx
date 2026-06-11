import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, Fingerprint, Award, CheckCircle, Database } from "lucide-react";
import axios from "axios";
import Topbar from "../components/Topbar";

function Landing() {
  const [metrics, setMetrics] = useState({
    pendingVoterApps: 0,
    approvedVoters: 0,
    latestVoterId: "--"
  });
  const [election, setElection] = useState({
    title: "",
    description: "",
    status: "NO_ELECTION"
  });

  // Forms states
  const [voterForm, setVoterForm] = useState({ name: "", email: "", mobile: "" });
  const [voterMsg, setVoterMsg] = useState("");
  const [voterMsgType, setVoterMsgType] = useState("");

  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    mobile: "",
    organization: "",
    password: "",
    confirmPassword: ""
  });
  const [adminMsg, setAdminMsg] = useState("");
  const [adminMsgType, setAdminMsgType] = useState("");

  useEffect(() => {
    fetchLandingData();
  }, []);

  const fetchLandingData = async () => {
    try {
      // Fetch election status
      const electionRes = await axios.get("http://localhost:5000/api/voters/election");
      setElection(electionRes.data || { title: "", description: "", status: "NO_ELECTION" });

      // Fetch voter statistics (using admin metrics endpoint or default values)
      const metricsRes = await axios.get("http://localhost:5000/api/admins/dashboard-metrics");
      
      // Fetch latest voter ID
      const votersRes = await axios.get("http://localhost:5000/api/admins/voters");
      const lastVoter = votersRes.data.length > 0 ? votersRes.data[votersRes.data.length - 1].voterId : "--";

      setMetrics({
        pendingVoterApps: metricsRes.data.pendingVoterApps,
        approvedVoters: metricsRes.data.approvedVoters,
        latestVoterId: lastVoter
      });
    } catch (err) {
      console.error("Error loading landing data:", err);
    }
  };

  const handleVoterSubmit = async (e) => {
    e.preventDefault();
    setVoterMsg("");
    try {
      const res = await axios.post("http://localhost:5000/api/voters/register", voterForm);
      if (res.data.success) {
        setVoterMsgType("success");
        setVoterMsg(`${voterForm.name}'s application was submitted for admin review with status PENDING.`);
        setVoterForm({ name: "", email: "", mobile: "" });
        fetchLandingData();
      }
    } catch (err) {
      setVoterMsgType("error");
      setVoterMsg(err.response?.data?.message || "Failed to submit voter registration.");
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminMsg("");
    if (adminForm.password !== adminForm.confirmPassword) {
      setAdminMsgType("error");
      setAdminMsg("Passwords do not match. Admin access request was not submitted.");
      return;
    }
    try {
      const res = await axios.post("http://localhost:5000/api/admins/request", {
        name: adminForm.name,
        email: adminForm.email,
        mobile: adminForm.mobile,
        organization: adminForm.organization,
        password: adminForm.password
      });
      if (res.data.success) {
        setAdminMsgType("success");
        setAdminMsg(`${adminForm.name}'s admin access request was stored as PENDING.`);
        setAdminForm({
          name: "",
          email: "",
          mobile: "",
          organization: "",
          password: "",
          confirmPassword: ""
        });
        fetchLandingData();
      }
    } catch (err) {
      setAdminMsgType("error");
      setAdminMsg(err.response?.data?.message || "Failed to submit admin request.");
    }
  };

  return (
    <>
      <Topbar />
      <main>
        {/* Hero Banner */}
        <section className="hero">
          <div className="hero-icon">
            <Shield size={40} />
          </div>
          <h1>SRR BlockeyVote Prototype</h1>
          <p>
            An advanced blockchain-enabled, multi-factor biometric voting simulator designed to eliminate duplicate voting and deliver tamper-proof results.
          </p>
          <div className="hero-actions">
            <Link to="/login" className="primary-action">Access Ballot Portal</Link>
            <a href="#register-section" className="secondary-action">Voter Registration</a>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="feature-grid">
          <article className="feature-card">
            <div className="feature-icon">
              <Database size={24} />
            </div>
            <h2>Cryptographic Blockchain Ledger</h2>
            <p>
              Every vote creates an immutable block cryptographically linked to the previous transaction, preventing any manipulation of recorded totals.
            </p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">
              <Fingerprint size={24} />
            </div>
            <h2>Multi-Factor Biometrics</h2>
            <p>
              Dual-verification workflows simulate Fingerprint and Face Recognition hardware scanning to securely verify identity at the point of ballot submission.
            </p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">
              <Award size={24} />
            </div>
            <h2>Secure Admin Framework</h2>
            <p>
              Hierarchical authentication, timed security lockouts, audit logs, and critical action approvals keep the entire election lifecycle secure.
            </p>
          </article>
        </section>

        {/* Process Steps Panel */}
        <section className="process-panel">
          <h2>How BlockeyVote Secures Elections</h2>
          <ol className="steps">
            <li>
              <span>1</span>
              <strong>Voter Registration</strong>
              <small>Submit credentials and apply for administrative clearance.</small>
            </li>
            <li>
              <span>2</span>
              <strong>Admin Clearance</strong>
              <small>Election administrators verify information and approve Voter ID.</small>
            </li>
            <li>
              <span>3</span>
              <strong>Biometric Scan</strong>
              <small>Perform simulated multi-factor hardware identity confirmation.</small>
            </li>
            <li>
              <span>4</span>
              <strong>Cast Ballot</strong>
              <small>Cast vote, hash transaction, and commit block to ledger.</small>
            </li>
          </ol>
        </section>

        {/* Registration Two Column Section */}
        <section className="page-section" id="register-section">
          <div className="two-column">
            {/* Voter Registration Panel */}
            <article className="panel">
              <div className="section-heading">
                <p>Register as Voter</p>
                <h2>Apply for Ballot Access</h2>
              </div>
              <form onSubmit={handleVoterSubmit} className="form-grid">
                <div>
                  <label htmlFor="voter-name">Full Name</label>
                  <input
                    id="voter-name"
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={voterForm.name}
                    onChange={(e) => setVoterForm({ ...voterForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="voter-email">Email Address</label>
                  <input
                    id="voter-email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={voterForm.email}
                    onChange={(e) => setVoterForm({ ...voterForm, email: e.target.value })}
                  />
                </div>
                <div className="wide">
                  <label htmlFor="voter-mobile">Mobile Number</label>
                  <input
                    id="voter-mobile"
                    type="tel"
                    required
                    placeholder="10-digit number"
                    value={voterForm.mobile}
                    onChange={(e) => setVoterForm({ ...voterForm, mobile: e.target.value })}
                  />
                </div>
                <button type="submit" className="primary-action form-button">Submit Voter Application</button>
                {voterMsg && (
                  <p className="inline-message" data-type={voterMsgType}>{voterMsg}</p>
                )}
              </form>
            </article>

            {/* Voter Statistics Panel */}
            <article className="panel status-panel" style={{ height: "fit-content" }}>
              <h3>Ballot Statistics</h3>
              <dl>
                <div>
                  <dt>Pending Applications</dt>
                  <dd>{metrics.pendingVoterApps}</dd>
                </div>
                <div>
                  <dt>Approved Voters</dt>
                  <dd>{metrics.approvedVoters}</dd>
                </div>
                <div>
                  <dt>Latest Voter ID</dt>
                  <dd>{metrics.latestVoterId}</dd>
                </div>
              </dl>
              <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--line)" }}>
                <h4>Active Election Status</h4>
                <p style={{ marginTop: "8px" }}>
                  <strong>Title: </strong>
                  {election.status !== "NO_ELECTION" ? election.title : "Currently no elections available"}
                </p>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "12px" }}>
                  <span>Status Pill: </span>
                  <span id="election-status-pill" data-status={election.status}>
                    {election.status}
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Admin Request Section */}
        <section className="page-section">
          <div className="two-column">
            {/* Admin Access Form */}
            <article className="panel">
              <div className="section-heading">
                <p>Administrative Access</p>
                <h2>Request Admin Credentials</h2>
              </div>
              <form onSubmit={handleAdminSubmit} className="form-grid">
                <div>
                  <label htmlFor="admin-name">Full Name</label>
                  <input
                    id="admin-name"
                    type="text"
                    required
                    placeholder="Priya Nair"
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="admin-email">Email Address</label>
                  <input
                    id="admin-email"
                    type="email"
                    required
                    placeholder="priya@ieee.org"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="admin-mobile">Mobile Number</label>
                  <input
                    id="admin-mobile"
                    type="tel"
                    required
                    placeholder="9000011111"
                    value={adminForm.mobile}
                    onChange={(e) => setAdminForm({ ...adminForm, mobile: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="admin-org">Affiliated Organization</label>
                  <input
                    id="admin-org"
                    type="text"
                    required
                    placeholder="IEEE Student Chapter"
                    value={adminForm.organization}
                    onChange={(e) => setAdminForm({ ...adminForm, organization: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="admin-pass">Password</label>
                  <input
                    id="admin-pass"
                    type="password"
                    required
                    placeholder="Create security password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="admin-confirm">Confirm Password</label>
                  <input
                    id="admin-confirm"
                    type="password"
                    required
                    placeholder="Re-enter security password"
                    value={adminForm.confirmPassword}
                    onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                  />
                </div>
                <button type="submit" className="primary-action form-button">Submit Admin Request</button>
                {adminMsg && (
                  <p className="inline-message" data-type={adminMsgType}>{adminMsg}</p>
                )}
              </form>
            </article>

            {/* Simulated Architecture Note */}
            <article className="panel" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ textAlign: "center", padding: "20px" }}>
                <CheckCircle size={56} color="var(--success)" style={{ marginInline: "auto", marginBottom: "16px" }} />
                <h3>Zero-Trust Security Simulation</h3>
                <p style={{ marginTop: "12px" }}>
                  This demo supports test data seeding, duplicate login attempt protection (temporary lock), multi-factor static OTP validation, and Super Admin critical command controls.
                </p>
              </div>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}

export default Landing;
