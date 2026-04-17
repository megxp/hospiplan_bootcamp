import { useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../api/api";

// Palette couleurs par care_unit (cyclique)
const SERVICE_COLORS = [
  { bg: "#4f46e5", light: "#eef2ff", text: "#3730a3" },
  { bg: "#0891b2", light: "#ecfeff", text: "#0e7490" },
  { bg: "#16a34a", light: "#f0fdf4", text: "#15803d" },
  { bg: "#dc2626", light: "#fef2f2", text: "#b91c1c" },
  { bg: "#d97706", light: "#fffbeb", text: "#b45309" },
  { bg: "#7c3aed", light: "#f5f3ff", text: "#6d28d9" },
  { bg: "#db2777", light: "#fdf2f8", text: "#be185d" },
  { bg: "#0d9488", light: "#f0fdfa", text: "#0f766e" },
];

function getColor(careUnitId) {
  const safeId = Number(careUnitId) || 1;
  return SERVICE_COLORS[(safeId - 1) % SERVICE_COLORS.length];
}

// ── Fetch toutes les pages d'un endpoint paginé ──
async function fetchAllPages(url) {
  let all = [];
  let next = url;
  while (next) {
    const res = await API.get(next.replace("http://127.0.0.1:8000/api", ""));
    const body = res.data;
    all = [...all, ...(body.results || body)];
    next = body.next || null;
  }
  return all;
}

export default function CalendarPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const startParam = queryParams.get("start");
  const endParam = queryParams.get("end");
  const initialUnit = queryParams.get("unit") || "all";
  const initialMode = queryParams.get("mode") === "service" ? "service" : "staff";
  const initialDate = startParam || undefined;

  const [events, setEvents]           = useState([]);
  const [allEvents, setAllEvents]     = useState([]);
  const [careUnits, setCareUnits]     = useState({});
  const [shiftTypes, setShiftTypes]   = useState({});
  const [selectedCareUnit, setSelectedCareUnit] = useState(initialUnit);
  const [displayMode, setDisplayMode] = useState(initialMode);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [popupPos, setPopupPos]       = useState({ x: 0, y: 0 });
  const [showModal, setShowModal]     = useState(false);
  const [newShift, setNewShift]       = useState({ start: "", end: "", care_unit: "", shift_type: "", min_staff: 1, max_staff: 5 });
  const [careUnitList, setCareUnitList] = useState([]);
  const [shiftTypeList, setShiftTypeList] = useState([]);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState(null);
  const calendarRef = useRef(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      // Charger care units et shift types en parallèle
      const [cuRes, stRes] = await Promise.all([
        API.get("/hospital/care-units/"),
        API.get("/planning/shift-types/"),
      ]);

      const cuData = cuRes.data.results || cuRes.data;
      const stData = stRes.data.results || stRes.data;

      const cuMap = {};
      cuData.forEach(cu => { cuMap[cu.id] = cu; });
      const stMap = {};
      stData.forEach(st => { stMap[st.id] = st; });

      setCareUnits(cuMap);
      setShiftTypes(stMap);
      setCareUnitList(cuData);
      setShiftTypeList(stData);

      // Charger toutes les affectations
      const assignments = await fetchAllPages("http://127.0.0.1:8000/api/planning/assignments/");

      const formatted = assignments.map(a => {
        const careUnitId = Number(a.care_unit_id) || 1;
        const color = getColor(careUnitId);
        const baseTitle = a.staff_name || `Soignant #${a.staff}`;
        return {
          id:              `assign-${a.id}`,
          title:           baseTitle,
          start:           a.shift_start,
          end:             a.shift_end,
          backgroundColor: color.bg,
          borderColor:     color.bg,
          textColor:       "#fff",
          extendedProps: {
            type:          "assignment",
            shiftLabel:    a.shift_label || a.shift_type_name || "",
            careUnitName:  a.care_unit_name || cuMap[a.care_unit]?.name || "",
            serviceName:   a.service_name || "",
            staffName:     a.staff_name || "",
            careUnitId,
            baseTitle,
            assignmentId:  a.id,
          }
        };
      });

      setAllEvents(formatted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const filtered = allEvents
      .filter((evt) => {
        if (selectedCareUnit === "all") {
          return true;
        }
        return String(evt.extendedProps.careUnitId) === selectedCareUnit;
      })
      .map((evt) => ({
        ...evt,
        title:
          displayMode === "service"
            ? evt.extendedProps.serviceName || evt.extendedProps.careUnitName || "Service"
            : evt.extendedProps.baseTitle,
      }));

    setEvents(filtered);
  }, [allEvents, selectedCareUnit, displayMode]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (selectedCareUnit === "all") {
      params.delete("unit");
    } else {
      params.set("unit", selectedCareUnit);
    }

    if (displayMode === "staff") {
      params.delete("mode");
    } else {
      params.set("mode", displayMode);
    }

    const nextSearch = params.toString();
    const currentSearch = location.search.startsWith("?")
      ? location.search.slice(1)
      : location.search;

    if (nextSearch !== currentSearch) {
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : "",
        },
        { replace: true }
      );
    }
  }, [selectedCareUnit, displayMode, navigate, location.pathname, location.search]);

  function handleEventClick(info) {
    const rect = info.el.getBoundingClientRect();
    setPopupPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
    setSelected(info.event);
  }

  function handleDateSelect(selectInfo) {
    setNewShift({
      start:      selectInfo.startStr.slice(0, 16),
      end:        selectInfo.endStr.slice(0, 16),
      care_unit:  "",
      shift_type: "",
      min_staff:  1,
      max_staff:  5,
    });
    setSaveError(null);
    setShowModal(true);
  }

  async function handleCreateShift(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await API.post("/planning/shifts/", {
        start_datetime: new Date(newShift.start).toISOString(),
        end_datetime:   new Date(newShift.end).toISOString(),
        care_unit:      parseInt(newShift.care_unit),
        shift_type:     parseInt(newShift.shift_type),
        min_staff:      parseInt(newShift.min_staff),
        max_staff:      parseInt(newShift.max_staff),
      });
      setShowModal(false);
      await loadAll();
    } catch (err) {
      setSaveError(err.response?.data?.detail || JSON.stringify(err.response?.data) || "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#f1f5f9" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── Header ── */}
      <div style={{
        background: "white",
        borderBottom: "1px solid #e2e8f0",
        padding: "16px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
            📅 Calendrier des gardes
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>
            {startParam && endParam
              ? `Planning généré du ${startParam} au ${endParam}`
              : "Cliquez sur un créneau pour créer un shift · Cliquez sur un événement pour les détails"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={selectedCareUnit}
            onChange={(e) => setSelectedCareUnit(e.target.value)}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 13,
              color: "#334155",
              background: "white",
              cursor: "pointer"
            }}
          >
            <option value="all">Toutes les unités</option>
            {careUnitList.map((cu) => (
              <option key={cu.id} value={String(cu.id)}>
                {cu.name}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setDisplayMode("staff")}
                title="Afficher les événements par soignant"
              style={{
                border: "none",
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: displayMode === "staff" ? "#1e293b" : "white",
                color: displayMode === "staff" ? "white" : "#334155"
              }}
            >
              Par soignant
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("service")}
                title="Afficher les événements par service"
              style={{
                border: "none",
                borderLeft: "1px solid #cbd5e1",
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: displayMode === "service" ? "#1e293b" : "white",
                color: displayMode === "service" ? "white" : "#334155"
              }}
            >
              Par service
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedCareUnit("all");
              setDisplayMode("staff");
            }}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: "white",
              color: "#334155",
              transition: "all 0.15s ease"
            }}
          >
            Réinitialiser
          </button>

          <span style={{
            background: "#eef2ff",
            color: "#3730a3",
            border: "1px solid #c7d2fe",
            borderRadius: 20,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 600
          }}>
            {events.length} affectations
          </span>

          {SERVICE_COLORS.slice(0, Math.min(careUnitList.length, 4)).map((c, i) => (
            careUnitList[i] && (
              <span key={i} style={{
                background: c.light, color: c.text,
                border: `1.5px solid ${c.bg}`,
                borderRadius: 20, padding: "3px 12px",
                fontSize: 12, fontWeight: 600
              }}>
                {careUnitList[i].name}
              </span>
            )
          ))}
        </div>
      </div>

      {/* ── Calendrier ── */}
      <div style={{ padding: 24 }}>
        {loading ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: 400, color: "#64748b", fontSize: 16, gap: 12
          }}>
            <span style={{ fontSize: 28 }}>⏳</span> Chargement des affectations…
          </div>
        ) : (
          <div style={{
            background: "white", borderRadius: 16,
            boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
            overflow: "hidden"
          }}>
            <style>{`
              .fc { font-family: 'DM Sans', sans-serif !important; }
              .fc-toolbar-title { font-size: 18px !important; font-weight: 700 !important; color: #0f172a !important; }
              .fc-button { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; color: #334155 !important; border-radius: 8px !important; font-weight: 600 !important; font-size: 13px !important; padding: 6px 14px !important; box-shadow: none !important; }
              .fc-button:hover { background: #f1f5f9 !important; }
              .fc-button-active { background: #1e293b !important; color: white !important; border-color: #1e293b !important; }
              .fc-today-button { background: #2563eb !important; color: white !important; border-color: #2563eb !important; }
              .fc-col-header-cell { background: #f8fafc; padding: 10px 0 !important; }
              .fc-col-header-cell-cushion { font-weight: 600 !important; color: #475569 !important; font-size: 13px !important; text-decoration: none !important; }
              .fc-daygrid-day-number { font-weight: 600; color: #475569; font-size: 13px; text-decoration: none !important; }
              .fc-day-today { background: #eff6ff !important; }
              .fc-day-today .fc-daygrid-day-number { color: #2563eb !important; background: #2563eb; color: white !important; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; }
              .fc-event { border-radius: 6px !important; font-size: 11px !important; font-weight: 600 !important; cursor: pointer !important; border: none !important; padding: 1px 5px !important; }
              .fc-event:hover { opacity: 0.88; transform: scale(1.01); transition: all 0.1s; }
              .fc-timegrid-slot { height: 34px !important; }
              .fc-timegrid-slot-label { font-size: 11px !important; color: #94a3b8 !important; font-weight: 500 !important; }
              .fc-highlight { background: #dbeafe !important; }
              .fc-toolbar { padding: 16px 20px !important; }
              .fc-scrollgrid { border-radius: 0 !important; }
              select:hover { border-color: #94a3b8; }
            `}</style>

            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              initialDate={initialDate}
              locale="fr"
              firstDay={1}
              headerToolbar={{
                left:   "prev,next today",
                center: "title",
                right:  "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              buttonText={{
                today: "Aujourd'hui",
                month: "Mois",
                week:  "Semaine",
                day:   "Jour",
              }}
              events={events}
              selectable={true}
              selectMirror={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              dayMaxEvents={true}
              height="74vh"
              nowIndicator={true}
              slotMinTime="06:00:00"
              slotMaxTime="24:00:00"
            />
          </div>
        )}
      </div>

      {/* ── Popup détail événement ── */}
      {selected && (
        <>
          <div
            onClick={() => setSelected(null)}
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
          />
          <div style={{
            position: "fixed",
            left: Math.min(popupPos.x, window.innerWidth - 300),
            top:  Math.min(popupPos.y, window.innerHeight - 250),
            zIndex: 100,
            background: "white",
            borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            padding: 20,
            minWidth: 260,
            border: "1px solid #e2e8f0",
            animation: "fadeIn 0.15s ease"
          }}>
            <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }`}</style>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{
                background: selected.backgroundColor, color: "white",
                borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700
              }}>
                {selected.extendedProps.shiftLabel || "Garde"}
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, lineHeight: 1 }}
              >×</button>
            </div>

            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
              👤 {selected.extendedProps.staffName || selected.title}
            </div>

            <div style={{ fontSize: 13, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
              {selected.extendedProps.careUnitName && (
                <span>🏥 {selected.extendedProps.careUnitName}</span>
              )}
              {selected.extendedProps.serviceName && (
                <span>📍 {selected.extendedProps.serviceName}</span>
              )}
              <span>🕐 {new Date(selected.start).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
              <span>🕐 {new Date(selected.end).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
            </div>
          </div>
        </>
      )}

      {/* ── Modal création shift ── */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200
        }}>
          <div style={{
            background: "white", borderRadius: 18,
            boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
            padding: 32, width: 440, maxWidth: "95vw",
            animation: "fadeIn 0.2s ease"
          }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
              ➕ Créer un shift
            </h3>

            <form onSubmit={handleCreateShift}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Début</label>
                  <input type="datetime-local" value={newShift.start}
                    onChange={e => setNewShift(p => ({ ...p, start: e.target.value }))}
                    style={inp} required />
                </div>
                <div>
                  <label style={lbl}>Fin</label>
                  <input type="datetime-local" value={newShift.end}
                    onChange={e => setNewShift(p => ({ ...p, end: e.target.value }))}
                    style={inp} required />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Unité de soins</label>
                <select value={newShift.care_unit}
                  onChange={e => setNewShift(p => ({ ...p, care_unit: e.target.value }))}
                  style={inp} required>
                  <option value="">— Sélectionner —</option>
                  {careUnitList.map(cu => (
                    <option key={cu.id} value={cu.id}>{cu.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Type de shift</label>
                <select value={newShift.shift_type}
                  onChange={e => setNewShift(p => ({ ...p, shift_type: e.target.value }))}
                  style={inp} required>
                  <option value="">— Sélectionner —</option>
                  {shiftTypeList.map(st => (
                    <option key={st.id} value={st.id}>{st.name} ({st.duration_hours}h)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={lbl}>Min. soignants</label>
                  <input type="number" min={1} value={newShift.min_staff}
                    onChange={e => setNewShift(p => ({ ...p, min_staff: e.target.value }))}
                    style={inp} />
                </div>
                <div>
                  <label style={lbl}>Max. soignants</label>
                  <input type="number" min={1} value={newShift.max_staff}
                    onChange={e => setNewShift(p => ({ ...p, max_staff: e.target.value }))}
                    style={inp} />
                </div>
              </div>

              {saveError && (
                <div style={{ background: "#fef2f2", color: "#991b1b", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                  ❌ {saveError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", cursor: "pointer", fontWeight: 600 }}>
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: saving ? "#94a3b8" : "#2563eb", color: "white", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14 }}>
                  {saving ? "Enregistrement…" : "✓ Créer le shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5 };
const inp = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, color: "#0f172a", background: "#f8fafc", boxSizing: "border-box", outline: "none" };