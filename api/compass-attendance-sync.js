/* global process */

import { createClient } from "@supabase/supabase-js";

const PERIOD_PAGE_SIZE = 5000;
const MAX_BATCH_SIZE = 500;
const EXISTING_LOOKUP_BATCH_SIZE = 50;
const SCHOOL_LATE_SLICE_TYPE = 30;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const compassBaseUrl = process.env.COMPASS_BASE_URL;
  const compassApiKey = process.env.COMPASS_API_KEY;
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return res.status(500).json({ error: "Server auth configuration is missing." });
  }

  if (!compassBaseUrl || !compassApiKey) {
    return res.status(500).json({ error: "Compass server configuration is missing." });
  }

  if (!token) {
    return res.status(401).json({ error: "Missing auth token." });
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const requesterSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const requester = await getAllowedRequester(requesterSupabase, adminSupabase);
  if (requester.error) {
    return res.status(requester.status).json({ error: requester.error });
  }

  const { fromDate, toDate, previewOnly, latestKnownStartAt } = req.body || {};
  const dateRange = normalizeDateRange(fromDate, toDate);
  const modifiedSinceTimestamp = normalizeAttendanceModifiedSince(
    latestKnownStartAt,
    dateRange.fromDate
  );

  try {
    console.log("[compass-attendance-sync] Starting sync", {
      requesterId: requester.user.id,
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
      modifiedSinceTimestamp,
      compassBaseUrl,
    });

    const [studentMappings, statuses, periodLines] = await Promise.all([
      fetchStudentsBasic({ compassApiKey, compassBaseUrl }).catch((error) => {
        throw new Error(`Compass GetStudentsBasic failed: ${error.message}`);
      }),
      fetchAttendanceStatuses({ compassApiKey, compassBaseUrl }).catch((error) => {
        throw new Error(`Compass GetStatuses failed: ${error.message}`);
      }),
      fetchPeriodLines({
        compassApiKey,
        compassBaseUrl,
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        modifiedSinceTimestamp,
      }).catch((error) => {
        throw new Error(`Compass GetPeriodLines failed: ${error.message}`);
      }),
    ]);
    const schoolLines = previewOnly
      ? await fetchSchoolLines({
          compassApiKey,
          compassBaseUrl,
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
        }).catch((error) => {
          throw new Error(`Compass GetLines failed: ${error.message}`);
        })
      : [];

    const studentCodeByPersonId = buildStudentCodeByPersonId(studentMappings);
    const statusById = buildStatusById(statuses);
    const absentDayPatternKeys = buildAbsentDayPatternKeys(periodLines, statusById);
    const approvedAbsenceRecords = buildApprovedAbsenceRecords(
      periodLines,
      studentCodeByPersonId,
      statusById
    );
    const trackedLateRecords = buildTrackedLatePeriodRecords(
      periodLines,
      studentCodeByPersonId,
      statusById,
      absentDayPatternKeys
    );
    const rawRecords = trackedLateRecords;
    const dedupedRecords = Array.from(
      rawRecords.reduce((map, record) => {
        map.set(record.id, record);
        return map;
      }, new Map()).values()
    );
    const duplicateCount = rawRecords.length - dedupedRecords.length;

    const studentCodes = Array.from(new Set(dedupedRecords.map((record) => record.student_code)));
    const absenceStudentCodes = Array.from(
      new Set(approvedAbsenceRecords.map((record) => record.student_code))
    );
    const existingStudentCodes = await fetchExistingStudentCodes(adminSupabase, studentCodes);
    const existingAbsenceStudentCodes = await fetchExistingStudentCodes(
      adminSupabase,
      absenceStudentCodes
    );
    const missingStudentCodes = studentCodes.filter((code) => !existingStudentCodes.has(code));
    const missingAbsenceStudentCodes = absenceStudentCodes.filter(
      (code) => !existingAbsenceStudentCodes.has(code)
    );
    const topPeriodStatuses = summarizePeriodStatuses(periodLines, statusById);
    const topSchoolStatuses = summarizeSchoolStatuses(schoolLines, statusById);
    const latePeriodStatuses = summarizeLatePeriodStatuses(periodLines, statusById);
    const lateSchoolStatuses = summarizeLateSchoolStatuses(schoolLines, statusById);

    if (previewOnly) {
      const previewRecords = [
        ...buildPreviewPeriodRecords(
          periodLines,
          studentCodeByPersonId,
          statusById,
          absentDayPatternKeys
        ),
        ...buildPreviewSchoolRecords(schoolLines, studentCodeByPersonId, statusById),
      ];
      const dedupedPreviewRecords = Array.from(
        previewRecords.reduce((map, record) => {
          map.set(record.id, record);
          return map;
        }, new Map()).values()
      );

      return res.status(200).json({
        previewCount: dedupedPreviewRecords.length,
        duplicateCount,
        missingStudentCodes,
        schoolLateCount: dedupedPreviewRecords.filter(
          (record) => normalizeText(record.source_type) === "school"
        ).length,
        classLateCount: dedupedPreviewRecords.filter(
          (record) => normalizeText(record.status_name).includes("late to class")
        ).length,
        records: dedupedPreviewRecords,
        totalPeriodLines: periodLines.length,
        totalSchoolLines: schoolLines.length,
        topPeriodStatuses,
        topSchoolStatuses,
        latePeriodStatuses,
        lateSchoolStatuses,
        approvedAbsenceRecords,
      });
    }

    const validRecords = dedupedRecords.filter((record) =>
      existingStudentCodes.has(record.student_code)
    );
    const validApprovedAbsenceRecords = approvedAbsenceRecords.filter((record) =>
      existingAbsenceStudentCodes.has(record.student_code)
    );
    console.log("[compass-attendance-sync] Save candidate summary", {
      periodLines: periodLines.length,
      trackedLateRecords: trackedLateRecords.length,
      dedupedRecords: dedupedRecords.length,
      validRecords: validRecords.length,
      missingStudentCodes: missingStudentCodes.length,
      validApprovedAbsenceRecords: validApprovedAbsenceRecords.length,
      missingAbsenceStudentCodes: missingAbsenceStudentCodes.length,
    });
    const existingIds = await fetchExistingAttendanceIds(
      adminSupabase,
      validRecords.map((record) => record.id)
    );

    await upsertAttendanceRows(adminSupabase, validRecords);
    await upsertAttendanceAbsenceRows(adminSupabase, validApprovedAbsenceRecords);

    return res.status(200).json({
      syncedCount: validRecords.length,
      insertedCount: validRecords.filter((record) => !existingIds.has(record.id)).length,
      updatedCount: validRecords.filter((record) => existingIds.has(record.id)).length,
      duplicateCount,
      missingStudentCodes,
      schoolLateCount: validRecords.filter((record) => record.arrival_at).length,
      classLateCount: validRecords.filter((record) => record.arrival_time_text === "-").length,
      approvedAbsenceRecords: validApprovedAbsenceRecords,
      totalPeriodLines: periodLines.length,
      totalSchoolLines: schoolLines.length,
    });
  } catch (error) {
    console.error("[compass-attendance-sync] Sync failed", {
      message: error?.message,
      causeMessage: error?.cause?.message,
      causeCode: error?.cause?.code,
      causeErrno: error?.cause?.errno,
      stack: error?.stack,
    });

    const rootCause =
      error?.cause?.message ||
      error?.cause?.code ||
      error?.cause?.errno ||
      "";
    return res.status(500).json({
      error: rootCause
        ? `${error?.message || "Failed to sync attendance records from Compass."} (${rootCause})`
        : error?.message || "Failed to sync attendance records from Compass.",
    });
  }
}

