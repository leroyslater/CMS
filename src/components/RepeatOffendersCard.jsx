import {
  cardStyle,
  entryCardStyle,
  sectionCopyStyle,
  sectionTitleStyle,
} from "../styles/uiStyles";

export default function RepeatOffendersCard({
  repeatStudents,
  getStudentFlag,
  setSelectedStudent,
}) {
  return (
    <div style={cardStyle}>
      <h2 style={sectionTitleStyle}>Repeat Offender Flags</h2>
      <p style={sectionCopyStyle}>
        Students with multiple detentions are grouped here for quick review.
      </p>
      {repeatStudents.length === 0 ? (
        <p>No repeat students yet.</p>
      ) : (
        repeatStudents.map(([name, count]) => (
          <div
            key={name}
            style={{ ...entryCardStyle, cursor: "pointer" }}
            onClick={() => setSelectedStudent(name)}
          >
            <div style={{ fontWeight: "bold" }}>
              {name} {getStudentFlag(name) ? `(${getStudentFlag(name)})` : ""}
            </div>
            <div style={{ color: "#555" }}>{count} detention records</div>
          </div>
        ))
      )}
    </div>
  );
}
