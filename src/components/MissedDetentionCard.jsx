import {
  buttonStyle,
  cardStyle,
  entryCardStyle,
  inputStyle,
  sectionCopyStyle,
  sectionTitleStyle,
  smallButtonStyle,
} from "../styles/uiStyles";
import { useState } from "react";

export default function MissedDetentionCard({
  missedEntries,
  sessions,
  onUpdateEntry,
  onDeleteEntry,
  entrySavingId,
  setSelectedStudent,
}) {
  const [movingEntryId, setMovingEntryId] = useState(null);
  const [moveSessionId, setMoveSessionId] = useState("");

  function startMovingEntry(entry) {
    setMovingEntryId(entry.id);
    setMoveSessionId(entry.session_id || "");
  }

  async function handleMoveEntry(entry) {
    if (!moveSessionId || moveSessionId === entry.session_id) {
      setMovingEntryId(null);
      return;
    }

    const ok = await onUpdateEntry(entry.id, {
      session_id: moveSessionId,
      attendance: "Unmarked",
    });

    if (ok) {
      setMovingEntryId(null);
      setMoveSessionId("");
    }
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitleStyle}>Missed Detention</h2>
      <p style={sectionCopyStyle}>
        Review students marked absent from detention, move them into a new detention,
        or remove the entry entirely.
      </p>
      {missedEntries.length === 0 ? (
        <p>No missed detention entries yet.</p>
      ) : (
        missedEntries.map((entry) => {
          const isMoving = movingEntryId === entry.id;

          return (
            <div
              key={entry.id}
              style={{
                ...entryCardStyle,
                border: "2px solid #e9a19a",
                background: "#fff2eb",
                cursor: "pointer",
              }}
              onClick={() => setSelectedStudent?.(entry.student_name)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: 4,
                }}
              >
                <strong>{entry.student_name}</strong>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 9px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#8a1f1f",
                    background: "#ffeaea",
                    border: "1px solid #f1b0b0",
                  }}
                >
                  Missed detention
                </span>
              </div>
              <div style={{ color: "#4b587c", fontSize: 14, marginBottom: 4 }}>
                Year {entry.year_level || "-"} · {entry.homegroup || "-"}
              </div>
              <div style={{ color: "#17334b", fontSize: 14, marginBottom: 4 }}>
                Detention: {entry.session_name || "-"} · {formatDisplayDate(entry.session_date)} ·{" "}
                {entry.session_time || "-"}
              </div>
              <div style={{ color: "#4b587c", fontSize: 14 }}>
                Reason: {entry.reason || "-"}
              </div>

              {isMoving ? (
                <div style={{ marginTop: 10 }}>
                  <select
                    style={inputStyle}
                    value={moveSessionId}
                    onChange={(event) => setMoveSessionId(event.target.value)}
                  >
                    <option value="">Select new detention</option>
                    {sessions
                      .filter((session) => session.id !== entry.session_id)
                      .map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.name} - {formatDisplayDate(session.date)}
                        </option>
                      ))}
                  </select>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={{ ...buttonStyle, padding: "10px 14px" }}
                      disabled={entrySavingId === entry.id || !moveSessionId}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleMoveEntry(entry);
                      }}
                    >
                      {entrySavingId === entry.id ? "Saving..." : "Move to detention"}
                    </button>
                    <button
                      type="button"
                      style={smallButtonStyle}
                      onClick={(event) => {
                        event.stopPropagation();
                        setMovingEntryId(null);
                        setMoveSessionId("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={(event) => {
                      event.stopPropagation();
                      startMovingEntry(entry);
                    }}
                  >
                    Move
                  </button>
                  <button
                    type="button"
                    style={{
                      ...smallButtonStyle,
                      border: "1px solid #d9a79a",
                      color: "#8b2f1b",
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteEntry(entry);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function formatDisplayDate(value) {
  if (!value) return "-";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(value);

  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T12:00:00`);
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
