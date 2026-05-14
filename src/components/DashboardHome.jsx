import { useEffect, useState } from "react";

import {
  brandPalette,
  buttonStyle,
  cardStyle,
  entryCardStyle,
  inputStyle,
  mobileNavBarStyle,
  mobileNavButtonStyle,
  navButtonActiveStyle,
  navButtonStyle,
  sectionCopyStyle,
  sectionTitleStyle,
  twoColStyle,
} from "../styles/uiStyles";
import DashboardStats from "./DashboardStats";
import UpcomingSessionAssignmentsCard from "./UpcomingSessionAssignmentsCard";

export default function DashboardHome({
  stats,
  showYearFilters,
  teacherView = false,
  availableYearLevels,
  selectedYearLevels,
  onToggleYearLevel,
  onClearYearLevels,
  topChronicleStudents,
  minorBehaviourTeachers,
  chronicleTwoPlusThisWeek,
  topAttendanceStudents,
  attendanceTwoPlusThisWeek,
  lowAttendanceStudents,
  topDetentionStudents,
  missedDetentionStudents,
  upcomingSession,
  upcomingSessionAssignments,
  todos,
  studentOptions,
  creatingTodo,
  updatingTodoId,
  deletingTodoId,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  setSelectedStudent,
}) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  const [todoInput, setTodoInput] = useState("");
  const [todoDueDate, setTodoDueDate] = useState("");
  const [followUpStudent, setFollowUpStudent] = useState("");
  const [followUpDescription, setFollowUpDescription] = useState("");
  const [followUpDueDate, setFollowUpDueDate] = useState("");
  const [expandedChronicleKey, setExpandedChronicleKey] = useState("");
  const [expandedAttendanceKey, setExpandedAttendanceKey] = useState("");

  const generalTodos = todos.filter((todo) => !todo.studentName);
  const studentFollowUps = todos.filter((todo) => todo.studentName);
  const mobileTwoColStyle = isMobile
    ? { ...twoColStyle, gridTemplateColumns: "1fr" }
    : twoColStyle;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    function updateIsMobile() {
      setIsMobile(window.innerWidth <= 768);
    }

    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  async function addTodo(event) {
    event.preventDefault();
    const value = todoInput.trim();
    if (!value) return;

    const ok = await onAddTodo(value, todoDueDate || null);
    if (ok) {
      setTodoInput("");
      setTodoDueDate("");
    }
  }

  async function addStudentFollowUp(event) {
    event.preventDefault();
    const studentName = followUpStudent.trim();
    const description = followUpDescription.trim();
    if (!studentName || !description) return;

    const ok = await onAddTodo(description, followUpDueDate || null, studentName);
    if (ok) {
      setFollowUpStudent("");
      setFollowUpDescription("");
      setFollowUpDueDate("");
    }
  }

  function toggleDashboardChronicleStudent(student) {
    setSelectedStudent(student.name);
    setExpandedChronicleKey((current) => (current === student.key ? "" : student.key));
  }

  function toggleDashboardAttendanceStudent(student) {
    setSelectedStudent(student.name);
    setExpandedAttendanceKey((current) => (current === student.key ? "" : student.key));
  }

  return (
    <>
      {isMobile || teacherView ? null : <DashboardStats stats={stats} />}

      {showYearFilters ? (
        <div style={mobileTwoColStyle}>
          <div style={{ ...cardStyle, maxWidth: "none", gridColumn: "1 / -1" }}>
            <div
              style={
                isMobile
                  ? mobileNavBarStyle
                  : { display: "flex", gap: 10, flexWrap: "wrap" }
              }
            >
              <button
                type="button"
                style={{
                  ...(isMobile ? mobileNavButtonStyle : navButtonStyle),
                  ...(selectedYearLevels.length === 0 ? navButtonActiveStyle : {}),
                }}
                onClick={onClearYearLevels}
              >
                {isMobile ? "All" : "All years"}
              </button>
              {availableYearLevels.map((yearLevel) => {
                const selected = selectedYearLevels.includes(yearLevel);

                return (
                  <button
                    key={yearLevel}
                    type="button"
                    style={{
                      ...(isMobile ? mobileNavButtonStyle : navButtonStyle),
                      ...(selected ? navButtonActiveStyle : {}),
                    }}
                    onClick={() => onToggleYearLevel(yearLevel)}
                  >
                    {isMobile ? yearLevel : `Year ${yearLevel}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div
        style={
          teacherView
            ? { ...mobileTwoColStyle, gridTemplateColumns: "1fr" }
            : mobileTwoColStyle
        }
      >
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Chronicle 2+ This Week</h2>
          {isMobile ? null : (
            <p style={sectionCopyStyle}>
            Students with two or more Chronicle records in the current tracked week.
            </p>
          )}
          {chronicleTwoPlusThisWeek.length === 0 ? (
            <p>No students have reached two Chronicle records this week yet.</p>
          ) : (
            chronicleTwoPlusThisWeek.map((student) => (
              <div
                key={student.key}
                style={{
                  ...entryCardStyle,
                  cursor: "pointer",
                  border:
                    student.count >= 3
                      ? "2px solid #dc2626"
                      : entryCardStyle.border,
                  background:
                    student.count >= 3 ? "#fef2f2" : entryCardStyle.background,
                }}
                onClick={() => toggleDashboardChronicleStudent(student)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "baseline",
                      flexWrap: "wrap",
                      minWidth: 0,
                      flex: "1 1 260px",
                    }}
                  >
                    <strong>{student.name}</strong>
                    <span style={{ color: brandPalette.muted, fontSize: 14 }}>
                      {student.homegroup || "-"} · {student.count}
                      {isMobile ? "" : " Chronicle records"}
                    </span>
                  </div>
                  {student.count >= 3 ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#b91c1c",
                        background: "#fee2e2",
                        border: "1px solid #fca5a5",
                      }}
                    >
                      3+ threshold
                    </span>
                  ) : null}
                </div>
                {expandedChronicleKey === student.key ? (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontWeight: "bold", marginBottom: 8 }}>
                      Chronicle Incident Detail
                    </div>
                    {student.rows.map((row, index) => (
                      <div
                        key={`${student.key}-${index}`}
                        style={{ ...entryCardStyle, marginTop: 8 }}
                      >
                        <div style={{ fontWeight: "bold" }}>{row.occurredText}</div>
                        <div>
                          <strong>Details:</strong> {row.details || "No details"}
                        </div>
                        <div>
                          <strong>Chronicle Type:</strong> {row.chronicleType || "Unknown"}
                        </div>
                        <div>
                          <strong>Original Publisher:</strong> {row.originalPublisher || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        {teacherView ? null : (
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Late 2+ This Week</h2>
            {isMobile ? null : (
              <p style={sectionCopyStyle}>
              Students with two or more late incidents in the current tracked week.
              </p>
            )}
            {attendanceTwoPlusThisWeek.length === 0 ? (
              <p>No students have reached two late incidents this week yet.</p>
            ) : (
              attendanceTwoPlusThisWeek.map((student) => (
                <div
                  key={student.key}
                  style={{
                    ...entryCardStyle,
                    cursor: "pointer",
                    border:
                      student.count >= 3
                        ? "2px solid #dc2626"
                        : entryCardStyle.border,
                    background:
                      student.count >= 3 ? "#fef2f2" : entryCardStyle.background,
                  }}
                  onClick={() => toggleDashboardAttendanceStudent(student)}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "baseline",
                        flexWrap: "wrap",
                        minWidth: 0,
                        flex: "1 1 260px",
                      }}
                    >
                      <strong>{student.name}</strong>
                      <span style={{ color: brandPalette.muted, fontSize: 14 }}>
                        {student.homegroup || "-"} · {student.count}
                        {isMobile ? "" : " late incidents"}
                      </span>
                    </div>
                    {student.count >= 3 ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#b91c1c",
                          background: "#fee2e2",
                          border: "1px solid #fca5a5",
                        }}
                      >
                        3+ threshold
                      </span>
                    ) : null}
                  </div>
                  {expandedAttendanceKey === student.key ? (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontWeight: "bold", marginBottom: 8 }}>
                        Attendance Incident Detail
                      </div>
                      {student.rows.map((row, index) => (
                        <div
                          key={`${student.key}-${index}`}
                          style={{ ...entryCardStyle, marginTop: 8 }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <div style={{ fontWeight: "bold" }}>
                              {row.startText} · {row.period || "No period"}
                            </div>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "6px 10px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                                color:
                                  row.attendanceType === "School late"
                                    ? brandPalette.navy
                                    : "#8a341f",
                                background:
                                  row.attendanceType === "School late"
                                    ? brandPalette.mintSoft
                                    : "#fff2eb",
                                border:
                                  row.attendanceType === "School late"
                                    ? "1px solid rgba(92,231,170,0.45)"
                                    : "1px solid #f1c7b1",
                              }}
                            >
                              {row.attendanceType}
                            </span>
                          </div>
                          <div>
                            <strong>Class:</strong> {row.activityName || "-"}
                          </div>
                          <div>
                            <strong>Arrival:</strong>{" "}
                            {row.attendanceType === "Class late"
                              ? "Not recorded"
                              : row.arrivalText || "-"}
                          </div>
                          <div>
                            <strong>Minutes late:</strong> {row.minutesLate}
                          </div>
                          <div>
                            <strong>Type:</strong> {row.attendanceDescription || "-"}
                          </div>
                          <div>
                            <strong>Teacher:</strong> {row.teacher || "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {teacherView ? null : (
        <>

      <div style={mobileTwoColStyle}>
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Missed Detention</h2>
          {isMobile ? null : (
            <p style={sectionCopyStyle}>
              Students who have been marked absent on the detention session roll.
            </p>
          )}
          {missedDetentionStudents.length === 0 ? (
            <p>No students have been marked absent from detention yet.</p>
          ) : (
            missedDetentionStudents.map((student) => (
              <div
                key={`missed-detention-${student.name}`}
                style={{ ...entryCardStyle, cursor: "pointer" }}
                onClick={() => setSelectedStudent(student.name)}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "baseline",
                    flexWrap: "wrap",
                  }}
                >
                  <strong>{student.name}</strong>
                  <span style={{ color: brandPalette.muted, fontSize: 14 }}>
                    {student.homegroup || "-"}
                    {!isMobile && student.yearLevel ? ` · Year ${student.yearLevel}` : ""}
                    {" · "}
                    {student.count} missed detention{student.count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <UpcomingSessionAssignmentsCard
          upcomingSession={upcomingSession}
          assignedStudents={upcomingSessionAssignments}
          setSelectedStudent={setSelectedStudent}
        />
      </div>

      <div style={mobileTwoColStyle}>
        {isMobile ? null : (
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Chronicle Watchlist</h2>
            <p style={sectionCopyStyle}>
              Students with the most Chronicle records across the imported data.
            </p>
            {topChronicleStudents.length === 0 ? (
              <p>No Chronicle records loaded yet.</p>
            ) : (
              topChronicleStudents.map((student) => (
                <div
                  key={`chronicle-${student.name}`}
                  style={{ ...entryCardStyle, cursor: "pointer" }}
                  onClick={() => setSelectedStudent(student.name)}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "baseline",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong>{student.name}</strong>
                    <span style={{ color: brandPalette.muted, fontSize: 14 }}>
                      {student.homegroup || "-"} · {student.count} Chronicle records
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {isMobile ? null : (
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Late Watchlist</h2>
            <p style={sectionCopyStyle}>
              Students with the most recorded late arrivals this year.
            </p>
            {topAttendanceStudents.length === 0 ? (
              <p>No attendance records loaded yet.</p>
            ) : (
              topAttendanceStudents.map((student) => (
                <div
                  key={`attendance-${student.name}`}
                  style={{ ...entryCardStyle, cursor: "pointer" }}
                  onClick={() => setSelectedStudent(student.name)}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "baseline",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong>{student.name}</strong>
                    <span style={{ color: brandPalette.muted, fontSize: 14 }}>
                      {student.homegroup || "-"} · {student.count} late arrivals
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div style={mobileTwoColStyle}>
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Attendance Percentage Watchlist</h2>
          {isMobile ? null : (
            <p style={sectionCopyStyle}>
              Students ordered by lowest year-to-date attendance percentage, based on full-day `Unexplained / NU` absences synced from Compass.
            </p>
          )}
          {lowAttendanceStudents.length === 0 ? (
            <p>No students with synced full-day `Unexplained / NU` absences are loaded yet.</p>
          ) : (
            lowAttendanceStudents.map((student) => (
              <div
                key={`low-attendance-${student.studentCode || student.name}`}
                style={{
                  ...entryCardStyle,
                  cursor: "pointer",
                  border:
                    student.percentage < 80
                      ? "2px solid #dc2626"
                      : student.percentage < 85
                        ? "2px solid #f59e0b"
                        : entryCardStyle.border,
                  background:
                    student.percentage < 80
                      ? "#fef2f2"
                      : student.percentage < 85
                        ? "#fff7ed"
                        : entryCardStyle.background,
                }}
                onClick={() => setSelectedStudent(student.name)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "baseline",
                      flexWrap: "wrap",
                      minWidth: 0,
                      flex: "1 1 260px",
                    }}
                  >
                    <strong>{student.name}</strong>
                    <span style={{ color: brandPalette.muted, fontSize: 14 }}>
                      {student.homegroup || "-"} · {student.absentDayCount} day
                      {student.absentDayCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 800,
                      color:
                        student.percentage < 80
                          ? "#b91c1c"
                          : student.percentage < 85
                            ? "#9a3412"
                            : brandPalette.navy,
                      background:
                        student.percentage < 80
                          ? "#fee2e2"
                          : student.percentage < 85
                            ? "#ffedd5"
                            : brandPalette.mintSoft,
                      border:
                        student.percentage < 80
                          ? "1px solid #fca5a5"
                          : student.percentage < 85
                            ? "1px solid #fdba74"
                            : "1px solid rgba(92,231,170,0.45)",
                    }}
                  >
                    {student.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {isMobile ? null : (
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Minor Behaviour Teachers</h2>
            <p style={sectionCopyStyle}>
              Teachers issuing the most `Minor Behaviour` Chronicle records.
            </p>
            {minorBehaviourTeachers.length === 0 ? (
              <p>No minor behaviour Chronicle records loaded yet.</p>
            ) : (
              minorBehaviourTeachers.map((teacher) => (
                <div
                  key={`minor-behaviour-teacher-${teacher.name}`}
                  style={entryCardStyle}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "baseline",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong>{teacher.name}</strong>
                    <span style={{ color: brandPalette.muted, fontSize: 14 }}>
                      {teacher.count} minor behaviour chronicles
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {isMobile ? null : (
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Detention Watchlist</h2>
            <p style={sectionCopyStyle}>
              Students with the highest number of detention entries.
            </p>
            {topDetentionStudents.length === 0 ? (
              <p>No detention records loaded yet.</p>
            ) : (
              topDetentionStudents.map((student) => (
                <div
                  key={`detention-${student.name}`}
                  style={{ ...entryCardStyle, cursor: "pointer" }}
                  onClick={() => setSelectedStudent(student.name)}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "baseline",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong>{student.name}</strong>
                    <span style={{ color: brandPalette.muted, fontSize: 14 }}>
                      {student.homegroup || "-"} · {student.count} detention records
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {isMobile ? null : (
        <div style={mobileTwoColStyle}>
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>To Do</h2>
            <p style={sectionCopyStyle}>
              Keep a short running list of follow-ups for the day.
            </p>
            <form
              onSubmit={addTodo}
              style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}
            >
              <input
                style={{ ...inputStyle, flex: "1 1 320px", marginBottom: 0 }}
                placeholder="Add a task"
                value={todoInput}
                onChange={(event) => setTodoInput(event.target.value)}
              />
              <input
                style={{ ...inputStyle, flex: "0 0 180px", marginBottom: 0 }}
                type="date"
                value={todoDueDate}
                onChange={(event) => setTodoDueDate(event.target.value)}
              />
              <button type="submit" style={buttonStyle}>
                {creatingTodo ? "Adding..." : "Add task"}
              </button>
            </form>

            {generalTodos.length === 0 ? (
              <p>No tasks yet.</p>
            ) : (
              generalTodos.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  updatingTodoId={updatingTodoId}
                  deletingTodoId={deletingTodoId}
                  onToggleTodo={onToggleTodo}
                  onDeleteTodo={onDeleteTodo}
                />
              ))
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Student Follow Up</h2>
            <p style={sectionCopyStyle}>
              Track a student, a short description, and the due date for the follow-up.
            </p>
            <form
              onSubmit={addStudentFollowUp}
              style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}
            >
              <input
                list="dashboard-student-options"
                style={{ ...inputStyle, flex: "1 1 260px", marginBottom: 0 }}
                placeholder="Student name"
                value={followUpStudent}
                onChange={(event) => setFollowUpStudent(event.target.value)}
              />
              <input
                style={{ ...inputStyle, flex: "2 1 320px", marginBottom: 0 }}
                placeholder="Description"
                value={followUpDescription}
                onChange={(event) => setFollowUpDescription(event.target.value)}
              />
              <input
                style={{ ...inputStyle, flex: "0 0 180px", marginBottom: 0 }}
                type="date"
                value={followUpDueDate}
                onChange={(event) => setFollowUpDueDate(event.target.value)}
              />
              <button type="submit" style={buttonStyle}>
                {creatingTodo ? "Adding..." : "Add follow-up"}
              </button>
            </form>
            <datalist id="dashboard-student-options">
              {studentOptions.map((studentName) => (
                <option key={studentName} value={studentName} />
              ))}
            </datalist>

            {studentFollowUps.length === 0 ? (
              <p>No student follow-ups yet.</p>
            ) : (
              studentFollowUps.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  updatingTodoId={updatingTodoId}
                  deletingTodoId={deletingTodoId}
                  onToggleTodo={onToggleTodo}
                  onDeleteTodo={onDeleteTodo}
                  showStudentName
                />
              ))
            )}
          </div>
        </div>
      )}
        </>
      )}
    </>
  );
}

function TodoRow({
  todo,
  updatingTodoId,
  deletingTodoId,
  onToggleTodo,
  onDeleteTodo,
  showStudentName = false,
}) {
  return (
    <div
      style={{
        ...entryCardStyle,
        border: getTodoUrgencyStyles(todo).border,
        background: getTodoUrgencyStyles(todo).background,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flex: 1,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={todo.done}
          disabled={updatingTodoId === todo.id}
          onChange={() => onToggleTodo(todo.id, todo.done)}
        />
        <div>
          {showStudentName && todo.studentName ? (
            <div style={{ fontWeight: 700, color: brandPalette.text, marginBottom: 4 }}>
              {todo.studentName}
            </div>
          ) : null}
          <div
            style={{
              textDecoration: todo.done ? "line-through" : "none",
              color: todo.done ? "#6c6f72" : brandPalette.text,
            }}
          >
            {todo.text}
          </div>
        </div>
      </label>
      <div
        style={{ minWidth: 120, textAlign: "right", color: brandPalette.muted, fontSize: 13 }}
      >
        {todo.dueDate ? (
          <div style={{ color: getTodoUrgencyStyles(todo).textColor }}>
            Due {formatDueDate(todo.dueDate)}
          </div>
        ) : (
          <div>No due date</div>
        )}
        {getTodoUrgencyStyles(todo).label ? (
          <div
            style={{
              color: getTodoUrgencyStyles(todo).textColor,
              fontWeight: 700,
            }}
          >
            {getTodoUrgencyStyles(todo).label}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        style={{
          border: "1px solid #f1c7b1",
          background: "#fff2eb",
          color: "#8a341f",
          borderRadius: 999,
          padding: "8px 12px",
          cursor: "pointer",
          fontWeight: 700,
        }}
        disabled={deletingTodoId === todo.id}
        onClick={() => onDeleteTodo(todo.id)}
      >
        {deletingTodoId === todo.id ? "Removing..." : "Remove"}
      </button>
    </div>
  );
}

function formatDueDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getTodoUrgencyStyles(todo) {
  if (todo.done || !todo.dueDate) {
    return {
      border: entryCardStyle.border,
      background: entryCardStyle.background,
      textColor: brandPalette.muted,
      label: "",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${todo.dueDate}T00:00:00`);
  const dayDiff = Math.round((dueDate - today) / 86400000);

  if (dayDiff < 0) {
    return {
      border: "1px solid #dc2626",
      background: "#fef2f2",
      textColor: "#b91c1c",
      label: "Overdue",
    };
  }

  if (dayDiff === 0) {
    return {
      border: "1px solid #d97706",
      background: "#fff7ed",
      textColor: "#b45309",
      label: "Due today",
    };
  }

  if (dayDiff === 1) {
    return {
      border: "1px solid #eab308",
      background: "#fefce8",
      textColor: "#a16207",
      label: "Due tomorrow",
    };
  }

  return {
    border: entryCardStyle.border,
    background: entryCardStyle.background,
    textColor: brandPalette.muted,
    label: "",
  };
}
