import { useEffect, useEffectEvent, useMemo, useState } from "react";
import AddStudentCard from "./components/AddStudentCard";
import AttendanceImportCard from "./components/AttendanceImportCard";
import AppHeader from "./components/AppHeader";
import AuthScreen from "./components/AuthScreen";
import ChronicleImportCard from "./components/ChronicleImportCard";
import ConfigScreen from "./components/ConfigScreen";
import CreateSessionCard from "./components/CreateSessionCard";
import DashboardHome from "./components/DashboardHome";
import DashboardStats from "./components/DashboardStats";
import RepeatOffendersCard from "./components/RepeatOffendersCard";
import SessionRollCard from "./components/SessionRollCard";
import StudentHistoryCard from "./components/StudentHistoryCard";
import StudentUploadCard from "./components/StudentUploadCard";
import { useAuth } from "./hooks/useAuth";
import { useDetentionData } from "./hooks/useDetentionData";
import { fetchTableRows, upsertTableRows } from "./lib/supabaseRest";
import { supabase } from "./lib/supabaseClient";
import {
  navBarStyle,
  navButtonActiveStyle,
  navButtonStyle,
  pageStyle,
  statusErrorStyle,
  statusSuccessStyle,
  twoColStyle,
} from "./styles/uiStyles";

const todayString = new Date().toISOString().slice(0, 10);

