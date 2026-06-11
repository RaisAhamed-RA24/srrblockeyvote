import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Fingerprint, Scan, CheckCircle } from "lucide-react";
import axios from "axios";
import Topbar from "../components/Topbar";

function Biometric() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState(
    window.matchMedia("(max-width: 720px)").matches ? "Fingerprint" : "Face Recognition"
  );
  
  const [scanning, setScanning] = useState(false);
  const [verified, setVerified] = useState(false);
  const [statusText, setStatusText] = useState("");
  
  const loggedInVoter = localStorage.getItem("loggedInVoter");
  const loggedInVoterId = localStorage.getItem("loggedInVoterId");

  useEffect(() => {
    if (!loggedInVoter || !loggedInVoterId) {
      navigate("/login");
      return;
    }
    setStatusText(`${selectedType} scanner ready.`);
  }, [selectedType, loggedInVoter, loggedInVoterId, navigate]);

  const handleTypeChange = (type) => {
    if (scanning || verified) return;
    setSelectedType(type);
  };

  const startScan = async () => {
    if (scanning || verified) return;
    
    setScanning(true);
    setStatusText(`Scanning ${selectedType.toLowerCase()}...`);

    // Simulate biometric scan delay (800ms as per original logic)
    setTimeout(async () => {
      try {
        const res = await axios.post("http://localhost:5000/api/voters/biometrics", {
          voterId: loggedInVoterId,
          biometricType: selectedType
        });
        
        if (res.data.success) {
          localStorage.setItem("biometricVerified", "true");
          setVerified(true);
          setScanning(false);
          setStatusText("Identity Verified. Proceed to Voting.");
          
          // Short delay before transitioning to ballot (800ms)
          setTimeout(() => {
            navigate("/voting");
          }, 1200);
        }
      } catch (err) {
        setScanning(false);
        setStatusText("Biometric update failed. Contact administration.");
      }
    }, 1200);
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
        <article className="panel" style={{ width: "100%", maxWidth: "560px", borderRadius: "12px" }}>
          
          <div style={{ display: "flex", justifyContent: "center", color: "var(--blue)", marginBottom: "20px" }}>
            <Shield size={36} />
          </div>

          <h2 style={{ textAlign: "center", fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>Biometric Verification</h2>
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "15px", marginBottom: "28px" }}>
            Confirm your physical identity using simulated hardware scanners.
          </p>

          <div 
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "24px",
              justifyItems: "center",
              marginBlock: "20px"
            }}
          >
            {/* Visual Scan Circle */}
            <div 
              style={{
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                background: verified ? "#e8fff4" : "var(--soft)",
                border: `3px solid ${verified ? "var(--success)" : "var(--blue)"}`,
                display: "grid",
                placeItems: "center",
                color: verified ? "var(--success)" : "var(--blue)",
                boxShadow: "0 8px 20px rgba(47, 70, 184, 0.08)",
                position: "relative",
                transition: "all 0.3s ease"
              }}
            >
              {verified ? (
                <CheckCircle size={72} strokeWidth={1.5} />
              ) : selectedType === "Fingerprint" ? (
                <Fingerprint 
                  size={72} 
                  strokeWidth={1.5}
                  className={scanning ? "scan-animation" : ""}
                  style={{ animation: scanning ? "pulse 1.2s infinite ease-in-out" : "none" }}
                />
              ) : (
                <Scan 
                  size={72} 
                  strokeWidth={1.5}
                  style={{ animation: scanning ? "pulse 1.2s infinite ease-in-out" : "none" }}
                />
              )}
            </div>

            {/* Scan description */}
            <div style={{ textAlign: "center" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: verified ? "var(--success)" : "var(--ink)", marginBottom: "6px" }}>
                {statusText}
              </h3>
              <p style={{ fontSize: "14px", color: "var(--muted)" }}>
                {selectedType === "Fingerprint" 
                  ? "Fingerprint verification selected for mobile or USB scanner workflows."
                  : "Face recognition selected for laptop or desktop camera workflows."
                }
              </p>
            </div>

            {/* Biometric Type Selector controls */}
            {!verified && (
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "20px" }}>
                  <button
                    onClick={() => handleTypeChange("Fingerprint")}
                    disabled={scanning}
                    className={`fingerprint ${selectedType === "Fingerprint" ? "active" : "face-scan"}`}
                    type="button"
                    title="Fingerprint scanner"
                  >
                    <Fingerprint />
                  </button>
                  <button
                    onClick={() => handleTypeChange("Face Recognition")}
                    disabled={scanning}
                    className={`fingerprint ${selectedType === "Face Recognition" ? "active" : "face-scan"}`}
                    type="button"
                    title="Face camera scanner"
                  >
                    <Scan />
                  </button>
                </div>

                <button
                  onClick={startScan}
                  disabled={scanning}
                  className="primary-action form-button"
                  style={{ width: "100%" }}
                >
                  {scanning ? "Initializing Scanner..." : `Authenticate with ${selectedType}`}
                </button>
              </div>
            )}
          </div>

          <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--line)" }} className="biometric-stage">
            <Shield size={24} style={{ color: "var(--blue)" }} />
            <div>
              <strong style={{ fontSize: "14px", display: "block", color: "var(--ink)" }}>Secure Zero-Trust Processing</strong>
              <p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
                Your biometric signature is simulated locally and matches database records securely. No raw physical details are persisted.
              </p>
            </div>
          </div>

        </article>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}

export default Biometric;