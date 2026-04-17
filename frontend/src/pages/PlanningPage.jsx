import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = "http://127.0.0.1:8000/api/planning";

export default function PlanningPage() {
  const navigate = useNavigate();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd,   setPeriodEnd]   = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  const handleGenerate = async () => {
    if (!periodStart || !periodEnd) {
      setError("Veuillez renseigner les deux dates.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await axios.post(`${API}/plannings/generate/`, {
        period_start: `${periodStart}T00:00:00`,
        period_end:   `${periodEnd}T23:59:59`,
      });
      navigate(`/calendar?start=${periodStart}&end=${periodEnd}`);
    } catch (err) {
      setError(
        err.response?.data?.error || "Erreur lors de la génération du planning."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>

      {/* ── Titre ── */}
      <h2 style={{ color: "#1e293b", marginBottom: 8 }}>
        🗓️ Génération automatique du planning
      </h2>
      <p style={{ color: "#64748b", marginBottom: 24 }}>
        Sélectionnez une période. Le système affectera automatiquement les
        soignants disponibles en respectant toutes les contraintes dures et en
        minimisant les contraintes molles.
      </p>

      {/* ── Formulaire ── */}
      <div style={{
        display: "flex", gap: 16, alignItems: "flex-end",
        background: "#f8fafc", border: "1px solid #e2e8f0",
        borderRadius: 10, padding: 20, marginBottom: 24
      }}>
        <div>
          <label style={labelStyle}>Date de début</label>
          <input
            type="date"
            value={periodStart}
            onChange={e => setPeriodStart(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Date de fin</label>
          <input
            type="date"
            value={periodEnd}
            onChange={e => setPeriodEnd(e.target.value)}
            style={inputStyle}
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            padding: "10px 24px",
            background: loading ? "#94a3b8" : "#2563eb",
            color: "white", border: "none", borderRadius: 8,
            fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer",
            fontSize: 15,
          }}
        >
          {loading ? "⏳ Génération..." : "⚡ Générer le planning"}
        </button>
      </div>

      {/* ── Erreur ── */}
      {error && (
        <div style={{
          background: "#fee2e2", border: "1px solid #fca5a5",
          color: "#991b1b", padding: 14, borderRadius: 8, marginBottom: 20
        }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
}

// ── Styles réutilisables ──
const labelStyle = {
  display: "block", fontSize: 13,
  color: "#475569", marginBottom: 6, fontWeight: 600
};

const inputStyle = {
  padding: "9px 12px", border: "1px solid #cbd5e1",
  borderRadius: 8, fontSize: 14, color: "#1e293b",
  background: "white"
};