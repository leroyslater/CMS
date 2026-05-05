/* global process */

import { createClient } from "@supabase/supabase-js";

const RESEND_API_URL = "https://api.resend.com/emails";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.ROLL_SUBMISSION_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.SMTP_ADMIN_EMAIL;
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
    return res.status(500).json({ error: "Server auth configuration is missing." });
  }

  if (!resendApiKey || !fromEmail) {
    return res.status(500).json({
      error:
        "Email configuration is missing. Set RESEND_API_KEY and ROLL_SUBMISSION_FROM_EMAIL.",
    });
  }

  if (!token) {
    return res.status(401).json({ error: "Missing auth token." });
  }

  const sessionId = String(req.body?.sessionId || "").trim();
  if (!sessionId) {
    return res.status(400).json({ error: "Session id is required." });
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

  const { data: session, error: sessionError } = await adminSupabase
    .from("sessions")
    .select("id, name, date, time, location, supervisor")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    return res.status(400).json({ error: sessionError.message });
  }

  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }

  const { data: entries, error: entriesError } = await adminSupabase
    .from("entries")
    .select(
      "id, student_name, year_level, homegroup, reason, attendance, session_id"
    )
    .eq("session_id", sessionId)
    .order("student_name", { ascending: true });

  if (entriesError) {
    return res.status(400).json({ error: entriesError.message });
  }

  const safeEntries = entries || [];
  if (safeEntries.length === 0) {
    return res.status(400).json({ error: "No students are assigned to this session." });
  }

  const unmarkedEntries = safeEntries.filter(
    (entry) => !entry.attendance || entry.attendance === "Unmarked"
  );

  if (unmarkedEntries.length > 0) {
    return res.status(400).json({
      error: "Mark every student as present or absent before submitting the roll.",
    });
  }

  const { data: recipients, error: recipientsError } = await adminSupabase
    .from("profiles")
    .select("email, full_name, role")
    .in("role", ["admin", "coordinator"]);

  if (recipientsError) {
    return res.status(400).json({ error: recipientsError.message });
  }

  const to = Array.from(
    new Set(
      (recipients || [])
        .map((recipient) => String(recipient.email || "").trim())
        .filter(Boolean)
    )
  );

  if (to.length === 0) {
    return res
      .status(400)
      .json({ error: "No coordinator or admin email addresses were found." });
  }

  const presentEntries = orderRollEntries(
    safeEntries.filter((entry) => entry.attendance === "Present")
  );
  const absentEntries = orderRollEntries(
    safeEntries.filter((entry) => entry.attendance === "Absent")
  );

  const subject = `Session roll submitted: ${session.name || "Detention session"} (${formatDisplayDate(
    session.date
  )})`;

  const html = buildRollEmailHtml({
    session,
    presentEntries,
    absentEntries,
    submittedBy: requester.user.email || "Supervisor",
  });
  const text = buildRollEmailText({
    session,
    presentEntries,
    absentEntries,
    submittedBy: requester.user.email || "Supervisor",
  });

  const emailResponse = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      html,
      text,
    }),
  });

  const emailResult = await emailResponse.json().catch(() => ({}));

  if (!emailResponse.ok) {
    return res.status(400).json({
      error:
        emailResult?.message ||
        emailResult?.error ||
        "Failed to send roll submission email.",
    });
  }

  return res.status(200).json({
    ok: true,
    recipients: to.length,
    presentCount: presentEntries.length,
    absentCount: absentEntries.length,
  });
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

  if (!profile || !["supervisor", "coordinator", "admin"].includes(profile.role)) {
    return { status: 403, error: "Only logged-in staff can submit a roll." };
  }

  return { status: 200, user, profile };
}

function orderRollEntries(entries) {
  return [...entries].sort((a, b) => {
    const yearCompare =
      Number(a.year_level || 0) - Number(b.year_level || 0) ||
      String(a.year_level || "").localeCompare(String(b.year_level || ""));
    if (yearCompare !== 0) return yearCompare;

    const homegroupCompare = String(a.homegroup || "").localeCompare(
      String(b.homegroup || "")
    );
    if (homegroupCompare !== 0) return homegroupCompare;

    return String(a.student_name || "").localeCompare(String(b.student_name || ""));
  });
}

