import { useState } from "react";

import {
  buttonStyle,
  cardStyle,
  entryCardStyle,
  inputStyle,
  sectionCopyStyle,
  sectionTitleStyle,
  twoColStyle,
} from "../styles/uiStyles";
import DashboardStats from "./DashboardStats";

export default function DashboardHome({
  stats,
  topChronicleStudents,
  topAttendanceStudents,
  topDetentionStudents,
  todos,
  creatingTodo,
  updatingTodoId,
  deletingTodoId,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  setSelectedStudent,
}) {
  const [todoInput, setTodoInput] = useState("");
  const [todoDueDate, setTodoDueDate] = useState("");

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

  return (
    <>
      <DashboardStats stats={stats} />

      <div style={twoColStyle}>
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
                <div style={{ fontWeight: "bold" }}>{student.name}</div>
                <div style={{ color: "#4b587c" }}>
                  {student.count} Chronicle records
                </div>
              </div>
            ))
          )}
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Attendance Watchlist</h2>
          <p style={sectionCopyStyle}>
            Students with the most recorded late arrivals this week.
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
                <div style={{ fontWeight: "bold" }}>{student.name}</div>
                <div style={{ color: "#4b587c" }}>
                  {student.count} late arrivals
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
              <div style={{ fontWeight: "bold" }}>{student.name}</div>
              <div style={{ color: "#4b587c" }}>
                {student.count} detention records
              </div>
            </div>
          ))
        )}
      </div>

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

        {todos.length === 0 ? (
          <p>No tasks yet.</p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
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
                <span
                  style={{
                    textDecoration: todo.done ? "line-through" : "none",
                    color: todo.done ? "#6c6f72" : "#030c2e",
                  }}
                >
                  {todo.text}
                </span>
              </label>
              <div style={{ minWidth: 120, textAlign: "right", color: "#4b587c", fontSize: 13 }}>
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
          ))
        )}
      </div>
    </>
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
      textColor: "#4b587c",
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
    textColor: "#4b587c",
    label: "",
  };
}
