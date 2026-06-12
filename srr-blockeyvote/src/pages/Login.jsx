import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, User, Lock, ArrowLeft, KeyRound } from "lucide-react";
import axios from "axios";
import Topbar from "../components/Topbar";

function Login({ roleType }) {
  const navigate = useNavigate();

  // Common forms state
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState("");

  // Clear fields on route roleType change
  useEffect(() => {
    setUserId("");
    setPassword("");
    setOtp("");
    setRequiresOtp(false);
    setNote("");
    setNoteType("");
  }, [roleType]);

  const handleVoterLogin = async (e) => {
    e.preventDefault();
    setNote("");
    try {
      const res = await axios.post("http://localhost:5000/api/voter/login", {
        voterId: userId,
        password
      });
      if (res.data.success) {
        setNoteType("success");
        setNote(`Welcome ${res.data.user.name}. Redirecting to dashboard.`);
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.removeItem("biometricVerified");
        setTimeout(() => {
          navigate("/voter/dashboard");
        }, 1200);
      }
    } catch (err) {
      setNoteType("error");
      setNote(err.response?.data?.message || "Login failed. Invalid Voter ID or password.");
    }
  };

  const handleAdminPasswordSubmit = async (e) => {
    e.preventDefault();
    setNote("");
    const endpoint = roleType === "super" 
      ? "http://localhost:5000/api/superadmin/login" 
      : "http://localhost:5000/api/admin/login";

    const payload = roleType === "super"
      ? { superAdminId: userId, password }
      : { adminId: userId, password };

    try {
      const res = await axios.post(endpoint, payload);
      if (res.data.requiresOTP) {
        setRequiresOtp(true);
        setNoteType("success");
        setNote(roleType === "super" 
          ? "Password verified. Enter OTP 654321 to complete Super Admin login." 
          : "Password verified. Enter OTP 123456 to complete Admin login."
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
    const endpoint = roleType === "super" 
      ? "http://localhost:5000/api/superadmin/login/otp" 
      : "http://localhost:5000/api/admin/login/otp";

    const payload = roleType === "super"
      ? { superAdminId: userId, otp }
      : { adminId: userId, otp };

    try {
      const res = await axios.post(endpoint, payload);
      if (res.data.success) {
        setNoteType("success");
        setNote(`Signed in successfully as ${res.data.user.role}.`);
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setTimeout(() => {
          if (res.data.user.role === "SUPER_ADMIN") {
            navigate("/superadmin/dashboard");
          } else {
            navigate("/admin/dashboard");
          }
        }, 1200);
      }
    } catch (err) {
      setNoteType("error");
      setNote(err.response?.data?.message || "Invalid OTP code.");
    }
  };

  const isVoter = roleType === "voter";
  const isSuper = roleType === "super";

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

          <h2 style={{ textAlign: "center", fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>
            {isVoter ? "Voter Login" : isSuper ? "Super Admin Access" : "Admin Login"}
          </h2>
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "15px", marginBottom: "28px" }}>
            Authenticate with secure credentials to access your dashboard.
          </p>

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
          {isVoter ? (
            <form onSubmit={handleVoterLogin} className="form-grid compact">
              <div>
                <label htmlFor="voter-id-inp" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <User size={16} />
                  Voter ID
                </label>
                <input
                  id="voter-id-inp"
                  type="text"
                  required
                  placeholder="e.g. VTR20260001"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="voter-pass-inp" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Lock size={16} />
                  Password
                </label>
                <input
                  id="voter-pass-inp"
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
          ) : (
            /* Admin & Super Admin forms */
            <>
              {!requiresOtp ? (
                <form onSubmit={handleAdminPasswordSubmit} className="form-grid compact">
                  <div>
                    <label htmlFor="adm-id-inp" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <User size={16} />
                      {isSuper ? "Super Admin ID" : "Admin ID"}
                    </label>
                    <input
                      id="adm-id-inp"
                      type="text"
                      required
                      placeholder={isSuper ? "e.g. SA0001" : "e.g. ADM20260001"}
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-pass-inp" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Lock size={16} />
                      Password
                    </label>
                    <input
                      id="adm-pass-inp"
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
                      A secure login attempt was verified. Enter the 6-digit dynamic OTP to confirm your session.
                    </small>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <label htmlFor="adm-otp-inp" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <KeyRound size={16} />
                      Security OTP
                    </label>
                    <input
                      id="adm-otp-inp"
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

          {/* Quick link switches */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", fontSize: "13px", color: "var(--muted)" }}>
            {isVoter ? (
              <>
                <Link to="/admin/login" className="text-link">Admin login</Link>
                <Link to="/superadmin/login" className="text-link">Super Admin login</Link>
              </>
            ) : isSuper ? (
              <>
                <Link to="/voter/login" className="text-link">Voter login</Link>
                <Link to="/admin/login" className="text-link">Admin login</Link>
              </>
            ) : (
              <>
                <Link to="/voter/login" className="text-link">Voter login</Link>
                <Link to="/superadmin/login" className="text-link">Super Admin login</Link>
              </>
            )}
          </div>

        </article>
      </div>
    </>
  );
}

export default Login;