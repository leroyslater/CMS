import { useEffect, useEffectEvent, useMemo, useState } from "react";
import AddStudentCard from "./components/AddStudentCard";
import AppHeader from "./components/AppHeader";
import AuthScreen from "./components/AuthScreen";
import ChronicleImportCard from "./components/ChronicleImportCard";
import ConfigScreen from "./components/ConfigScreen";
import CreateSessionCard from "./components/CreateSessionCard";
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
  const [selectedChronicleKeys, setSelectedChronicleKeys] = useState([]);
  const [selectedChronicleKey, setSelectedChronicleKey] = useState("");
  const [chronicleSearch, setChronicleSearch] = useState("");
  const [chronicleYearFilter, setChronicleYearFilter] = useState("");
  const [chronicleHomegroupFilter, setChronicleHomegroupFilter] = useState("");
  const [chronicleOnly3Plus, setChronicleOnly3Plus] = useState(false);

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
  const [message, setMessage] = useState("");
  const error = authError || dataError;
  const currentEntry = newEntry.sessionId
    ? newEntry
    : { ...newEntry, sessionId: selectedSessionId };
  const isSupervisor = (profile?.role || "coordinator") === "supervisor";

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
      const rows = text
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter(Boolean);

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

  async function handleChronicleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    clearError();
    setMessage("");

    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).filter(Boolean);

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

      const missingStudentCodes = Array.from(
        new Set(
          chroniclePayload
            .map((record) => record.student_code)
            .filter((studentCode) => !studentLookupByCode[studentCode])
        )
      );

      if (missingStudentCodes.length > 0) {
        setDataError(
          `Chronicle import skipped because these student codes are missing from Students: ${missingStudentCodes.join(", ")}`
        );
        return;
      }

      const accessToken = authSession?.access_token;
      if (!accessToken) {
        setDataError("You need to be signed in before importing Chronicle data.");
        return;
      }

      try {
        await upsertTableRows(
          "chronicle_entries",
          chroniclePayload,
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
      setSelectedChronicleKeys([]);
      setSelectedChronicleKey("");
      setMessage(
        `Saved ${chroniclePayload.length} Chronicle records and loaded ${parsedRows.length} minor behaviour records.`
      );
    } catch (err) {
      setDataError(err.message || "Failed to parse Chronicle file.");
    } finally {
      e.target.value = "";
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

  const chronicleYearOptions = useMemo(
    () =>
      Array.from(
        new Set(chronicleGrouped.map((g) => g.yearLevel).filter(Boolean))
      ).sort(),
    [chronicleGrouped]
  );

  const chronicleHomegroupOptions = useMemo(
    () =>
      Array.from(
        new Set(chronicleGrouped.map((g) => g.homegroup).filter(Boolean))
      ).sort(),
    [chronicleGrouped]
  );

  const selectedChronicleGroup = useMemo(
    () => chronicleGrouped.find((g) => g.key === selectedChronicleKey) || null,
    [chronicleGrouped, selectedChronicleKey]
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

      const parsedRows = (chronicleData || [])
        .map((record) => mapChronicleRecordToView(record, studentLookupByCode))
        .filter((row) => isMinorChronicle(row.chronicleType));

      setChronicleRows(parsedRows);
      return parsedRows;
    } catch (err) {
      setDataError(err.message || "Failed to load Chronicle records.");
      return [];
    }
  }

  const loadChronicleRowsEvent = useEffectEvent(loadChronicleRows);

  useEffect(() => {
    if (!authSession?.access_token) {
      setChronicleRows([]);
      return;
    }

    loadChronicleRowsEvent(authSession.access_token);
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

  function toggleChronicleSelection(key) {
    setSelectedChronicleKeys((prev) =>
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
    ],
    [students.length, sessions.length, entries.length, repeatStudents.length]
  );

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

          <RepeatOffendersCard
            repeatStudents={repeatStudents}
            getStudentFlag={getStudentFlag}
            setSelectedStudent={setSelectedStudent}
          />

          <StudentHistoryCard
            selectedStudent={selectedStudent}
            getStudentHistory={getStudentHistory}
          />

          <StudentUploadCard
            handleStudentUpload={handleStudentUpload}
            studentCount={students.length}
          />
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

function isMinorChronicle(value) {
  return String(value || "").toLowerCase().includes("minor");
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
