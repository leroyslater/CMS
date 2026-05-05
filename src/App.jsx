import { useEffect, useEffectEvent, useMemo, useState } from "react";
import AddStudentCard from "./components/AddStudentCard";
import AccountSettingsCard from "./components/AccountSettingsCard";
import AttendanceImportCard from "./components/AttendanceImportCard";
import AdminAccountsCard from "./components/AdminAccountsCard";
import AppHeader from "./components/AppHeader";
import AuthScreen from "./components/AuthScreen";
import ChronicleImportCard from "./components/ChronicleImportCard";
import ConfigScreen from "./components/ConfigScreen";
import CreateSessionCard from "./components/CreateSessionCard";
import DashboardHome from "./components/DashboardHome";
import DashboardStats from "./components/DashboardStats";
import MissedDetentionCard from "./components/MissedDetentionCard";
import SessionRollCard from "./components/SessionRollCard";
import StudentHistoryCard from "./components/StudentHistoryCard";
import StudentUploadCard from "./components/StudentUploadCard";
import UpcomingSessionAssignmentsCard from "./components/UpcomingSessionAssignmentsCard";
import { useAuth } from "./hooks/useAuth";
import { useDetentionData } from "./hooks/useDetentionData";
import { fetchTableRows, upsertTableRows } from "./lib/supabaseRest";
import { supabase } from "./lib/supabaseClient";
import {
  mobileNavBarStyle,
  mobileNavButtonStyle,
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
    passwordRecoveryMode,
    setPasswordRecoveryMode,
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
  const [chronicleYearFilter, setChronicleYearFilter] = useState([]);
  const [chronicleOnly3Plus, setChronicleOnly3Plus] = useState(false);
  const [chronicleSyncing, setChronicleSyncing] = useState(false);
  const [chronicleSyncYear] = useState(String(new Date().getFullYear()));
  const [chronicleSyncModifiedSince, setChronicleSyncModifiedSince] = useState(
    `${new Date().getFullYear()}-01-01`
  );
  const [selectedAttendanceKeys, setSelectedAttendanceKeys] = useState([]);
  const [selectedAttendanceKey, setSelectedAttendanceKey] = useState("");
  const [attendanceYearFilter, setAttendanceYearFilter] = useState([]);
  const [attendanceOnly3Plus, setAttendanceOnly3Plus] = useState(false);
  const [attendanceSessionId, setAttendanceSessionId] = useState("");
  const [attendanceSyncing, setAttendanceSyncing] = useState(false);
  const [attendancePreviewRows, setAttendancePreviewRows] = useState([]);
  const [attendanceApprovedAbsenceRows, setAttendanceApprovedAbsenceRows] = useState([]);

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [newSession, setNewSession] = useState(resetNewSession);

  const [newEntry, setNewEntry] = useState(() => resetNewEntry());

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [attendanceUpdatingId, setAttendanceUpdatingId] = useState(null);
  const [rollSubmitting, setRollSubmitting] = useState(false);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [entrySavingId, setEntrySavingId] = useState(null);
  const [todos, setTodos] = useState([]);
  const [creatingTodo, setCreatingTodo] = useState(false);
  const [updatingTodoId, setUpdatingTodoId] = useState(null);
  const [deletingTodoId, setDeletingTodoId] = useState(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [savingAccountId, setSavingAccountId] = useState(null);
  const [deletingAccountId, setDeletingAccountId] = useState(null);
  const [resettingPasswordId, setResettingPasswordId] = useState(null);
  const [message, setMessage] = useState("");
  const [activePage, setActivePage] = useState("dashboard");
  const [dashboardYearFilter, setDashboardYearFilter] = useState([]);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  const error = authError || dataError;
  const currentEntry = newEntry.sessionId
    ? newEntry
    : { ...newEntry, sessionId: selectedSessionId };
  const isSupervisor = (profile?.role || "coordinator") === "supervisor";
  const isAdmin = profile?.role === "admin";
  const coordinatorYearLevels = useMemo(
    () => normalizeYearLevels(profile?.year_levels ?? profile?.year_level),
    [profile]
  );
  const availableDashboardYearLevels = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .map((student) => String(student.year_level || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
    [students]
  );
  const dashboardYearLevels = useMemo(
    () => normalizeYearLevels(dashboardYearFilter),
    [dashboardYearFilter]
  );
  const chronicleYearLevels = useMemo(
    () => normalizeYearLevels(chronicleYearFilter),
    [chronicleYearFilter]
  );
  const attendanceYearLevels = useMemo(
    () => normalizeYearLevels(attendanceYearFilter),
    [attendanceYearFilter]
  );
  const shouldScopeDashboardByYear = dashboardYearLevels.length > 0;
  const pages = useMemo(
    () =>
      isSupervisor
        ? [
            { id: "sessions", label: "Sessions" },
          ]
        : [
            { id: "dashboard", label: "Dashboard" },
            { id: "sessions", label: "Sessions" },
            { id: "supervisor", label: "Supervisor" },
            { id: "chronicle", label: "Chronicle" },
            { id: "attendance", label: "Attendance" },
            { id: "students", label: "Student" },
          ],
    [isSupervisor]
  );

  useEffect(() => {
    if (activePage !== "account" && !pages.some((page) => page.id === activePage)) {
      setActivePage(pages[0].id);
    }
  }, [activePage, pages]);

  useEffect(() => {
    if (passwordRecoveryMode) {
      setActivePage("account");
    }
  }, [passwordRecoveryMode]);

  useEffect(() => {
    if (!authSession || passwordRecoveryMode) return;
    setActivePage(isSupervisor ? "sessions" : "dashboard");
  }, [authSession, isSupervisor, passwordRecoveryMode]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    function updateIsMobile() {
      setIsMobile(window.innerWidth <= 768);
    }

    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  function clearError() {
    setAuthError("");
    setDataError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message);
        return;
      }
    } catch (err) {
      setAuthError(err.message || "Authentication failed.");
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    clearError();
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      setMessage("Password reset email sent.");
    } catch (err) {
      setAuthError(err.message || "Failed to send reset email.");
    }
  }

  async function handleUpdatePassword(nextPassword, confirmPassword) {
    if (nextPassword !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return false;
    }

    clearError();
    setMessage("");
    setUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: nextPassword,
      });

      if (error) {
        setAuthError(error.message);
        return false;
      }

      setPasswordRecoveryMode(false);
      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      setMessage("Password updated.");
      return true;
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function handleCreateAccount(payload) {
    clearError();
    setMessage("");
    setCreatingAccount(true);

    try {
      const response = await fetch("/api/admin-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token || ""}`,
        },
        body: JSON.stringify({
          action: "create",
          ...payload,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setDataError(result?.error || "Failed to create account.");
        return false;
      }

      setMessage("Account created and password setup email sent.");
      await loadAccounts();
      return true;
    } catch (err) {
      setDataError(err.message || "Failed to create account.");
      return false;
    } finally {
      setCreatingAccount(false);
    }
  }

  async function loadAccounts() {
    if (!isAdmin || !authSession?.access_token) {
      setAccounts([]);
      return [];
    }

    setLoadingAccounts(true);

    try {
      const response = await fetch("/api/admin-users", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authSession.access_token}`,
        },
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || "Failed to load users.");
      }

      const users = result?.users || [];
      setAccounts(users);
      return users;
    } catch (err) {
      setDataError(err.message || "Failed to load users.");
      return [];
    } finally {
      setLoadingAccounts(false);
    }
  }

  const loadAccountsEvent = useEffectEvent(loadAccounts);

  async function handleUpdateAccount(account) {
    clearError();
    setMessage("");
    setSavingAccountId(account.id);

    try {
      const response = await fetch("/api/admin-users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token || ""}`,
        },
        body: JSON.stringify(account),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setDataError(result?.error || "Failed to update account.");
        return false;
      }

      setAccounts((prev) =>
        prev.map((item) =>
          item.id === account.id
            ? {
                ...item,
                email: account.email,
                full_name: account.fullName,
                role: account.role,
              }
            : item
        )
      );
      setMessage("Account updated.");
      return true;
    } finally {
      setSavingAccountId(null);
    }
  }

  async function handleDeleteAccount(accountId, emailAddress) {
    const confirmed = window.confirm(`Delete account ${emailAddress}?`);
    if (!confirmed) return;

    clearError();
    setMessage("");
    setDeletingAccountId(accountId);

    try {
      const response = await fetch("/api/admin-users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token || ""}`,
        },
        body: JSON.stringify({ id: accountId }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setDataError(result?.error || "Failed to delete account.");
        return;
      }

      setAccounts((prev) => prev.filter((account) => account.id !== accountId));
      setMessage("Account deleted.");
    } finally {
      setDeletingAccountId(null);
    }
  }

  async function handleResetAccountPassword(accountId, emailAddress) {
    clearError();
    setMessage("");
    setResettingPasswordId(accountId);

    try {
      const response = await fetch("/api/admin-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token || ""}`,
        },
        body: JSON.stringify({
          action: "reset_password",
          email: emailAddress,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setDataError(result?.error || "Failed to send reset email.");
        return;
      }

      setMessage(`Password reset email sent to ${emailAddress}.`);
    } finally {
      setResettingPasswordId(null);
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      setAccounts([]);
      return;
    }

    loadAccountsEvent();
  }, [isAdmin, authSession?.access_token]);

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
          const student = {
            student_code: record["sussi id"],
            first_name: record["first name"],
            last_name: record["last name"],
            year_level: extractYearLevelFromHomegroup(homegroup),
            homegroup,
          };

          const attendancePercentage = parseAttendancePercentageValue(
            getStudentAttendancePercentageValue(record)
          );

          if (attendancePercentage != null) {
            student.attendance_percentage = attendancePercentage;
          }

          return student;
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
        const message = err.message || "Failed to upload students.";
        setDataError(
          message.includes("attendance_percentage")
            ? "Students table is missing attendance percentage support. Run database/students_attendance_percentage.sql in Supabase first."
            : message
        );
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

  async function handleSubmitRoll(sessionId) {
    clearError();
    setMessage("");
    setRollSubmitting(true);

    try {
      const accessToken = authSession?.access_token;
      if (!accessToken) {
        setDataError("You need to be signed in before submitting the roll.");
        return;
      }

      const response = await fetch("/api/session-roll-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setDataError(result?.error || "Failed to submit the session roll.");
        return;
      }

      setMessage(
        `Roll submitted. Emailed ${result?.recipients || 0} staff with ${result?.presentCount || 0} present and ${result?.absentCount || 0} absent.`
      );
    } finally {
      setRollSubmitting(false);
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
      const accessToken = authSession?.access_token;
      if (!accessToken) {
        setDataError("You need to be signed in before deleting sessions.");
        return;
      }

      const response = await fetch("/api/session-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setDataError(result?.error || "Failed to delete session.");
        return;
      }

      removeSession(sessionId);
      const deletedEntryIds = Array.isArray(result?.deletedEntryIds)
        ? result.deletedEntryIds
        : entries
            .filter((entry) => entry.session_id === sessionId)
            .map((entry) => entry.id);
      deletedEntryIds.forEach((entryId) => removeEntry(entryId));
      await loadData();
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

  async function handleDeleteEntry(entryToDelete) {
    const entryId = entryToDelete?.id;
    const sessionId = entryToDelete?.session_id;
    const studentName = entryToDelete?.student_name;

    if (!entryId) {
      setDataError("Could not identify the session entry to remove.");
      return;
    }

    const confirmed = window.confirm(
      "Remove this student from the selected session?"
    );
    if (!confirmed) return;

    clearError();
    setMessage("");
    setEntrySavingId(entryId);

    try {
      const normalizedStudentName = String(studentName || "").trim().toLowerCase();
      const matchingEntryIds =
        sessionId && normalizedStudentName
          ? entries
              .filter(
                (entry) =>
                  entry.session_id === sessionId &&
                  String(entry.student_name || "").trim().toLowerCase() ===
                    normalizedStudentName
              )
              .map((entry) => entry.id)
          : [entryId];

      const idsToDelete = Array.from(
        new Set(matchingEntryIds.filter(Boolean))
      );

      const accessToken = authSession?.access_token;
      if (!accessToken) {
        setDataError("You need to be signed in before removing students from sessions.");
        return;
      }

      const response = await fetch("/api/session-entry-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setDataError(result?.error || "Failed to remove student from session.");
        return;
      }

      const deletedIds = Array.isArray(result?.deletedIds)
        ? result.deletedIds
        : idsToDelete;

      deletedIds.forEach((id) => removeEntry(id));
      await loadData();
      setMessage("Student removed from session roll.");
    } finally {
      setEntrySavingId(null);
    }
  }

  async function handleAddTodo(taskText, dueDate, studentName = null) {
    clearError();
    setMessage("");
    setCreatingTodo(true);

    const userId = authSession?.user?.id;
    if (!userId) {
      setDataError("You need to be signed in before adding tasks.");
      setCreatingTodo(false);
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("todo_items")
        .insert([
          {
            user_id: userId,
            student_name: studentName || null,
            task_text: taskText,
            is_done: false,
            due_date: dueDate,
          },
        ])
        .select()
        .single();

      if (error) {
        setDataError(error.message);
        return false;
      }

      if (data) {
        setTodos((prev) => [data, ...prev]);
        setMessage(studentName ? "Student follow-up added." : "Task added.");
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

    const userId = authSession?.user?.id;
    if (!userId) {
      setDataError("You need to be signed in before updating tasks.");
      setUpdatingTodoId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("todo_items")
        .update({ is_done: !isDone })
        .eq("id", todoId)
        .eq("user_id", userId);

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

    const userId = authSession?.user?.id;
    if (!userId) {
      setDataError("You need to be signed in before removing tasks.");
      setDeletingTodoId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("todo_items")
        .delete()
        .eq("id", todoId)
        .eq("user_id", userId);

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

  async function handleChronicleSync() {
    clearError();
    setMessage("");

    const accessToken = authSession?.access_token;
    if (!accessToken) {
      setDataError("You need to be signed in before syncing Chronicle data.");
      return;
    }

    setChronicleSyncing(true);

    try {
      const response = await fetch("/api/compass-chronicle-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          year: Number.parseInt(chronicleSyncYear, 10) || new Date().getFullYear(),
          modifiedSinceTimestamp: chronicleSyncModifiedSince
            ? `${chronicleSyncModifiedSince}T00:00:00.000Z`
            : undefined,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setDataError(result?.error || "Failed to sync Chronicle records from Compass.");
        return;
      }

      const parsedRows = await loadChronicleRows(accessToken);
      const sourceCount = result?.totalSourceEntries || 0;
      const syncedCount = result?.syncedCount || 0;
      const duplicateMessage =
        result?.duplicateCount > 0
          ? ` Collapsed ${result.duplicateCount} duplicate Chronicle row${result.duplicateCount === 1 ? "" : "s"} from Compass.`
          : "";
      const skippedMessage =
        result?.missingStudentCodes?.length > 0
          ? ` Skipped ${result.missingStudentCodes.length} missing student code${result.missingStudentCodes.length === 1 ? "" : "s"}: ${result.missingStudentCodes.join(", ")}.`
          : "";

      setSelectedChronicleKeys([]);
      setSelectedChronicleKey("");
      if (sourceCount === 0) {
        setMessage(
          "Chronicle sync complete: Compass returned 0 source entries for the selected year."
        );
        return;
      }

      if (syncedCount === 0) {
        setMessage(
          `Chronicle sync complete: Compass returned ${sourceCount} source entr${sourceCount === 1 ? "y" : "ies"}, but 0 were saved.${skippedMessage || " Check that student codes in Compass match Students."}`
        );
        return;
      }

      setMessage(
        `Chronicle sync complete: ${sourceCount} source entr${sourceCount === 1 ? "y" : "ies"}, ${result?.insertedCount || 0} new, ${result?.updatedCount || 0} updated, ${parsedRows.length} total loaded.${duplicateMessage}${skippedMessage}`
      );
    } catch (err) {
      setDataError(err.message || "Failed to sync Chronicle records from Compass.");
    } finally {
      setChronicleSyncing(false);
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
      const schoolLateCount = validAttendancePayload.filter(
        (record) => record.arrival_at || (record.arrival_time_text && record.arrival_time_text !== "-")
      ).length;
      const classLateCount = validAttendancePayload.length - schoolLateCount;
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
        `Attendance import complete: ${insertedCount} new, ${updatedCount} updated, ${parsedRows.length} total loaded. ${schoolLateCount} school late, ${classLateCount} class late.${duplicateMessage}${skippedMessage}`
      );
    } catch (err) {
      setDataError(err.message || "Failed to parse attendance file.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleAttendanceSync() {
    clearError();
    setMessage("");

    const accessToken = authSession?.access_token;
    if (!accessToken) {
      setDataError("You need to be signed in before syncing attendance data.");
      return;
    }

    setAttendanceSyncing(true);
    const currentYear = new Date().getFullYear();
    const defaultFromDate = `${currentYear}-01-01`;
    const defaultToDate = todayString;

    try {
      const response = await fetch("/api/compass-attendance-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fromDate: defaultFromDate,
          toDate: defaultToDate,
          latestKnownStartAt: latestSavedAttendanceStartAt || undefined,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = result?.error || "Failed to sync attendance records from Compass.";
        setDataError(
          message.includes("attendance_absence_entries")
            ? "Attendance absence table missing. Run database/attendance_absence_entries.sql in Supabase first."
            : message
        );
        return;
      }

      setAttendancePreviewRows([]);
      const approvedAbsenceRecords = Array.isArray(result?.approvedAbsenceRecords)
        ? result.approvedAbsenceRecords
        : [];
      setAttendanceApprovedAbsenceRows(
        approvedAbsenceRecords.map((record) =>
          mapApprovedAbsenceRecordToView(record, studentLookupByCode)
        )
      );
      const parsedRows = await loadAttendanceRows(accessToken);
      const syncedCount = Number(result?.syncedCount || 0);
      const insertedCount = Number(result?.insertedCount || 0);
      const updatedCount = Number(result?.updatedCount || 0);
      const schoolLateCount = Number(result?.schoolLateCount || 0);
      const classLateCount = Number(result?.classLateCount || 0);
      const approvedAbsenceCount = approvedAbsenceRecords.length;
      const duplicateCount = Number(result?.duplicateCount || 0);
      const unmatchedStudentCodes = Array.isArray(result?.missingStudentCodes)
        ? result.missingStudentCodes
        : [];
      const duplicateMessage =
        duplicateCount > 0
          ? ` Collapsed ${duplicateCount} duplicate Compass attendance row${duplicateCount === 1 ? "" : "s"}.`
          : "";
      const unmatchedMessage =
        unmatchedStudentCodes.length > 0
          ? ` Skipped ${unmatchedStudentCodes.length} missing student code${unmatchedStudentCodes.length === 1 ? "" : "s"}: ${unmatchedStudentCodes.join(", ")}.`
          : "";
      setSelectedAttendanceKeys([]);
      setSelectedAttendanceKey("");
      setMessage(
        `Attendance sync complete: ${insertedCount} new, ${updatedCount} updated, ${syncedCount} synced, ${parsedRows.length} total loaded. ${schoolLateCount} school late, ${classLateCount} class late, ${approvedAbsenceCount} unapproved full-day absence${approvedAbsenceCount === 1 ? "" : "s"}.${duplicateMessage}${unmatchedMessage}`
      );
    } catch (err) {
      setDataError(err.message || "Failed to sync attendance records from Compass.");
    } finally {
      setAttendanceSyncing(false);
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
  const attendancePreviewMode = attendancePreviewRows.length > 0;
  const attendancePreviewDisplayRows = useMemo(
    () =>
      attendancePreviewRows.filter((row) => {
        if (!isTrackedAttendancePeriod(row.period)) {
          return false;
        }

        if (isParentApprovedAttendanceStatus(row.statusName, row.statusCode)) {
          return false;
        }

        if (row.attendanceType === "School late") {
          return true;
        }

        if (row.attendanceType === "Class late" && !row.absentDayPattern) {
          return true;
        }

        return false;
      }),
    [attendancePreviewRows]
  );
  const attendancePageRows = attendancePreviewMode
    ? attendancePreviewDisplayRows
    : attendanceRows;
  const attendancePageGrouped = useMemo(() => {
    const map = {};

    attendancePageRows.forEach((row) => {
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
  }, [attendancePageRows]);

  const filteredChronicle = useMemo(() => {
    return chronicleGrouped.filter((g) => {
      if (chronicleOnly3Plus && g.count < 3) return false;
      if (chronicleYearLevels.length > 0 && !chronicleYearLevels.includes(g.yearLevel)) {
        return false;
      }
      return true;
    });
  }, [
    chronicleGrouped,
    chronicleYearLevels,
    chronicleOnly3Plus,
  ]);

  const filteredAttendance = useMemo(() => {
    return attendancePageGrouped.filter((group) => {
      if (attendanceOnly3Plus && group.count < 3) return false;
      if (attendanceYearLevels.length > 0 && !attendanceYearLevels.includes(group.yearLevel)) {
        return false;
      }
      return true;
    });
  }, [
    attendancePageGrouped,
    attendanceOnly3Plus,
    attendanceYearLevels,
  ]);

  const filteredAttendanceApprovedAbsences = useMemo(() => {
    return attendanceApprovedAbsenceRows.filter((row) => {
      if (attendanceYearLevels.length > 0 && !attendanceYearLevels.includes(row.yearLevel)) {
        return false;
      }
      return true;
    });
  }, [
    attendanceApprovedAbsenceRows,
    attendanceYearLevels,
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
        new Set(attendancePageGrouped.map((group) => group.yearLevel).filter(Boolean))
      ).sort(),
    [attendancePageGrouped]
  );

  const selectedChronicleGroup = useMemo(
    () => chronicleGrouped.find((g) => g.key === selectedChronicleKey) || null,
    [chronicleGrouped, selectedChronicleKey]
  );

  const selectedAttendanceGroup = useMemo(
    () => attendancePageGrouped.find((group) => group.key === selectedAttendanceKey) || null,
    [attendancePageGrouped, selectedAttendanceKey]
  );

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  const selectedSessionEntries = useMemo(() => {
    if (!selectedSessionId) return [];
    return entries.filter((entry) => entry.session_id === selectedSessionId);
  }, [entries, selectedSessionId]);

  const missedDetentionEntries = useMemo(() => {
    return entries
      .filter((entry) => entry.attendance === "Absent")
      .map((entry) => {
        const session = sessions.find((item) => item.id === entry.session_id);
        return {
          ...entry,
          session_name: session?.name || "",
          session_date: session?.date || "",
          session_time: session?.time || "",
        };
      })
      .sort((a, b) => {
        const yearCompare =
          Number(a.year_level || 0) - Number(b.year_level || 0) ||
          String(a.year_level || "").localeCompare(String(b.year_level || ""));
        if (yearCompare !== 0) return yearCompare;

        const dateCompare = String(b.session_date || "").localeCompare(
          String(a.session_date || "")
        );
        if (dateCompare !== 0) return dateCompare;

        return String(a.student_name || "").localeCompare(String(b.student_name || ""));
      });
  }, [entries, sessions]);

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

  useEffect(() => {
    if (isSupervisor) {
      setDashboardYearFilter([]);
      return;
    }

    setDashboardYearFilter((current) => {
      const normalizedCurrent = normalizeYearLevels(current).filter((level) =>
        availableDashboardYearLevels.includes(level)
      );

      if (normalizedCurrent.length > 0) {
        return normalizedCurrent;
      }

      const initialLevels = isAdmin
        ? []
        : coordinatorYearLevels.filter((level) =>
            availableDashboardYearLevels.includes(level)
          );

      return initialLevels;
    });
  }, [availableDashboardYearLevels, coordinatorYearLevels, isAdmin, isSupervisor]);

  const dashboardStudents = useMemo(() => {
    if (!shouldScopeDashboardByYear) return students;

    return students.filter((student) =>
      dashboardYearLevels.includes(String(student.year_level || "").trim())
    );
  }, [dashboardYearLevels, shouldScopeDashboardByYear, students]);

  const dashboardStudentCodes = useMemo(
    () => new Set(dashboardStudents.map((student) => student.student_code)),
    [dashboardStudents]
  );

  const dashboardStudentNames = useMemo(
    () =>
      new Set(
        dashboardStudents.map((student) =>
          `${student.first_name} ${student.last_name}`.trim()
        )
      ),
    [dashboardStudents]
  );

  const dashboardChronicleRows = useMemo(() => {
    if (!shouldScopeDashboardByYear) return chronicleRows;
    return chronicleRows.filter((row) => dashboardStudentCodes.has(row.studentCode));
  }, [chronicleRows, dashboardStudentCodes, shouldScopeDashboardByYear]);

  const dashboardAttendanceRows = useMemo(() => {
    if (!shouldScopeDashboardByYear) return attendanceRows;
    return attendanceRows.filter((row) => dashboardStudentCodes.has(row.studentCode));
  }, [attendanceRows, dashboardStudentCodes, shouldScopeDashboardByYear]);

  const dashboardAttendanceApprovedAbsenceRows = useMemo(() => {
    if (!shouldScopeDashboardByYear) return attendanceApprovedAbsenceRows;
    return attendanceApprovedAbsenceRows.filter((row) =>
      dashboardStudentCodes.has(row.studentCode)
    );
  }, [
    attendanceApprovedAbsenceRows,
    dashboardStudentCodes,
    shouldScopeDashboardByYear,
  ]);

  const dashboardChronicleGrouped = useMemo(() => {
    if (!shouldScopeDashboardByYear) return chronicleGrouped;
    return chronicleGrouped.filter((group) => dashboardStudentCodes.has(group.studentCode));
  }, [chronicleGrouped, dashboardStudentCodes, shouldScopeDashboardByYear]);

  const dashboardAttendanceGrouped = useMemo(() => {
    if (!shouldScopeDashboardByYear) return attendanceGrouped;
    return attendanceGrouped.filter((group) => dashboardStudentCodes.has(group.studentCode));
  }, [attendanceGrouped, dashboardStudentCodes, shouldScopeDashboardByYear]);

  const latestSavedAttendanceStartAt = useMemo(() => {
    const allDates = [
      ...attendanceRows.map((row) => row.startAtDate).filter(Boolean),
      ...attendanceApprovedAbsenceRows.map((row) => row.startAtDate).filter(Boolean),
    ];

    if (allDates.length === 0) {
      return "";
    }

    const latestDate = allDates.reduce((latest, current) =>
      current > latest ? current : latest
    );

    return latestDate.toISOString();
  }, [attendanceApprovedAbsenceRows, attendanceRows]);

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

      const parsedRows = (chronicleData || [])
        .map((record) => mapChronicleRecordToView(record, studentLookupByCode))
        .filter((record) => isTrackedChronicleType(record.chronicleType));

      setChronicleRows(parsedRows);
      return parsedRows;
    } catch (err) {
      setDataError(err.message || "Failed to load Chronicle records.");
      return [];
    }
  }

  const loadChronicleRowsEvent = useEffectEvent(loadChronicleRows);

  async function loadTodos() {
    const userId = authSession?.user?.id;

    if (!userId) {
      setTodos([]);
      return [];
    }

    try {
      const { data: todoData, error } = await supabase
        .from("todo_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

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

  async function loadAttendanceAbsenceRows(accessToken = authSession?.access_token) {
    if (!accessToken) {
      setAttendanceApprovedAbsenceRows([]);
      return [];
    }

    try {
      const absenceData = await fetchTableRows("attendance_absence_entries", accessToken, {
        column: "start_at",
        ascending: false,
      });

      const parsedRows = (absenceData || []).map((record) =>
        mapApprovedAbsenceRecordToView(record, studentLookupByCode)
      );
      setAttendanceApprovedAbsenceRows(parsedRows);
      return parsedRows;
    } catch (err) {
      setDataError(err.message || "Failed to load attendance absences.");
      return [];
    }
  }

  const loadAttendanceAbsenceRowsEvent = useEffectEvent(loadAttendanceAbsenceRows);

  useEffect(() => {
    if (!authSession?.access_token) {
      setChronicleRows([]);
      setAttendanceRows([]);
      setAttendanceApprovedAbsenceRows([]);
      setTodos([]);
      return;
    }

    loadChronicleRowsEvent(authSession.access_token);
    loadAttendanceRowsEvent(authSession.access_token);
    loadAttendanceAbsenceRowsEvent(authSession.access_token);
    loadTodosEvent();
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

  const upcomingSession = useMemo(() => {
    const futureSessions = sessions
      .filter((session) => session.date && session.date >= todayString)
      .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

    return futureSessions[0] || null;
  }, [sessions]);

  const upcomingSessionAssignments = useMemo(() => {
    if (!upcomingSession) return [];

    return entries
      .filter((entry) => entry.session_id === upcomingSession.id)
      .filter((entry) => !shouldScopeDashboardByYear || dashboardStudentNames.has(entry.student_name))
      .map((entry) => ({
        name: entry.student_name,
        reason: entry.reason,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dashboardStudentNames, entries, upcomingSession, shouldScopeDashboardByYear]);

  const dashboardStudentCount = shouldScopeDashboardByYear
    ? dashboardStudents.length
    : students.length;

  const dashboardStats = useMemo(
    () => [
      {
        label: "Students",
        value: dashboardStudentCount,
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
        label: "Upcoming Assigned",
        value: upcomingSessionAssignments.length,
        note: upcomingSession
          ? `Students in ${upcomingSession.name}`
          : "No future session scheduled",
      },
      {
        label: "Late Arrivals",
        value: dashboardAttendanceRows.length,
        note: "Attendance incidents imported",
      },
    ],
    [
      dashboardStudentCount,
      sessions.length,
      entries.length,
      upcomingSessionAssignments.length,
      upcomingSession,
      dashboardAttendanceRows.length,
    ]
  );

  const topChronicleStudents = useMemo(() => {
    const counts = {};
    dashboardChronicleRows.forEach((row) => {
      if (!row.studentName) return;
      counts[row.studentName] = (counts[row.studentName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 5);
  }, [dashboardChronicleRows]);

  const minorBehaviourTeachers = useMemo(() => {
    const counts = {};

    dashboardChronicleRows.forEach((row) => {
      if (String(row.chronicleType || "").trim().toLowerCase() !== "minor behaviour") {
        return;
      }

      const teacherName = String(row.originalPublisher || "").trim();
      if (!teacherName) return;

      counts[teacherName] = (counts[teacherName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [dashboardChronicleRows]);

  const chronicleTwoPlusThisWeek = useMemo(
    () => {
      const currentWeekEndingKey = getSchoolWeekEndingKey(
        getDashboardWeekReferenceDate(new Date())
      );

      return dashboardChronicleGrouped
        .filter((group) =>
          isGroupInCurrentSchoolWeek(group.rows, "occurredDate", currentWeekEndingKey)
        )
        .filter((group) => group.count >= 2)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 8)
        .map((group) => ({
          key: group.key,
          name: group.studentName,
          count: group.count,
          weekLabel: group.weekLabel,
          homegroup: group.homegroup,
          rows: group.rows,
        }));
    },
    [dashboardChronicleGrouped]
  );

  const topDetentionStudents = useMemo(
    () =>
      Object.entries(
        entries.reduce((counts, entry) => {
          if (shouldScopeDashboardByYear && !dashboardStudentNames.has(entry.student_name)) {
            return counts;
          }
          if (entry.student_name) {
            counts[entry.student_name] = (counts[entry.student_name] || 0) + 1;
          }
          return counts;
        }, {})
      )
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 5),
    [dashboardStudentNames, entries, shouldScopeDashboardByYear]
  );

  const missedDetentionStudents = useMemo(() => {
    const grouped = {};

    entries.forEach((entry) => {
      if (entry.attendance !== "Absent") return;
      if (shouldScopeDashboardByYear && !dashboardStudentNames.has(entry.student_name)) {
        return;
      }

      const key = entry.student_name || "";
      if (!key) return;

      if (!grouped[key]) {
        grouped[key] = {
          name: entry.student_name,
          count: 0,
          yearLevel: entry.year_level || "",
          homegroup: entry.homegroup || "",
        };
      }

      grouped[key].count += 1;
    });

    return Object.values(grouped)
      .sort(
        (a, b) =>
          Number(a.yearLevel || 0) - Number(b.yearLevel || 0) ||
          String(a.yearLevel || "").localeCompare(String(b.yearLevel || "")) ||
          String(a.homegroup || "").localeCompare(String(b.homegroup || "")) ||
          a.name.localeCompare(b.name)
      )
      .slice(0, 8);
  }, [dashboardStudentNames, entries, shouldScopeDashboardByYear]);

  const topAttendanceStudents = useMemo(() => {
    const counts = {};
    dashboardAttendanceRows.forEach((row) => {
      if (!row.studentName) return;
      counts[row.studentName] = (counts[row.studentName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 5);
  }, [dashboardAttendanceRows]);

  const lowAttendanceStudents = useMemo(() => {
    const schoolDaysElapsed = countVictorianSchoolDaysElapsedThisYear(new Date());
    if (schoolDaysElapsed <= 0) return [];

    const absentDatesByStudent = dashboardAttendanceApprovedAbsenceRows.reduce(
      (map, row) => {
        const studentCode = String(row.studentCode || "").trim();
        const startDate = row.startAtDate;

        if (!studentCode || !startDate) return map;

        const dayKey = formatDate(startDate);
        if (!map[studentCode]) {
          map[studentCode] = new Set();
        }
        map[studentCode].add(dayKey);
        return map;
      },
      {}
    );

    return dashboardStudents
      .map((student) => {
        const studentCode = String(student.student_code || "").trim();
        const absentDayCount = absentDatesByStudent[studentCode]?.size || 0;

        if (absentDayCount === 0) {
          return null;
        }

        const percentage = Number(
          (((schoolDaysElapsed - absentDayCount) / schoolDaysElapsed) * 100).toFixed(1)
        );

        return {
          name: `${student.first_name} ${student.last_name}`.trim(),
          studentCode: studentCode || "",
          percentage,
          absentDayCount,
          schoolDaysElapsed,
          homegroup: student.homegroup || "",
          yearLevel: String(student.year_level || ""),
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          a.percentage - b.percentage ||
          b.absentDayCount - a.absentDayCount ||
          a.name.localeCompare(b.name)
      )
      .slice(0, 8);
  }, [dashboardAttendanceApprovedAbsenceRows, dashboardStudents]);

  const attendanceTwoPlusThisWeek = useMemo(() => {
    const currentWeekEndingKey = getSchoolWeekEndingKey(
      getDashboardWeekReferenceDate(new Date())
    );

    return dashboardAttendanceGrouped
      .filter((group) =>
        isGroupInCurrentSchoolWeek(group.rows, "startAtDate", currentWeekEndingKey)
      )
      .filter((group) => group.count >= 2)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 8)
      .map((group) => ({
        key: group.key,
        name: group.studentName,
        count: group.count,
        weekLabel: group.weekLabel,
        homegroup: group.homegroup,
        rows: group.rows,
      }));
  }, [dashboardAttendanceGrouped]);

  if (!supabase) {
    return <ConfigScreen />;
  }

  if (booting) return <div>Loading...</div>;

  if (!authSession) {
    return (
        <AuthScreen
          mode={mode}
          setMode={setMode}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          handleSubmit={handleSubmit}
          handleForgotPassword={handleForgotPassword}
          error={error}
          message={message}
        />
    );
  }

  if (passwordRecoveryMode) {
    return (
      <div style={pageStyle}>
        {error ? <p style={statusErrorStyle}>{error}</p> : null}
        {message ? <p style={statusSuccessStyle}>{message}</p> : null}
        <AccountSettingsCard
          recoveryMode={passwordRecoveryMode}
          updatingPassword={updatingPassword}
          onUpdatePassword={handleUpdatePassword}
        />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <AppHeader
        handleLogout={handleLogout}
        onOpenAccount={() => setActivePage("account")}
        accountActive={activePage === "account"}
      />

      {error ? <p style={statusErrorStyle}>{error}</p> : null}
      {message ? <p style={statusSuccessStyle}>{message}</p> : null}

      {isSupervisor && activePage !== "account" ? (
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
          onSubmitRoll={handleSubmitRoll}
          rollSubmitting={rollSubmitting}
        />
      ) : (
        <>
          {!isSupervisor ? (
            isMobile ? (
              <div style={mobileNavBarStyle}>
                {pages.map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    style={{
                      ...mobileNavButtonStyle,
                      ...(activePage === page.id ? navButtonActiveStyle : {}),
                    }}
                    onClick={() => setActivePage(page.id)}
                  >
                    {page.label}
                  </button>
                ))}
              </div>
            ) : (
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
            )
          ) : null}

          {activePage === "dashboard" ? (
            <DashboardHome
              stats={dashboardStats}
              showYearFilters={!isSupervisor}
              availableYearLevels={availableDashboardYearLevels}
              selectedYearLevels={dashboardYearLevels}
              onToggleYearLevel={(yearLevel) =>
                setDashboardYearFilter((current) =>
                  current.includes(yearLevel)
                    ? current.filter((level) => level !== yearLevel)
                    : [...current, yearLevel].sort(
                        (a, b) => Number(a) - Number(b) || a.localeCompare(b)
                      )
                )
              }
              onClearYearLevels={() => setDashboardYearFilter([])}
              topChronicleStudents={topChronicleStudents}
              minorBehaviourTeachers={minorBehaviourTeachers}
              chronicleTwoPlusThisWeek={chronicleTwoPlusThisWeek}
              topAttendanceStudents={topAttendanceStudents}
              attendanceTwoPlusThisWeek={attendanceTwoPlusThisWeek}
              lowAttendanceStudents={lowAttendanceStudents}
              topDetentionStudents={topDetentionStudents}
              missedDetentionStudents={missedDetentionStudents}
              upcomingSession={upcomingSession}
              upcomingSessionAssignments={upcomingSessionAssignments}
              todos={todos.map((todo) => ({
                id: todo.id,
                studentName: todo.student_name,
                text: todo.task_text,
                done: todo.is_done,
                dueDate: todo.due_date,
                isOverdue: isTodoOverdue(todo.due_date, todo.is_done),
              }))}
              studentOptions={dashboardStudents
                .map((student) => `${student.first_name} ${student.last_name}`.trim())
                .sort((a, b) => a.localeCompare(b))}
              creatingTodo={creatingTodo}
              updatingTodoId={updatingTodoId}
              deletingTodoId={deletingTodoId}
              onAddTodo={handleAddTodo}
              onToggleTodo={handleToggleTodo}
              onDeleteTodo={handleDeleteTodo}
              setSelectedStudent={setSelectedStudent}
            />
          ) : null}

          {activePage === "account" ? (
            <>
              <AccountSettingsCard
                recoveryMode={passwordRecoveryMode}
                updatingPassword={updatingPassword}
                onUpdatePassword={handleUpdatePassword}
              />

              {isAdmin ? (
                <AdminAccountsCard
                  accounts={accounts}
                  loadingAccounts={loadingAccounts}
                  creatingAccount={creatingAccount}
                  savingAccountId={savingAccountId}
                  deletingAccountId={deletingAccountId}
                  resettingPasswordId={resettingPasswordId}
                  onCreateAccount={handleCreateAccount}
                  onUpdateAccount={handleUpdateAccount}
                  onDeleteAccount={handleDeleteAccount}
                  onResetPassword={handleResetAccountPassword}
                />
              ) : null}
            </>
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

              <MissedDetentionCard
                missedEntries={missedDetentionEntries}
                sessions={sessions}
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
                entrySavingId={entrySavingId}
                setSelectedStudent={setSelectedStudent}
              />

              <StudentHistoryCard
                selectedStudent={selectedStudent}
                getStudentHistory={getStudentHistory}
              />
            </>
          ) : null}

          {activePage === "supervisor" ? (
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
              onSubmitRoll={handleSubmitRoll}
              rollSubmitting={rollSubmitting}
            />
          ) : null}

          {activePage === "chronicle" ? (
            <ChronicleImportCard
              handleChronicleSync={handleChronicleSync}
              handleChronicleUpload={handleChronicleUpload}
              chronicleSyncModifiedSince={chronicleSyncModifiedSince}
              setChronicleSyncModifiedSince={setChronicleSyncModifiedSince}
              chronicleSyncing={chronicleSyncing}
              chronicleYearLevels={chronicleYearLevels}
              setChronicleYearFilter={setChronicleYearFilter}
              chronicleOnly3Plus={chronicleOnly3Plus}
              setChronicleOnly3Plus={setChronicleOnly3Plus}
              chronicleSessionId={chronicleSessionId}
              setChronicleSessionId={setChronicleSessionId}
              sessions={sessions}
              chronicleYearOptions={chronicleYearOptions}
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
              handleAttendanceSync={handleAttendanceSync}
              handleAttendanceUpload={handleAttendanceUpload}
              attendanceSyncing={attendanceSyncing}
              attendancePreviewMode={attendancePreviewMode}
              attendanceYearLevels={attendanceYearLevels}
              setAttendanceYearFilter={setAttendanceYearFilter}
              attendanceOnly3Plus={attendanceOnly3Plus}
              setAttendanceOnly3Plus={setAttendanceOnly3Plus}
              attendanceSessionId={attendanceSessionId}
              setAttendanceSessionId={setAttendanceSessionId}
              sessions={sessions}
              attendanceYearOptions={attendanceYearOptions}
              assignSelectedAttendanceGroups={assignSelectedAttendanceGroups}
              filteredAttendance={filteredAttendance}
              filteredAttendanceApprovedAbsences={filteredAttendanceApprovedAbsences}
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

  const text = String(value).trim();
  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );
  if (match) {
    let [, day, month, year, hour, minute, meridiem] = match;
    let h = Number(hour);

    if (meridiem.toUpperCase() === "PM" && h !== 12) h += 12;
    if (meridiem.toUpperCase() === "AM" && h === 12) h = 0;

    return new Date(Number(year), Number(month) - 1, Number(day), h, Number(minute));
  }

  const nativeDate = new Date(text);
  if (!Number.isNaN(nativeDate.getTime())) {
    return nativeDate;
  }

  return null;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeYearLevels(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (value == null) {
    return [];
  }

  return [String(value).trim()].filter(Boolean);
}

function getStudentAttendancePercentageValue(record) {
  return (
    record["attendance percentage"] ||
    record["attendance %"] ||
    record["attendance percent"] ||
    record["attendance"] ||
    ""
  );
}

function parseAttendancePercentageValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const normalized = text.replace(/%/g, "").trim();
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.min(100, Number(parsed.toFixed(1))));
}

const VICTORIAN_TERM_RANGES_2026 = [
  { start: "2026-01-28", end: "2026-04-02" },
  { start: "2026-04-20", end: "2026-06-26" },
  { start: "2026-07-13", end: "2026-09-18" },
  { start: "2026-10-05", end: "2026-12-18" },
];

function parseIsoDateOnly(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function countWeekdaysInclusive(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start > end) return 0;

  let count = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

function countVictorianSchoolDaysElapsedThisYear(referenceDate = new Date()) {
  if (referenceDate.getFullYear() !== 2026) {
    return 0;
  }

  return VICTORIAN_TERM_RANGES_2026.reduce((total, term) => {
    const termStart = parseIsoDateOnly(term.start);
    const termEnd = parseIsoDateOnly(term.end);
    const effectiveEnd = referenceDate < termEnd ? referenceDate : termEnd;

    if (!termStart || !termEnd || effectiveEnd < termStart) {
      return total;
    }

    return total + countWeekdaysInclusive(termStart, effectiveEnd);
  }, 0);
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

function getSchoolWeekEndingDate(date) {
  const weekEnding = new Date(date);
  const day = weekEnding.getDay();
  const daysSinceFriday = (day - 5 + 7) % 7;
  weekEnding.setDate(weekEnding.getDate() - daysSinceFriday + 7);
  return weekEnding;
}

function getSchoolWeekEndingKey(date) {
  return formatDate(getSchoolWeekEndingDate(date));
}

function getDashboardWeekReferenceDate(date) {
  const referenceDate = new Date(date);
  referenceDate.setHours(0, 0, 0, 0);

  if (referenceDate.getDay() === 5) {
    referenceDate.setDate(referenceDate.getDate() - 1);
  }

  return referenceDate;
}

function isGroupInCurrentSchoolWeek(rows, dateField, currentWeekEndingKey) {
  return (rows || []).some((row) => {
    const date = row?.[dateField];
    if (!date) return false;
    return getSchoolWeekEndingKey(date) === currentWeekEndingKey;
  });
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
  const isClassLate = String(arrivalTimeText || "").trim() === "-";

  if (
    !studentCode ||
    !startDate ||
    (!isClassLate && (!arrivalDate || arrivalDate <= startDate))
  ) {
    return null;
  }

  const minutesLate =
    arrivalDate && arrivalDate > startDate
      ? Math.round((arrivalDate - startDate) / 60000)
      : 0;
  const period = getChronicleValue(row, "Period");
  const activityCode = getChronicleValue(row, "ActivityCode", "Activity Code");

  return {
    id: `${studentCode}-${formatDateTimeForSql(startDate)}-${period || activityCode || "late"}`,
    student_code: studentCode,
    start_time_text: startTimeText || "",
    start_at: formatDateTimeForSql(startDate),
    arrival_time_text: arrivalTimeText || "",
    arrival_at: arrivalDate ? formatDateTimeForSql(arrivalDate) : null,
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
    occurredText: occurredDate
      ? formatDisplayDate(occurredDate)
      : record.occurred_timestamp || "",
    occurredDate,
    weekKey: occurredDate ? getFridayWeekKey(occurredDate) : record.week_key || "unknown-week",
    weekLabel:
      occurredDate ? getFridayWeekLabel(occurredDate) : record.week_label || "Unknown week",
    chronicleType: record.chronicle_type || "",
    details: normalizeChronicleDetails(record.details),
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
  const attendanceType = classifyAttendanceType(record);

  return {
    key: record.id,
    id: record.id,
    studentCode: record.student_code || "",
    studentName,
    yearLevel: String(student?.year_level || ""),
    homegroup: student?.homegroup || "",
    startText: startDate ? formatDisplayDateTime(startDate) : record.start_time_text || "",
    arrivalText:
      record.arrival_at && parseChronicleDate(record.arrival_at)
        ? formatDisplayTime(parseChronicleDate(record.arrival_at))
        : record.arrival_time_text || "",
    period: record.period || "",
    activityName: record.activity_name || "",
    sourceType: record.source_type || "",
    statusName: record.status_name || "",
    statusCode: record.status_code || "",
    absentDayPattern: Boolean(record.absent_day_pattern),
    statusDescription: record.status_description || "",
    attendanceType,
    attendanceDescription:
      record.status_description ||
      (attendanceType === "School late" ? "Late to school" : "Late to class"),
    teacher: record.teacher || "",
    minutesLate: Number(record.minutes_late || 0),
    startAtDate: startDate,
    weekKey: startDate ? getFridayWeekKey(startDate) : record.week_key || "unknown-week",
    weekLabel:
      startDate ? getFridayWeekLabel(startDate) : record.week_label || "Unknown week",
  };
}

function mapApprovedAbsenceRecordToView(record, studentLookupByCode = {}) {
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
    startText: startDate ? formatDisplayDate(startDate) : record.start_time_text || "",
    startAtDate: startDate,
    periodsText: record.periods || "",
    statusName: record.status_name || "",
    statusCode: record.status_code || "",
    statusDescription: record.status_description || "",
    weekKey: startDate ? getFridayWeekKey(startDate) : record.week_key || "unknown-week",
    weekLabel:
      startDate ? getFridayWeekLabel(startDate) : record.week_label || "Unknown week",
  };
}

function classifyAttendanceType(record) {
  const sourceType = String(record?.source_type || "").trim().toLowerCase();
  const statusName = String(record?.status_name || "").trim().toLowerCase();
  const statusCode = String(record?.status_code || "").trim().toUpperCase();
  const period = String(record?.period || "").trim().toUpperCase();
  const hasArrival =
    Boolean(record?.arrival_at) ||
    (String(record?.arrival_time_text || "").trim() !== "" &&
      String(record?.arrival_time_text || "").trim() !== "-");

  if (
    period === "S1" &&
    (!statusName ||
      statusCode === "L" ||
      statusCode === "LU" ||
      statusCode === "LA" ||
      statusName.includes("late"))
  ) {
    return "School late";
  }

  if (statusName === "late to class" || statusCode === "L") {
    return "Class late";
  }

  if (
    sourceType === "period" &&
    !hasArrival &&
    (statusCode === "LU" || statusCode === "LA" || statusName.includes("late arrival at school"))
  ) {
    return "Class late";
  }

  if (hasArrival || statusCode === "LU" || statusCode === "LA") {
    return "School late";
  }

  return statusName || "Class late";
}

function isTrackedAttendancePeriod(period) {
  const normalizedPeriod = String(period || "").trim().toUpperCase();
  return normalizedPeriod === "S1" ||
    normalizedPeriod === "S2" ||
    normalizedPeriod === "S3" ||
    normalizedPeriod === "S4";
}

function isParentApprovedAttendanceStatus(statusName, statusCode) {
  const normalizedStatusName = String(statusName || "").trim().toLowerCase();
  const normalizedStatusCode = String(statusCode || "").trim().toUpperCase();

  return normalizedStatusCode === "LA" || normalizedStatusName.includes("parent approved");
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

function normalizeChronicleDetails(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  const overviewMatch = text.match(/(?:^|[|~\n\r])\s*Overview:\s*(.*?)(?=\s*(?:\||~|[A-Za-z ]+:|$))/i);
  if (overviewMatch?.[1]) {
    return overviewMatch[1].trim();
  }

  const pipeIndex = text.indexOf("|");
  if (pipeIndex !== -1) {
    return text.slice(0, pipeIndex).trim();
  }

  return text;
}

function cleanChronicleType(value) {
  return String(value || "")
    .replace(/\*/g, "")
    .trim();
}

function isTrackedChronicleType(value) {
  const normalized = cleanChronicleType(value).toLowerCase();
  return (
    normalized === "minor behaviour" || normalized === "major behaviour"
  );
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

function formatDisplayDateTime(date) {
  return date.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDisplayDate(date) {
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDisplayTime(date) {
  return date.toLocaleString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
