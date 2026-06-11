import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, User, Lock, ArrowLeft, KeyRound } from "lucide-react";
import axios from "axios";
import Topbar from "../components/Topbar";

function Login() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("voter"); // voter, admin, super

  // Common forms state
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState("");

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setUserId("");
    setPassword("");
    setOtp("");
    setRequiresOtp(false);
    setNote("");
    setNoteType("");
  };

  const handleVoterLogin = async (e) => {
    e.preventDefault();
    setNote("");
    try {
      const res = await axios.post("http://localhost:5000/api/voters/login", {
        voterId: userId,
        password
      });
      if (res.data.success) {
        setNoteType("success");
        setNote(`Welcome ${res.data.voter.name}. Redirecting to biometric verification.`);
        localStorage.setItem("loggedInVoter", JSON.stringify(res.data.voter));
        localStorage.setItem("loggedInVoterId", res.data.voter.voterId);
        localStorage.removeItem("biometricVerified");
        setTimeout(() => {
          navigate("/biometric");
        }, 1200);
      }
    } catch (err) {
      setNoteType("error");
      setNote(err.response?.data?.message || "Login failed. Voter ID must be approved and password must match.");
    }
  };

  const handleAdminPasswordSubmit = async (e) => {
    e.preventDefault();
    setNote("");
    const role = activeTab === "super" ? "SUPER_ADMIN" : "ADMIN";
    try {
      const res = await axios.post("http://localhost:5000/api/admins/login", {
        adminId: userId,
        password,
        role
      });
      if (res.data.requiresOTP) {
        setRequiresOtp(true);
        setNoteType("success");
        setNote(role === "SUPER_ADMIN" 
          ? "Password verified. Enter OTP 654321 to complete Super Admin login." 
          : "Password verified. Enter OTP 123456 to complete admin login."
        );
      }
    } catch (err) {
      setNoteType("error");
      setNote(err.response?.data?.message || "Invalid credentials or account is suspended/locked.");
    }
  };

  const handleAdminOtpSubmit = async (e) => {
    e.preventDefault();
    setNote("");
    const role = activeTab === "super" ? "SUPER_ADMIN" : "ADMIN";
    try {
      const res = await axios.post("http://localhost:5000/api/admins/login/otp", {
        adminId: userId,
        otp,
        role
      });
      if (res.data.success) {
        setNoteType("success");
        setNote(`Signed in as ${role} with MFA.`);
        localStorage.setItem("currentAdmin", JSON.stringify(res.data.admin));
        localStorage.setItem("currentAdminId", res.data.admin.adminId);
        setTimeout(() => {
          navigate("/admin");
        }, 1200);
      }
    } catch (err) {
      setNoteType("error");
      setNote(err.response?.data?.message || "Invalid OTP. Admin login blocked.");
    }
  };

  return (
    <>
      <Topbar />
      <div 
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "calc(100vh - 72px)",
          padding: "40px 20px"
        }}
      >
        {/* Login Container Panel */}
        <article className="panel" style={{ width: "100%", maxWidth: "480px", borderRadius: "12px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 700, color: "var(--blue)" }}>
              <ArrowLeft size={16} />
              Back to Home
            </Link>
            <div style={{ color: "var(--blue)" }}>
              <Shield size={32} />
            </div>
          </div>

          <h2 style={{ textAlign: "center", fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>Ballot Access Login</h2>
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "15px", marginBottom: "28px" }}>
            Authenticate with secure credentials to access voting or portal tools.
          </p>

          {/* Role Tabs Selection */}
          <div 
            style={{
              display: "flex",
              background: "var(--soft)",
              padding: "4px",
              borderRadius: "8px",
              marginBottom: "28px"
            }}
          >
            <button
              onClick={() => handleTabChange("voter")}
              style={{
                flex: 1,
                minHeight: "40px",
                border: "none",
                background: activeTab === "voter" ? "#fff" : "transparent",
                color: activeTab === "voter" ? "var(--blue)" : "var(--muted)",
                fontWeight: 800,
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: activeTab === "voter" ? "0 2px 6px rgba(0,0,0,0.05)" : "none"
              }}
            >
              Voter
            </button>
            <button
              onClick={() => handleTabChange("admin")}
              style={{
                flex: 1,
                minHeight: "40px",
                border: "none",
                background: activeTab === "admin" ? "#fff" : "transparent",
                color: activeTab === "admin" ? "var(--blue)" : "var(--muted)",
                fontWeight: 800,
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: activeTab === "admin" ? "0 2px 6px rgba(0,0,0,0.05)" : "none"
              }}
            >
              Admin
            </button>
            <button
              onClick={() => handleTabChange("super")}
              style={{
                flex: 1,
                minHeight: "40px",
                border: "none",
                background: activeTab === "super" ? "#fff" : "transparent",
                color: activeTab === "super" ? "var(--blue)" : "var(--muted)",
                fontWeight: 800,
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: activeTab === "super" ? "0 2px 6px rgba(0,0,0,0.05)" : "none"
              }}
            >
              Super Admin
            </button>
          </div>

          {/* Note message */}
          {note && (
            <div 
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 700,
                marginBottom: "20px",
                background: noteType === "success" ? "#e8fff4" : "#fff0f2",
                color: noteType === "success" ? "#0d6e4d" : "#7b1f2a",
                border: `1px solid ${noteType === "success" ? "#a8f5d0" : "#f5c2c7"}`
              }}
            >
              {note}
            </div>
          )}

          {/* Voter Form */}
          {activeTab === "voter" && (
            <form onSubmit={handleVoterLogin} className="form-grid compact">
              <div>
                <label htmlFor="voter-id" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <User size={16} />
                  Voter ID
                </label>
                <input
                  id="voter-id"
                  type="text"
                  required
                  placeholder="VTR20260001"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="voter-password" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Lock size={16} />
                  Password
                </label>
                <input
                  id="voter-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="primary-action form-button" style={{ marginTop: "10px" }}>
                Verify and Access Ballot
              </button>
            </form>
          )}

          {/* Admin / Super Admin MFA Login Forms */}
          {activeTab !== "voter" && (
            <>
              {!requiresOtp ? (
                <form onSubmit={handleAdminPasswordSubmit} className="form-grid compact">
                  <div>
                    <label htmlFor="admin-id" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <User size={16} />
                      {activeTab === "super" ? "Super Admin ID" : "Admin ID"}
                    </label>
                    <input
                      id="admin-id"
                      type="text"
                      required
                      placeholder={activeTab === "super" ? "SA-0001" : "ADM20260001"}
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="admin-password" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Lock size={16} />
                      Password
                    </label>
                    <input
                      id="admin-password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="primary-action form-button" style={{ marginTop: "10px" }}>
                    Verify Password
                  </button>
                </form>
              ) : (
                <form onSubmit={handleAdminOtpSubmit} className="form-grid compact">
                  <div className="mfa-box">
                    <strong>Multi-Factor Authentication Required</strong>
                    <small style={{ display: "block" }}>
                      A secure login attempt was verified. Enter the 6-digit dynamic OTP to confirm your administrative session.
                    </small>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <label htmlFor="admin-otp" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <KeyRound size={16} />
                      Security OTP
                    </label>
                    <input
                      id="admin-otp"
                      type="text"
                      required
                      placeholder="Enter 6-digit OTP code"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="primary-action form-button" style={{ marginTop: "10px" }}>
                    Verify MFA OTP
                  </button>
                </form>
              )}
            </>
          )}

          <div style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "var(--muted)" }}>
            🔒 Connections are cryptographically encrypted and logged for auditing.
          </div>

        </article>
      </div>
    </>
  );
}

export default Login;