import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Staff       from "./pages/Staff";
import Shifts      from "./pages/Shifts";
import Assignments from "./pages/Assignments";
import CalendarPage from "./pages/CalendarPage";
import PlanningPage from "./pages/PlanningPage";

function App() {
  return (
    <BrowserRouter>

      {/* ── Barre de navigation ── */}
      <nav style={{
        display: "flex",
        gap: 24,
        padding: "12px 24px",
        background: "#1e293b",
        color: "white",
        alignItems: "center"
      }}>
        <span style={{ fontWeight: "bold", fontSize: 18 }}>🏥 HospiPlan</span>
        <Link to="/staff"       style={{ color: "#93c5fd", textDecoration: "none" }}>👩‍⚕️ Soignants</Link>
        <Link to="/shifts"      style={{ color: "#93c5fd", textDecoration: "none" }}>📅 Shifts</Link>
        <Link to="/assignments" style={{ color: "#93c5fd", textDecoration: "none" }}>🔗 Affectations</Link>
        <Link to="/planning" style={{ color: "#93c5fd", textDecoration: "none" }}>🗓️ Planning</Link>
        <Link to="/calendar" style={{ color: "#93c5fd", textDecoration: "none" }}>📅 Calendrier</Link>
      </nav>

      {/* ── Pages ── */}
      <div style={{ padding: 24 }}>
        <Routes>
          {/* Route par défaut → Staff */}
          <Route path="/"            element={<Staff />} />
          <Route path="/staff"       element={<Staff />} />
          <Route path="/shifts"      element={<Shifts />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/planning" element={<PlanningPage />} />
        </Routes>
      </div>

    </BrowserRouter>
  );
}

export default App;