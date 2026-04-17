import { useEffect, useState } from "react";
import API from "../api/api";

export default function Shifts() {
  const [shifts, setShifts]     = useState([]);
  const [units, setUnits]       = useState([]);
  const [types, setTypes]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [form, setForm] = useState({
    care_unit: "", shift_type: "",
    start_datetime: "", end_datetime: "",
    min_staff: 1, max_staff: 5
  });

  const load = async () => {
    setLoading(true);
    try {
      const [s, u, t] = await Promise.all([
        API.get("/planning/shifts/"),
        API.get("/hospital/care-units/"),
        API.get("/planning/shift-types/"),
      ]);
      setShifts(s.data.results || s.data);
      setUnits(u.data.results  || u.data);
      setTypes(t.data.results  || t.data);
    } catch (err) {
      console.error("Erreur chargement shifts :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.care_unit || !form.shift_type || !form.start_datetime || !form.end_datetime) {
      alert("Tous les champs sont obligatoires.");
      return;
    }
    try {
      await API.post("/planning/shifts/", {
        ...form,
        care_unit:  parseInt(form.care_unit),
        shift_type: parseInt(form.shift_type),
        min_staff:  parseInt(form.min_staff),
        max_staff:  parseInt(form.max_staff),
      });
      setForm({ care_unit: "", shift_type: "", start_datetime: "", end_datetime: "", min_staff: 1, max_staff: 5 });
      load();
    } catch (err) {
      alert(JSON.stringify(err.response?.data));
    }
  };

  return (
    <div>
      <h2>📅 Shifts</h2>

      {/* Formulaire de création */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>➕ Créer un shift</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

          <select value={form.care_unit} onChange={e => setForm({ ...form, care_unit: e.target.value })} style={selectStyle}>
            <option value="">— Unité de soins —</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.service_name})</option>)}
          </select>

          <select value={form.shift_type} onChange={e => setForm({ ...form, shift_type: e.target.value })} style={selectStyle}>
            <option value="">— Type de garde —</option>
            {types.map(t => <option key={t.id} value={t.id}>{t.name} ({t.duration_hours}h)</option>)}
          </select>

          <input
            type="datetime-local"
            value={form.start_datetime}
            onChange={e => setForm({ ...form, start_datetime: e.target.value })}
            style={inputStyle}
          />
          <input
            type="datetime-local"
            value={form.end_datetime}
            onChange={e => setForm({ ...form, end_datetime: e.target.value })}
            style={inputStyle}
          />
          <input
            type="number" placeholder="Min staff" min={1}
            value={form.min_staff}
            onChange={e => setForm({ ...form, min_staff: e.target.value })}
            style={{ ...inputStyle, width: 90 }}
          />
          <input
            type="number" placeholder="Max staff" min={1}
            value={form.max_staff}
            onChange={e => setForm({ ...form, max_staff: e.target.value })}
            style={{ ...inputStyle, width: 90 }}
          />
          <button onClick={handleCreate} style={btnStyle("#2563eb")}>➕ Créer</button>
        </div>
      </div>

      {/* Liste */}
      {loading ? <p>Chargement...</p> : (
        <table style={tableStyle}>
          <thead style={{ background: "#f1f5f9" }}>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Service</th>
              <th style={thStyle}>Unité</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Début</th>
              <th style={thStyle}>Fin</th>
              <th style={thStyle}>Effectif</th>
            </tr>
          </thead>
          <tbody>
            {shifts.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 16, color: "#9ca3af" }}>
                  Aucun shift enregistré.
                </td>
              </tr>
            )}
            {shifts.map(s => (
              <tr key={s.id}>
                <td style={tdStyle}>{s.id}</td>
                <td style={tdStyle}>{s.service_name}</td>
                <td style={tdStyle}>{s.care_unit_name}</td>
                <td style={tdStyle}>{s.shift_type_name}</td>
                <td style={tdStyle}>{new Date(s.start_datetime).toLocaleString("fr-FR")}</td>
                <td style={tdStyle}>{new Date(s.end_datetime).toLocaleString("fr-FR")}</td>
                <td style={tdStyle}>
                  <span style={{
                    color: s.current_staff_count >= s.min_staff ? "#16a34a" : "#dc2626",
                    fontWeight: "bold"
                  }}>
                    {s.current_staff_count}
                  </span>
                  /{s.min_staff}–{s.max_staff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const inputStyle  = { padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 };
const selectStyle = { padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 };
const tableStyle  = { borderCollapse: "collapse", width: "100%", fontSize: 14 };
const thStyle     = { padding: "10px 12px", border: "1px solid #e5e7eb", textAlign: "left" };
const tdStyle     = { padding: "8px 12px", border: "1px solid #e5e7eb" };
const btnStyle    = bg => ({ padding: "8px 16px", background: bg, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 });