function buildRollEmailHtml({ session, presentEntries, absentEntries, submittedBy }) {
  const sessionName = escapeHtml(session.name || "Detention session");
  const sessionDate = escapeHtml(formatDisplayDate(session.date));
  const sessionTime = escapeHtml(session.time || "-");
  const sessionLocation = escapeHtml(session.location || "-");
  const supervisor = escapeHtml(session.supervisor || "-");
  const submitted = escapeHtml(submittedBy);

  return `
    <div style="font-family: Arial, sans-serif; color: #17334b; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Session roll submitted</h2>
      <p style="margin: 0 0 16px;">
        <strong>${sessionName}</strong><br />
        ${sessionDate} · ${sessionTime} · ${sessionLocation}<br />
        Supervisor: ${supervisor}<br />
        Submitted by: ${submitted}
      </p>
      <h3 style="margin: 20px 0 8px;">Present (${presentEntries.length})</h3>
      ${buildRollEmailTableHtml(presentEntries)}
      <h3 style="margin: 20px 0 8px;">Absent (${absentEntries.length})</h3>
      ${buildRollEmailTableHtml(absentEntries)}
    </div>
  `;
}

function buildRollEmailTableHtml(entries) {
  if (!entries.length) {
    return `<p style="margin: 0 0 12px; color: #4b587c;">None</p>`;
  }

  const rows = entries
    .map(
      (entry) => `
        <tr>
          <td style="border: 1px solid #c8d8e1; padding: 8px 10px;">${escapeHtml(
            entry.student_name || ""
          )}</td>
          <td style="border: 1px solid #c8d8e1; padding: 8px 10px;">${escapeHtml(
            entry.year_level || "-"
          )}</td>
          <td style="border: 1px solid #c8d8e1; padding: 8px 10px;">${escapeHtml(
            entry.homegroup || "-"
          )}</td>
          <td style="border: 1px solid #c8d8e1; padding: 8px 10px;">${escapeHtml(
            entry.reason || "-"
          )}</td>
        </tr>
      `
    )
    .join("");

  return `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
      <thead>
        <tr>
          <th style="border: 1px solid #c8d8e1; padding: 8px 10px; text-align: left; background: #eef3f7;">Student</th>
          <th style="border: 1px solid #c8d8e1; padding: 8px 10px; text-align: left; background: #eef3f7;">Year</th>
          <th style="border: 1px solid #c8d8e1; padding: 8px 10px; text-align: left; background: #eef3f7;">Homegroup</th>
          <th style="border: 1px solid #c8d8e1; padding: 8px 10px; text-align: left; background: #eef3f7;">Reason</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildRollEmailText({ session, presentEntries, absentEntries, submittedBy }) {
  const header = [
    "Session roll submitted",
    `${session.name || "Detention session"}`,
    `${formatDisplayDate(session.date)} · ${session.time || "-"} · ${session.location || "-"}`,
    `Supervisor: ${session.supervisor || "-"}`,
    `Submitted by: ${submittedBy}`,
    "",
  ].join("\n");

  return [
    header,
    `Present (${presentEntries.length})`,
    buildRollEmailListText(presentEntries),
    "",
    `Absent (${absentEntries.length})`,
    buildRollEmailListText(absentEntries),
  ].join("\n");
}

function buildRollEmailListText(entries) {
  if (!entries.length) {
    return "None";
  }

  return entries
    .map(
      (entry) =>
        `- ${entry.student_name || ""} | Year ${entry.year_level || "-"} | ${
          entry.homegroup || "-"
        } | ${entry.reason || "-"}`
    )
    .join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDisplayDate(value) {
  if (!value) return "-";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(value);

  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T12:00:00`);
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
