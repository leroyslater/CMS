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
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "baseline",
                    flexWrap: "wrap",
                  }}
                >
                  <strong>{entry.student_name}</strong>
                  <span style={{ color: "#4b587c", fontSize: 13 }}>
                    Year {entry.year_level || "-"} · {entry.homegroup || "-"} ·{" "}
                    {entry.session_name || "-"} · {formatDisplayDate(entry.session_date)} ·{" "}
                    {entry.session_time || "-"} · {formatDetentionReasonLabel(entry.reason)}
                  </span>
                </div>
                {isMoving ? null : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={{
                        ...smallButtonStyle,
                        border: "1px solid #9fb6c7",
                      }}
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
              ) : null}
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

function formatDetentionReasonLabel(reason) {
  const value = String(reason || "").trim();
  const normalized = value.toLowerCase();

  if (!value) {
    return "-";
  }

  if (normalized.includes("attendance")) {
    return "Attendance";
  }

  if (normalized.includes("chronicle")) {
    return "Chronicle";
  }

  return value;
}
