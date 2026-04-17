import { useEffect, useState } from "react";
import API from "../api/api";

export default function Assignments() {
  const [staff, setStaff]             = useState([]);
  const [shifts, setShifts]           = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm]               = useState({ staff: "", shift: "" });
  const [violations, setViolations]   = useState(null);   // ← contraintes dures
  const [success, setSuccess]         = useState(false);
  const [loading, setLoading]         = useState(false);

  const load = async () => {
    try {
      const [st, sh, as] = await Promise.all([
        API.get("/personnel/staff/"),
        API.get("/planning/shifts/"),
        API.get("/planning/assignments/"),
      ]);
      // ⚠️ CORRECTION : gérer la pagination Django (.results)
      setStaff(st.data.results       || st.data);
      setShifts(sh.data.results      || sh.data);
      setAssignments(as.data.results || as.data);
    } catch (err) {
      console.error("Erreur chargement :", err);
    }
  };

  useEffect(() => { load(); }, []);

  const assign = async () => {
    // Reset des messages
    setViolations(null);
    setSuccess(false);

    // Validation côté client
    if (!form.staff || !form.shift) {
      alert("Sélectionne un soignant et un shift.");
      return;
    }

    setLoading(true);
    try {
      await API.post("/planning/assignments/", {
        // ⚠️ CORRECTION : convertir en entiers
        staff: parseInt(form.staff),
        shift: parseInt(form.shift),
      });

      setSuccess(true);
      setForm({ staff: "", shift: "" });
      load();

    } catch (err) {
      if (err.response?.status === 409) {
        // ⚠️ CORRECTION : le backend renvoie "violations", pas "details"
        setViolations(err.response.data.violations);
      } else {
        alert("Erreur inattendue : " + JSON.stringify(err.response?.data));
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteAssignment = async (id) => {
    if (!window.confirm("Supprimer cette affectation ?")) return;
    await API.delete(`/planning/assignments/${id}/`);
    load();
  };

  return (
    <div>
      <h2>🔗 Affectations</h2>

      {/* ── Formulaire ─────────────────────────────── */}
      <div style={{
        background: "#f8fafc", border: "1px solid #e2e8f0",
        borderRadius: 8, padding: 16, marginBottom: 24
      }}>
        <h3 style={{ marginTop: 0 }}>Créer une affectation</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>

          <select
            value={form.staff}
            onChange={e => setForm({ ...form, staff: e.target.value })}
            style={selectStyle}
          >
            <option value="">— Soignant —</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </option>
            ))}
          </select>

          <select
            value={form.shift}
            onChange={e => setForm({ ...form, shift: e.target.value })}
            style={selectStyle}
          >
            <option value="">— Shift —</option>
            {shifts.map(s => (
              <option key={s.id} value={s.id}>
                #{s.id} | {s.care_unit_name} | {s.shift_type_name} |{" "}
                {new Date(s.start_datetime).toLocaleDateString("fr-FR")}
              </option>
            ))}
          </select>

          <button onClick={assign} disabled={loading} style={btnStyle("#2563eb")}>
            {loading ? "⏳..." : "➕ Affecter"}
          </button>
        </div>
      </div>

      {/* ── Message succès ──────────────────────────── */}
      {success && (
        <div style={{
          background: "#f0fdf4", border: "1px solid #22c55e",
          borderRadius: 8, padding: 12, marginBottom: 16, color: "#16a34a"
        }}>
          ✅ Affectation créée avec succès !
        </div>
      )}

      {/* ── Erreurs contraintes dures ───────────────── */}
      {violations && (
        <div style={{
          background: "#fef2f2", border: "1px solid #ef4444",
          borderRadius: 8, padding: 16, marginBottom: 20
        }}>
          <strong style={{ color: "#dc2626", fontSize: 16 }}>
            ⛔ Affectation refusée — contraintes dures violées
          </strong>

          {Object.entries(violations).map(([code, messages]) => (
            <div key={code} style={{ marginTop: 12 }}>
              <div style={{
                background: "#dc2626", color: "white",
                borderRadius: 4, padding: "2px 8px",
                display: "inline-block", fontSize: 12, marginBottom: 4
              }}>
                {code}
              </div>
              <ul style={{ margin: "4px 0", paddingLeft: 20 }}>
                {messages.map((msg, i) => (
                  <li key={i} style={{ color: "#7f1d1d", fontSize: 14 }}>{msg}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ── Liste des affectations ──────────────────── */}
      <h3>Affectations existantes ({assignments.length})</h3>
      <table style={tableStyle}>
        <thead style={{ background: "#f1f5f9" }}>
          <tr>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Soignant</th>
            <th style={thStyle}>Poste</th>
            <th style={thStyle}>Affecté le</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>
        <tbody>
          {assignments.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: 16, color: "#9ca3af" }}>
                Aucune affectation.
              </td>
            </tr>
          )}
          {assignments.map(a => (
            <tr key={a.id}>
              <td style={tdStyle}>{a.id}</td>
              <td style={tdStyle}>{a.staff_name}</td>
              <td style={tdStyle}>{a.shift_detail}</td>
              <td style={tdStyle}>{new Date(a.assigned_at).toLocaleString("fr-FR")}</td>
              <td style={tdStyle}>
                <button onClick={() => deleteAssignment(a.id)} style={btnStyle("#ef4444", true)}>
                  🗑️ Retirer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const selectStyle = { padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, minWidth: 200 };
const tableStyle  = { borderCollapse: "collapse", width: "100%", fontSize: 14 };
const thStyle     = { padding: "10px 12px", border: "1px solid #e5e7eb", textAlign: "left" };
const tdStyle     = { padding: "8px 12px", border: "1px solid #e5e7eb" };
const btnStyle    = (bg, small) => ({
  padding: small ? "4px 10px" : "8px 16px",
  background: bg, color: "white",
  border: "none", borderRadius: 6,
  cursor: "pointer", fontSize: small ? 12 : 14,
});