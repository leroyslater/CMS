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
import ccMapPin from "../assets/cc-map-pin.svg";

const DETENTION_REASON_OPTIONS = [
  "Disruptive behaviour",
  "Failure to follow instruction",
  "Late to class",
  "Refusal to complete set tasks",
  "Inappropriate use of ICT",
  "Other",
];

const LATE_ACTIVITY_PROMPTS = [
  "Regulate and relate: What was happening for you before school or class, and what helped or could have helped you get ready to learn?",
  "Motivation and meaning: Why does arriving on time matter for your learning and for the learning of others?",
  "Feedback and review: Who was affected by your lateness, and what impact did it have on the class or teacher?",
  "Review and plan: What is one realistic strategy you will use next time to arrive ready to learn?",
];

const CHRONICLE_ACTIVITY_PROMPTS = [
  "Regulate and relate: What was happening for you at the time, and what did you notice about your emotions, body, or reactions?",
  "Relationships and safety: How did your behaviour affect the safety, learning, or relationships of others in the class?",
  "Feedback and review: What would a better choice have looked like in that moment?",
  "Review and repair: What is one clear strategy you will use next time to stay engaged and ready to learn?",
];

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
  onSubmitRoll,
  rollSubmitting = false,
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
  const orderedSessionEntries = [...selectedSessionEntries].sort((a, b) => {
    const yearCompare =
      Number(a.year_level || 0) - Number(b.year_level || 0) ||
      String(a.year_level || "").localeCompare(String(b.year_level || ""));

    if (yearCompare !== 0) return yearCompare;

    const homegroupCompare = String(a.homegroup || "").localeCompare(
      String(b.homegroup || "")
    );
    if (homegroupCompare !== 0) return homegroupCompare;

    return String(a.student_name || "").localeCompare(String(b.student_name || ""));
  });
  const rollReadyToSubmit =
    orderedSessionEntries.length > 0 &&
    orderedSessionEntries.every(
      (entry) => entry.attendance === "Present" || entry.attendance === "Absent"
    );

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

  function handlePrintSession() {
    if (!selectedSession) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    const studentRows = orderedSessionEntries
      .map(
        (entry) => `
          <tr>
            <td>${escapeHtml(entry.student_name || "")}</td>
            <td>${escapeHtml(entry.year_level || "")}</td>
            <td>${escapeHtml(entry.homegroup || "")}</td>
            <td class="reason-cell">${escapeHtml(entry.reason || "")}</td>
            <td>${escapeHtml(entry.attendance || "Unmarked")}</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(selectedSession.name || "Detention Roll")}</title>
          <style>
            @page {
              size: landscape;
              margin: 12mm;
            }
            body {
              font-family: "Avenir Next", "Segoe UI", sans-serif;
              padding: 32px;
              color: #17334b;
            }
            h1 {
              margin: 0 0 12px;
              font-size: 28px;
            }
            .meta {
              margin: 0 0 24px;
              color: #4b587c;
              line-height: 1.6;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #c8d8e1;
              padding: 10px 12px;
              text-align: left;
              vertical-align: top;
            }
            .reason-cell {
              max-width: 280px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            th {
              background: #def9ee;
              color: #14314b;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(selectedSession.name || "Detention Roll")}</h1>
          <div class="meta">
            <div><strong>Date:</strong> ${escapeHtml(formatDisplayDate(selectedSession.date))}</div>
            <div><strong>Time:</strong> ${escapeHtml(selectedSession.time || "-")}</div>
            <div><strong>Location:</strong> ${escapeHtml(selectedSession.location || "-")}</div>
            <div><strong>Supervisor:</strong> ${escapeHtml(selectedSession.supervisor || "-")}</div>
            <div><strong>Students:</strong> ${orderedSessionEntries.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Year</th>
                <th>Homegroup</th>
                <th>Reason</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              ${studentRows || '<tr><td colspan="5">No students assigned to this detention yet.</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function handlePrintDetentionSlips() {
    if (!selectedSession) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    const slipMarkup = orderedSessionEntries
      .map(
        (entry, index) => `
          <section class="slip ${index > 0 && index % 2 === 0 ? "page-break" : ""}">
            <div class="slip-header">
              <div class="brand-block">
                <img class="brand-mark" src="${ccMapPin}" alt="Collingwood College" />
                <div>
                  <div class="eyebrow">Collingwood College</div>
                  <h1>Detention Slip</h1>
                </div>
              </div>
              <div class="session-meta">
                <div><strong>Date:</strong> ${escapeHtml(formatDisplayDate(selectedSession.date))}</div>
                <div><strong>Time:</strong> ${escapeHtml(selectedSession.time || "-")}</div>
                <div><strong>Room:</strong> ${escapeHtml(selectedSession.location || "-")}</div>
              </div>
            </div>
            <div class="student-block">
              <div class="student-name">${escapeHtml(entry.student_name || "")}</div>
              <div class="student-meta">
                Year ${escapeHtml(entry.year_level || "-")} · ${escapeHtml(entry.homegroup || "-")}
              </div>
            </div>
            <div class="detail-row">
              <span class="detail-label">Detention</span>
              <span>${escapeHtml(selectedSession.name || "-")}</span>
            </div>
            <div class="reason-block">
              <div class="detail-label">Reason</div>
              <div class="reason-grid">
                ${renderReasonChecklist()}
              </div>
            </div>
            <div class="signature-row">
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-label">Student signature</div>
              </div>
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-label">Staff signature</div>
              </div>
            </div>
          </section>
        `
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(selectedSession.name || "Detention Slips")}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              font-family: "Avenir Next", "Segoe UI", sans-serif;
              color: #071c74;
              margin: 0;
              background: #ffffff;
            }
            .slip {
              border: 2px solid #071c74;
              border-radius: 16px;
              padding: 18px 20px;
              min-height: calc(50vh - 24px);
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              gap: 12px;
              margin-bottom: 14px;
              background: linear-gradient(180deg, #f7f9ff 0%, #ffffff 24%);
              box-shadow: inset 0 0 0 1px rgba(7, 28, 116, 0.08);
            }
            .page-break {
              break-before: page;
            }
            .slip-header {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              align-items: flex-start;
              padding-bottom: 12px;
              border-bottom: 2px solid rgba(7, 28, 116, 0.12);
            }
            .brand-block {
              display: flex;
              align-items: center;
              gap: 14px;
            }
            .brand-mark {
              width: 54px;
              height: 62px;
              object-fit: contain;
            }
            .eyebrow {
              text-transform: uppercase;
              letter-spacing: 0.16em;
              font-size: 11px;
              color: #071c74;
              font-weight: 700;
              margin-bottom: 6px;
            }
            h1 {
              margin: 0;
              font-size: 28px;
              color: #071c74;
            }
            .session-meta {
              color: #3f4f95;
              font-size: 13px;
              line-height: 1.6;
              text-align: right;
              background: rgba(7, 28, 116, 0.05);
              border: 1px solid rgba(7, 28, 116, 0.12);
              border-radius: 12px;
              padding: 10px 12px;
            }
            .student-block {
              background: #eef2ff;
              border: 1px solid rgba(7, 28, 116, 0.12);
              border-radius: 12px;
              padding: 12px 14px;
            }
            .student-name {
              font-size: 24px;
              font-weight: 800;
              margin-bottom: 4px;
              color: #071c74;
            }
            .student-meta {
              color: #3f4f95;
              font-size: 14px;
            }
            .detail-row {
              display: grid;
              grid-template-columns: 110px 1fr;
              gap: 12px;
              font-size: 15px;
              align-items: start;
            }
            .reason-block {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .reason-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 18px;
            }
            .reason-option {
              display: flex;
              align-items: flex-start;
              gap: 8px;
              font-size: 14px;
              color: #071c74;
            }
            .reason-checkbox {
              width: 14px;
              height: 14px;
              border: 1.5px solid #071c74;
              border-radius: 3px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              line-height: 1;
              margin-top: 1px;
              flex: 0 0 14px;
            }
            .reason-other-text {
              font-size: 13px;
              color: #4b587c;
              margin-top: 4px;
            }
            .detail-label {
              font-weight: 700;
              color: #3f4f95;
            }
            .signature-row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              margin-top: auto;
              padding-top: 20px;
            }
            .signature-line {
              border-bottom: 1px solid #071c74;
              height: 28px;
              margin-bottom: 6px;
            }
            .signature-label {
              font-size: 12px;
              color: #3f4f95;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${slipMarkup || "<p>No students assigned to this detention yet.</p>"}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function handlePrintActivitySheets(activityType) {
    if (!selectedSession) return;

    const config =
      activityType === "chronicle"
        ? {
            title: "Chronicle Reflection Sheet",
            subtitle: "Behaviour reflection activity",
            prompts: CHRONICLE_ACTIVITY_PROMPTS,
          }
        : {
            title: "Late Reflection Sheet",
            subtitle: "Lateness reflection activity",
            prompts: LATE_ACTIVITY_PROMPTS,
          };
    const filteredEntries = orderedSessionEntries.filter((entry) =>
      matchesActivityReason(entry.reason, activityType)
    );

    if (filteredEntries.length === 0) {
      window.alert(
        activityType === "chronicle"
          ? "No Chronicle entries were found in this detention."
          : "No Attendance/Late entries were found in this detention."
      );
      return;
    }

    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) return;

    const activityMarkup = filteredEntries
      .map((entry, index) => {
        const promptPages = [config.prompts.slice(0, 2), config.prompts.slice(2, 4)];

        return promptPages
          .map(
            (prompts, pageIndex) => `
              <section class="activity-sheet ${index > 0 || pageIndex > 0 ? "page-break" : ""}">
                ${
                  pageIndex === 0
                    ? `
                      <div class="sheet-header">
                        <div class="brand-block">
                          <img class="brand-mark" src="${ccMapPin}" alt="Collingwood College" />
                          <div>
                            <div class="eyebrow">Collingwood College</div>
                            <h1>${escapeHtml(config.title)}</h1>
                            <div class="subtitle">${escapeHtml(config.subtitle)} · Page ${pageIndex + 1} of 2</div>
                          </div>
                        </div>
                        <div class="session-meta">
                          <div><strong>Date:</strong> ${escapeHtml(formatDisplayDate(selectedSession.date))}</div>
                          <div><strong>Time:</strong> ${escapeHtml(selectedSession.time || "-")}</div>
                          <div><strong>Room:</strong> ${escapeHtml(selectedSession.location || "-")}</div>
                        </div>
                      </div>
                      <div class="student-panel">
                        <div class="student-name">${escapeHtml(entry.student_name || "")}</div>
                        <div class="student-meta">
                          Year ${escapeHtml(entry.year_level || "-")} · ${escapeHtml(entry.homegroup || "-")}
                        </div>
                      </div>
                      <div class="detail-grid">
                        <div class="detail-row">
                          <span class="detail-label">Detention</span>
                          <span>${escapeHtml(selectedSession.name || "-")}</span>
                        </div>
                        <div class="detail-row">
                          <span class="detail-label">Reason</span>
                          <span>${escapeHtml(entry.reason || "-")}</span>
                        </div>
                      </div>
                    `
                    : `
                      <div class="page-two-label">${escapeHtml(config.title)} · Page 2 of 2</div>
                    `
                }
                <div class="prompt-list">
                  ${prompts
                    .map(
                      (prompt, promptIndex) => `
                        <div class="prompt-block">
                          <div class="prompt-title">${pageIndex * 2 + promptIndex + 1}. ${escapeHtml(prompt)}</div>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </section>
            `
          )
          .join("");
      })
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(config.title)}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
            body {
              font-family: "Avenir Next", "Segoe UI", sans-serif;
              color: #071c74;
              margin: 0;
              background: #ffffff;
            }
            .activity-sheet {
              height: 273mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              gap: 14px;
              border: 2px solid #071c74;
              border-radius: 16px;
              padding: 18px 20px;
              background: linear-gradient(180deg, #f7f9ff 0%, #ffffff 22%);
              overflow: hidden;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .page-break {
              break-before: page;
              page-break-before: always;
            }
            .page-two-label {
              font-size: 14px;
              font-weight: 700;
              color: #3f4f95;
              margin-bottom: 2px;
            }
            .sheet-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              padding-bottom: 12px;
              border-bottom: 2px solid rgba(7, 28, 116, 0.12);
            }
            .brand-block {
              display: flex;
              align-items: center;
              gap: 14px;
            }
            .brand-mark {
              width: 54px;
              height: 62px;
              object-fit: contain;
            }
            .eyebrow {
              text-transform: uppercase;
              letter-spacing: 0.16em;
              font-size: 11px;
              color: #071c74;
              font-weight: 700;
              margin-bottom: 6px;
            }
            h1 {
              margin: 0;
              font-size: 28px;
              color: #071c74;
            }
            .subtitle {
              margin-top: 4px;
              color: #3f4f95;
              font-size: 14px;
            }
            .session-meta {
              color: #3f4f95;
              font-size: 13px;
              line-height: 1.6;
              text-align: right;
              background: rgba(7, 28, 116, 0.05);
              border: 1px solid rgba(7, 28, 116, 0.12);
              border-radius: 12px;
              padding: 10px 12px;
            }
            .student-panel {
              background: #eef2ff;
              border: 1px solid rgba(7, 28, 116, 0.12);
              border-radius: 12px;
              padding: 12px 14px;
            }
            .student-name {
              font-size: 24px;
              font-weight: 800;
              margin-bottom: 4px;
              color: #071c74;
            }
            .student-meta {
              color: #3f4f95;
              font-size: 14px;
            }
            .detail-grid {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            .detail-row {
              display: grid;
              grid-template-columns: 100px 1fr;
              gap: 12px;
              font-size: 15px;
            }
            .detail-label {
              font-weight: 700;
              color: #3f4f95;
            }
            .prompt-list {
              display: grid;
              grid-template-rows: 1fr 1fr;
              gap: 14px;
              margin-top: 6px;
              flex: 1;
              min-height: 0;
            }
            .prompt-block {
              break-inside: avoid;
              display: flex;
              flex-direction: column;
              min-height: 0;
            }
            .prompt-title {
              font-weight: 700;
              color: #071c74;
              font-size: 14px;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${activityMarkup || "<p>No students assigned to this detention yet.</p>"}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitleStyle}>Detention Roll</h2>
      <p style={sectionCopyStyle}>
        {isSupervisor
          ? "Review the roll and mark each student as present or absent."
          : "Review the selected detention and open any student to inspect their history."}
      </p>
      <select
        style={inputStyle}
        value={selectedSessionId}
        onChange={(e) => setSelectedSessionId(e.target.value)}
      >
        <option value="">Select detention</option>
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
                placeholder="Detention name"
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
                  {sessionSaving ? "Saving..." : "Save detention"}
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
                  Students: {selectedSessionEntries.length}
                </div>
              </div>
              {!isSupervisor ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={handlePrintSession}
                  >
                    Print roll
                  </button>
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={handlePrintDetentionSlips}
                  >
                    Print slips
                  </button>
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={() => handlePrintActivitySheets("late")}
                  >
                    Print late activity
                  </button>
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={() => handlePrintActivitySheets("chronicle")}
                  >
                    Print chronicle activity
                  </button>
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={startEditingSession}
                  >
                    Edit detention
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
                    Delete detention
                  </button>
                </div>
              ) : null}
              {isSupervisor ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={handlePrintSession}
                  >
                    Print roll
                  </button>
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={handlePrintDetentionSlips}
                  >
                    Print slips
                  </button>
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={() => handlePrintActivitySheets("late")}
                  >
                    Print late activity
                  </button>
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={() => handlePrintActivitySheets("chronicle")}
                  >
                    Print chronicle activity
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
      {orderedSessionEntries.length === 0 ? (
        <p>No students assigned to this detention yet.</p>
      ) : (
        <>
        {isSupervisor ? (
          <div
            style={{
              marginBottom: 12,
              padding: "12px 14px",
              borderRadius: 14,
              background: "#eef3f7",
              color: "#4b587c",
              fontSize: 14,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              Mark every student as present or absent, then submit the completed roll.
            </div>
            <button
              type="button"
              style={{
                ...buttonStyle,
                opacity: rollReadyToSubmit && !rollSubmitting ? 1 : 0.65,
                cursor: rollReadyToSubmit && !rollSubmitting ? "pointer" : "not-allowed",
              }}
              disabled={!rollReadyToSubmit || rollSubmitting}
              onClick={() => onSubmitRoll?.(selectedSessionId)}
            >
              {rollSubmitting ? "Submitting..." : "Submit roll"}
            </button>
          </div>
        ) : null}
        {orderedSessionEntries.map((entry) => {
          const attendanceStatus = entry.attendance || "Unmarked";
          const isPresent = attendanceStatus === "Present";
          const isAbsent = attendanceStatus === "Absent";

          return (
          <div
            key={entry.id}
            style={{
              ...entryCardStyle,
              cursor: "pointer",
              padding: 10,
              marginBottom: 8,
              border: isPresent
                ? "2px solid rgba(57, 213, 146, 0.45)"
                : isAbsent
                  ? "2px solid #e9a19a"
                  : entryCardStyle.border,
              background: isPresent
                ? "rgba(92, 231, 170, 0.12)"
                : isAbsent
                  ? "#fff2eb"
                  : entryCardStyle.background,
            }}
            onClick={() => {
              if (!isSupervisor) {
                setSelectedStudent(entry.student_name);
              }
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "baseline",
                  flexWrap: "wrap",
                  minWidth: 0,
                  flex: "1 1 320px",
                }}
              >
                <strong>{entry.student_name}</strong>
                <span style={{ color: "#4b587c", fontSize: 13 }}>
                  Year {entry.year_level || "-"} · {entry.homegroup || "-"} ·{" "}
                  {formatDetentionReasonLabel(entry.reason)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                {isSupervisor || editingEntryId === entry.id ? null : (
                  <>
                    <button
                      type="button"
                      style={{
                        ...smallButtonStyle,
                        border: "1px solid #9fb6c7",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingEntry(entry);
                      }}
                    >
                      Edit
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
                        onDeleteEntry(entry);
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
            {isSupervisor ? (
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={{ ...buttonStyle, padding: "10px 14px" }}
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
                    padding: "10px 14px",
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
              <div style={{ marginTop: 10 }}>
                <select
                  style={inputStyle}
                  value={entryForm.session_id}
                  onChange={(e) =>
                    setEntryForm((prev) => ({ ...prev, session_id: e.target.value }))
                  }
                >
                  <option value="">Select detention</option>
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
                    style={{ ...buttonStyle, padding: "10px 14px" }}
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
            ) : null}
          </div>
          );
        })}
        </>
      )}
    </div>
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function renderReasonChecklist() {
  return DETENTION_REASON_OPTIONS.map((option) => {
    return `
      <div class="reason-option">
        <span class="reason-checkbox"></span>
        <span>
          ${escapeHtml(option)}
        </span>
      </div>
    `;
  }).join("");
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

function matchesActivityReason(reason, activityType) {
  const normalizedReason = String(reason || "").trim().toLowerCase();

  if (!normalizedReason) {
    return false;
  }

  if (activityType === "chronicle") {
    return normalizedReason.includes("chronicle");
  }

  return (
    normalizedReason.includes("attendance") || normalizedReason.includes("late")
  );
}