async function getAllowedRequester(requesterSupabase, adminSupabase) {
  const {
    data: { user },
    error: userError,
  } = await requesterSupabase.auth.getUser();

  if (userError || !user) {
    return { status: 401, error: "Invalid auth token." };
  }

  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { status: 500, error: profileError.message };
  }

  if (!["coordinator", "admin"].includes(profile?.role)) {
    return { status: 403, error: "Only coordinators and admins can sync attendance data." };
  }

  return { status: 200, user };
}

function normalizeDateRange(fromDate, toDate) {
  const today = new Date();
  const end = parseDateOnly(toDate) || today;
  const start = parseDateOnly(fromDate) || new Date(end.getFullYear(), end.getMonth(), 1);

  if (start > end) {
    return {
      fromDate: formatIsoDateOnly(end),
      toDate: formatIsoDateOnly(start),
    };
  }

  return {
    fromDate: formatIsoDateOnly(start),
    toDate: formatIsoDateOnly(end),
  };
}

function normalizeAttendanceModifiedSince(latestKnownStartAt, fallbackFromDate) {
  const latestDateTime = parseIsoDateTime(latestKnownStartAt);
  if (latestDateTime) {
    return latestDateTime.toISOString();
  }

  return `${fallbackFromDate}T00:00:00.000Z`;
}

