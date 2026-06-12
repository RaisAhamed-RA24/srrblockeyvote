import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Biometric from "./pages/Biometric";
import Voting from "./pages/Voting";
import Confirmation from "./pages/Confirmation";
import Results from "./pages/Results";

// New Dashboard and registration pages
import VoterDashboard from "./pages/VoterDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Register from "./pages/Register";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/results" element={<Results />} />

        {/* Voter Auth & Register */}
        <Route path="/voter/login" element={<Login roleType="voter" />} />
        <Route path="/voter/register" element={<Register type="voter" />} />

        {/* Admin Auth & Register */}
        <Route path="/admin/login" element={<Login roleType="admin" />} />
        <Route path="/admin/register" element={<Register type="admin" />} />

        {/* Super Admin Auth */}
        <Route path="/superadmin/login" element={<Login roleType="super" />} />

        {/* Protected Voter Routes */}
        <Route element={<ProtectedRoute allowedRoles={["VOTER"]} />}>
          <Route path="/voter/dashboard" element={<VoterDashboard />} />
          <Route path="/voter/biometric" element={<Biometric />} />
          <Route path="/voter/voting" element={<Voting />} />
          <Route path="/voter/confirmation" element={<Confirmation />} />
        </Route>

        {/* Protected Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>

        {/* Protected Super Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]} />}>
          <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;