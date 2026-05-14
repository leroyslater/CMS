import { useEffect } from "react";

import {
  buttonStyle,
  cardStyle,
  inputStyle,
  secondaryButtonStyle,
  sectionCopyStyle,
  sectionTitleStyle,
} from "../styles/uiStyles";

export default function ClassroomRemovalAlertModal({
  open,
  form,
  setForm,
  sending,
  onClose,
  onSubmit,
  defaultTeacher,
  studentOptions,
}) {
  useEffect(() => {
    if (!open || !defaultTeacher || String(form.teacher || "").trim()) return;

    setForm((current) => ({
      ...current,
      teacher: defaultTeacher,
    }));
  }, [defaultTeacher, form.teacher, open, setForm]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(11, 24, 37, 0.48)",
        backdropFilter: "blur(6px)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...cardStyle,
          width: "100%",
          maxWidth: 620,
          marginBottom: 0,
          border: "1px solid rgba(173, 34, 34, 0.16)",
          boxShadow: "0 24px 50px rgba(113, 29, 29, 0.18)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 style={{ ...sectionTitleStyle, color: "#8a1f1f" }}>Classroom Removal Alert</h2>
        <p style={sectionCopyStyle}>
          Send an immediate alert to coordinators and admins when a student needs to be
          removed from class.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <input
            list="classroom-removal-students"
            style={inputStyle}
            placeholder="Student name"
            value={form.studentName}
            onChange={(event) =>
              setForm((current) => ({ ...current, studentName: event.target.value }))
            }
          />
          <datalist id="classroom-removal-students">
            {studentOptions.map((studentName) => (
              <option key={studentName} value={studentName} />
            ))}
          </datalist>
          <input
            style={inputStyle}
            placeholder="Class / room"
            value={form.classroom}
            onChange={(event) =>
              setForm((current) => ({ ...current, classroom: event.target.value }))
            }
          />
          <input
            style={inputStyle}
            placeholder="Teacher"
            value={form.teacher}
            onChange={(event) =>
              setForm((current) => ({ ...current, teacher: event.target.value }))
            }
          />
          <textarea
            style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
            placeholder="Reason / urgency details"
            value={form.reason}
            onChange={(event) =>
              setForm((current) => ({ ...current, reason: event.target.value }))
            }
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="submit"
              style={{
                ...buttonStyle,
                background: "linear-gradient(135deg, #d73c3c 0%, #ef5e5e 100%)",
                color: "#fff",
                boxShadow: "0 10px 22px rgba(176, 36, 36, 0.28)",
              }}
              disabled={
                sending ||
                !String(form.studentName || "").trim() ||
                !String(form.classroom || "").trim() ||
                !String(form.reason || "").trim()
              }
            >
              {sending ? "Sending..." : "Send alert"}
            </button>
            <button type="button" style={secondaryButtonStyle} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
