import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Settings, Users, AlertTriangle, Cpu, Layers, RefreshCw, Plus, Trash2, Edit } from "lucide-react";
import axios from "axios";
import Topbar from "../components/Topbar";

function Admin() {
  const navigate = useNavigate();
  const currentAdmin = localStorage.getItem("currentAdmin");
  const currentAdminId = localStorage.getItem("currentAdminId");
  const [adminDetails, setAdminDetails] = useState(null);

  // Statistics state
  const [metrics, setMetrics] = useState({
    pendingVoterApps: 0,
    approvedVoters: 0,
    totalVoters: 0,
    votesCast: 0,
    activeElectionsCount: 0,
    duplicateAttempts: 0,
    activeAdmins: 0,
    pendingAdminRequests: 0,
    ledgerBlocksCount: 0
  });

  // Data lists state
  const [voterApplications, setVoterApplications] = useState([]);
  const [voterAccounts, setVoterAccounts] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [adminRequests, setAdminRequests] = useState([]);
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [ledgerBlocks, setLedgerBlocks] = useState([]);

  // Forms state
  const [electionForm, setElectionForm] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "DRAFT"
  });

  const [candidateForm, setCandidateForm] = useState({
    name: "",
    party: "",
    symbol: "",
    manifesto: ""
  });
  const [editingCandidateId, setEditingCandidateId] = useState(null);

  // UI state
  const [activeSubTab, setActiveSubTab] = useState("voters-mgmt"); // voters-mgmt, election-mgmt, candidates-mgmt, results-mgmt

  useEffect(() => {
    if (!currentAdmin || !currentAdminId) {
      navigate("/login");
      return;
    }
    const parsed = JSON.parse(currentAdmin);
    setAdminDetails(parsed);
  }, [currentAdmin, currentAdminId, navigate]);

  useEffect(() => {
    if (adminDetails) {
      fetchDashboardData();
    }
  }, [adminDetails, activeSubTab]);

  const fetchDashboardData = async () => {
    try {
      // Fetch metrics
      const metricsRes = await axios.get("http://localhost:5000/api/admins/dashboard-metrics");
      setMetrics(metricsRes.data);

      // Fetch election config
      const electRes = await axios.get("http://localhost:5000/api/voters/election");
      if (electRes.data) {
        setElectionForm({
          title: electRes.data.title || "",
          description: electRes.data.description || "",
          startDate: electRes.data.startDate || "",
          endDate: electRes.data.endDate || "",
          status: electRes.data.status || "DRAFT"
        });
      }

      // Fetch standard lists
      const candRes = await axios.get("http://localhost:5000/api/admins/results");
      setCandidates(candRes.data || []);

      const votersRes = await axios.get("http://localhost:5000/api/admins/voters");
      setVoterAccounts(votersRes.data || []);

      const appsRes = await axios.get("http://localhost:5000/api/admins/voter-applications");
      setVoterApplications(appsRes.data || []);

      // Fetch super admin exclusive lists
      if (adminDetails.role === "SUPER_ADMIN") {
        const adminReqRes = await axios.get("http://localhost:5000/api/admins/admin-requests");
        setAdminRequests(adminReqRes.data || []);

        const adminAccRes = await axios.get("http://localhost:5000/api/admins/accounts");
        setAdminAccounts(adminAccRes.data || []);

        const securityRes = await axios.get("http://localhost:5000/api/admins/security-events");
        setSecurityEvents(securityRes.data || []);

        const ledgerRes = await axios.get("http://localhost:5000/api/voters/ledger");
        setLedgerBlocks(ledgerRes.data || []);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  };

  /* ==========================================================================
     VOTER APPROVALS & CONTROLS
     ========================================================================== */

  const handleApproveVoter = async (appId) => {
    try {
      const res = await axios.post(`http://localhost:5000/api/admins/voter-applications/${appId}/approve`);
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Voter approval error:", err);
    }
  };

  const handleRejectVoter = async (appId) => {
    try {
      const res = await axios.post(`http://localhost:5000/api/admins/voter-applications/${appId}/reject`);
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Voter rejection error:", err);
    }
  };

  const handleResetVoter = async (vId) => {
    try {
      const res = await axios.post(`http://localhost:5000/api/admins/voters/${vId}/reset`);
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Voter reset error:", err);
    }
  };

  const handleSuspendVoter = async (vId) => {
    try {
      const res = await axios.post(`http://localhost:5000/api/admins/voters/${vId}/suspend`);
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Voter suspend error:", err);
    }
  };

  const handleDeleteVoter = async (vId) => {
    try {
      await axios.delete(`http://localhost:5000/api/admins/voters/${vId}`);
      fetchDashboardData();
    } catch (err) {
      console.error("Voter deletion error:", err);
    }
  };

  const handleGenerateTestVoters = async () => {
    try {
      await axios.post("http://localhost:5000/api/admins/voters/generate-test");
      fetchDashboardData();
    } catch (err) {
      console.error("Test voter generation error:", err);
    }
  };

  const handleResetTestVoters = async () => {
    try {
      await axios.post("http://localhost:5000/api/admins/voters/reset-test");
      localStorage.removeItem("biometricVerified");
      fetchDashboardData();
    } catch (err) {
      console.error("Reset test voters error:", err);
    }
  };

  /* ==========================================================================
     ELECTION lifecycle controls
     ========================================================================== */

  const handleElectionSubmit = async (e, customStatus) => {
    e.preventDefault();
    const updatedStatus = customStatus || electionForm.status;
    try {
      const res = await axios.post("http://localhost:5000/api/admins/election", {
        ...electionForm,
        status: updatedStatus
      });
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Election update error:", err);
    }
  };

  /* ==========================================================================
     CANDIDATE uploads
     ========================================================================== */

  const handleCandidateSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCandidateId) {
        // Edit candidate details
        await axios.put(`http://localhost:5000/api/admins/candidates/${editingCandidateId}`, candidateForm);
        setEditingCandidateId(null);
      } else {
        // Add candidate details
        await axios.post("http://localhost:5000/api/admins/candidates", candidateForm);
      }
      setCandidateForm({ name: "", party: "", symbol: "", manifesto: "" });
      fetchDashboardData();
    } catch (err) {
      console.error("Candidate submit error:", err);
    }
  };

  const handleEditCandidateClick = (cand) => {
    setCandidateForm({
      name: cand.name,
      party: cand.party,
      symbol: cand.symbol,
      manifesto: cand.manifesto
    });
    setEditingCandidateId(cand.candidateId);
  };

  const handleDeleteCandidate = async (candId) => {
    try {
      await axios.delete(`http://localhost:5000/api/admins/candidates/${candId}`);
      fetchDashboardData();
    } catch (err) {
      console.error("Candidate delete error:", err);
    }
  };

  /* ==========================================================================
     SUPER ADMIN APPROVALS & LOG CONTROLS
     ========================================================================== */

  const handleApproveAdminRequest = async (reqId) => {
    const code = window.prompt("Super Admin re-authentication required. Enter critical action code 999999.");
    if (!code) return;
    try {
      const res = await axios.post(`http://localhost:5000/api/admins/admin-requests/${reqId}/approve`, {
        reauthCode: code,
        currentAdminId
      });
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve request.");
    }
  };

  const handleRejectAdminRequest = async (reqId) => {
    const code = window.prompt("Super Admin re-authentication required. Enter critical action code 999999.");
    if (!code) return;
    try {
      const res = await axios.post(`http://localhost:5000/api/admins/admin-requests/${reqId}/reject`, {
        reauthCode: code
      });
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject request.");
    }
  };

  const handleActivateAdmin = async (adminIdVal) => {
    try {
      const res = await axios.post(`http://localhost:5000/api/admins/accounts/${adminIdVal}/activate`);
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Admin activate error:", err);
    }
  };

  const handleSuspendAdmin = async (adminIdVal) => {
    try {
      const res = await axios.post(`http://localhost:5000/api/admins/accounts/${adminIdVal}/suspend`);
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Admin suspend error:", err);
    }
  };

  const handleViewAdminActivity = (adminIdVal) => {
    alert(`${adminIdVal} activity: voter approvals, election updates, candidate management.`);
  };

  if (!adminDetails) {
    return <p className="inline-message">Loading admin details...</p>;
  }

  const isSuper = adminDetails.role === "SUPER_ADMIN";

  // Results calculation helper
  const totalVotes = candidates.reduce((sum, c) => sum + (c.votes || 0), 0);
  const sorted = [...candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const winner = sorted[0];

  return (
    <>
      <Topbar />
      <main className="page-section" style={{ marginTop: "30px", width: "95%" }}>
        
        {/* Portal title */}
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Secure Administration
            </span>
            <h1 style={{ fontSize: "32px", fontWeight: 900, marginTop: "4px" }}>
              {isSuper ? "Super Admin Portal" : "Election Admin Portal"}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--blue)" }}>
            <Shield size={28} />
            <strong style={{ fontSize: "14px" }}>
              ID: {currentAdminId} ({isSuper ? "SUPER_ADMIN" : "ADMIN"})
            </strong>
          </div>
        </section>

        {/* ELECTION ADMIN VIEW PORTAL */}
        {!isSuper ? (
          <div className="two-column">
            
            {/* Sidebar navigation controls */}
            <aside style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={() => setActiveSubTab("voters-mgmt")}
                className={activeSubTab === "voters-mgmt" ? "primary-action" : "secondary-action"}
                style={{ width: "100%", justifyContent: "flex-start", minHeight: "46px" }}
              >
                <Users size={16} style={{ marginRight: "10px" }} />
                Voters Approval & List
              </button>
              <button
                onClick={() => setActiveSubTab("election-mgmt")}
                className={activeSubTab === "election-mgmt" ? "primary-action" : "secondary-action"}
                style={{ width: "100%", justifyContent: "flex-start", minHeight: "46px" }}
              >
                <Settings size={16} style={{ marginRight: "10px" }} />
                Election Lifecycle
              </button>
              <button
                onClick={() => setActiveSubTab("candidates-mgmt")}
                className={activeSubTab === "candidates-mgmt" ? "primary-action" : "secondary-action"}
                style={{ width: "100%", justifyContent: "flex-start", minHeight: "46px" }}
              >
                <Plus size={16} style={{ marginRight: "10px" }} />
                Candidate Management
              </button>
              <button
                onClick={() => setActiveSubTab("results-mgmt")}
                className={activeSubTab === "results-mgmt" ? "primary-action" : "secondary-action"}
                style={{ width: "100%", justifyContent: "flex-start", minHeight: "46px" }}
              >
                <Cpu size={16} style={{ marginRight: "10px" }} />
                Live Monitoring Results
              </button>

              {/* Voter Metrics Box */}
              <div 
                className="panel status-panel" 
                style={{ 
                  marginTop: "20px", 
                  padding: "20px",
                  background: "var(--soft)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px"
                }}
              >
                <h4 style={{ fontSize: "16px", fontWeight: 800 }}>Quick Stats</h4>
                <dl style={{ gridTemplateColumns: "1fr", gap: "10px", marginTop: "12px" }}>
                  <div>
                    <dt style={{ fontSize: "10px" }}>Total Voters</dt>
                    <dd style={{ fontSize: "16px" }}>{metrics.totalVoters}</dd>
                  </div>
                  <div>
                    <dt style={{ fontSize: "10px" }}>Approved Voters</dt>
                    <dd style={{ fontSize: "16px" }}>{metrics.approvedVoters}</dd>
                  </div>
                  <div>
                    <dt style={{ fontSize: "10px" }}>Votes Cast</dt>
                    <dd style={{ fontSize: "16px" }}>{metrics.votesCast}</dd>
                  </div>
                  <div>
                    <dt style={{ fontSize: "10px" }}>Duplicate Blocked Attempts</dt>
                    <dd style={{ fontSize: "16px", color: "var(--danger)" }}>{metrics.duplicateAttempts}</dd>
                  </div>
                </dl>
              </div>
            </aside>

            {/* Sub-tab sections */}
            <article className="panel" style={{ minHeight: "500px" }}>
              
              {/* Voter Management Section */}
              {activeSubTab === "voters-mgmt" && (
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    Voter Approval Requests
                    <span className="status-pill approved" style={{ minHeight: "24px", fontSize: "11px" }}>
                      {voterApplications.length} pending
                    </span>
                  </h3>

                  {voterApplications.length === 0 ? (
                    <p className="inline-message" style={{ marginBlock: "30px" }}>No pending voter applications.</p>
                  ) : (
                    <div style={{ display: "grid", gap: "14px" }}>
                      {voterApplications.map(app => (
                        <div key={app._id} className="application-card" style={{ margin: 0 }}>
                          <header>
                            <strong>{app.name}</strong>
                            <span className="status-pill">{app.status}</span>
                          </header>
                          <p>{app.email} | Mobile: {app.mobile}<br />Documents submitted on {app.date}</p>
                          <div className="row-actions">
                            <button className="mini-button" onClick={() => handleApproveVoter(app._id)}>Approve</button>
                            <button className="mini-button danger-button" onClick={() => handleRejectVoter(app._id)}>Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <hr style={{ marginBlock: "28px", border: "0", borderTop: "1px solid var(--line)" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                    <h3 style={{ fontSize: "20px", fontWeight: 800 }}>Approved Voter Accounts</h3>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="mini-button" onClick={handleGenerateTestVoters}>Generate Test Voters</button>
                      <button className="mini-button danger-button" onClick={handleResetTestVoters}>Reset Test Voters</button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "12px" }}>
                    {voterAccounts.map(voter => (
                      <div key={voter.voterId} className="application-card" style={{ margin: 0 }}>
                        <header>
                          <strong>{voter.voterId} {voter.isTest && <span style={{ color: "var(--warning)", fontSize: "11px", border: "1px solid var(--warning)", padding: "1px 4px", borderRadius: "4px" }}>TEST</span>}</strong>
                          <span className={`status-pill ${voter.status === "ACTIVE" ? "approved" : "rejected"}`}>{voter.status}</span>
                        </header>
                        <p>
                          {voter.name} | {voter.email}<br />
                          {voter.biometricType || "Fingerprint"} | has_voted = {String(voter.hasVoted).toUpperCase()}
                        </p>
                        <div className="row-actions">
                          <button className="mini-button" onClick={() => handleResetVoter(voter.voterId)}>Reset Has Voted</button>
                          <button 
                            className="mini-button danger-button" 
                            onClick={() => voter.isTest ? handleDeleteVoter(voter.voterId) : handleSuspendVoter(voter.voterId)}
                          >
                            {voter.isTest ? "Delete Test" : "Suspend"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Election Lifecyle settings Section */}
              {activeSubTab === "election-mgmt" && (
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "20px" }}>Create and lifecycle election</h3>
                  <form onSubmit={(e) => handleElectionSubmit(e)} className="form-grid">
                    <div className="wide">
                      <label htmlFor="election-title-inp">Election Title</label>
                      <input
                        id="election-title-inp"
                        type="text"
                        required
                        placeholder="e.g. 2026 IEEE Student Council Elections"
                        value={electionForm.title}
                        onChange={(e) => setElectionForm({ ...electionForm, title: e.target.value })}
                      />
                    </div>
                    <div className="wide">
                      <label htmlFor="election-desc-inp">Description / Voting Guidelines</label>
                      <textarea
                        id="election-desc-inp"
                        required
                        placeholder="Define constraints, guidelines, candidate info details..."
                        value={electionForm.description}
                        onChange={(e) => setElectionForm({ ...electionForm, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="election-start-inp">Start Date</label>
                      <input
                        id="election-start-inp"
                        type="date"
                        required
                        value={electionForm.startDate}
                        onChange={(e) => setElectionForm({ ...electionForm, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="election-end-inp">End Date</label>
                      <input
                        id="election-end-inp"
                        type="date"
                        required
                        value={electionForm.endDate}
                        onChange={(e) => setElectionForm({ ...electionForm, endDate: e.target.value })}
                      />
                    </div>

                    <div className="wide" style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
                      <button type="submit" onClick={(e) => handleElectionSubmit(e, "DRAFT")} className="secondary-action" style={{ minHeight: "44px" }}>
                        Save Draft
                      </button>
                      <button type="submit" onClick={(e) => handleElectionSubmit(e, "OPEN")} className="primary-action" style={{ minHeight: "44px" }}>
                        Start Election (OPEN)
                      </button>
                      <button type="submit" onClick={(e) => handleElectionSubmit(e, "CLOSED")} className="secondary-action" style={{ minHeight: "44px", color: "var(--danger)", borderColor: "#f7d2d6" }}>
                        End Election (CLOSED)
                      </button>
                      <button type="submit" onClick={(e) => handleElectionSubmit(e, "RESULTS_PUBLISHED")} className="primary-action" style={{ minHeight: "44px", background: "var(--success)", boxShadow: "none" }}>
                        Publish Results (RESULTS_PUBLISHED)
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Candidate additions Section */}
              {activeSubTab === "candidates-mgmt" && (
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "20px" }}>
                    {editingCandidateId ? `Edit Candidate: ${editingCandidateId}` : "Add New Candidate"}
                  </h3>
                  <form onSubmit={handleCandidateSubmit} className="form-grid">
                    <div>
                      <label htmlFor="cand-name-inp">Candidate Name</label>
                      <input
                        id="cand-name-inp"
                        type="text"
                        required
                        placeholder="Ravi Shankar"
                        value={candidateForm.name}
                        onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="cand-party-inp">Political Party / Affiliation</label>
                      <input
                        id="cand-party-inp"
                        type="text"
                        required
                        placeholder="IEEE Independent"
                        value={candidateForm.party}
                        onChange={(e) => setCandidateForm({ ...candidateForm, party: e.target.value })}
                      />
                    </div>
                    <div className="wide">
                      <label htmlFor="cand-symbol-inp">Voting Symbol / Icon Description</label>
                      <input
                        id="cand-symbol-inp"
                        type="text"
                        required
                        placeholder="e.g. Blue Flame, Torch, Lotus"
                        value={candidateForm.symbol}
                        onChange={(e) => setCandidateForm({ ...candidateForm, symbol: e.target.value })}
                      />
                    </div>
                    <div className="wide">
                      <label htmlFor="cand-manifesto-inp">Candidate Manifesto / Statement</label>
                      <textarea
                        id="cand-manifesto-inp"
                        required
                        placeholder="Outline the candidate's agenda, promises, credentials..."
                        value={candidateForm.manifesto}
                        onChange={(e) => setCandidateForm({ ...candidateForm, manifesto: e.target.value })}
                      />
                    </div>
                    <div className="wide" style={{ display: "flex", gap: "10px" }}>
                      <button type="submit" className="primary-action" style={{ minHeight: "44px" }}>
                        {editingCandidateId ? "Update Candidate" : "Publish Candidate"}
                      </button>
                      {editingCandidateId && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingCandidateId(null);
                            setCandidateForm({ name: "", party: "", symbol: "", manifesto: "" });
                          }} 
                          className="secondary-action" 
                          style={{ minHeight: "44px" }}
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>

                  <hr style={{ marginBlock: "30px", border: "0", borderTop: "1px solid var(--line)" }} />

                  <h3 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "16px" }}>Current Ballot Candidates</h3>
                  {candidates.length === 0 ? (
                    <p className="inline-message">Add candidates to publish them on the voter ballot.</p>
                  ) : (
                    <div style={{ display: "grid", gap: "12px" }}>
                      {candidates.map(cand => (
                        <div key={cand.candidateId} className="admin-candidate">
                          <header>
                            <strong>{cand.name} ({cand.candidateId})</strong>
                            <span className="row-actions">
                              <button className="mini-button" onClick={() => handleEditCandidateClick(cand)}>
                                <Edit size={14} style={{ marginRight: "4px" }} />
                                Edit
                              </button>
                              <button className="mini-button danger-button" onClick={() => handleDeleteCandidate(cand.candidateId)}>
                                <Trash2 size={14} style={{ marginRight: "4px" }} />
                                Delete
                              </button>
                            </span>
                          </header>
                          <p>Party: {cand.party} | Symbol: {cand.symbol}<br />Manifesto: {cand.manifesto}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Live monitoring results Section */}
              {activeSubTab === "results-mgmt" && (
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "16px" }}>Live Election Monitoring</h3>
                  {candidates.length === 0 ? (
                    <p className="inline-message">No candidates available for live monitoring.</p>
                  ) : (
                    <>
                      <div className="bar-chart" style={{ marginBottom: "30px" }}>
                        {candidates.map(cand => {
                          const percent = totalVotes ? Math.round((cand.votes / totalVotes) * 100) : 0;
                          return (
                            <div key={cand.candidateId} className="bar-row">
                              <span>
                                <strong>{cand.name}</strong>
                                <small>{cand.votes} votes | {percent}%</small>
                              </span>
                              <div className="bar-track">
                                <div className="bar-fill" style={{ width: `${percent}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div 
                        style={{ 
                          padding: "16px", 
                          background: "var(--soft)", 
                          border: "1px dashed var(--blue)", 
                          borderRadius: "8px",
                          fontWeight: 700,
                          textAlign: "center"
                        }}
                      >
                        {totalVotes ? `Winner prediction: ${winner?.name} currently leads.` : "Winner prediction appears after candidates receive votes."}
                      </div>
                    </>
                  )}
                </div>
              )}

            </article>

          </div>
        ) : (
          /* SUPER ADMIN VIEW PORTAL */
          <div className="two-column">
            
            {/* Super admin side panels */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Analytics dashboard */}
              <article className="panel">
                <h3>Super Analytics</h3>
                <div className="bar-chart" style={{ marginTop: "16px" }}>
                  {[
                    ["Admins", metrics.activeAdmins],
                    ["Pending Admin Requests", metrics.pendingAdminRequests],
                    ["Voters", metrics.totalVoters],
                    ["Votes", metrics.votesCast],
                    ["Ledger Blocks", metrics.ledgerBlocksCount]
                  ].map(([label, value]) => {
                    const maxVal = Math.max(metrics.activeAdmins, metrics.pendingAdminRequests, metrics.totalVoters, metrics.votesCast, metrics.ledgerBlocksCount, 1);
                    const percent = Math.max(8, Math.round((value / maxVal) * 100));
                    return (
                      <div key={label} className="bar-row">
                        <span>
                          <strong>{label}</strong>
                          <small>{value}</small>
                        </span>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              {/* Admin Accounts suspend activation list */}
              <article className="panel">
                <h3>Manage Admin Credentials</h3>
                {adminAccounts.length === 0 ? (
                  <p className="inline-message">No admin accounts created yet.</p>
                ) : (
                  <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
                    {adminAccounts.map(adm => (
                      <div key={adm.adminId} className="application-card" style={{ margin: 0, padding: "16px" }}>
                        <header>
                          <strong>{adm.adminId}</strong>
                          <span className={`status-pill ${adm.status === "ACTIVE" ? "approved" : "rejected"}`}>{adm.status}</span>
                        </header>
                        <p>{adm.name} | {adm.email}<br />Created by: {adm.createdBy}</p>
                        <div className="row-actions">
                          <button className="mini-button" onClick={() => handleActivateAdmin(adm.adminId)}>Activate</button>
                          <button className="mini-button danger-button" onClick={() => handleSuspendAdmin(adm.adminId)}>Suspend</button>
                          <button className="mini-button" onClick={() => handleViewAdminActivity(adm.adminId)}>Activity</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

            </div>

            {/* Right side panels */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Admin Request processing list */}
              <article className="panel">
                <h3>Pending Admin Requests</h3>
                {adminRequests.length === 0 ? (
                  <p className="inline-message" style={{ marginTop: "14px" }}>No pending admin requests.</p>
                ) : (
                  <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
                    {adminRequests.map(req => (
                      <div key={req._id} className="application-card" style={{ margin: 0, padding: "16px" }}>
                        <header>
                          <strong>{req.name}</strong>
                          <span className="status-pill">{req.status}</span>
                        </header>
                        <p>{req.email} | {req.mobile}<br />Org: {req.organization}</p>
                        <div className="row-actions">
                          <button className="mini-button" onClick={() => handleApproveAdminRequest(req._id)}>Approve</button>
                          <button className="mini-button danger-button" onClick={() => handleRejectAdminRequest(req._id)}>Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              {/* Security Audit event log */}
              <article className="panel">
                <h3>System Security Audit Event Logs</h3>
                {securityEvents.length === 0 ? (
                  <p className="inline-message" style={{ marginTop: "14px" }}>No security events recorded yet.</p>
                ) : (
                  <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
                    {securityEvents.map(evt => (
                      <div key={evt._id} className="ledger-block" style={{ margin: 0, padding: "10px 14px", borderLeft: "3px solid var(--danger)" }}>
                        <strong style={{ fontSize: "13px" }}>{evt.message}</strong>
                        <small style={{ fontSize: "11px", color: "var(--muted)" }}>{evt.time}</small>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              {/* Blockchain Ledger block viewer list */}
              <article className="panel">
                <h3>Simulated Blockchain Ledger Viewer</h3>
                {ledgerBlocks.length === 0 ? (
                  <p className="inline-message" style={{ marginTop: "14px" }}>No blockchain vote records yet.</p>
                ) : (
                  <div style={{ display: "grid", gap: "12px", marginTop: "16px", maxHeight: "400px", overflowY: "auto" }}>
                    {ledgerBlocks.map(block => (
                      <div key={block.blockId} className="ledger-block" style={{ margin: 0 }}>
                        <strong>Block {block.blockId} | Vote ID: {block.voteId}</strong>
                        <small>Candidate ID: {block.candidateId} | Timestamp: {block.timestamp}</small>
                        <code>Previous: {block.previousHash}</code>
                        <code>Current: {block.currentHash}</code>
                      </div>
                    ))}
                  </div>
                )}
              </article>

            </div>

          </div>
        )}

      </main>
    </>
  );
}

export default Admin;
