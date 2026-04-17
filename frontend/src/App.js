import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Staff       from "./pages/Staff";
import Shifts      from "./pages/Shifts";
import Assignments from "./pages/Assignments";
import CalendarPage from "./pages/CalendarPage";
import PlanningPage from "./pages/PlanningPage";
import Dashboard from "./pages/Dashboard";
import StaffDashboard from "./pages/StaffDashboard";

function App() {
  const [planningMenuOpen, setPlanningMenuOpen] = useState(false);
  const planningMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (planningMenuRef.current && !planningMenuRef.current.contains(event.target)) {
        setPlanningMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        <Link to="/dashboard" style={{ color: "#bfdbfe", textDecoration: "none", fontWeight: 700 }}>🏠 Dashboard</Link>
        <Link to="/staff-dashboard" style={{ color: "#bfdbfe", textDecoration: "none", fontWeight: 700 }}>🧑‍⚕️ Dashboard soignant</Link>
        <Link to="/calendar" style={{ color: "#bfdbfe", textDecoration: "none", fontWeight: 700 }}>📅 Calendrier</Link>
        <Link to="/planning" style={{ color: "#93c5fd", textDecoration: "none" }}>🗓️ Génération</Link>
        <Link to="/staff"       style={{ color: "#93c5fd", textDecoration: "none" }}>👩‍⚕️ Soignants</Link>
        <div ref={planningMenuRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setPlanningMenuOpen((open) => !open)}
            style={{
              background: "transparent",
              border: "none",
              color: "#93c5fd",
              cursor: "pointer",
              fontSize: 16,
              padding: 0,
              fontWeight: 600
            }}
          >
            📋 Planning ▾
          </button>

          {planningMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 2,
                minWidth: 180,
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 8,
                boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                padding: "8px 0",
                zIndex: 10
              }}
            >
              <Link
                to="/shifts"
                onClick={() => setPlanningMenuOpen(false)}
                style={{
                  display: "block",
                  padding: "8px 12px",
                  color: "#e2e8f0",
                  textDecoration: "none"
                }}
              >
                📅 Shifts
              </Link>
              <Link
                to="/assignments"
                onClick={() => setPlanningMenuOpen(false)}
                style={{
                  display: "block",
                  padding: "8px 12px",
                  color: "#e2e8f0",
                  textDecoration: "none"
                }}
              >
                🔗 Affectations
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ── Pages ── */}
      <div style={{ padding: 24 }}>
        <Routes>
          {/* Route par défaut → Dashboard */}
          <Route path="/"            element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<Dashboard />} />
          <Route path="/staff-dashboard" element={<StaffDashboard />} />
          <Route path="/staff"       element={<Staff />} />
          <Route path="/shifts"      element={<Shifts />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/planning" element={<PlanningPage />} />
          <Route path="*" element={<Navigate to="/calendar" replace />} />
        </Routes>
      </div>

    </BrowserRouter>
  );
}

export default App;