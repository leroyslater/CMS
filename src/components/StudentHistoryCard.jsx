import {
  cardStyle,
  entryCardStyle,
  sectionCopyStyle,
  sectionTitleStyle,
} from "../styles/uiStyles";

export default function StudentHistoryCard({
  selectedStudent,
  getStudentHistory,
}) {
  if (!selectedStudent) {
    return null;
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitleStyle}>Student History</h2>
      <p style={sectionCopyStyle}>
        A quick timeline of detention records for the selected student.
      </p>
      <p>
        <strong>{selectedStudent}</strong>
      </p>
      {getStudentHistory(selectedStudent).map((entry) => (
        <div key={entry.id} style={entryCardStyle}>
          <div style={{ fontWeight: "bold" }}>
            {entry.linkedSession?.name || "Session"}
          </div>
          <div style={{ color: "#555" }}>
            {entry.linkedSession?.date || "-"} · {entry.linkedSession?.time || "-"}
          </div>
          <div>
            <strong>Reason:</strong> {entry.reason}
          </div>
          <div>Attendance: {entry.attendance || "Unmarked"}</div>
        </div>
      ))}
    </div>
  );
}
