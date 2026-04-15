import {
  buttonStyle,
  cardStyle,
  inputStyle,
  sectionCopyStyle,
  sectionTitleStyle,
} from "../styles/uiStyles";

const dropdownStyle = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  background: "rgba(255,255,255,0.98)",
  border: "1px solid #d0d1d7",
  borderRadius: 16,
  maxHeight: 220,
  overflowY: "auto",
  zIndex: 10,
  boxShadow: "0 8px 20px rgba(3,12,46,0.1)",
};

export default function AddStudentCard({
  handleAddEntry,
  newEntry,
  setNewEntry,
  sessions,
  studentSearch,
  setStudentSearch,
  studentDropdownOpen,
  setStudentDropdownOpen,
  filteredStudents,
}) {
  return (
    <div style={cardStyle}>
      <h2 style={sectionTitleStyle}>Add Student to Session</h2>
      <p style={sectionCopyStyle}>
        Search the student roster, select the target session, then record the reason.
      </p>
      <form onSubmit={handleAddEntry}>
        <select
          style={inputStyle}
          value={newEntry.sessionId}
          onChange={(e) => setNewEntry({ ...newEntry, sessionId: e.target.value })}
        >
          <option value="">Select session</option>
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.name} - {session.date}
            </option>
          ))}
        </select>

        <div style={{ position: "relative" }}>
          <input
            style={inputStyle}
            placeholder="Search student (name, code, year...)"
            value={studentSearch}
            onChange={(e) => {
              setStudentSearch(e.target.value);
              setStudentDropdownOpen(true);
            }}
            onFocus={() => setStudentDropdownOpen(true)}
          />
          {studentDropdownOpen && studentSearch ? (
            <div style={dropdownStyle}>
              {filteredStudents.length === 0 ? (
                <div style={{ padding: 10 }}>No students found</div>
              ) : (
                filteredStudents.slice(0, 10).map((student) => (
                  <div
                    key={student.id}
                    style={{
                      padding: 10,
                      cursor: "pointer",
                      borderBottom: "1px solid #e4e5eb",
                    }}
                    onClick={() => {
                      setNewEntry((prev) => ({
                        ...prev,
                        studentId: student.id,
                        studentName: `${student.first_name} ${student.last_name}`,
                        yearLevel: student.year_level,
                        homegroup: student.homegroup,
                      }));
                      setStudentSearch(
                        `${student.first_name} ${student.last_name} (${student.student_code})`
                      );
                      setStudentDropdownOpen(false);
                    }}
                  >
                    <strong>
                      {student.last_name}, {student.first_name}
                    </strong>
                    <div style={{ fontSize: 12, color: "#4b587c" }}>
                      {student.student_code} · Year {student.year_level} ·{" "}
                      {student.homegroup}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>

        <input
          style={inputStyle}
          placeholder="Reason"
          value={newEntry.reason}
          onChange={(e) => setNewEntry({ ...newEntry, reason: e.target.value })}
        />
        <input
          style={inputStyle}
          placeholder="Issued by"
          value={newEntry.issuedBy}
          onChange={(e) => setNewEntry({ ...newEntry, issuedBy: e.target.value })}
        />
        <button style={buttonStyle} type="submit">
          Add Student
        </button>
      </form>
    </div>
  );
}
