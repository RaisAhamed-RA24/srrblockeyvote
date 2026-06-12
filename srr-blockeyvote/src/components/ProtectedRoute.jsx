import { Navigate, Outlet, useLocation } from "react-router-dom";

function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  
  if (!token || !userStr) {
    // Redirect to corresponding login page
    if (location.pathname.startsWith("/superadmin")) {
      return <Navigate to="/superadmin/login" replace />;
    }
    if (location.pathname.startsWith("/admin")) {
      return <Navigate to="/admin/login" replace />;
    }
    return <Navigate to="/voter/login" replace />;
  }

  const user = JSON.parse(userStr);
  if (!allowedRoles.includes(user.role)) {
    // Redirect role-violating attempts back to their respective dashboards
    if (user.role === "SUPER_ADMIN") {
      return <Navigate to="/superadmin/dashboard" replace />;
    }
    if (user.role === "ADMIN") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/voter/dashboard" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
