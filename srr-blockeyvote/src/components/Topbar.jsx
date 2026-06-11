import { Link, useNavigate, useLocation } from "react-router-dom";
import { Shield, LogOut } from "lucide-react";

function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const loggedInVoter = localStorage.getItem("loggedInVoter");
  const currentAdmin = localStorage.getItem("currentAdmin");

  const handleLogout = () => {
    localStorage.removeItem("loggedInVoter");
    localStorage.removeItem("loggedInVoterId");
    localStorage.removeItem("biometricVerified");
    localStorage.removeItem("currentAdmin");
    localStorage.removeItem("currentAdminId");
    navigate("/");
  };

  const isActive = (path) => location.pathname === path ? "active" : "";

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">
          <Shield size={30} strokeWidth={2.5} />
        </span>
        <strong>SRR BlockeyVote</strong>
      </div>
      <nav>
        <Link to="/" className={isActive("/")}>Home</Link>
        <Link to="/results" className={isActive("/results")}>Results</Link>
        
        {loggedInVoter && (
          <>
            <Link to="/biometric" className={isActive("/biometric")}>Verify Biometrics</Link>
            <Link to="/voting" className={isActive("/voting")}>Cast Vote</Link>
          </>
        )}
        
        {currentAdmin && (
          <Link to="/admin" className={isActive("/admin")}>Admin Portal</Link>
        )}

        {(loggedInVoter || currentAdmin) ? (
          <button 
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#b42335",
              fontWeight: 800,
              fontSize: "15px",
              padding: "8px 12px",
              cursor: "pointer"
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        ) : (
          <Link to="/login" className={isActive("/login")}>Login</Link>
        )}
      </nav>
    </header>
  );
}

export default Topbar;
