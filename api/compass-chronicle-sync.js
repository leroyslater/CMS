/* global process */

import { createClient } from "@supabase/supabase-js";

const DEFAULT_TAKE = 500;
const MAX_BATCH_SIZE = 500;
const EXISTING_LOOKUP_BATCH_SIZE = 50;
const COMMENT_TEMPLATE = "comment";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const compassBaseUrl = process.env.COMPASS_BASE_URL;
  const compassApiKey = process.env.COMPASS_API_KEY;
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "Server auth configuration is missing." });
  }

  if (!compassBaseUrl || !compassApiKey) {
    console.error("[compass-chronicle-sync] Missing Compass configuration", {
      hasCompassBaseUrl: Boolean(compassBaseUrl),
      hasCompassApiKey: Boolean(compassApiKey),
    });
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

  const requester = await getAllowedRequester(adminSupabase, token);
  if (requester.error) {
    return res.status(requester.status).json({ error: requester.error });
  }

  const { modifiedSinceTimestamp, year } = req.body || {};
  const normalizedYear = normalizeYear(year);
  const syncTimestamp = normalizeSyncTimestamp(modifiedSinceTimestamp, normalizedYear);

  try {
    console.log("[compass-chronicle-sync] Starting sync", {
      requesterId: requester.user.id,
      year: normalizedYear,
      modifiedSinceTimestamp: syncTimestamp,
      compassBaseUrl,
    });

    const sourceEntries = await fetchChronicleEntries({
      compassApiKey,
      compassBaseUrl,
      modifiedSinceTimestamp: syncTimestamp,
      year: normalizedYear,
    });
    const staffMembers = await fetchStaffBasic({
      compassApiKey,
      compassBaseUrl,
    });
    const staffNameById = buildStaffNameById(staffMembers);
    const rawRecords = flattenChronicleEntries(sourceEntries, staffNameById);
    const dedupedRecords = Array.from(
      rawRecords.reduce((map, record) => {
        map.set(record.id, record);
        return map;
      }, new Map()).values()
    );
    const duplicateCount = rawRecords.length - dedupedRecords.length;
    const studentCodes = Array.from(new Set(dedupedRecords.map((record) => record.student_code)));
    const existingStudentCodes = await fetchExistingStudentCodes(adminSupabase, studentCodes);
    const missingStudentCodes = studentCodes.filter((code) => !existingStudentCodes.has(code));
    const validRecords = dedupedRecords.filter((record) =>
      existingStudentCodes.has(record.student_code)
    );

    const existingIds = await fetchExistingChronicleIds(
      adminSupabase,
      validRecords.map((record) => record.id)
    );

    await upsertChronicleRows(adminSupabase, validRecords);

    return res.status(200).json({
      syncedCount: validRecords.length,
      insertedCount: validRecords.filter((record) => !existingIds.has(record.id)).length,
      updatedCount: validRecords.filter((record) => existingIds.has(record.id)).length,
      duplicateCount,
      missingStudentCodes,
      totalSourceEntries: sourceEntries.length,
    });
  } catch (error) {
    console.error("[compass-chronicle-sync] Sync failed", {
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
        ? `${error?.message || "Failed to sync Chronicle records from Compass."} (${rootCause})`
        : error?.message || "Failed to sync Chronicle records from Compass.",
    });
  }
}

async function getAllowedRequester(adminSupabase, token) {
  const {
    data: { user },
    error: userError,
  } = await adminSupabase.auth.getUser(token);

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

  if (profile?.role === "supervisor") {
    return { status: 403, error: "Supervisors cannot sync Chronicle data." };
  }

  return { status: 200, user };
}

async function fetchChronicleEntries({
  compassApiKey,
  compassBaseUrl,
  modifiedSinceTimestamp,
  year,
}) {
  const url = `${String(compassBaseUrl || "").replace(/\/$/, "")}/API/V4/Chronicle/GetChronicleEntries`;
  console.log("[compass-chronicle-sync] Fetching Compass entries", {
    url,
    modifiedSinceTimestamp,
    year,
  });
  const records = [];
  let skip = 0;
  let total = Number.POSITIVE_INFINITY;

  while (skip < total) {
    let response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          CompassApiKey: compassApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request: {
            modifiedSinceTimestamp,
            skip,
            take: DEFAULT_TAKE,
            year,
            includeArchived: false,
            excludeTemplates: ["Comment"],
          },
        }),
      });
    } catch (error) {
      console.error("[compass-chronicle-sync] Compass fetch error", {
        url,
        message: error?.message,
        causeMessage: error?.cause?.message,
        causeCode: error?.cause?.code,
        causeErrno: error?.cause?.errno,
      });
      throw new Error(`Failed to reach Compass Chronicle endpoint at ${url}`, {
        cause: error,
      });
    }

    if (!response.ok) {
      const message = await readCompassError(response);
      throw new Error(message || `Compass Chronicle sync failed with HTTP ${response.status}`);
    }

    const payload = await response.json();
    const pageEntries = payload?.d?.data || payload?.data || [];
    const pageTotal = payload?.d?.total ?? payload?.total ?? pageEntries.length;

    records.push(...pageEntries);
    total = Number.isFinite(pageTotal) ? pageTotal : records.length;

    if (pageEntries.length < DEFAULT_TAKE) {
      break;
    }

    skip += pageEntries.length;
  }

  return records;
}

