import {
  cardStyle,
  entryCardStyle,
  sectionCopyStyle,
  sectionTitleStyle,
} from "../styles/uiStyles";

export default function UpcomingSessionAssignmentsCard({
  upcomingSession,
  assignedStudents,
  setSelectedStudent,
}) {
  return (
    <div style={cardStyle}>
      <h2 style={sectionTitleStyle}>Upcoming Detention</h2>
      <p style={sectionCopyStyle}>
        {upcomingSession
          ? `Students already assigned to ${upcomingSession.name} on ${upcomingSession.date}.`
          : "No upcoming detention is scheduled yet."}
      </p>
      {!upcomingSession ? (
        <p>Create a future detention to see assigned students here.</p>
      ) : assignedStudents.length === 0 ? (
        <p>No students assigned to the upcoming detention yet.</p>
      ) : (
        assignedStudents.map((student) => (
          <div
            key={`${upcomingSession.id}-${student.name}-${student.reason}`}
            style={{ ...entryCardStyle, cursor: "pointer" }}
            onClick={() => setSelectedStudent(student.name)}
          >
            <div style={{ fontWeight: "bold" }}>{student.name}</div>
            <div style={{ color: "#555" }}>{student.reason || "Assigned detention"}</div>
          </div>
        ))
      )}
    </div>
  );
}
