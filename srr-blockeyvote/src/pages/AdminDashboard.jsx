import { useState, useEffect } from "react";
import { Shield, Settings, Users, Cpu, Plus, Trash2, Edit } from "lucide-react";
import api from "../utils/api";
import Topbar from "../components/Topbar";

function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    pendingVoterApps: 0,
    approvedVoters: 0,
    totalVoters: 0,
    votesCast: 0,
    activeElectionsCount: 0,
    duplicateAttempts: 0
  });

  const [voterApplications, setVoterApplications] = useState([]);
  const [voterAccounts, setVoterAccounts] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("voters-mgmt"); // voters-mgmt, election-mgmt, candidates-mgmt, results-mgmt

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

  useEffect(() => {
    fetchDashboardData();
  }, [activeSubTab]);

  const fetchDashboardData = async () => {
    try {
      const metricsRes = await api.get("/admin/dashboard-metrics");
      setMetrics(metricsRes.data);

      const electRes = await api.get("/voter/election");
      if (electRes.data) {
        setElectionForm({
          title: electRes.data.title || "",
          description: electRes.data.description || "",
          startDate: electRes.data.startDate || "",
          endDate: electRes.data.endDate || "",
          status: electRes.data.status || "DRAFT"
        });
      }

      const candRes = await api.get("/admin/results");
      setCandidates(candRes.data || []);

      const votersRes = await api.get("/admin/voters");
      setVoterAccounts(votersRes.data || []);

      const appsRes = await api.get("/admin/voter-applications");
      setVoterApplications(appsRes.data || []);
    } catch (err) {
      console.error("Error loading admin dashboard data:", err);
    }
  };

  const handleApproveVoter = async (appId) => {
    try {
      const res = await api.post(`/admin/voter-applications/${appId}/approve`);
      if (res.data.success) fetchDashboardData();
    } catch (err) {
      console.error("Voter approval error:", err);
    }
  };

  const handleRejectVoter = async (appId) => {
    try {
      const res = await api.post(`/admin/voter-applications/${appId}/reject`);
      if (res.data.success) fetchDashboardData();
    } catch (err) {
      console.error("Voter rejection error:", err);
    }
  };

  const handleResetVoter = async (vId) => {
    try {
      const res = await api.post(`/admin/voters/${vId}/reset`);
      if (res.data.success) fetchDashboardData();
    } catch (err) {
      console.error("Voter reset error:", err);
    }
  };

  const handleSuspendVoter = async (vId) => {
    try {
      const res = await api.post(`/admin/voters/${vId}/suspend`);
      if (res.data.success) fetchDashboardData();
    } catch (err) {
      console.error("Voter suspend error:", err);
    }
  };

  const handleDeleteVoter = async (vId) => {
    try {
      await api.delete(`/admin/voters/${vId}`);
      fetchDashboardData();
    } catch (err) {
      console.error("Voter deletion error:", err);
    }
  };

  const handleGenerateTestVoters = async () => {
    try {
      await api.post("/admin/voters/generate-test");
      fetchDashboardData();
    } catch (err) {
      console.error("Test voter generation error:", err);
    }
  };

  const handleResetTestVoters = async () => {
    try {
      await api.post("/admin/voters/reset-test");
      localStorage.removeItem("biometricVerified");
      fetchDashboardData();
    } catch (err) {
      console.error("Reset test voters error:", err);
    }
  };

  const handleElectionSubmit = async (e, customStatus) => {
    e.preventDefault();
    const updatedStatus = customStatus || electionForm.status;
    try {
      const res = await api.post("/admin/election", {
        ...electionForm,
        status: updatedStatus
      });
      if (res.data.success) fetchDashboardData();
    } catch (err) {
      console.error("Election update error:", err);
    }
  };

  const handleCandidateSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCandidateId) {
        await api.put(`/admin/candidates/${editingCandidateId}`, candidateForm);
        setEditingCandidateId(null);
      } else {
        await api.post("/admin/candidates", candidateForm);
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
      await api.delete(`/admin/candidates/${candId}`);
      fetchDashboardData();
    } catch (err) {
      console.error("Candidate delete error:", err);
    }
  };

  const totalVotes = candidates.reduce((sum, c) => sum + (c.votes || 0), 0);
  const sorted = [...candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const winner = sorted[0];

  return (
    <>
      <Topbar />
      <main className="page-section" style={{ marginTop: "30px", width: "95%" }}>
        
        {/* Title bar */}
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Election Administration
            </span>
            <h1 style={{ fontSize: "32px", fontWeight: 900, marginTop: "4px" }}>Admin Portal</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--blue)" }}>
            <Shield size={28} />
            <strong style={{ fontSize: "14px" }}>Active Session</strong>
          </div>
        </section>

        <div className="two-column">
          
          {/* Sub menu */}
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

            {/* Quick Metrics stats */}
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

          {/* Sub menu actions pages */}
          <article className="panel" style={{ minHeight: "500px" }}>
            
            {/* Voters Management Tab */}
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
                        <p>{app.email} | Mobile: {app.mobile}<br />DOB: {app.dob} | Address: {app.address}</p>
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
                    <div key={voter.userId} className="application-card" style={{ margin: 0 }}>
                      <header>
                        <strong>{voter.userId} {voter.isTest && <span style={{ color: "var(--warning)", fontSize: "11px", border: "1px solid var(--warning)", padding: "1px 4px", borderRadius: "4px" }}>TEST</span>}</strong>
                        <span className={`status-pill ${voter.status === "ACTIVE" ? "approved" : "rejected"}`}>{voter.status}</span>
                      </header>
                      <p>
                        {voter.name} | {voter.email}<br />
                        {voter.biometricType || "Fingerprint"} | has_voted = {String(voter.hasVoted).toUpperCase()}
                      </p>
                      <div className="row-actions">
                        <button className="mini-button" onClick={() => handleResetVoter(voter.userId)}>Reset Has Voted</button>
                        <button 
                          className="mini-button danger-button" 
                          onClick={() => voter.isTest ? handleDeleteVoter(voter.userId) : handleSuspendVoter(voter.userId)}
                        >
                          {voter.isTest ? "Delete Test" : "Suspend"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Election Lifecycle Settings */}
            {activeSubTab === "election-mgmt" && (
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "20px" }}>Create and lifecycle election</h3>
                <form onSubmit={(e) => handleElectionSubmit(e)} className="form-grid">
                  <div className="wide">
                    <label htmlFor="adm-el-title">Election Title</label>
                    <input
                      id="adm-el-title"
                      type="text"
                      required
                      placeholder="e.g. 2026 Student Council Elections"
                      value={electionForm.title}
                      onChange={(e) => setElectionForm({ ...electionForm, title: e.target.value })}
                    />
                  </div>
                  <div className="wide">
                    <label htmlFor="adm-el-desc">Description / Guidelines</label>
                    <textarea
                      id="adm-el-desc"
                      required
                      placeholder="Define constraints, guidelines, candidate info details..."
                      value={electionForm.description}
                      onChange={(e) => setElectionForm({ ...electionForm, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-el-start">Start Date</label>
                    <input
                      id="adm-el-start"
                      type="date"
                      required
                      value={electionForm.startDate}
                      onChange={(e) => setElectionForm({ ...electionForm, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-el-end">End Date</label>
                    <input
                      id="adm-el-end"
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

            {/* Candidates Management */}
            {activeSubTab === "candidates-mgmt" && (
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "20px" }}>
                  {editingCandidateId ? `Edit Candidate: ${editingCandidateId}` : "Add New Candidate"}
                </h3>
                <form onSubmit={handleCandidateSubmit} className="form-grid">
                  <div>
                    <label htmlFor="adm-cand-name">Candidate Name</label>
                    <input
                      id="adm-cand-name"
                      type="text"
                      required
                      placeholder="Ravi Shankar"
                      value={candidateForm.name}
                      onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-cand-party">Party / Affiliation</label>
                    <input
                      id="adm-cand-party"
                      type="text"
                      required
                      placeholder="IEEE Independent"
                      value={candidateForm.party}
                      onChange={(e) => setCandidateForm({ ...candidateForm, party: e.target.value })}
                    />
                  </div>
                  <div className="wide">
                    <label htmlFor="adm-cand-symbol">Symbol Description</label>
                    <input
                      id="adm-cand-symbol"
                      type="text"
                      required
                      placeholder="e.g. Lotus, Torch, Key"
                      value={candidateForm.symbol}
                      onChange={(e) => setCandidateForm({ ...candidateForm, symbol: e.target.value })}
                    />
                  </div>
                  <div className="wide">
                    <label htmlFor="adm-cand-manifesto">Manifesto Statement</label>
                    <textarea
                      id="adm-cand-manifesto"
                      required
                      placeholder="Outline details promises, credentials..."
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

            {/* Results Live Tab */}
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

      </main>
    </>
  );
}

export default AdminDashboard;