async function fetchStaffBasic({ compassApiKey, compassBaseUrl }) {
  const url = `${String(compassBaseUrl || "").replace(/\/$/, "")}/api/person/v1/GetStaffBasic`;
  let response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        CompassApiKey: compassApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
  } catch (error) {
    throw new Error(`Failed to reach Compass staff endpoint at ${url}`, {
      cause: error,
    });
  }

  if (!response.ok) {
    const message = await readCompassError(response);
    throw new Error(message || `Compass staff lookup failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (Array.isArray(payload?.d)) return payload.d;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function buildStaffNameById(staffMembers) {
  return staffMembers.reduce((map, staff) => {
    const id = String(staff?.compassPersonId || "").trim();
    if (!id) return map;

    const preferredFirst = String(staff?.preferredFirstName || "").trim();
    const preferredLast = String(staff?.preferredLastName || "").trim();
    const first = String(staff?.firstName || "").trim();
    const last = String(staff?.lastName || "").trim();
    const displayName = [preferredFirst || first, preferredLast || last]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (displayName) {
      map.set(id, displayName);
    }

    return map;
  }, new Map());
}

function flattenChronicleEntries(entries, staffNameById = new Map()) {
  return entries.flatMap((entry) => {
    if (!entry || entry.archived || isCommentTemplate(entry.template)) {
      return [];
    }

    const entryId = String(entry.entryId || "").trim();
    if (!entryId) {
      return [];
    }

    const studentRows = Array.isArray(entry.students) ? entry.students : [];
    const occurredDate = parseChronicleDate(entry.dateOfIncident || entry.dateRecorded);

    return studentRows
      .filter((student) => student && !student.archived)
      .map((student) => {
        const studentCode = normalizeStudentCode(student.code);
        if (!studentCode) {
          return null;
        }

        return {
          id: `${studentCode}-${entryId}`,
          entry_id: entryId,
          student_code: studentCode,
          chronicle_type: cleanChronicleType(entry.template || entry.category || ""),
          occurred_timestamp: entry.dateOfIncident || entry.dateRecorded || "",
          occurred_at: occurredDate ? formatDateTimeForSql(occurredDate) : null,
          details: extractCompassDetails(entry),
          original_publisher:
            staffNameById.get(String(entry.createdBy || "").trim()) ||
            String(entry.createdBy || "").trim(),
          week_key: occurredDate ? getFridayWeekKey(occurredDate) : "unknown-week",
          week_label: occurredDate ? getFridayWeekLabel(occurredDate) : "Unknown week",
        };
      })
      .filter(Boolean);
  });
}

function extractCompassDetails(entry) {
  const primaryFieldName = String(entry?.primaryFieldName || "").trim().toLowerCase();
  const fields = Array.isArray(entry?.fields) ? entry.fields : [];
  const secondaryFields = fields
    .filter((field) => field && String(field.value || "").trim())
    .filter((field) => {
      const key = String(field.key || "").trim().toLowerCase();
      return key && key !== primaryFieldName && key !== COMMENT_TEMPLATE;
    })
    .map((field) => {
      const key = String(field.key || "").trim();
      const value = String(field.value || "").trim();
      return key ? `${key}: ${value}` : value;
    });

  if (secondaryFields.length > 0) {
    return secondaryFields.join(" | ");
  }

  return String(entry?.primaryFieldData || "").trim();
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

async function fetchExistingChronicleIds(adminSupabase, ids) {
  const foundIds = new Set();

  for (const chunk of chunkArray(ids, EXISTING_LOOKUP_BATCH_SIZE)) {
    if (chunk.length === 0) continue;

    const { data, error } = await adminSupabase
      .from("chronicle_entries")
      .select("id")
      .in("id", chunk);

    if (error) {
      throw new Error(error.message);
    }

    (data || []).forEach((row) => {
      foundIds.add(row.id);
    });
  }

  return foundIds;
}

async function upsertChronicleRows(adminSupabase, rows) {
  for (const chunk of chunkArray(rows, MAX_BATCH_SIZE)) {
    if (chunk.length === 0) continue;

    const { error } = await adminSupabase.from("chronicle_entries").upsert(chunk, {
      onConflict: "id",
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}

function normalizeYear(year) {
  const parsed = Number.parseInt(year, 10);
  const currentYear = new Date().getFullYear();

  if (!Number.isFinite(parsed) || parsed < 2000 || parsed > currentYear) {
    return currentYear;
  }

  return parsed;
}

function normalizeSyncTimestamp(value, year) {
  const providedDate = parseChronicleDate(value);
  if (providedDate) {
    return providedDate.toISOString();
  }

  return `${year}-01-01T00:00:00.000Z`;
}

function isCommentTemplate(value) {
  return String(value || "").trim().toLowerCase() === COMMENT_TEMPLATE;
}

function normalizeStudentCode(value) {
  return String(value || "").replace(/\s+/g, "").trim().toUpperCase();
}

function cleanChronicleType(value) {
  return String(value || "")
    .replace(/\*/g, "")
    .trim();
}

function parseChronicleDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
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
    return (
      data?.message ||
      data?.error ||
      data?.Message ||
      data?.d?.message ||
      ""
    );
  } catch {
    return "";
  }
}
