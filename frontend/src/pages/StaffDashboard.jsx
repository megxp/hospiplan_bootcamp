import { useEffect, useMemo, useState } from "react";
import API from "../api/api";

async function fetchAllPages(urlPath) {
  let next = urlPath;
  let all = [];

  while (next) {
    const res = await API.get(next);
    const body = res.data;
    all = [...all, ...(body.results || body)];
    next = body.next ? body.next.replace("http://127.0.0.1:8000/api", "") : null;
  }

  return all;
}

function getMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

export default function StaffDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [staffCerts, setStaffCerts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [staffData, roleData, contractData, certData, assignmentData, shiftData, shiftTypeData] =
          await Promise.all([
            fetchAllPages("/personnel/staff/"),
            fetchAllPages("/personnel/roles/"),
            fetchAllPages("/personnel/contracts/"),
            fetchAllPages("/personnel/staff-certifications/"),
            fetchAllPages("/planning/assignments/"),
            fetchAllPages("/planning/shifts/"),
            fetchAllPages("/planning/shift-types/"),
          ]);

        setStaffList(staffData);
        setRoles(roleData);
        setContracts(contractData);
        setStaffCerts(certData);
        setAssignments(assignmentData);
        setShifts(shiftData);
        setShiftTypes(shiftTypeData);

        if (staffData.length > 0) {
          setSelectedStaffId(String(staffData[0].id));
        }
      } catch (e) {
        setError("Impossible de charger les donnees du dashboard soignant.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const data = useMemo(() => {
    if (!selectedStaffId) {
      return null;
    }

    const staffId = Number(selectedStaffId);
    const staff = staffList.find((s) => s.id === staffId);
    if (!staff) {
      return null;
    }

    const roleMap = new Map(roles.map((r) => [r.id, r.name]));
    const shiftTypeMap = new Map(shiftTypes.map((st) => [st.id, st]));
    const shiftMap = new Map(shifts.map((s) => [s.id, s]));

    const roleNames = (staff.roles || [])
      .map((roleId) => roleMap.get(roleId))
      .filter(Boolean);

    const currentContract = contracts
      .filter((c) => c.staff === staffId)
      .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0] || null;

    const certs = staffCerts
      .filter((sc) => sc.staff === staffId)
      .sort((a, b) => {
        if (!a.expiration_date && !b.expiration_date) return 0;
        if (!a.expiration_date) return 1;
        if (!b.expiration_date) return -1;
        return new Date(a.expiration_date) - new Date(b.expiration_date);
      });

    const staffAssignments = assignments
      .filter((a) => a.staff === staffId)
      .map((a) => {
        const shift = shiftMap.get(a.shift);
        const shiftType = shift ? shiftTypeMap.get(shift.shift_type) : null;
        return {
          ...a,
          durationHours: shiftType?.duration_hours || 0,
          startDate: new Date(a.shift_start),
        };
      });

    const { monday, sunday } = getWeekBounds();
    const weekHours = staffAssignments
      .filter((a) => a.startDate >= monday && a.startDate <= sunday)
      .reduce((sum, a) => sum + a.durationHours, 0);

    const { start: monthStart, end: monthEnd } = getMonthBounds();
    const monthHours = staffAssignments
      .filter((a) => a.startDate >= monthStart && a.startDate <= monthEnd)
      .reduce((sum, a) => sum + a.durationHours, 0);

    const recentAssignments = [...staffAssignments]
      .sort((a, b) => b.startDate - a.startDate)
      .slice(0, 8);

    return {
      staff,
      roleNames,
      currentContract,
      certs,
      weekHours,
      monthHours,
      totalAssignments: staffAssignments.length,
      recentAssignments,
    };
  }, [selectedStaffId, staffList, roles, contracts, staffCerts, assignments, shifts, shiftTypes]);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />

      <h1 style={{ margin: "0 0 8px", color: "#0f172a" }}>Dashboard soignant</h1>
      <p style={{ marginTop: 0, color: "#64748b" }}>
        Visualiser rapidement le profil, les competences et la charge d'un soignant.
      </p>

      {loading && <p style={{ color: "#475569" }}>Chargement...</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {!loading && !error && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "#334155", fontWeight: 600, marginRight: 8 }}>
              Selectionner un soignant
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", minWidth: 280 }}
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
          </div>

          {data && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 14 }}>
                <Card label="Nom" value={`${data.staff.first_name} ${data.staff.last_name}`} color="#1d4ed8" />
                <Card label="Statut" value={data.staff.is_active ? "Actif" : "Inactif"} color={data.staff.is_active ? "#16a34a" : "#dc2626"} />
                <Card label="Heures semaine" value={`${data.weekHours}h`} color="#7c3aed" />
                <Card label="Heures mois" value={`${data.monthHours}h`} color="#0891b2" />
                <Card label="Affectations totales" value={data.totalAssignments} color="#d97706" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14, alignItems: "start" }}>
                <Panel title="Roles et contrat">
                  <p style={line}><strong>Email:</strong> {data.staff.email}</p>
                  <p style={line}><strong>Telephone:</strong> {data.staff.phone || "—"}</p>
                  <p style={line}>
                    <strong>Roles:</strong>{" "}
                    {data.roleNames.length > 0 ? data.roleNames.join(", ") : "Aucun role"}
                  </p>
                  {data.currentContract ? (
                    <>
                      <p style={line}><strong>Contrat:</strong> {data.currentContract.contract_type_name || data.currentContract.contract_type}</p>
                      <p style={line}><strong>Charge:</strong> {data.currentContract.workload_percent}%</p>
                      <p style={line}><strong>Debut:</strong> {new Date(data.currentContract.start_date).toLocaleDateString("fr-FR")}</p>
                    </>
                  ) : (
                    <p style={line}>Aucun contrat trouve.</p>
                  )}
                </Panel>

                <Panel title={`Certifications (${data.certs.length})`}>
                  {data.certs.length === 0 ? (
                    <p style={line}>Aucune certification.</p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {data.certs.map((c) => (
                        <li key={c.id} style={{ marginBottom: 6, color: "#334155", fontSize: 14 }}>
                          {c.certification_name}
                          {c.expiration_date ? ` (expire le ${new Date(c.expiration_date).toLocaleDateString("fr-FR")})` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>

              <Panel title="Affectations recentes" style={{ marginTop: 14 }}>
                {data.recentAssignments.length === 0 ? (
                  <p style={line}>Aucune affectation recente.</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={th}>Date</th>
                        <th style={th}>Shift</th>
                        <th style={th}>Unite</th>
                        <th style={th}>Service</th>
                        <th style={th}>Duree</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentAssignments.map((a) => (
                        <tr key={a.id}>
                          <td style={td}>{new Date(a.shift_start).toLocaleString("fr-FR")}</td>
                          <td style={td}>{a.shift_label || "—"}</td>
                          <td style={td}>{a.care_unit_name || "—"}</td>
                          <td style={td}>{a.service_name || "—"}</td>
                          <td style={td}>{a.durationHours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Card({ label, value, color }) {
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderLeft: `6px solid ${color}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function Panel({ title, children, style }) {
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, ...style }}>
      <h3 style={{ margin: "0 0 10px", color: "#0f172a", fontSize: 16 }}>{title}</h3>
      {children}
    </div>
  );
}

const line = { margin: "0 0 6px", color: "#334155", fontSize: 14 };
const th = { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #e2e8f0", color: "#475569" };
const td = { padding: "8px 10px", borderBottom: "1px solid #f1f5f9", color: "#334155" };
