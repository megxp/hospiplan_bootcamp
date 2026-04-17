import { useEffect, useState } from "react";
import API from "../api/api";

export default function Staff() {
  const [data, setData]     = useState([]);
  const [form, setForm]     = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [editing, setEditing] = useState(null);  // id du soignant en cours d'édition
  const [loading, setLoading] = useState(false);

  // ── Charger la liste ──────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get("/personnel/staff/");
      setData(res.data.results || res.data);
    } catch (err) {
      console.error("Erreur chargement staff :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Créer ou Modifier ─────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.email) {
      alert("Prénom, nom et email sont obligatoires.");
      return;
    }

    try {
      if (editing) {
        // PATCH = modification partielle
        await API.patch(`/personnel/staff/${editing}/`, form);
        setEditing(null);
      } else {
        // POST = création
        await API.post("/personnel/staff/", form);
      }
      setForm({ first_name: "", last_name: "", email: "", phone: "" });
      load();
    } catch (err) {
      alert(JSON.stringify(err.response?.data));
    }
  };

  // ── Remplir le formulaire pour modification ───────────────────
  const handleEdit = (s) => {
    setEditing(s.id);
    setForm({
      first_name: s.first_name,
      last_name:  s.last_name,
      email:      s.email,
      phone:      s.phone || "",
    });
  };

  // ── Annuler la modification ───────────────────────────────────
  const handleCancel = () => {
    setEditing(null);
    setForm({ first_name: "", last_name: "", email: "", phone: "" });
  };

  // ── Supprimer ─────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce soignant définitivement ?")) return;
    try {
      await API.delete(`/personnel/staff/${id}/`);
      load();
    } catch (err) {
      alert("Erreur lors de la suppression.");
    }
  };

  // ── Rendu ─────────────────────────────────────────────────────
  return (
    <div>
      <h2>👩‍⚕️ Soignants</h2>

      {/* Formulaire */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          placeholder="Prénom *"
          value={form.first_name}
          onChange={e => setForm({ ...form, first_name: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Nom *"
          value={form.last_name}
          onChange={e => setForm({ ...form, last_name: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Email *"
          type="email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Téléphone"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
          style={inputStyle}
        />
        <button onClick={handleSubmit} style={btnStyle("#2563eb")}>
          {editing ? "✏️ Enregistrer" : "➕ Ajouter"}
        </button>
        {editing && (
          <button onClick={handleCancel} style={btnStyle("#6b7280")}>
            Annuler
          </button>
        )}
      </div>

      {/* Tableau */}
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <table style={tableStyle}>
          <thead style={{ background: "#f1f5f9" }}>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Prénom</th>
              <th style={thStyle}>Nom</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Téléphone</th>
              <th style={thStyle}>Actif</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 16, color: "#9ca3af" }}>
                  Aucun soignant enregistré.
                </td>
              </tr>
            )}
            {data.map(s => (
              <tr key={s.id} style={editing === s.id ? { background: "#eff6ff" } : {}}>
                <td style={tdStyle}>{s.id}</td>
                <td style={tdStyle}>{s.first_name}</td>
                <td style={tdStyle}>{s.last_name}</td>
                <td style={tdStyle}>{s.email}</td>
                <td style={tdStyle}>{s.phone || "—"}</td>
                <td style={tdStyle}>{s.is_active ? "✅" : "❌"}</td>
                <td style={tdStyle}>
                  <button onClick={() => handleEdit(s)} style={btnStyle("#f59e0b", "small")}>✏️</button>
                  <button onClick={() => handleDelete(s.id)} style={{ ...btnStyle("#ef4444", "small"), marginLeft: 4 }}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Styles réutilisables ──
const inputStyle = { padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 };
const tableStyle = { borderCollapse: "collapse", width: "100%", fontSize: 14 };
const thStyle    = { padding: "10px 12px", border: "1px solid #e5e7eb", textAlign: "left" };
const tdStyle    = { padding: "8px 12px", border: "1px solid #e5e7eb" };
const btnStyle   = (bg, size) => ({
  padding: size === "small" ? "4px 8px" : "8px 16px",
  background: bg, color: "white",
  border: "none", borderRadius: 6,
  cursor: "pointer", fontSize: size === "small" ? 12 : 14,
});