import {
  buttonStyle,
  cardStyle,
  entryCardStyle,
  inputStyle,
  smallButtonStyle,
  sectionCopyStyle,
  sectionTitleStyle,
} from "../styles/uiStyles";
import { useState } from "react";

export default function SessionRollCard({
  selectedSessionId,
  setSelectedSessionId,
  sessions,
  selectedSession,
  selectedSessionEntries,
  setSelectedStudent,
  isSupervisor = false,
  onUpdateAttendance,
  attendanceUpdatingId,
  onUpdateSession,
  onDeleteSession,
  sessionSaving,
  onUpdateEntry,
  onDeleteEntry,
  entrySavingId,
}) {
  const [editingSession, setEditingSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    name: "",
    date: "",
    time: "",
    location: "",
    supervisor: "",
  });
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [entryForm, setEntryForm] = useState({
    session_id: "",
    reason: "",
    issued_by: "",
    attendance: "Unmarked",
  });

  function startEditingSession() {
    if (!selectedSession) return;

    setEditingSession(true);
    setSessionForm({
      name: selectedSession.name || "",
      date: selectedSession.date || "",
      time: selectedSession.time || "",
      location: selectedSession.location || "",
      supervisor: selectedSession.supervisor || "",
    });
  }

  function startEditingEntry(entry) {
    setEditingEntryId(entry.id);
    setEntryForm({
      session_id: entry.session_id || "",
      reason: entry.reason || "",
      issued_by: entry.issued_by || "",
      attendance: entry.attendance || "Unmarked",
    });
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitleStyle}>Session Roll</h2>
      <p style={sectionCopyStyle}>
        {isSupervisor
          ? "Review the roll and mark each student as present or absent."
          : "Review the selected detention session and open any student to inspect their history."}
      </p>
      <select
        style={inputStyle}
        value={selectedSessionId}
        onChange={(e) => setSelectedSessionId(e.target.value)}
      >
        <option value="">Select session</option>
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {session.name} - {session.date}
          </option>
        ))}
      </select>
      {selectedSession ? (
        <div style={{ marginTop: 10, marginBottom: 16 }}>
          {editingSession && !isSupervisor ? (
            <div>
              <input
                style={inputStyle}
                value={sessionForm.name}
                onChange={(e) =>
                  setSessionForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Session name"
              />
              <input
                style={inputStyle}
                type="date"
                value={sessionForm.date}
                onChange={(e) =>
                  setSessionForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
              <input
                style={inputStyle}
                value={sessionForm.time}
                onChange={(e) =>
                  setSessionForm((prev) => ({ ...prev, time: e.target.value }))
                }
                placeholder="Time"
              />
              <input
                style={inputStyle}
                value={sessionForm.location}
                onChange={(e) =>
                  setSessionForm((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="Location"
              />
              <input
                style={inputStyle}
                value={sessionForm.supervisor}
                onChange={(e) =>
                  setSessionForm((prev) => ({ ...prev, supervisor: e.target.value }))
                }
                placeholder="Supervisor"
              />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={buttonStyle}
                  disabled={sessionSaving}
                  onClick={async () => {
                    const ok = await onUpdateSession(
                      selectedSession.id,
                      sessionForm
                    );
                    if (ok) {
                      setEditingSession(false);
                    }
                  }}
                >
                  {sessionSaving ? "Saving..." : "Save session"}
                </button>
                <button
                  type="button"
                  style={smallButtonStyle}
                  onClick={() => setEditingSession(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{selectedSession.name}</div>
                <div style={{ marginTop: 4 }}>
                  {selectedSession.date} · {selectedSession.time || "-"} ·{" "}
                  {selectedSession.location || "-"}
                </div>
                <div style={{ marginTop: 4, color: "#4b587c" }}>
                  Supervisor: {selectedSession.supervisor || "-"}
                </div>
              </div>
              {!isSupervisor ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={startEditingSession}
                  >
                    Edit session
                  </button>
                  <button
                    type="button"
                    style={{
                      ...smallButtonStyle,
                      border: "1px solid #d9a79a",
                      color: "#8b2f1b",
                    }}
                    onClick={() => onDeleteSession(selectedSession.id)}
                  >
                    Delete session
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
      {selectedSessionEntries.length === 0 ? (
        <p>No students assigned to this session yet.</p>
      ) : (
        selectedSessionEntries.map((entry) => (
          <div
            key={entry.id}
            style={{ ...entryCardStyle, cursor: "pointer" }}
            onClick={() => {
              if (!isSupervisor) {
                setSelectedStudent(entry.student_name);
              }
            }}
          >
            <strong>{entry.student_name}</strong>
            <div>
              Year {entry.year_level} · {entry.homegroup}
            </div>
            <div>
              <strong>Reason:</strong> {entry.reason}
            </div>
            <div>Attendance: {entry.attendance || "Unmarked"}</div>
            {isSupervisor ? (
              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={buttonStyle}
                  disabled={attendanceUpdatingId === entry.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateAttendance(entry.id, "Present");
                  }}
                >
                  {attendanceUpdatingId === entry.id && entry.attendance !== "Present"
                    ? "Saving..."
                    : "Present"}
                </button>
                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    background: "linear-gradient(135deg, #a44b35 0%, #7c2d1f 100%)",
                    boxShadow: "0 10px 22px rgba(124, 45, 31, 0.18)",
                  }}
                  disabled={attendanceUpdatingId === entry.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateAttendance(entry.id, "Absent");
                  }}
                >
                  {attendanceUpdatingId === entry.id && entry.attendance !== "Absent"
                    ? "Saving..."
                    : "Absent"}
                </button>
              </div>
            ) : editingEntryId === entry.id ? (
              <div style={{ marginTop: 12 }}>
                <select
                  style={inputStyle}
                  value={entryForm.session_id}
                  onChange={(e) =>
                    setEntryForm((prev) => ({ ...prev, session_id: e.target.value }))
                  }
                >
                  <option value="">Select session</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name} - {session.date}
                    </option>
                  ))}
                </select>
                <input
                  style={inputStyle}
                  value={entryForm.reason}
                  onChange={(e) =>
                    setEntryForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="Reason"
                />
                <input
                  style={inputStyle}
                  value={entryForm.issued_by}
                  onChange={(e) =>
                    setEntryForm((prev) => ({ ...prev, issued_by: e.target.value }))
                  }
                  placeholder="Issued by"
                />
                <select
                  style={inputStyle}
                  value={entryForm.attendance}
                  onChange={(e) =>
                    setEntryForm((prev) => ({ ...prev, attendance: e.target.value }))
                  }
                >
                  <option value="Unmarked">Unmarked</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                </select>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={buttonStyle}
                    disabled={entrySavingId === entry.id}
                    onClick={async () => {
                      const ok = await onUpdateEntry(entry.id, entryForm);
                      if (ok) {
                        setEditingEntryId(null);
                      }
                    }}
                  >
                    {entrySavingId === entry.id ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={() => setEditingEntryId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={smallButtonStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditingEntry(entry);
                  }}
                >
                  Edit or move
                </button>
                <button
                  type="button"
                  style={{
                    ...smallButtonStyle,
                    border: "1px solid #d9a79a",
                    color: "#8b2f1b",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEntry(entry.id);
                  }}
                >
                  Delete student
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
