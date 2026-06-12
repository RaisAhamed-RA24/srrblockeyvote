import { useState, useEffect } from "react";
import { Shield, Users, Layers, AlertTriangle } from "lucide-react";
import api from "../utils/api";
import Topbar from "../components/Topbar";

function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState({
    activeAdmins: 0,
    pendingAdminRequests: 0,
    totalVoters: 0,
    votesCast: 0,
    ledgerBlocksCount: 0
  });

  const [adminRequests, setAdminRequests] = useState([]);
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [ledgerBlocks, setLedgerBlocks] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const metricsRes = await api.get("/admin/dashboard-metrics");
      setMetrics(metricsRes.data);

      const adminReqRes = await api.get("/superadmin/admin-requests");
      setAdminRequests(adminReqRes.data || []);

      const adminAccRes = await api.get("/superadmin/accounts");
      setAdminAccounts(adminAccRes.data || []);

      const securityRes = await api.get("/superadmin/security-events");
      setSecurityEvents(securityRes.data || []);

      const ledgerRes = await api.get("/public/ledger");
      setLedgerBlocks(ledgerRes.data || []);
    } catch (err) {
      console.error("Error loading super admin dashboard data:", err);
    }
  };

  const handleApproveAdminRequest = async (reqId) => {
    const code = window.prompt("Super Admin re-authentication required. Enter critical action code 999999.");
    if (!code) return;
    try {
      const res = await api.post(`/superadmin/admin-requests/${reqId}/approve`, {
        reauthCode: code
      });
      if (res.data.success) fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve request.");
    }
  };

  const handleRejectAdminRequest = async (reqId) => {
    const code = window.prompt("Super Admin re-authentication required. Enter critical action code 999999.");
    if (!code) return;
    try {
      const res = await api.post(`/superadmin/admin-requests/${reqId}/reject`, {
        reauthCode: code
      });
      if (res.data.success) fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject request.");
    }
  };

  const handleActivateAdmin = async (adminIdVal) => {
    try {
      const res = await api.post(`/superadmin/accounts/${adminIdVal}/activate`);
      if (res.data.success) fetchDashboardData();
    } catch (err) {
      console.error("Admin activate error:", err);
    }
  };

  const handleSuspendAdmin = async (adminIdVal) => {
    try {
      const res = await api.post(`/superadmin/accounts/${adminIdVal}/suspend`);
      if (res.data.success) fetchDashboardData();
    } catch (err) {
      console.error("Admin suspend error:", err);
    }
  };

  const handleViewAdminActivity = (adminIdVal) => {
    alert(`${adminIdVal} activity: voter approvals, election updates, candidate management.`);
  };

  return (
    <>
      <Topbar />
      <main className="page-section" style={{ marginTop: "30px", width: "95%" }}>
        
        {/* Title bar */}
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Secure Infrastructure
            </span>
            <h1 style={{ fontSize: "32px", fontWeight: 900, marginTop: "4px" }}>Super Admin Portal</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--blue)" }}>
            <Shield size={28} />
            <strong style={{ fontSize: "14px" }}>Root Terminal Mode</strong>
          </div>
        </section>

        <div className="two-column">
          
          {/* Left Columns (Analytics & Managed Admins) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Analytics Dashboard */}
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
                    <div key={adm.userId} className="application-card" style={{ margin: 0, padding: "16px" }}>
                      <header>
                        <strong>{adm.userId}</strong>
                        <span className={`status-pill ${adm.status === "ACTIVE" ? "approved" : "rejected"}`}>{adm.status}</span>
                      </header>
                      <p>{adm.name} | {adm.email}</p>
                      <div className="row-actions">
                        <button className="mini-button" onClick={() => handleActivateAdmin(adm.userId)}>Activate</button>
                        <button className="mini-button danger-button" onClick={() => handleSuspendAdmin(adm.userId)}>Suspend</button>
                        <button className="mini-button" onClick={() => handleViewAdminActivity(adm.userId)}>Activity</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

          </div>

          {/* Right Columns (Requests, Security Audit, Ledger blocks) */}
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

      </main>
    </>
  );
}

export default SuperAdminDashboard;