async function fetchStudentsBasic({ compassApiKey, compassBaseUrl }) {
  const url = `${String(compassBaseUrl || "").replace(/\/$/, "")}/api/person/v1/GetStudentsBasic`;
  const variants = [
    { method: "POST", body: JSON.stringify({}) },
    { method: "POST", body: JSON.stringify({ request: {} }) },
    { method: "GET" },
  ];

  let lastError = null;

  for (const variant of variants) {
    let response;

    try {
      response = await fetch(url, {
        method: variant.method,
        headers: {
          CompassApiKey: compassApiKey,
          "Content-Type": "application/json",
        },
        body: variant.body,
      });
    } catch (error) {
      lastError = error;
      continue;
    }

    if (!response.ok) {
      lastError = new Error(
        (await readCompassError(response)) ||
          `Compass student lookup failed with HTTP ${response.status}`
      );
      continue;
    }

    const payload = await response.json();
    if (Array.isArray(payload?.d)) return payload.d;
    if (Array.isArray(payload?.data)) return payload.data;
  }

  throw new Error(`Failed to fetch Compass students from ${url}`, {
    cause: lastError || undefined,
  });
}

async function fetchAttendanceStatuses({ compassApiKey, compassBaseUrl }) {
  const url = `${String(compassBaseUrl || "").replace(/\/$/, "")}/api/attendance/v3/GetStatuses`;
  const variants = [
    { method: "POST", body: JSON.stringify({}) },
    { method: "POST", body: JSON.stringify({ request: {} }) },
    { method: "GET" },
  ];

  let lastError = null;

  for (const variant of variants) {
    let response;

    try {
      response = await fetch(url, {
        method: variant.method,
        headers: {
          CompassApiKey: compassApiKey,
          "Content-Type": "application/json",
        },
        body: variant.body,
      });
    } catch (error) {
      lastError = error;
      continue;
    }

    if (!response.ok) {
      lastError = new Error(
        (await readCompassError(response)) ||
          `Compass attendance statuses failed with HTTP ${response.status}`
      );
      continue;
    }

    const payload = await response.json();
    if (Array.isArray(payload?.d)) return payload.d;
    if (Array.isArray(payload?.data)) return payload.data;
  }

  throw new Error(`Failed to fetch Compass attendance statuses from ${url}`, {
    cause: lastError || undefined,
  });
}

async function fetchPeriodLines({
  compassApiKey,
  compassBaseUrl,
  fromDate,
  toDate,
  modifiedSinceTimestamp,
}) {
  const url = `${String(compassBaseUrl || "").replace(/\/$/, "")}/API/V4/Attendance/GetPeriodLines`;
  const records = [];
  let skip = 0;
  let total = Number.POSITIVE_INFINITY;

  while (skip < total) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        CompassApiKey: compassApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        request: {
          lBound: `${fromDate}T00:00:00.000Z`,
          uBound: `${toDate}T23:59:59.999Z`,
          modifiedSinceTimestamp,
          skip,
          take: PERIOD_PAGE_SIZE,
        },
      }),
    });

    if (!response.ok) {
      const message = await readCompassError(response);
      console.error("[compass-attendance-sync] GetPeriodLines HTTP error", {
        status: response.status,
        url,
        fromDate,
        toDate,
        modifiedSinceTimestamp,
        skip,
        message,
      });
      throw new Error(message || `Compass attendance period lines failed with HTTP ${response.status}`);
    }

    const payload = await response.json();
    const pageRecords = payload?.d?.data || payload?.d || payload?.data || [];
    const pageTotal = payload?.d?.total ?? payload?.total ?? pageRecords.length;

    if (!Array.isArray(pageRecords)) {
      break;
    }

    records.push(...pageRecords);
    total = Number.isFinite(pageTotal) ? pageTotal : records.length;

    if (pageRecords.length < PERIOD_PAGE_SIZE) {
      break;
    }

    skip += pageRecords.length;
  }

  return records;
}

