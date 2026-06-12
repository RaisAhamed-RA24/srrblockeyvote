import { useState, useEffect } from "react";
import { ShieldAlert, Award, TrendingUp } from "lucide-react";
import axios from "axios";
import Topbar from "../components/Topbar";

function Results() {
  const [election, setElection] = useState({
    title: "",
    description: "",
    status: "NO_ELECTION"
  });
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const electRes = await axios.get("http://localhost:5000/api/public/election");
      const electData = electRes.data || { title: "", description: "", status: "NO_ELECTION" };
      setElection(electData);

      if (electData.status === "RESULTS_PUBLISHED") {
        const resultsRes = await axios.get("http://localhost:5000/api/public/results");
        setCandidates(resultsRes.data || []);
      }
    } catch (err) {
      console.error("Error loading results:", err);
    } finally {
      setLoading(false);
    }
  };

  const isPublished = election.status === "RESULTS_PUBLISHED";

  // Results calculation helper
  const totalVotes = candidates.reduce((sum, c) => sum + (c.votes || 0), 0);
  const sorted = [...candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const winner = sorted[0];
  const winnerShare = totalVotes ? Math.round((winner.votes / totalVotes) * 100) : 0;

  let lockedHeading = "Results are not yet available.";
  let lockedBody = "Awaiting administrator approval. Results appear only after the election status becomes RESULTS_PUBLISHED.";

  if (election.status === "OPEN") {
    lockedHeading = "Results are unavailable while voting is active.";
    lockedBody = "Live results remain hidden until the admin closes the election and officially publishes results.";
  } else if (election.status === "CLOSED") {
    lockedHeading = "Results are awaiting official publication.";
    lockedBody = "The election is closed, but voters can view results only after administrator publication.";
  }

  return (
    <>
      <Topbar />
      <main className="page-section" style={{ marginTop: "40px" }}>
        
        <div className="section-heading">
          <p>Public Auditing</p>
          <h2>Election Results and Charts</h2>
        </div>

        {loading ? (
          <p className="inline-message">Loading election data...</p>
        ) : !isPublished ? (
          /* Locked Results Screen */
          <article id="results-locked" className="panel" style={{ textAlign: "center", paddingBlock: "60px" }}>
            <div 
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "#fff8d7",
                border: "2px solid var(--warning)",
                display: "grid",
                placeItems: "center",
                color: "var(--warning)",
                marginInline: "auto",
                marginBottom: "20px"
              }}
            >
              <ShieldAlert size={40} />
            </div>
            <h3 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "8px" }}>{lockedHeading}</h3>
            <p style={{ maxWidth: "520px", marginInline: "auto", color: "var(--muted)", fontSize: "15px" }}>
              {lockedBody}
            </p>
          </article>
        ) : (
          /* Published Results Screen */
          <div id="results-published" className="results-layout">
            
            {/* Candidates Vote Chart */}
            <article className="panel chart-panel">
              <h3>Voter Distribution</h3>
              <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "20px" }}>
                Total secure ballots audited: <strong>{totalVotes}</strong> votes cast.
              </p>
              
              <div id="bar-chart" className="bar-chart">
                {candidates.map((cand) => {
                  const percent = totalVotes ? Math.round((cand.votes / totalVotes) * 100) : 0;
                  return (
                    <div key={cand.candidateId} className="bar-row">
                      <span>
                        <strong>{cand.name} ({cand.party})</strong>
                        <small>{cand.votes} votes | {percent}%</small>
                      </span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            {/* Winner Details Card */}
            <article className="panel" style={{ height: "fit-content" }}>
              <h3>Official Declaration</h3>
              <div 
                className="winner-card" 
                style={{ 
                  background: "var(--soft)", 
                  border: "1px solid var(--line)", 
                  borderRadius: "8px",
                  padding: "24px",
                  marginTop: "16px"
                }}
              >
                <div style={{ color: "var(--blue)", display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                  <Award size={48} />
                </div>
                <p>Elected Candidate</p>
                <h2 id="winner-name">{winner ? winner.name : "--"}</h2>
                <span id="winner-percent" style={{ color: "var(--blue)" }}>
                  {winner ? `${winnerShare}% vote share` : "0% vote share"}
                </span>
              </div>

              <div 
                style={{ 
                  display: "flex", 
                  gap: "10px", 
                  alignItems: "center", 
                  marginTop: "20px",
                  fontSize: "13px",
                  color: "var(--muted)" 
                }}
              >
                <TrendingUp size={16} />
                <span>Verified with simulated blockchain ledger audits.</span>
              </div>
            </article>

          </div>
        )}

      </main>
    </>
  );
}

export default Results;
