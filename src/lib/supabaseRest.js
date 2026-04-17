import { supabaseAnonKey, supabaseUrl } from "./supabaseClient";

const REST_TIMEOUT_MS = 8000;
const REST_PAGE_SIZE = 1000;

export async function fetchTableRows(table, accessToken, orderBy) {
  const rows = [];
  let offset = 0;

  while (true) {
    const searchParams = new URLSearchParams({
      select: "*",
      limit: String(REST_PAGE_SIZE),
      offset: String(offset),
    });

    if (orderBy) {
      searchParams.set(
        "order",
        `${orderBy.column}.${orderBy.ascending ? "asc" : "desc"}`
      );
    }

    const url = `${supabaseUrl}/rest/v1/${table}?${searchParams.toString()}`;
    const response = await timedFetch(url, accessToken);

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new Error(message || `${table} request failed with HTTP ${response.status}`);
    }

    const page = await response.json();
    rows.push(...page);

    if (!Array.isArray(page) || page.length < REST_PAGE_SIZE) {
      break;
    }

    offset += REST_PAGE_SIZE;
  }

  return rows;
}

export async function fetchProfile(userId, accessToken) {
  const searchParams = new URLSearchParams({
    select: "*",
    id: `eq.${userId}`,
    limit: "1",
  });

  const url = `${supabaseUrl}/rest/v1/profiles?${searchParams.toString()}`;
  const response = await timedFetch(url, accessToken);

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || `profiles request failed with HTTP ${response.status}`);
  }

  const rows = await response.json();
  return rows[0] || null;
}

export async function upsertTableRows(table, rows, accessToken, onConflict = "id") {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const searchParams = new URLSearchParams({
    on_conflict: onConflict,
  });
  const url = `${supabaseUrl}/rest/v1/${table}?${searchParams.toString()}`;
  const response = await timedFetch(url, accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || `${table} upsert failed with HTTP ${response.status}`);
  }

  return response.json();
}

async function timedFetch(url, accessToken, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: options.method || "GET",
      signal: controller.signal,
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {}),
      },
      body: options.body,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`Request timed out after ${REST_TIMEOUT_MS / 1000}s`);
    }

    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readErrorMessage(response) {
  try {
    const data = await response.json();
    return data?.message || data?.error_description || data?.hint || data?.error;
  } catch {
    return "";
  }
}
