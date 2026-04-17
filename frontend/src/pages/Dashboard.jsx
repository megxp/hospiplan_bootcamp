import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";

async function fetchAllPages(urlPath) {
  let next = urlPath;
  let all = [];

  while (next) {
    const res = await API.get(next);
    const body = res.data;
    const items = body.results || body;
    all = [...all, ...items];

    if (!body.next) {
      next = null;
      continue;
    }
    next = body.next.replace("http://127.0.0.1:8000/api", "");
  }

  return all;
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const [staffData, shiftData, assignmentData] = await Promise.all([
          fetchAllPages("/personnel/staff/"),
          fetchAllPages("/planning/shifts/"),
          fetchAllPages("/planning/assignments/"),
        ]);
        setStaff(staffData);
        setShifts(shiftData);
        setAssignments(assignmentData);
      } catch (e) {
        setError("Impossible de charger les statistiques du dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const activeStaff = staff.filter((s) => s.is_active).length;
    const { monday, sunday } = getWeekBounds();
    const shiftsInWeek = shifts.filter((s) => {
      const start = new Date(s.start_datetime);
      return start >= monday && start <= sunday;
    });

    const assignmentsByShiftId = assignments.reduce((acc, assignment) => {
      const shiftId = assignment.shift;
      if (!shiftId) {
        return acc;
      }
      acc[shiftId] = (acc[shiftId] || 0) + 1;
      return acc;
    }, {});

    const uncoveredShifts = shiftsInWeek.filter((shift) => {
      const assigned = assignmentsByShiftId[shift.id] || 0;
      return assigned < (shift.min_staff || 0);
    }).length;

    const pendingAssignments = shiftsInWeek.reduce((sum, shift) => {
      const assigned = assignmentsByShiftId[shift.id] || 0;
      const missing = Math.max((shift.min_staff || 0) - assigned, 0);
      return sum + missing;
    }, 0);

    const assignmentsThisWeek = assignments.filter((assignment) => {
      const start = new Date(assignment.shift_start);
      return start >= monday && start <= sunday;
    }).length;

    return {
      activeStaff,
      shiftsThisWeek: shiftsInWeek.length,
      pendingAssignments,
      uncoveredShifts,
      assignmentsThisWeek,
    };
  }, [staff, shifts, assignments]);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      <h1 style={{ margin: "0 0 8px", color: "#0f172a" }}>Tableau de bord RH</h1>
      <p style={{ marginTop: 0, color: "#64748b" }}>
        Vue d'ensemble des ressources et de la couverture des gardes.
      </p>

      {loading && <p style={{ color: "#475569" }}>Chargement des indicateurs...</p>}
      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard label="Soignants actifs" value={stats.activeStaff} color="#2563eb" />
            <StatCard label="Shifts cette semaine" value={stats.shiftsThisWeek} color="#16a34a" />
            <StatCard label="Affectations en attente (semaine)" value={stats.pendingAssignments} color="#d97706" />
            <StatCard label="Shifts non couverts (semaine)" value={stats.uncoveredShifts} color="#dc2626" />
            <StatCard label="Affectations cette semaine" value={stats.assignmentsThisWeek} color="#7c3aed" />
          </div>

          <div
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 2px 12px rgba(15, 23, 42, 0.06)",
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <QuickLink to="/calendar" label="Voir le calendrier" />
            <QuickLink to="/planning" label="Lancer une génération" />
            <QuickLink to="/shifts" label="Gérer les shifts" />
            <QuickLink to="/assignments" label="Gérer les affectations" />
            <QuickLink to="/staff" label="Gérer les soignants" />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderLeft: `6px solid ${color}`,
        borderRadius: 12,
        padding: "14px 16px",
        boxShadow: "0 2px 12px rgba(15, 23, 42, 0.05)",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ color: "#475569", fontSize: 13, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function QuickLink({ to, label }) {
  return (
    <Link
      to={to}
      style={{
        textDecoration: "none",
        color: "#1d4ed8",
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {label}
    </Link>
  );
}