async function fetchSchoolLines({ compassApiKey, compassBaseUrl, fromDate, toDate }) {
  const url = `${String(compassBaseUrl || "").replace(/\/$/, "")}/api/attendance/v3/GetLines`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      CompassApiKey: compassApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lBound: `${fromDate}T00:00:00.000Z`,
      uBound: `${toDate}T23:59:59.999Z`,
      modifiedSince: `${fromDate}T00:00:00.000Z`,
      sliceType: SCHOOL_LATE_SLICE_TYPE,
    }),
  });

  if (!response.ok) {
    const message = await readCompassError(response);
    throw new Error(message || `Compass attendance lines failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (Array.isArray(payload?.d)) return payload.d;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function buildStudentCodeByPersonId(students) {
  return (students || []).reduce((map, student) => {
    const personId = String(student?.compassPersonId || "").trim();
    const studentCode = normalizeStudentCode(student?.studentCode);
    if (personId && studentCode) {
      map.set(personId, studentCode);
    }
    return map;
  }, new Map());
}

function buildStatusById(statuses) {
  return (statuses || []).reduce((map, status) => {
    const id = String(status?.statusId || "").trim();
    if (id) {
      map.set(id, status);
    }
    return map;
  }, new Map());
}

function buildTrackedLatePeriodRecords(
  lines,
  studentCodeByPersonId,
  statusById,
  absentDayPatternKeys = new Set()
) {
  return (lines || [])
    .map((line) => {
      const personId = String(line?.compassPersonId || "").trim();
      const studentCode = studentCodeByPersonId.get(personId);
      const startDate = parseIsoDateTime(line?.start);
      const periodLineId = String(line?.periodLineId || "").trim();
      const period = String(line?.periodCode || "").trim().toUpperCase();
      const status = statusById.get(String(line?.prevalentOverallStatusId || "").trim());
      const dayKey = getPersonDayKey(personId, startDate);
      const statusName = String(status?.name || "").trim();
      const statusCode = String(status?.shortCode || "").trim().toUpperCase();
      const attendanceType = classifyTrackedLatePeriod({
        period,
        statusName,
        statusCode,
        absentDayPattern: absentDayPatternKeys.has(dayKey),
      });

      if (!studentCode || !startDate || !periodLineId || !attendanceType) {
        return null;
      }

      return {
        id: `compass-period-${periodLineId}`,
        student_code: studentCode,
        start_time_text: line?.start || "",
        start_at: formatDateTimeForSql(startDate),
        arrival_time_text: attendanceType === "School late" ? "Not recorded" : "-",
        arrival_at: null,
        period,
        activity_code: "",
        activity_name: String(line?.description || "").trim(),
        teacher: "",
        minutes_late: 0,
        week_key: getFridayWeekKey(startDate),
        week_label: getFridayWeekLabel(startDate),
      };
    })
    .filter(Boolean);
}

function buildPreviewPeriodRecords(
  lines,
  studentCodeByPersonId,
  statusById,
  absentDayPatternKeys = new Set()
) {
  return (lines || [])
    .map((line) => {
      const personId = String(line?.compassPersonId || "").trim();
      const studentCode = studentCodeByPersonId.get(personId) || "";
      const startDate = parseIsoDateTime(line?.start);
      const status = statusById.get(String(line?.prevalentOverallStatusId || "").trim());
      const periodLineId = String(line?.periodLineId || "").trim();
      const dayKey = getPersonDayKey(personId, startDate);

      if (!startDate || !periodLineId) {
        return null;
      }

      return {
        id: `preview-period-${periodLineId}`,
        student_code: studentCode,
        start_time_text: line?.start || "",
        start_at: formatDateTimeForSql(startDate),
        arrival_time_text: "",
        arrival_at: null,
        period: String(line?.periodCode || "").trim(),
        activity_code: "",
        activity_name: String(line?.description || "").trim(),
        teacher: "",
        minutes_late: 0,
        week_key: getFridayWeekKey(startDate),
        week_label: getFridayWeekLabel(startDate),
        source_type: "Period",
        status_name: String(status?.name || "").trim(),
        status_code: String(status?.shortCode || "").trim(),
        absent_day_pattern: absentDayPatternKeys.has(dayKey),
        status_description: absentDayPatternKeys.has(dayKey)
          ? `${
              String(status?.description || "").trim() || "Counted absence pattern"
            } (Detected full-day absence pattern: S1/S2/S3/S4)`
          : String(status?.description || "").trim(),
      };
    })
    .filter(Boolean);
}

function buildAbsentDayPatternKeys(lines, statusById) {
  const grouped = new Map();

  (lines || []).forEach((line) => {
    const personId = String(line?.compassPersonId || "").trim();
    const startDate = parseIsoDateTime(line?.start);
    if (!personId || !startDate) return;

    const key = getPersonDayKey(personId, startDate);
    const status = statusById.get(String(line?.prevalentOverallStatusId || "").trim());
    const period = String(line?.periodCode || "").trim().toUpperCase();

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push({
      period,
      countedAbsence: Boolean(status?.countedAbsence),
    });
  });

  const absentDayPatternKeys = new Set();

  grouped.forEach((entries, key) => {
    const periods = new Set(entries.map((entry) => entry.period).filter(Boolean));
    const hasFullDayPeriods = ["S1", "S2", "S3", "S4"].every((period) => periods.has(period));
    const allCountedAbsence =
      entries.length > 0 && entries.every((entry) => entry.countedAbsence);

    if (hasFullDayPeriods && allCountedAbsence) {
      absentDayPatternKeys.add(key);
    }
  });

  return absentDayPatternKeys;
}

function buildPreviewSchoolRecords(lines, studentCodeByPersonId, statusById) {
  return (lines || [])
    .map((line, index) => {
      const personId = String(line?.compassPersonId || "").trim();
      const studentCode = studentCodeByPersonId.get(personId) || "";
      const startDate = parseIsoDateTime(line?.start);
      const arrivalDate = parseIsoDateTime(line?.arrivalTimestamp);
      const status = statusById.get(String(line?.prevalentOverallStatusId || "").trim());
      const recordId =
        String(line?.periodLineId || "").trim() ||
        `${personId || "unknown"}-${line?.start || ""}-${index}`;

      if (!startDate || !recordId) {
        return null;
      }

      const minutesLate =
        arrivalDate && arrivalDate > startDate
          ? Math.round((arrivalDate.getTime() - startDate.getTime()) / 60000)
          : 0;

      return {
        id: `preview-school-${recordId}`,
        student_code: studentCode,
        start_time_text: line?.start || "",
        start_at: formatDateTimeForSql(startDate),
        arrival_time_text: line?.arrivalTimestamp || "",
        arrival_at: arrivalDate ? formatDateTimeForSql(arrivalDate) : null,
        period: String(line?.sliceCode || "").trim(),
        activity_code: "",
        activity_name: String(line?.description || "").trim(),
        teacher: "",
        minutes_late: minutesLate,
        week_key: getFridayWeekKey(startDate),
        week_label: getFridayWeekLabel(startDate),
        source_type: "School",
        status_name: String(status?.name || "").trim(),
        status_code: String(status?.shortCode || "").trim(),
        absent_day_pattern: false,
        status_description: String(status?.description || "").trim(),
      };
    })
    .filter(Boolean);
}

function buildApprovedAbsenceRecords(lines, studentCodeByPersonId, statusById) {
  const grouped = new Map();

  (lines || []).forEach((line) => {
    const personId = String(line?.compassPersonId || "").trim();
    const startDate = parseIsoDateTime(line?.start);
    const period = String(line?.periodCode || "").trim().toUpperCase();
    const status = statusById.get(String(line?.prevalentOverallStatusId || "").trim());

    if (!personId || !startDate || !isTrackedAttendancePeriod(period)) {
      return;
    }

    const key = getPersonDayKey(personId, startDate);

    if (!grouped.has(key)) {
      grouped.set(key, {
        personId,
        studentCode: studentCodeByPersonId.get(personId) || "",
        startDate,
        periods: new Map(),
      });
    }

    grouped.get(key).periods.set(period, {
      period,
      status,
    });
  });

  return Array.from(grouped.values())
    .map((group) => {
      const requiredPeriods = ["S1", "S2", "S3", "S4"];
      if (!requiredPeriods.every((period) => group.periods.has(period))) {
        return null;
      }

      const periodEntries = requiredPeriods
        .map((period) => group.periods.get(period))
        .filter(Boolean);

      if (
        periodEntries.length !== requiredPeriods.length ||
        !periodEntries.every((entry) => entry.status?.countedAbsence) ||
        !periodEntries.every((entry) => isUnapprovedFullDayAbsenceStatus(entry.status))
      ) {
        return null;
      }

      if (!group.studentCode) {
        return null;
      }

      const primaryStatus = pickPrimaryAbsenceStatus(periodEntries.map((entry) => entry.status));

      return {
        id: `compass-unapproved-absence-${group.personId}-${formatIsoDateOnly(group.startDate)}`,
        student_code: group.studentCode,
        start_at: formatDateTimeForSql(group.startDate),
        start_time_text: group.startDate.toISOString(),
        week_key: getFridayWeekKey(group.startDate),
        week_label: getFridayWeekLabel(group.startDate),
        periods: requiredPeriods.join(", "),
        status_name: String(primaryStatus?.name || "").trim(),
        status_code: String(primaryStatus?.shortCode || "").trim(),
        status_description: String(primaryStatus?.description || "").trim(),
      };
    })
    .filter(Boolean);
}

function classifyTrackedLatePeriod({
  period,
  statusName,
  statusCode,
  absentDayPattern,
}) {
  if (absentDayPattern) return null;
  if (!isTrackedAttendancePeriod(period)) return null;
  if (isParentApprovedAttendanceStatus(statusName, statusCode)) return null;

  const normalizedStatusName = normalizeText(statusName);
  const normalizedStatusCode = String(statusCode || "").trim().toUpperCase();

  if (normalizedStatusCode === "L" || normalizedStatusName === "late to class") {
    return "Class late";
  }

  const looksLikeSchoolLate =
    normalizedStatusCode === "LU" ||
    normalizedStatusCode === "LA" ||
    normalizedStatusName.includes("late arrival at school");

  if (!looksLikeSchoolLate) {
    return null;
  }

  return period === "S1" ? "School late" : "Class late";
}

function isUnapprovedFullDayAbsenceStatus(status) {
  if (!status?.countedAbsence) return false;

  const name = normalizeText(status?.name);
  const shortCode = String(status?.shortCode || "").trim().toUpperCase();

  if (!name) return false;
  return name === "unexplained" && shortCode === "NU";
}

function pickPrimaryAbsenceStatus(statuses) {
  const counts = new Map();

  (statuses || []).forEach((status) => {
    const key = String(status?.statusId || "").trim();
    if (!key) return;
    counts.set(key, {
      count: (counts.get(key)?.count || 0) + 1,
      status,
    });
  });

  return Array.from(counts.values()).sort((a, b) => b.count - a.count)[0]?.status || null;
}

function getPersonDayKey(personId, startDate) {
  const dateKey = startDate ? formatIsoDateOnly(startDate) : "";
  return `${String(personId || "").trim()}|${dateKey}`;
}

function isTrackedAttendancePeriod(period) {
  const normalizedPeriod = String(period || "").trim().toUpperCase();
  return normalizedPeriod === "S1" ||
    normalizedPeriod === "S2" ||
    normalizedPeriod === "S3" ||
    normalizedPeriod === "S4";
}

function isParentApprovedAttendanceStatus(statusName, statusCode) {
  return normalizeText(statusName).includes("parent approved") ||
    String(statusCode || "").trim().toUpperCase() === "LA";
}

function summarizePeriodStatuses(lines, statusById) {
  const counts = new Map();

  (lines || []).forEach((line) => {
    const statusId = String(line?.prevalentOverallStatusId || "").trim();
    const status = statusById.get(statusId);
    const label = `${status?.name || "(unknown)"}${statusId ? ` [${statusId}]` : ""}`;
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function summarizeSchoolStatuses(lines, statusById) {
  const counts = new Map();

  (lines || []).forEach((line) => {
    const statusId = String(line?.prevalentOverallStatusId || "").trim();
    const status = statusById.get(statusId);
    const description = String(line?.description || "").trim();
    const label = `${status?.name || "(unknown)"}${description ? ` · ${description}` : ""}${
      statusId ? ` [${statusId}]` : ""
    }`;
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function summarizeLatePeriodStatuses(lines, statusById) {
  const counts = new Map();

  (lines || []).forEach((line) => {
    const statusId = String(line?.prevalentOverallStatusId || "").trim();
    const status = statusById.get(statusId);
    const name = normalizeText(status?.name);
    const shortCode = normalizeText(status?.shortCode);

    if (!name.includes("late") && shortCode !== "l") {
      return;
    }

    const label = `${status?.name || "(unknown)"}${statusId ? ` [${statusId}]` : ""}`;
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function summarizeLateSchoolStatuses(lines, statusById) {
  const counts = new Map();

  (lines || []).forEach((line) => {
    const statusId = String(line?.prevalentOverallStatusId || "").trim();
    const status = statusById.get(statusId);
    const name = normalizeText(status?.name);
    const shortCode = normalizeText(status?.shortCode);
    const description = String(line?.description || "").trim();

    if (!name.includes("late") && !description.toLowerCase().includes("late") && shortCode !== "l") {
      return;
    }

    const label = `${status?.name || "(unknown)"}${description ? ` · ${description}` : ""}${
      statusId ? ` [${statusId}]` : ""
    }`;
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

async function fetchExistingStudentCodes(adminSupabase, studentCodes) {
  const foundCodes = new Set();

  for (const chunk of chunkArray(studentCodes, MAX_BATCH_SIZE)) {
    if (chunk.length === 0) continue;

    const { data, error } = await adminSupabase
      .from("students")
      .select("student_code")
      .in("student_code", chunk);

    if (error) {
      throw new Error(error.message);
    }

    (data || []).forEach((row) => {
      foundCodes.add(normalizeStudentCode(row.student_code));
    });
  }

  return foundCodes;
}

async function fetchExistingAttendanceIds(adminSupabase, ids) {
  const foundIds = new Set();

  for (const chunk of chunkArray(ids, EXISTING_LOOKUP_BATCH_SIZE)) {
    if (chunk.length === 0) continue;

    const { data, error } = await adminSupabase
      .from("attendance_entries")
      .select("id")
      .in("id", chunk);

    if (error) {
      console.error("[compass-attendance-sync] Existing attendance id lookup failed", {
        chunkSize: chunk.length,
        message: error.message,
      });
      throw new Error(error.message);
    }

    (data || []).forEach((row) => {
      foundIds.add(row.id);
    });
  }

  return foundIds;
}

async function upsertAttendanceRows(adminSupabase, rows) {
  for (const chunk of chunkArray(rows, MAX_BATCH_SIZE)) {
    if (chunk.length === 0) continue;

    const { error } = await adminSupabase.from("attendance_entries").upsert(chunk, {
      onConflict: "id",
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}

async function upsertAttendanceAbsenceRows(adminSupabase, rows) {
  for (const chunk of chunkArray(rows, MAX_BATCH_SIZE)) {
    if (chunk.length === 0) continue;

    const { error } = await adminSupabase.from("attendance_absence_entries").upsert(chunk, {
      onConflict: "id",
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}

function normalizeStudentCode(value) {
  return String(value || "").replace(/\s+/g, "").trim().toUpperCase();
}

function parseDateOnly(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const date = new Date(`${text}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseIsoDateTime(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatIsoDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function getFridayWeekKey(date) {
  const friday = getFridayForWeek(date);
  return friday.toISOString().slice(0, 10);
}

function getFridayWeekLabel(date) {
  const friday = getFridayForWeek(date);
  return friday.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getFridayForWeek(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  const diff = 5 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function chunkArray(values, size) {
  const chunks = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

async function readCompassError(response) {
  try {
    const data = await response.json();
    return data?.message || data?.error || data?.Message || data?.d?.message || "";
  } catch {
    return "";
  }
}
