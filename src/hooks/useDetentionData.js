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
      name: getDefaultSessionName(todayString),
      date: todayString,
      time: "3:15pm",
      location: "Room 218",
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

const VICTORIAN_TERM_WEEKS_2026 = [
  { term: 1, firstWeekEnding: "2026-01-30", lastWeekEnding: "2026-04-03" },
  { term: 2, firstWeekEnding: "2026-04-24", lastWeekEnding: "2026-06-26" },
  { term: 3, firstWeekEnding: "2026-07-17", lastWeekEnding: "2026-09-18" },
  { term: 4, firstWeekEnding: "2026-10-09", lastWeekEnding: "2026-12-18" },
];

function getDefaultSessionName(baseDateString) {
  const referenceDate = parseIsoDateOnly(baseDateString);
  if (!referenceDate) {
    return "Monday";
  }

  const upcomingMonday = getUpcomingMonday(referenceDate);
  const weekEnding = getWeekEndingFriday(upcomingMonday);
  const termWeek = getVictorianTermWeek(weekEnding);

  if (!termWeek) {
    return "Monday";
  }

  return `Term ${termWeek.term} Week ${termWeek.week} Monday`;
}

function parseIsoDateOnly(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getUpcomingMonday(date) {
  const monday = new Date(date);
  const day = monday.getDay();
  const daysUntilMonday = day === 1 ? 0 : ((8 - day) % 7 || 7);
  monday.setDate(monday.getDate() + daysUntilMonday);
  return monday;
}

function getWeekEndingFriday(date) {
  const friday = new Date(date);
  const day = friday.getDay();
  const daysUntilFriday = (5 - day + 7) % 7;
  friday.setDate(friday.getDate() + daysUntilFriday);
  return friday;
}

function getVictorianTermWeek(weekEndingDate) {
  const weekEndingKey = [
    weekEndingDate.getFullYear(),
    String(weekEndingDate.getMonth() + 1).padStart(2, "0"),
    String(weekEndingDate.getDate()).padStart(2, "0"),
  ].join("-");

  const term = VICTORIAN_TERM_WEEKS_2026.find(
    (item) =>
      weekEndingKey >= item.firstWeekEnding && weekEndingKey <= item.lastWeekEnding
  );

  if (!term) return null;

  const firstWeekEnding = parseIsoDateOnly(term.firstWeekEnding);
  const weekOffset = Math.round((weekEndingDate - firstWeekEnding) / 604800000);

  return {
    term: term.term,
    week: weekOffset + 1,
  };
}