export default function App() {
  const {
    authSession,
    profile,
    booting,
    authError,
    setAuthError,
    handleLogout,
  } = useAuth();
  const {
    students,
    sessions,
    entries,
    selectedSessionId,
    setSelectedSessionId,
    chronicleSessionId,
    setChronicleSessionId,
    dataError,
    setDataError,
    loadData,
    prependSession,
    replaceSession,
    removeSession,
    prependEntry,
    replaceEntry,
    removeEntry,
    resetNewSession,
    resetNewEntry,
  } = useDetentionData(authSession, todayString);

  const [chronicleRows, setChronicleRows] = useState([]);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [selectedChronicleKeys, setSelectedChronicleKeys] = useState([]);
  const [selectedChronicleKey, setSelectedChronicleKey] = useState("");
  const [chronicleSearch, setChronicleSearch] = useState("");
  const [chronicleYearFilter, setChronicleYearFilter] = useState("");
  const [chronicleHomegroupFilter, setChronicleHomegroupFilter] = useState("");
  const [chronicleOnly3Plus, setChronicleOnly3Plus] = useState(false);
  const [selectedAttendanceKeys, setSelectedAttendanceKeys] = useState([]);
  const [selectedAttendanceKey, setSelectedAttendanceKey] = useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceYearFilter, setAttendanceYearFilter] = useState("");
  const [attendanceHomegroupFilter, setAttendanceHomegroupFilter] = useState("");
  const [attendanceOnly3Plus, setAttendanceOnly3Plus] = useState(false);
  const [attendanceSessionId, setAttendanceSessionId] = useState("");

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("supervisor");

  const [newSession, setNewSession] = useState(resetNewSession);

  const [newEntry, setNewEntry] = useState(() => resetNewEntry());

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [attendanceUpdatingId, setAttendanceUpdatingId] = useState(null);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [entrySavingId, setEntrySavingId] = useState(null);
  const [todos, setTodos] = useState([]);
  const [creatingTodo, setCreatingTodo] = useState(false);
  const [updatingTodoId, setUpdatingTodoId] = useState(null);
  const [deletingTodoId, setDeletingTodoId] = useState(null);
  const [message, setMessage] = useState("");
  const [activePage, setActivePage] = useState("dashboard");
  const error = authError || dataError;
  const currentEntry = newEntry.sessionId
    ? newEntry
    : { ...newEntry, sessionId: selectedSessionId };
  const isSupervisor = (profile?.role || "coordinator") === "supervisor";
  const pages = useMemo(
    () =>
      isSupervisor
        ? [{ id: "sessions", label: "Sessions" }]
        : [
            { id: "dashboard", label: "Dashboard" },
            { id: "sessions", label: "Sessions" },
            { id: "chronicle", label: "Chronicle" },
            { id: "attendance", label: "Attendance" },
            { id: "students", label: "Student Upload" },
          ],
    [isSupervisor]
  );

  useEffect(() => {
    if (!pages.some((page) => page.id === activePage)) {
      setActivePage(pages[0].id);
    }
  }, [activePage, pages]);

  function clearError() {
    setAuthError("");
    setDataError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
            },
          },
        });

        if (error) {
          setAuthError(error.message);
          return;
        }

        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email,
            full_name: fullName,
            role,
          });
        }

        setMessage("Account created.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      setMessage("Logged in.");
    } catch (err) {
      setAuthError(err.message || "Authentication failed.");
    }
  }

  async function handleCreateSession(e) {
    e.preventDefault();
    clearError();
    setMessage("");

    const { data, error } = await supabase
      .from("sessions")
      .insert([newSession])
      .select();

    if (error) {
      setDataError(error.message);
      return;
    }

    if (data?.[0]) {
      prependSession(data[0]);
      setNewEntry((prev) => ({ ...prev, sessionId: data[0].id }));
      setMessage("Session created.");
    }

    setNewSession(resetNewSession());
  }

  async function handleAddEntry(e) {
    e.preventDefault();
    clearError();
    setMessage("");

    const selectedStudentRecord = students.find(
      (student) => student.id === currentEntry.studentId
    );

    if (
      !currentEntry.sessionId ||
      !selectedStudentRecord ||
      !currentEntry.reason ||
      !currentEntry.issuedBy
    ) {
      setDataError(
        "Select a session, choose a student, add a reason, and enter who issued the detention."
      );
      return;
    }

    const payload = {
      session_id: currentEntry.sessionId,
      student_name: `${selectedStudentRecord.first_name} ${selectedStudentRecord.last_name}`,
      year_level: selectedStudentRecord.year_level,
      homegroup: selectedStudentRecord.homegroup,
      reason: currentEntry.reason,
      issued_by: currentEntry.issuedBy,
      attendance: "Unmarked",
    };

    const { data, error } = await supabase
      .from("entries")
      .insert([payload])
      .select();

    if (error) {
      setDataError(error.message);
      return;
    }

    if (data?.[0]) {
      prependEntry(data[0]);
      setSelectedStudent(payload.student_name);
      setMessage("Student added.");
    }

    setNewEntry(resetNewEntry(currentEntry.sessionId));
    setStudentSearch("");
    setStudentDropdownOpen(false);
  }

  async function handleStudentUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    clearError();
    setMessage("");

    try {
      const text = await file.text();
      const rows = splitCsvRecords(text);

      if (rows.length < 2) {
        setDataError(
          "CSV file must include a header row and at least one student row."
        );
        return;
      }

      const headers = splitCsvRow(rows[0]).map((header) =>
        normalizeCsvHeader(header).toLowerCase()
      );
      const requiredHeaders = [
        "sussi id",
        "first name",
        "last name",
        "form group",
      ];
      const missingHeaders = requiredHeaders.filter(
        (header) => !headers.includes(header)
      );

      if (missingHeaders.length > 0) {
        setDataError(`Missing required columns: ${missingHeaders.join(", ")}`);
        return;
      }

      const studentPayload = rows
        .slice(1)
        .map((row) => {
          const values = splitCsvRow(row);
          const record = {};
          headers.forEach((header, index) => {
            record[header] = values[index] || "";
          });
          const homegroup = record["form group"] || "";
          return {
            student_code: record["sussi id"],
            first_name: record["first name"],
            last_name: record["last name"],
            year_level: extractYearLevelFromHomegroup(homegroup),
            homegroup,
          };
        })
        .filter(
          (student) =>
            student.student_code && student.first_name && student.last_name
        );

      if (studentPayload.length === 0) {
        setDataError("No valid student rows found in the CSV file.");
        return;
      }

      const accessToken = authSession?.access_token;
      if (!accessToken) {
        setDataError("You need to be signed in before importing students.");
        return;
      }

      let savedRows;
      try {
        savedRows = await upsertTableRows(
          "students",
          studentPayload,
          accessToken,
          "student_code"
        );
      } catch (err) {
        setDataError(err.message || "Failed to upload students.");
        return;
      }

      const refreshed = await loadData();
      if (refreshed.firstSessionId) {
        setNewEntry((prev) => ({
          ...prev,
          sessionId: prev.sessionId || refreshed.firstSessionId,
        }));
      }
      setMessage(
        `${savedRows?.length || studentPayload.length} students uploaded successfully.`
      );
    } catch (err) {
      setDataError(err.message || "Failed to upload students.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleUpdateAttendance(entryId, attendance) {
    clearError();
    setMessage("");
    setAttendanceUpdatingId(entryId);

    try {
      const { error } = await supabase
        .from("entries")
        .update({ attendance })
        .eq("id", entryId);

      if (error) {
        setDataError(error.message);
        return;
      }

      replaceEntry(entryId, { attendance });
      setMessage(`Attendance marked as ${attendance.toLowerCase()}.`);
    } finally {
      setAttendanceUpdatingId(null);
    }
  }

  async function handleUpdateSession(sessionId, updates) {
    clearError();
    setMessage("");
    setSessionSaving(true);

    try {
      const { error } = await supabase
        .from("sessions")
        .update(updates)
        .eq("id", sessionId);

      if (error) {
        setDataError(error.message);
        return false;
      }

      replaceSession(sessionId, updates);
      setMessage("Session updated.");
      return true;
    } finally {
      setSessionSaving(false);
    }
  }

  async function handleDeleteSession(sessionId) {
    const confirmed = window.confirm(
      "Delete this session and all students assigned to it?"
    );
    if (!confirmed) return;

    clearError();
    setMessage("");
    setSessionSaving(true);

    try {
      const { error: entriesError } = await supabase
        .from("entries")
        .delete()
        .eq("session_id", sessionId);

      if (entriesError) {
        setDataError(entriesError.message);
        return;
      }

      const { error: sessionError } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId);

      if (sessionError) {
        setDataError(sessionError.message);
        return;
      }

      removeSession(sessionId);
      const toRemove = entries.filter((entry) => entry.session_id === sessionId);
      toRemove.forEach((entry) => removeEntry(entry.id));
      setMessage("Session deleted.");
    } finally {
      setSessionSaving(false);
    }
  }

  async function handleUpdateEntry(entryId, updates) {
    clearError();
    setMessage("");
    setEntrySavingId(entryId);

    try {
      const { error } = await supabase
        .from("entries")
        .update(updates)
        .eq("id", entryId);

      if (error) {
        setDataError(error.message);
        return false;
      }

      replaceEntry(entryId, updates);
      setMessage("Student updated in session roll.");
      return true;
    } finally {
      setEntrySavingId(null);
    }
  }

  async function handleDeleteEntry(entryId) {
    const confirmed = window.confirm(
      "Remove this student from the selected session?"
    );
    if (!confirmed) return;

    clearError();
    setMessage("");
    setEntrySavingId(entryId);

    try {
      const { error } = await supabase.from("entries").delete().eq("id", entryId);

      if (error) {
        setDataError(error.message);
        return;
      }

      removeEntry(entryId);
      setMessage("Student removed from session roll.");
    } finally {
      setEntrySavingId(null);
    }
  }

  async function handleAddTodo(taskText, dueDate) {
    clearError();
    setMessage("");
    setCreatingTodo(true);

    try {
      const { data, error } = await supabase
        .from("todo_items")
        .insert([{ task_text: taskText, is_done: false, due_date: dueDate }])
        .select()
        .single();

      if (error) {
        setDataError(error.message);
        return false;
      }

      if (data) {
        setTodos((prev) => [data, ...prev]);
        setMessage("Task added.");
      }

      return true;
    } finally {
      setCreatingTodo(false);
    }
  }

  async function handleToggleTodo(todoId, isDone) {
    clearError();
    setMessage("");
    setUpdatingTodoId(todoId);

    try {
      const { error } = await supabase
        .from("todo_items")
        .update({ is_done: !isDone })
        .eq("id", todoId);

      if (error) {
        setDataError(error.message);
        return;
      }

      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === todoId ? { ...todo, is_done: !isDone } : todo
        )
      );
      setMessage("Task updated.");
    } finally {
      setUpdatingTodoId(null);
    }
  }

  async function handleDeleteTodo(todoId) {
    clearError();
    setMessage("");
    setDeletingTodoId(todoId);

    try {
      const { error } = await supabase.from("todo_items").delete().eq("id", todoId);

      if (error) {
        setDataError(error.message);
        return;
      }

      setTodos((prev) => prev.filter((todo) => todo.id !== todoId));
      setMessage("Task removed.");
    } finally {
      setDeletingTodoId(null);
    }
  }

  async function handleChronicleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    clearError();
    setMessage("");

    try {
      const text = await file.text();
      const rows = splitCsvRecords(text);

      if (rows.length < 2) {
        setDataError(
          "Chronicle CSV must include a header row and at least one record row."
        );
        return;
      }

      const headers = splitCsvRow(rows[0]).map(normalizeCsvHeader);

      const data = rows.slice(1).map((row) => {
        const values = splitCsvRow(row);
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = values[i] || "";
        });
        return obj;
      });

      const chroniclePayload = data
        .map(createChronicleRecord)
        .filter((record) => record.id && record.student_code);

      if (chroniclePayload.length === 0) {
        setDataError("No valid Chronicle rows found in the CSV file.");
        return;
      }

      const dedupedChroniclePayload = Array.from(
        chroniclePayload.reduce((map, record) => {
          map.set(record.id, record);
          return map;
        }, new Map()).values()
      );
      const duplicateCount = chroniclePayload.length - dedupedChroniclePayload.length;

      const missingStudentCodes = Array.from(
        new Set(
          dedupedChroniclePayload
            .map((record) => record.student_code)
            .filter((studentCode) => !studentLookupByCode[studentCode])
        )
      );
      const validChroniclePayload = dedupedChroniclePayload.filter(
        (record) => studentLookupByCode[record.student_code]
      );

      if (validChroniclePayload.length === 0) {
        setDataError(
          `Chronicle import could not save any rows. Missing student codes: ${missingStudentCodes.join(", ")}`
        );
        return;
      }

      const accessToken = authSession?.access_token;
      if (!accessToken) {
        setDataError("You need to be signed in before importing Chronicle data.");
        return;
      }

      const existingIds = new Set(chronicleRows.map((row) => row.id));
      try {
        await upsertTableRows(
          "chronicle_entries",
          validChroniclePayload,
          accessToken,
          "id"
        );
      } catch (err) {
        const message = err.message || "Failed to save Chronicle records.";
        setDataError(
          message.includes("chronicle_entries") ||
            message.includes("Could not find the table") ||
            message.includes("relation")
            ? "Chronicle table missing. Run database/chronicle_entries.sql in Supabase first."
            : message
        );
        return;
      }

      const parsedRows = await loadChronicleRows(accessToken);
      const insertedCount = validChroniclePayload.filter(
        (record) => !existingIds.has(record.id)
      ).length;
      const updatedCount = validChroniclePayload.length - insertedCount;
      const skippedCount = missingStudentCodes.length;
      const duplicateMessage =
        duplicateCount > 0
          ? ` Collapsed ${duplicateCount} duplicate Chronicle row${duplicateCount === 1 ? "" : "s"} in the upload.`
          : "";
      const skippedMessage =
        skippedCount > 0
          ? ` Skipped ${skippedCount} missing student code${skippedCount === 1 ? "" : "s"}: ${missingStudentCodes.join(", ")}.`
          : "";
      setSelectedChronicleKeys([]);
      setSelectedChronicleKey("");
      setMessage(
        `Chronicle import complete: ${insertedCount} new, ${updatedCount} updated, ${parsedRows.length} total loaded.${duplicateMessage}${skippedMessage}`
      );
    } catch (err) {
      setDataError(err.message || "Failed to parse Chronicle file.");
    } finally {
      e.target.value = "";
    }
  }

  async function handleAttendanceUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    clearError();
    setMessage("");

    try {
      const text = await file.text();
      const rows = splitCsvRecords(text);

      if (rows.length < 2) {
        setDataError(
          "Attendance CSV must include a header row and at least one record row."
        );
        return;
      }

      const headers = splitCsvRow(rows[0]).map(normalizeCsvHeader);
      const data = rows.slice(1).map((row) => {
        const values = splitCsvRow(row);
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || "";
        });
        return obj;
      });

      const attendancePayload = data
        .map(createAttendanceRecord)
        .filter((record) => record && record.id && record.student_code);

      if (attendancePayload.length === 0) {
        setDataError("No valid late attendance rows found in the CSV file.");
        return;
      }

      const dedupedAttendancePayload = Array.from(
        attendancePayload.reduce((map, record) => {
          map.set(record.id, record);
          return map;
        }, new Map()).values()
      );
      const duplicateCount =
        attendancePayload.length - dedupedAttendancePayload.length;

      const missingStudentCodes = Array.from(
        new Set(
          dedupedAttendancePayload
            .map((record) => record.student_code)
            .filter((studentCode) => !studentLookupByCode[studentCode])
        )
      );
      const validAttendancePayload = dedupedAttendancePayload.filter(
        (record) => studentLookupByCode[record.student_code]
      );

      if (validAttendancePayload.length === 0) {
        setDataError(
          `Attendance import could not save any rows. Missing student codes: ${missingStudentCodes.join(", ")}`
        );
        return;
      }

      const accessToken = authSession?.access_token;
      if (!accessToken) {
        setDataError("You need to be signed in before importing attendance data.");
        return;
      }

      const existingIds = new Set(attendanceRows.map((row) => row.id));
      try {
        await upsertTableRows(
          "attendance_entries",
          validAttendancePayload,
          accessToken,
          "id"
        );
      } catch (err) {
        const message = err.message || "Failed to save attendance records.";
        setDataError(
          message.includes("attendance_entries") ||
            message.includes("Could not find the table") ||
            message.includes("relation")
            ? "Attendance table missing. Run database/attendance_entries.sql in Supabase first."
            : message
        );
        return;
      }

      const parsedRows = await loadAttendanceRows(accessToken);
      const insertedCount = validAttendancePayload.filter(
        (record) => !existingIds.has(record.id)
      ).length;
      const updatedCount = validAttendancePayload.length - insertedCount;
      const skippedCount = missingStudentCodes.length;
      const duplicateMessage =
        duplicateCount > 0
          ? ` Collapsed ${duplicateCount} duplicate attendance row${duplicateCount === 1 ? "" : "s"} in the upload.`
          : "";
      const skippedMessage =
        skippedCount > 0
          ? ` Skipped ${skippedCount} missing student code${skippedCount === 1 ? "" : "s"}: ${missingStudentCodes.join(", ")}.`
          : "";
      setSelectedAttendanceKeys([]);
      setSelectedAttendanceKey("");
      setMessage(
        `Attendance import complete: ${insertedCount} new, ${updatedCount} updated, ${parsedRows.length} total loaded.${duplicateMessage}${skippedMessage}`
      );
    } catch (err) {
      setDataError(err.message || "Failed to parse attendance file.");
    } finally {
      event.target.value = "";
    }
  }

  const chronicleGrouped = useMemo(() => {
    const map = {};

    chronicleRows.forEach((r) => {
      const key = `${r.studentCode}__${r.weekKey}`;
      if (!map[key]) {
        map[key] = {
          key,
          name: r.studentName,
          studentName: r.studentName,
          studentCode: r.studentCode,
          count: 0,
          rows: [],
          yearLevel: r.yearLevel,
          homegroup: r.homegroup,
          weekKey: r.weekKey,
          weekLabel: r.weekLabel,
          chronicleType: r.chronicleType,
        };
      }
      map[key].count += 1;
      map[key].rows.push(r);
    });

    return Object.values(map).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name)
    );
  }, [chronicleRows]);

  const attendanceGrouped = useMemo(() => {
    const map = {};

    attendanceRows.forEach((row) => {
      const key = `${row.studentCode}__${row.weekKey}`;
      if (!map[key]) {
        map[key] = {
          key,
          name: row.studentName,
          studentName: row.studentName,
          studentCode: row.studentCode,
          count: 0,
          rows: [],
          yearLevel: row.yearLevel,
          homegroup: row.homegroup,
          weekKey: row.weekKey,
          weekLabel: row.weekLabel,
        };
      }
      map[key].count += 1;
      map[key].rows.push(row);
    });

    return Object.values(map).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name)
    );
  }, [attendanceRows]);

  const filteredChronicle = useMemo(() => {
    return chronicleGrouped.filter((g) => {
      if (chronicleOnly3Plus && g.count < 3) return false;
      if (
        chronicleSearch &&
        !g.name.toLowerCase().includes(chronicleSearch.toLowerCase())
      )
        return false;
      if (chronicleYearFilter && g.yearLevel !== chronicleYearFilter)
        return false;
      if (
        chronicleHomegroupFilter &&
        g.homegroup !== chronicleHomegroupFilter
      )
        return false;
      return true;
    });
  }, [
    chronicleGrouped,
    chronicleSearch,
    chronicleYearFilter,
    chronicleHomegroupFilter,
    chronicleOnly3Plus,
  ]);

  const filteredAttendance = useMemo(() => {
    return attendanceGrouped.filter((group) => {
      if (attendanceOnly3Plus && group.count < 3) return false;
      if (
        attendanceSearch &&
        !group.name.toLowerCase().includes(attendanceSearch.toLowerCase())
      ) {
        return false;
      }
      if (attendanceYearFilter && group.yearLevel !== attendanceYearFilter) {
        return false;
      }
      if (
        attendanceHomegroupFilter &&
        group.homegroup !== attendanceHomegroupFilter
      ) {
        return false;
      }
      return true;
    });
  }, [
    attendanceGrouped,
    attendanceOnly3Plus,
    attendanceSearch,
    attendanceYearFilter,
    attendanceHomegroupFilter,
  ]);

  const chronicleYearOptions = useMemo(
    () =>
      Array.from(
        new Set(chronicleGrouped.map((g) => g.yearLevel).filter(Boolean))
      ).sort(),
    [chronicleGrouped]
  );

  const attendanceYearOptions = useMemo(
    () =>
      Array.from(
        new Set(attendanceGrouped.map((group) => group.yearLevel).filter(Boolean))
      ).sort(),
    [attendanceGrouped]
  );

  const chronicleHomegroupOptions = useMemo(
    () =>
      Array.from(
        new Set(chronicleGrouped.map((g) => g.homegroup).filter(Boolean))
      ).sort(),
    [chronicleGrouped]
  );

  const attendanceHomegroupOptions = useMemo(
    () =>
      Array.from(
        new Set(attendanceGrouped.map((group) => group.homegroup).filter(Boolean))
      ).sort(),
    [attendanceGrouped]
  );

  const selectedChronicleGroup = useMemo(
    () => chronicleGrouped.find((g) => g.key === selectedChronicleKey) || null,
    [chronicleGrouped, selectedChronicleKey]
  );

  const selectedAttendanceGroup = useMemo(
    () => attendanceGrouped.find((group) => group.key === selectedAttendanceKey) || null,
    [attendanceGrouped, selectedAttendanceKey]
  );

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  const selectedSessionEntries = useMemo(() => {
    if (!selectedSessionId) return [];
    return entries.filter((entry) => entry.session_id === selectedSessionId);
  }, [entries, selectedSessionId]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) =>
      `${student.first_name} ${student.last_name} ${student.student_code} ${student.year_level} ${student.homegroup || ""}`
        .toLowerCase()
        .includes(studentSearch.toLowerCase())
    );
  }, [students, studentSearch]);

  const studentLookupByCode = useMemo(
    () =>
      students.reduce((map, student) => {
        map[student.student_code] = student;
        return map;
      }, {}),
    [students]
  );

  async function loadChronicleRows(accessToken = authSession?.access_token) {
    if (!accessToken) {
      setChronicleRows([]);
      return [];
    }

    try {
      const chronicleData = await fetchTableRows("chronicle_entries", accessToken, {
        column: "occurred_at",
        ascending: false,
      });

      const parsedRows = (chronicleData || []).map((record) =>
        mapChronicleRecordToView(record, studentLookupByCode)
      );

      setChronicleRows(parsedRows);
      return parsedRows;
    } catch (err) {
      setDataError(err.message || "Failed to load Chronicle records.");
      return [];
    }
  }

  const loadChronicleRowsEvent = useEffectEvent(loadChronicleRows);

  async function loadTodos(accessToken = authSession?.access_token) {
    if (!accessToken) {
      setTodos([]);
      return [];
    }

    try {
      const todoData = await fetchTableRows("todo_items", accessToken, {
        column: "created_at",
        ascending: false,
      });
      const safeTodos = todoData || [];
      setTodos(safeTodos);
      return safeTodos;
    } catch (err) {
      setDataError(err.message || "Failed to load tasks.");
      return [];
    }
  }

  const loadTodosEvent = useEffectEvent(loadTodos);

  async function loadAttendanceRows(accessToken = authSession?.access_token) {
    if (!accessToken) {
      setAttendanceRows([]);
      return [];
    }

    try {
      const attendanceData = await fetchTableRows("attendance_entries", accessToken, {
        column: "start_at",
        ascending: false,
      });

      const parsedRows = (attendanceData || []).map((record) =>
        mapAttendanceRecordToView(record, studentLookupByCode)
      );
      setAttendanceRows(parsedRows);
      return parsedRows;
    } catch (err) {
      setDataError(err.message || "Failed to load attendance records.");
      return [];
    }
  }

  const loadAttendanceRowsEvent = useEffectEvent(loadAttendanceRows);

  useEffect(() => {
    if (!authSession?.access_token) {
      setChronicleRows([]);
      setAttendanceRows([]);
      setTodos([]);
      return;
    }

    loadChronicleRowsEvent(authSession.access_token);
    loadAttendanceRowsEvent(authSession.access_token);
    loadTodosEvent(authSession.access_token);
  }, [authSession?.access_token, studentLookupByCode]);

  function getChronicleStatus(group) {
    const existing = entries.find(
      (entry) =>
        entry.student_name === group.studentName &&
        entry.reason === `Chronicle threshold reached (${group.weekLabel})`
    );

    if (existing) {
      const session = sessions.find((s) => s.id === existing.session_id);
      return {
        assigned: true,
        label: session ? `Assigned to ${session.name}` : "Assigned",
      };
    }

    if (group.count >= 3) return { assigned: false, label: "Ready to assign" };
    return { assigned: false, label: "Below threshold" };
  }

  function getAttendanceStatus(group) {
    const existing = entries.find(
      (entry) =>
        entry.student_name === group.studentName &&
        entry.reason === `Attendance threshold reached (${group.weekLabel})`
    );

    if (existing) {
      const session = sessions.find((session) => session.id === existing.session_id);
      return {
        assigned: true,
        label: session ? `Assigned to ${session.name}` : "Assigned",
      };
    }

    if (group.count >= 3) return { assigned: false, label: "Ready to assign" };
    return { assigned: false, label: "Below threshold" };
  }

  async function assignChronicleGroupToSession(group) {
    clearError();

    if (!chronicleSessionId) {
      setDataError("Choose a detention session first.");
      return false;
    }

    const duplicate = entries.find(
      (entry) =>
        entry.student_name === group.studentName &&
        entry.reason === `Chronicle threshold reached (${group.weekLabel})`
    );

    if (duplicate) return false;

    const payload = {
      session_id: chronicleSessionId,
      student_name: group.studentName,
      year_level: group.yearLevel,
      homegroup: group.homegroup,
      reason: `Chronicle threshold reached (${group.weekLabel})`,
      issued_by: "Chronicle import",
      attendance: "Unmarked",
    };

    const { data, error } = await supabase
      .from("entries")
      .insert([payload])
      .select();

    if (error) {
      setDataError(error.message);
      return false;
    }

    if (data?.[0]) {
      prependEntry(data[0]);
      setSelectedStudent(group.studentName);
      return true;
    }

    return false;
  }

  async function assignAttendanceGroupToSession(group) {
    clearError();

    if (!attendanceSessionId) {
      setDataError("Choose a detention session first.");
      return false;
    }

    const duplicate = entries.find(
      (entry) =>
        entry.student_name === group.studentName &&
        entry.reason === `Attendance threshold reached (${group.weekLabel})`
    );

    if (duplicate) return false;

    const payload = {
      session_id: attendanceSessionId,
      student_name: group.studentName,
      year_level: group.yearLevel,
      homegroup: group.homegroup,
      reason: `Attendance threshold reached (${group.weekLabel})`,
      issued_by: "Attendance import",
      attendance: "Unmarked",
    };

    const { data, error } = await supabase.from("entries").insert([payload]).select();

    if (error) {
      setDataError(error.message);
      return false;
    }

    if (data?.[0]) {
      prependEntry(data[0]);
      setSelectedStudent(group.studentName);
      return true;
    }

    return false;
  }

  async function assignSelectedChronicleGroups() {
    clearError();
    setMessage("");

    if (!chronicleSessionId) {
      setDataError("Choose a detention session first.");
      return;
    }

    const groups = filteredChronicle.filter(
      (g) =>
        selectedChronicleKeys.includes(g.key) &&
        g.count >= 3 &&
        !getChronicleStatus(g).assigned
    );

    if (groups.length === 0) {
      setDataError("Select at least one ready Chronicle candidate.");
      return;
    }

    let assigned = 0;
    for (const group of groups) {
      const ok = await assignChronicleGroupToSession(group);
      if (ok) assigned += 1;
    }

    setMessage(
      assigned > 0
        ? `Assigned ${assigned} Chronicle candidates.`
        : "No new Chronicle candidates were assigned."
    );
  }

  async function assignSelectedAttendanceGroups() {
    clearError();
    setMessage("");

    if (!attendanceSessionId) {
      setDataError("Choose a detention session first.");
      return;
    }

    const groups = filteredAttendance.filter(
      (group) =>
        selectedAttendanceKeys.includes(group.key) &&
        group.count >= 3 &&
        !getAttendanceStatus(group).assigned
    );

    if (groups.length === 0) {
      setDataError("Select at least one ready attendance candidate.");
      return;
    }

    let assigned = 0;
    for (const group of groups) {
      const ok = await assignAttendanceGroupToSession(group);
      if (ok) assigned += 1;
    }

    setMessage(
      assigned > 0
        ? `Assigned ${assigned} attendance candidates.`
        : "No new attendance candidates were assigned."
    );
  }

  function toggleChronicleSelection(key) {
    setSelectedChronicleKeys((prev) =>
      prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [...prev, key]
    );
  }

  function toggleAttendanceSelection(key) {
    setSelectedAttendanceKeys((prev) =>
      prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [...prev, key]
    );
  }

  function getStudentHistory(name) {
    return entries
      .filter((e) => e.student_name === name)
      .map((entry) => {
        const linkedSession = sessions.find((s) => s.id === entry.session_id);
        return { ...entry, linkedSession };
      })
      .sort((a, b) =>
        (b.linkedSession?.date || "").localeCompare(
          a.linkedSession?.date || ""
        )
      );
  }

  function getStudentFlag(name) {
    const studentEntries = entries.filter((e) => e.student_name === name);
    const total = studentEntries.length;
    if (total >= 3) return "⚠️ 3+ detentions";
    if (total >= 2) return "⚠️ Repeat";
    return null;
  }

  const repeatStudents = useMemo(() => {
    const counts = {};
    entries.forEach((entry) => {
      counts[entry.student_name] = (counts[entry.student_name] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const dashboardStats = useMemo(
    () => [
      {
        label: "Students",
        value: students.length,
        note: "Roster available to assign",
      },
      {
        label: "Sessions",
        value: sessions.length,
        note: "Detention slots currently open",
      },
      {
        label: "Entries",
        value: entries.length,
        note: "Assigned detention records",
      },
      {
        label: "Repeat Flags",
        value: repeatStudents.length,
        note: "Students with multiple records",
      },
      {
        label: "Late Arrivals",
        value: attendanceRows.length,
        note: "Attendance incidents imported",
      },
    ],
    [
      students.length,
      sessions.length,
      entries.length,
      repeatStudents.length,
      attendanceRows.length,
    ]
  );

  const topChronicleStudents = useMemo(() => {
    const counts = {};
    chronicleRows.forEach((row) => {
      if (!row.studentName) return;
      counts[row.studentName] = (counts[row.studentName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 5);
  }, [chronicleRows]);

  const topDetentionStudents = useMemo(
    () =>
      Object.entries(
        entries.reduce((counts, entry) => {
          if (entry.student_name) {
            counts[entry.student_name] = (counts[entry.student_name] || 0) + 1;
          }
          return counts;
        }, {})
      )
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 5),
    [entries]
  );

  const topAttendanceStudents = useMemo(() => {
    const counts = {};
    attendanceRows.forEach((row) => {
      if (!row.studentName) return;
      counts[row.studentName] = (counts[row.studentName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 5);
  }, [attendanceRows]);

  if (!supabase) {
    return <ConfigScreen />;
  }

  if (booting) return <div>Loading...</div>;

  if (!authSession) {
    return (
      <AuthScreen
        mode={mode}
        setMode={setMode}
        fullName={fullName}
        setFullName={setFullName}
        role={role}
        setRole={setRole}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        handleSubmit={handleSubmit}
        error={error}
        message={message}
      />
    );
  }

  return (
    <div style={pageStyle}>
      <AppHeader
        profile={profile}
        authSession={authSession}
        handleLogout={handleLogout}
        sessionsCount={sessions.length}
        studentsCount={students.length}
        isSupervisor={isSupervisor}
      />

      {error ? <p style={statusErrorStyle}>{error}</p> : null}
      {message ? <p style={statusSuccessStyle}>{message}</p> : null}

      {isSupervisor ? (
        <SessionRollCard
          selectedSessionId={selectedSessionId}
          setSelectedSessionId={setSelectedSessionId}
          sessions={sessions}
          selectedSession={selectedSession}
          selectedSessionEntries={selectedSessionEntries}
          setSelectedStudent={setSelectedStudent}
          isSupervisor={true}
          onUpdateAttendance={handleUpdateAttendance}
          attendanceUpdatingId={attendanceUpdatingId}
        />
      ) : (
        <>
          <div style={navBarStyle}>
            {pages.map((page) => (
              <button
                key={page.id}
                type="button"
                style={{
                  ...navButtonStyle,
                  ...(activePage === page.id ? navButtonActiveStyle : {}),
                }}
                onClick={() => setActivePage(page.id)}
              >
                {page.label}
              </button>
            ))}
          </div>

          {activePage === "dashboard" ? (
            <DashboardHome
              stats={dashboardStats}
              topChronicleStudents={topChronicleStudents}
              topAttendanceStudents={topAttendanceStudents}
              topDetentionStudents={topDetentionStudents}
              todos={todos.map((todo) => ({
                id: todo.id,
                text: todo.task_text,
                done: todo.is_done,
                dueDate: todo.due_date,
                isOverdue: isTodoOverdue(todo.due_date, todo.is_done),
              }))}
              creatingTodo={creatingTodo}
              updatingTodoId={updatingTodoId}
              deletingTodoId={deletingTodoId}
              onAddTodo={handleAddTodo}
              onToggleTodo={handleToggleTodo}
              onDeleteTodo={handleDeleteTodo}
              setSelectedStudent={setSelectedStudent}
            />
          ) : null}

          {activePage === "sessions" ? (
            <>
              <DashboardStats stats={dashboardStats} />

              <div style={twoColStyle}>
                <CreateSessionCard
                  newSession={newSession}
                  setNewSession={setNewSession}
                  handleCreateSession={handleCreateSession}
                />
                <AddStudentCard
                  handleAddEntry={handleAddEntry}
                  newEntry={currentEntry}
                  setNewEntry={setNewEntry}
                  sessions={sessions}
                  studentSearch={studentSearch}
                  setStudentSearch={setStudentSearch}
                  studentDropdownOpen={studentDropdownOpen}
                  setStudentDropdownOpen={setStudentDropdownOpen}
                  filteredStudents={filteredStudents}
                />
              </div>

              <SessionRollCard
                selectedSessionId={selectedSessionId}
                setSelectedSessionId={setSelectedSessionId}
                sessions={sessions}
                selectedSession={selectedSession}
                selectedSessionEntries={selectedSessionEntries}
                setSelectedStudent={setSelectedStudent}
                onUpdateSession={handleUpdateSession}
                onDeleteSession={handleDeleteSession}
                sessionSaving={sessionSaving}
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
                entrySavingId={entrySavingId}
              />

              <RepeatOffendersCard
                repeatStudents={repeatStudents}
                getStudentFlag={getStudentFlag}
                setSelectedStudent={setSelectedStudent}
              />

              <StudentHistoryCard
                selectedStudent={selectedStudent}
                getStudentHistory={getStudentHistory}
              />
            </>
          ) : null}

          {activePage === "chronicle" ? (
            <ChronicleImportCard
              handleChronicleUpload={handleChronicleUpload}
              chronicleSearch={chronicleSearch}
              setChronicleSearch={setChronicleSearch}
              chronicleYearFilter={chronicleYearFilter}
              setChronicleYearFilter={setChronicleYearFilter}
              chronicleHomegroupFilter={chronicleHomegroupFilter}
              setChronicleHomegroupFilter={setChronicleHomegroupFilter}
              chronicleOnly3Plus={chronicleOnly3Plus}
              setChronicleOnly3Plus={setChronicleOnly3Plus}
              chronicleSessionId={chronicleSessionId}
              setChronicleSessionId={setChronicleSessionId}
              sessions={sessions}
              chronicleYearOptions={chronicleYearOptions}
              chronicleHomegroupOptions={chronicleHomegroupOptions}
              assignSelectedChronicleGroups={assignSelectedChronicleGroups}
              filteredChronicle={filteredChronicle}
              selectedChronicleKeys={selectedChronicleKeys}
              toggleChronicleSelection={toggleChronicleSelection}
              setSelectedChronicleKey={setSelectedChronicleKey}
              getChronicleStatus={getChronicleStatus}
              assignChronicleGroupToSession={assignChronicleGroupToSession}
              selectedChronicleGroup={selectedChronicleGroup}
            />
          ) : null}

          {activePage === "attendance" ? (
            <AttendanceImportCard
              handleAttendanceUpload={handleAttendanceUpload}
              attendanceSearch={attendanceSearch}
              setAttendanceSearch={setAttendanceSearch}
              attendanceYearFilter={attendanceYearFilter}
              setAttendanceYearFilter={setAttendanceYearFilter}
              attendanceHomegroupFilter={attendanceHomegroupFilter}
              setAttendanceHomegroupFilter={setAttendanceHomegroupFilter}
              attendanceOnly3Plus={attendanceOnly3Plus}
              setAttendanceOnly3Plus={setAttendanceOnly3Plus}
              attendanceSessionId={attendanceSessionId}
              setAttendanceSessionId={setAttendanceSessionId}
              sessions={sessions}
              attendanceYearOptions={attendanceYearOptions}
              attendanceHomegroupOptions={attendanceHomegroupOptions}
              assignSelectedAttendanceGroups={assignSelectedAttendanceGroups}
              filteredAttendance={filteredAttendance}
              selectedAttendanceKeys={selectedAttendanceKeys}
              toggleAttendanceSelection={toggleAttendanceSelection}
              setSelectedAttendanceKey={setSelectedAttendanceKey}
              getAttendanceStatus={getAttendanceStatus}
              assignAttendanceGroupToSession={assignAttendanceGroupToSession}
              selectedAttendanceGroup={selectedAttendanceGroup}
            />
          ) : null}

          {activePage === "students" ? (
            <StudentUploadCard
              handleStudentUpload={handleStudentUpload}
              studentCount={students.length}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function splitCsvRow(row) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];
    const next = row[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function splitCsvRecords(text) {
  const records = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      current += char;
      if (inQuotes && next === '"') {
        current += next;
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current.trim()) {
        records.push(current.replace(/\r$/, ""));
      }

      current = "";
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    records.push(current.replace(/\r$/, ""));
  }

  return records;
}

function normalizeCsvHeader(header) {
  return String(header || "")
    .replace(/^\uFEFF/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractYearLevelFromHomegroup(value) {
  const match = String(value || "").match(/\d+/);
  return match ? String(Number(match[0])) : "";
}

function parseChronicleDate(value) {
  if (!value) return null;

  const match = String(value)
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) return null;

  let [, day, month, year, hour, minute, meridiem] = match;
  let h = Number(hour);

  if (meridiem.toUpperCase() === "PM" && h !== 12) h += 12;
  if (meridiem.toUpperCase() === "AM" && h === 12) h = 0;

  return new Date(Number(year), Number(month) - 1, Number(day), h, Number(minute));
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getFridayWeekKey(date) {
  const d = new Date(date);
  const day = d.getDay();
  const daysSinceFriday = (day - 5 + 7) % 7;
  d.setDate(d.getDate() - daysSinceFriday);
  return formatDate(d);
}

function getFridayWeekLabel(date) {
  const start = new Date(date);
  const day = start.getDay();
  const daysSinceFriday = (day - 5 + 7) % 7;
  start.setDate(start.getDate() - daysSinceFriday);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return `${formatDate(start)} to ${formatDate(end)}`;
}

function createChronicleRecord(row) {
  const studentCode = getChronicleValue(
    row,
    "Display Code",
    "DisplayCode",
    "Display code"
  );
  const rawEntryId = getChronicleValue(
    row,
    "EntryId",
    "EntryID",
    "Entry ID",
    "Entry Id"
  );
  const entryId =
    extractAfterLabel(rawEntryId, "EntryId:") ||
    extractAfterLabel(rawEntryId, "Entry ID:") ||
    extractAfterLabel(rawEntryId, "EntryID:") ||
    rawEntryId;
  const occurredTimestamp =
    getChronicleValue(row, "OccurredTimestamp", "Occurred Timestamp") ||
    getChronicleValue(row, "RecordedTimestamp", "Recorded Timestamp");
  const occurredDate = parseChronicleDate(occurredTimestamp);
  const detailsSource = getChronicleValue(row, "Details");

  return {
    id: `${studentCode}-${entryId || "missing-entry"}`,
    entry_id: entryId || "",
    student_code: studentCode || "",
    chronicle_type: cleanChronicleType(
      getChronicleValue(row, "Overview") ||
        getChronicleValue(row, "ChronicleItemTypeTextbox")
    ),
    occurred_timestamp: occurredTimestamp || "",
    occurred_at: occurredDate ? formatDateTimeForSql(occurredDate) : null,
    details: extractSection(detailsSource, "~Overview:"),
    original_publisher: cleanOriginalPublisher(
      getChronicleValue(row, "Original Publisher", "OriginalPublisher")
    ),
    week_key: occurredDate ? getFridayWeekKey(occurredDate) : "unknown-week",
    week_label: occurredDate ? getFridayWeekLabel(occurredDate) : "Unknown week",
  };
}

function createAttendanceRecord(row) {
  const studentCode = normalizeStudentCode(
    getChronicleValue(row, "StudentCode", "Student Code")
  );
  const startTimeText = getChronicleValue(row, "StartTime", "Start Time");
  const arrivalTimeText = getChronicleValue(row, "ArrivalTime", "Arrival Time");
  const startDate = parseAttendanceDateTime(startTimeText);
  const arrivalDate = parseAttendanceArrivalTime(arrivalTimeText, startDate);

  if (!studentCode || !startDate || !arrivalDate || arrivalDate <= startDate) {
    return null;
  }

  const minutesLate = Math.round((arrivalDate - startDate) / 60000);
  const period = getChronicleValue(row, "Period");
  const activityCode = getChronicleValue(row, "ActivityCode", "Activity Code");

  return {
    id: `${studentCode}-${formatDateTimeForSql(startDate)}-${period || activityCode || "late"}`,
    student_code: studentCode,
    start_time_text: startTimeText || "",
    start_at: formatDateTimeForSql(startDate),
    arrival_time_text: arrivalTimeText || "",
    arrival_at: formatDateTimeForSql(arrivalDate),
    period: period || "",
    activity_code: activityCode || "",
    activity_name: getChronicleValue(row, "ActivityName", "Activity Name") || "",
    teacher: getChronicleValue(row, "Teacher") || "",
    minutes_late: minutesLate,
    week_key: getFridayWeekKey(startDate),
    week_label: getFridayWeekLabel(startDate),
  };
}

function mapChronicleRecordToView(record, studentLookupByCode = {}) {
  const occurredDate = record.occurred_at
    ? new Date(record.occurred_at)
    : parseChronicleDate(record.occurred_timestamp);
  const student = studentLookupByCode[record.student_code] || null;
  const studentName = student
    ? `${student.first_name} ${student.last_name}`
    : "Unknown Student";

  return {
    key: record.id,
    id: record.id,
    studentCode: record.student_code || "",
    studentName,
    yearLevel: String(student?.year_level || ""),
    homegroup: student?.homegroup || "",
    occurredText: record.occurred_timestamp || "",
    occurredDate,
    weekKey:
      record.week_key ||
      (occurredDate ? getFridayWeekKey(occurredDate) : "unknown-week"),
    weekLabel:
      record.week_label ||
      (occurredDate ? getFridayWeekLabel(occurredDate) : "Unknown week"),
    chronicleType: record.chronicle_type || "",
    details: record.details || "",
    originalPublisher: record.original_publisher || "",
  };
}

function mapAttendanceRecordToView(record, studentLookupByCode = {}) {
  const startDate = record.start_at
    ? new Date(record.start_at)
    : parseAttendanceDateTime(record.start_time_text);
  const student = studentLookupByCode[record.student_code] || null;
  const studentName = student
    ? `${student.first_name} ${student.last_name}`
    : "Unknown Student";

  return {
    key: record.id,
    id: record.id,
    studentCode: record.student_code || "",
    studentName,
    yearLevel: String(student?.year_level || ""),
    homegroup: student?.homegroup || "",
    startText: record.start_time_text || "",
    arrivalText: record.arrival_time_text || "",
    period: record.period || "",
    activityName: record.activity_name || "",
    teacher: record.teacher || "",
    minutesLate: Number(record.minutes_late || 0),
    weekKey:
      record.week_key || (startDate ? getFridayWeekKey(startDate) : "unknown-week"),
    weekLabel:
      record.week_label ||
      (startDate ? getFridayWeekLabel(startDate) : "Unknown week"),
  };
}

function getChronicleValue(row, ...keys) {
  const match = keys.find((key) => String(row[key] || "").trim());
  return match ? row[match] : "";
}

function extractAfterLabel(value, label) {
  if (!value) return "";
  const text = String(value);
  const index = text.toLowerCase().indexOf(label.toLowerCase());
  if (index === -1) return "";
  return text.slice(index + label.length).trim();
}

function extractSection(value, marker) {
  if (!value) return "";

  const text = String(value);
  const startIndex = text.toLowerCase().indexOf(marker.toLowerCase());
  if (startIndex === -1) return "";

  const remainder = text.slice(startIndex + marker.length).trim();
  const endIndex = remainder.search(/(?:~[A-Za-z ]+:|Recorded By:)/i);

  if (endIndex === -1) {
    return remainder.trim();
  }

  return remainder.slice(0, endIndex).trim();
}

function cleanChronicleType(value) {
  return String(value || "")
    .replace(/\*/g, "")
    .trim();
}

function cleanOriginalPublisher(value) {
  return (
    extractAfterLabel(value, "Recorded by:") ||
    extractAfterLabel(value, "Recorded By:") ||
    String(value || "").trim()
  );
}

function normalizeStudentCode(value) {
  return String(value || "").replace(/\s+/g, "").trim().toUpperCase();
}

function parseAttendanceDateTime(value) {
  return parseChronicleDate(value);
}

function parseAttendanceArrivalTime(value, baseDate) {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed === "-") return null;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
  if (!match || !baseDate) return null;

  let [, hour, minute, meridiem] = match;
  let h = Number(hour);
  if (meridiem.toUpperCase() === "PM" && h !== 12) h += 12;
  if (meridiem.toUpperCase() === "AM" && h === 12) h = 0;

  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    h,
    Number(minute)
  );
}

function isTodoOverdue(dueDate, isDone) {
  if (!dueDate || isDone) return false;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
  return dueDate < todayKey;
}

function formatDateTimeForSql(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
