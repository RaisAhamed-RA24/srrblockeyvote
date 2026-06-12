import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";
import axios from "axios";
import Topbar from "../components/Topbar";

function Register({ type }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    dob: "",
    address: "",
    organization: "",
    identityProof: "",
    profilePhoto: "",
    password: "",
    confirmPassword: ""
  });

  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (type === "admin" && formData.password !== formData.confirmPassword) {
      setMsgType("error");
      setMessage("Passwords do not match.");
      return;
    }

    try {
      const endpoint = type === "voter" 
        ? "http://localhost:5000/api/voter/register" 
        : "http://localhost:5000/api/admin/register";

      const payload = type === "voter" 
        ? {
            name: formData.name,
            email: formData.email,
            mobile: formData.mobile,
            dob: formData.dob,
            address: formData.address,
            identityProof: formData.identityProof,
            profilePhoto: formData.profilePhoto
          }
        : {
            name: formData.name,
            email: formData.email,
            mobile: formData.mobile,
            organization: formData.organization,
            identityProof: formData.identityProof,
            password: formData.password
          };

      const res = await axios.post(endpoint, payload);
      if (res.data.success) {
        setMsgType("success");
        setMessage(res.data.message);
        setFormData({
          name: "",
          email: "",
          mobile: "",
          dob: "",
          address: "",
          organization: "",
          identityProof: "",
          profilePhoto: "",
          password: "",
          confirmPassword: ""
        });
      }
    } catch (err) {
      setMsgType("error");
      setMessage(err.response?.data?.message || "Registration submission failed.");
    }
  };

  const isVoter = type === "voter";

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
        <article className="panel" style={{ width: "100%", maxWidth: "600px", borderRadius: "12px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 700, color: "var(--blue)" }}>
              <ArrowLeft size={16} />
              Back to Home
            </Link>
            <div style={{ color: "var(--blue)" }}>
              <UserPlus size={32} />
            </div>
          </div>

          <h2 style={{ textAlign: "center", fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>
            {isVoter ? "Voter Access Registration" : "Admin Request Submission"}
          </h2>
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "15px", marginBottom: "28px" }}>
            {isVoter 
              ? "Apply for voter status. Once approved, you can complete biometric scanning and cast secure votes." 
              : "Submit admin request. Super Admin re-authentication is required to authorize requests."
            }
          </p>

          {message && (
            <div 
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 700,
                marginBottom: "20px",
                background: msgType === "success" ? "#e8fff4" : "#fff0f2",
                color: msgType === "success" ? "#0d6e4d" : "#7b1f2a",
                border: `1px solid ${msgType === "success" ? "#a8f5d0" : "#f5c2c7"}`
              }}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-grid">
            <div>
              <label htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                type="text"
                required
                placeholder="Ravi Kumar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="reg-email">Email Address</label>
              <input
                id="reg-email"
                type="email"
                required
                placeholder="ravi@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="reg-mobile">Mobile Number</label>
              <input
                id="reg-mobile"
                type="tel"
                required
                placeholder="9876543210"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>

            {isVoter ? (
              <>
                <div>
                  <label htmlFor="reg-dob">Date of Birth</label>
                  <input
                    id="reg-dob"
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                </div>
                <div className="wide">
                  <label htmlFor="reg-address">Address</label>
                  <input
                    id="reg-address"
                    type="text"
                    required
                    placeholder="123 Main Street, Bangalore"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="reg-id-proof">Identity Proof URL/Details</label>
                  <input
                    id="reg-id-proof"
                    type="text"
                    required
                    placeholder="Aadhaar Card link or ID number"
                    value={formData.identityProof}
                    onChange={(e) => setFormData({ ...formData, identityProof: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="reg-photo">Profile Photo URL/Details</label>
                  <input
                    id="reg-photo"
                    type="text"
                    required
                    placeholder="Photo link or Base64 string"
                    value={formData.profilePhoto}
                    onChange={(e) => setFormData({ ...formData, profilePhoto: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="reg-org">Organization</label>
                  <input
                    id="reg-org"
                    type="text"
                    required
                    placeholder="IEEE Student Chapter"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  />
                </div>
                <div className="wide">
                  <label htmlFor="reg-id-proof-adm">Identity Proof URL/Details</label>
                  <input
                    id="reg-id-proof-adm"
                    type="text"
                    required
                    placeholder="Employee ID or Aadhaar Card"
                    value={formData.identityProof}
                    onChange={(e) => setFormData({ ...formData, identityProof: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="reg-pass">Password</label>
                  <input
                    id="reg-pass"
                    type="password"
                    required
                    placeholder="Create password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="reg-confirm">Confirm Password</label>
                  <input
                    id="reg-confirm"
                    type="password"
                    required
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              </>
            )}

            <button type="submit" className="primary-action form-button">
              {isVoter ? "Register Voter Application" : "Submit Access Request"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "20px", fontSize: "14px" }}>
            Already registered?{" "}
            <Link to={isVoter ? "/voter/login" : "/admin/login"} className="text-link">
              Log in here
            </Link>
          </div>

        </article>
      </div>
    </>
  );
}

export default Register;
