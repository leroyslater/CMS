import { useEffect, useEffectEvent, useState } from "react";
import { fetchTableRows } from "../lib/supabaseRest";
import { supabase } from "../lib/supabaseClient";

export function useDetentionData(authSession, todayString) {
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [chronicleSessionId, setChronicleSessionId] = useState("");
  const [dataError, setDataError] = useState("");

  async function loadData() {
    setDataError("");

    const { data: studentsData, error: studentsError } = await runRestRead(
      () =>
        fetchTableRows("students", authSession.access_token, {
          column: "last_name",
          ascending: true,
        }),
      "students"
    );

    const { data: sessionsData, error: sessionsError } = await runRestRead(
      () =>
        fetchTableRows("sessions", authSession.access_token, {
          column: "date",
          ascending: true,
        }),
      "sessions"
    );

    const { data: entriesData, error: entriesError } = await runRestRead(
      () =>
        fetchTableRows("entries", authSession.access_token, {
          column: "student_name",
          ascending: true,
        }),
      "entries"
    );

    if (studentsError || sessionsError || entriesError) {
      setDataError(
        studentsError?.message ||
          sessionsError?.message ||
          entriesError?.message ||
          "Failed to load data."
      );
      return {
        students: [],
        sessions: [],
        entries: [],
        firstSessionId: "",
      };
    }

    const safeStudents = studentsData || [];
    const safeSessions = sessionsData || [];
    const safeEntries = entriesData || [];
    const firstSessionId = safeSessions[0]?.id || "";

    setStudents(safeStudents);
    setSessions(safeSessions);
    setEntries(safeEntries);
    setSelectedSessionId((prev) => prev || firstSessionId);
    setChronicleSessionId((prev) => prev || firstSessionId);

    return {
      students: safeStudents,
      sessions: safeSessions,
      entries: safeEntries,
      firstSessionId,
    };
  }

  const loadDataEvent = useEffectEvent(loadData);

  useEffect(() => {
    if (!supabase || !authSession?.user) {
      return;
    }

    Promise.resolve().then(() => {
      loadDataEvent();
    });
  }, [authSession]);

  function prependSession(session) {
    setSessions((prev) => [session, ...prev]);
    setSelectedSessionId(session.id);
    setChronicleSessionId(session.id);
  }

  function replaceSession(sessionId, updates) {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId ? { ...session, ...updates } : session
      )
    );
  }

  function removeSession(sessionId) {
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    setSelectedSessionId((prev) => (prev === sessionId ? "" : prev));
    setChronicleSessionId((prev) => (prev === sessionId ? "" : prev));
  }

  function prependEntry(entry) {
    setEntries((prev) => [entry, ...prev]);
  }

  function replaceEntry(entryId, updates) {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, ...updates } : entry
      )
    );
  }

  function removeEntry(entryId) {
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  }

  function resetNewSession() {
    return {
      name: "",
      date: todayString,
      time: "",
      location: "",
      supervisor: "",
    };
  }

  function resetNewEntry(sessionId = selectedSessionId) {
    return {
      sessionId,
      studentId: "",
      studentName: "",
      yearLevel: "",
      homegroup: "",
      reason: "",
      issuedBy: "",
    };
  }

  return {
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
  };
}

async function runRestRead(runQuery, label) {
  try {
    const data = await runQuery();
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err?.message || `Failed to load ${label}.`,
      },
    };
  }
}
