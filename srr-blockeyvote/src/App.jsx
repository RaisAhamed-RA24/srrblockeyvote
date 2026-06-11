import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Biometric from "./pages/Biometric";
import Voting from "./pages/Voting";
import Confirmation from "./pages/Confirmation";
import Results from "./pages/Results";
import Admin from "./pages/Admin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/biometric" element={<Biometric />} />
        <Route path="/voting" element={<Voting />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/results" element={<Results />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;