import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight, ShieldCheck } from "lucide-react";
import Topbar from "../components/Topbar";

function Confirmation() {
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState({
    voteId: "",
    hash: "",
    time: ""
  });

  useEffect(() => {
    const voteId = localStorage.getItem("confirmedVoteId");
    const hash = localStorage.getItem("confirmedHash");
    const time = localStorage.getItem("confirmedTimestamp");

    if (!voteId || !hash) {
      navigate("/");
      return;
    }

    setReceipt({ voteId, hash, time });
  }, [navigate]);

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
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
            <div 
              style={{ 
                width: "80px", 
                height: "80px", 
                borderRadius: "50%", 
                background: "#e8fff4", 
                border: "3px solid var(--success)",
                display: "grid",
                placeItems: "center",
                color: "var(--success)",
                marginBottom: "16px"
              }}
            >
              <CheckCircle size={48} strokeWidth={2} />
            </div>
            <h2 style={{ fontSize: "28px", fontWeight: 800 }}>Vote cast successfully!</h2>
            <p style={{ color: "var(--muted)", fontSize: "15px", marginTop: "4px" }}>
              Your ballot has been committed to the blockchain.
            </p>
          </div>

          {/* Secure block receipt card */}
          <div className="ledger-card confirmed" style={{ paddingInline: "20px 20px" }}>
            <div className="status-dot"></div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--success)" }}>
              <ShieldCheck size={20} />
              <strong id="ledger-status" style={{ fontSize: "16px" }}>Vote Successfully Recorded</strong>
            </div>
            <span id="ledger-detail" style={{ fontSize: "13px", color: "var(--muted)", display: "block", marginTop: "2px" }}>
              Simulated blockchain verification completed successfully.
            </span>

            {/* Receipt list key-values */}
            <dl className="receipt-list" style={{ marginTop: "16px", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
              <div>
                <dt>Ballot Reference</dt>
                <dd id="receipt-vote-id" style={{ fontFamily: "monospace", fontSize: "15px" }}>
                  {receipt.voteId}
                </dd>
              </div>
              <div>
                <dt>Transaction Block Hash</dt>
                <dd id="receipt-hash" style={{ fontFamily: "monospace", fontSize: "13px", background: "#f1f3f9", padding: "6px 8px", borderRadius: "6px" }}>
                  {receipt.hash}
                </dd>
              </div>
              <div>
                <dt>Commit Timestamp</dt>
                <dd id="receipt-time" style={{ fontSize: "14px" }}>
                  {receipt.time}
                </dd>
              </div>
            </dl>
          </div>

          <div 
            style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginTop: "28px",
              borderTop: "1px solid var(--line)",
              paddingTop: "20px"
            }}
          >
            <Link to="/voter/dashboard" style={{ color: "var(--muted)", fontWeight: 700, fontSize: "15px" }}>
              Return to Dashboard
            </Link>
            <Link to="/results" className="primary-action" style={{ gap: "8px", minHeight: "44px" }}>
              View Election Results
              <ArrowRight size={16} />
            </Link>
          </div>

        </article>
      </div>
    </>
  );
}

export default Confirmation;
