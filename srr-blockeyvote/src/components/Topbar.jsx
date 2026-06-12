import { Link, useNavigate, useLocation } from "react-router-dom";
import { Shield, LogOut } from "lucide-react";

function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const biometricVerified = localStorage.getItem("biometricVerified") === "true";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("biometricVerified");
    navigate("/");
  };

  const isActive = (path) => location.pathname === path ? "active" : "";

  return (
    <header className="topbar">
      <div className="brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        <span className="brand-mark">
          <Shield size={30} strokeWidth={2.5} />
        </span>
        <strong>SRR BlockeyVote</strong>
      </div>
      <nav>
        <Link to="/" className={isActive("/")}>Home</Link>
        <Link to="/results" className={isActive("/results")}>Results</Link>
        
        {user && user.role === "VOTER" && (
          <>
            <Link to="/voter/dashboard" className={isActive("/voter/dashboard")}>Dashboard</Link>
            <Link to="/voter/biometric" className={isActive("/voter/biometric")}>Verify Biometrics</Link>
            {biometricVerified && (
              <Link to="/voter/voting" className={isActive("/voter/voting")}>Cast Vote</Link>
            )}
          </>
        )}
        
        {user && user.role === "ADMIN" && (
          <Link to="/admin/dashboard" className={isActive("/admin/dashboard")}>Admin Portal</Link>
        )}

        {user && user.role === "SUPER_ADMIN" && (
          <>
            <Link to="/superadmin/dashboard" className={isActive("/superadmin/dashboard")}>Super Admin Portal</Link>
            <Link to="/admin/dashboard" className={isActive("/admin/dashboard")}>Admin Portal</Link>
          </>
        )}

        {user ? (
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
          <Link to="/voter/login" className={isActive("/voter/login")}>Login</Link>
        )}
      </nav>
    </header>
  );
}

export default Topbar;
