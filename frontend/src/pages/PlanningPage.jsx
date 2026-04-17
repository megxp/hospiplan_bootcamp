import { useState } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000/api/planning";

export default function PlanningPage() {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd,   setPeriodEnd]   = useState("");
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState(null);

  const handleGenerate = async () => {
    if (!periodStart || !periodEnd) {
      setError("Veuillez renseigner les deux dates.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await axios.post(`${API}/plannings/generate/`, {
        period_start: `${periodStart}T00:00:00`,
        period_end:   `${periodEnd}T23:59:59`,
      });
      setResult(res.data);
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

      {/* ── Résultats ── */}
      {result && (
        <>
          {/* Score global */}
          <div style={{
            display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap"
          }}>
            <StatCard label="Score global" value={result.total_score} color="#2563eb" unit="pts" />
            <StatCard label="Shifts traités" value={result.planning.length} color="#16a34a" />
            <StatCard
              label="Shifts non couverts"
              value={result.unmet_shifts.length}
              color={result.unmet_shifts.length > 0 ? "#dc2626" : "#16a34a"}
            />
          </div>

          {/* Shifts non couverts */}
          {result.unmet_shifts.length > 0 && (
            <div style={{
              background: "#fff7ed", border: "1px solid #fed7aa",
              borderRadius: 8, padding: 14, marginBottom: 20
            }}>
              <strong style={{ color: "#c2410c" }}>⚠️ Shifts non couverts :</strong>
              <ul style={{ margin: "8px 0 0 0", paddingLeft: 20, color: "#9a3412" }}>
                {result.unmet_shifts.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {/* Tableau du planning */}
          <div style={{
            background: "white", border: "1px solid #e2e8f0",
            borderRadius: 10, overflow: "hidden"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1e293b", color: "white" }}>
                  <th style={thStyle}>Shift</th>
                  <th style={thStyle}>Requis</th>
                  <th style={thStyle}>Affectés</th>
                  <th style={thStyle}>Soignants</th>
                  <th style={thStyle}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {result.planning.map((row, i) => (
                  <tr
                    key={row.shift_id}
                    style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}
                  >
                    <td style={tdStyle}>{row.shift}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{row.required}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{row.assigned}</td>
                    <td style={tdStyle}>
                      {row.assignments.length === 0
                        ? <span style={{ color: "#94a3b8" }}>—</span>
                        : row.assignments.map(a => (
                          <span key={a.staff_id} style={{
                            display: "inline-block",
                            background: "#dbeafe", color: "#1e40af",
                            borderRadius: 4, padding: "2px 8px",
                            marginRight: 4, marginBottom: 4, fontSize: 13
                          }}>
                            {a.staff_name}
                            <span style={{ color: "#93c5fd", marginLeft: 4 }}>
                              ({a.penalty}pts)
                            </span>
                          </span>
                        ))
                      }
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {row.fully_covered
                        ? <span style={{ color: "#16a34a", fontWeight: "bold" }}>✅</span>
                        : <span style={{ color: "#dc2626", fontWeight: "bold" }}>⚠️ Incomplet</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Composant carte stat ──
function StatCard({ label, value, color, unit = "" }) {
  return (
    <div style={{
      background: "white", border: `2px solid ${color}`,
      borderRadius: 10, padding: "14px 24px", minWidth: 140, textAlign: "center"
    }}>
      <div style={{ fontSize: 28, fontWeight: "bold", color }}>{value}{unit}</div>
      <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{label}</div>
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

const thStyle = {
  padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 13
};

const tdStyle = {
  padding: "11px 16px", fontSize: 14,
  color: "#334155", borderTop: "1px solid #e2e8f0"
};