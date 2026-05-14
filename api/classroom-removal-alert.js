/* global process */

import { Buffer } from "node:buffer";
import { createClient } from "@supabase/supabase-js";

const RESEND_API_URL = "https://api.resend.com/emails";
const CLICKSEND_SMS_URL = "https://rest.clicksend.com/v3/sms/send";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.CLASSROOM_ALERT_FROM_EMAIL ||
    process.env.ROLL_SUBMISSION_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.SMTP_ADMIN_EMAIL;
  const clickSendUsername = process.env.CLICKSEND_USERNAME || "";
  const clickSendApiKey = process.env.CLICKSEND_API_KEY || "";
  const clickSendSenderId = process.env.CLICKSEND_SENDER_ID || "StrikeTrack";
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
        "Email configuration is missing. Set RESEND_API_KEY and CLASSROOM_ALERT_FROM_EMAIL.",
    });
  }

  if (!clickSendUsername || !clickSendApiKey) {
    return res.status(500).json({
      error:
        "SMS configuration is missing. Set CLICKSEND_USERNAME and CLICKSEND_API_KEY.",
    });
  }

  if (!token) {
    return res.status(401).json({ error: "Missing auth token." });
  }

  const studentName = String(req.body?.studentName || "").trim();
  const classroom = String(req.body?.classroom || "").trim();
  const teacher = String(req.body?.teacher || "").trim();
  const reason = String(req.body?.reason || "").trim();

  if (!studentName || !classroom || !reason) {
    return res
      .status(400)
      .json({ error: "Student name, class/room, and reason are required." });
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

  const { data: recipients, error: recipientsError } = await adminSupabase
    .from("profiles")
    .select("email, full_name, role, mobile_number")
    .in("role", ["admin", "coordinator"]);

  if (recipientsError) {
    return res.status(400).json({ error: recipientsError.message });
  }

  const emailRecipients = Array.from(
    new Set(
      (recipients || [])
        .map((recipient) => String(recipient.email || "").trim())
        .filter(Boolean)
    )
  );
  const smsRecipients = Array.from(
    new Set(
      (recipients || [])
        .map((recipient) => normalizeAustralianMobileNumber(recipient.mobile_number))
        .filter(Boolean)
    )
  );

  if (emailRecipients.length === 0) {
    return res
      .status(400)
      .json({ error: "No coordinator or admin email addresses were found." });
  }

  if (smsRecipients.length === 0) {
    return res.status(400).json({
      error:
        "No coordinator or admin mobile numbers were found. Add mobile numbers on the Accounts page.",
    });
  }

  const submittedBy =
    String(requester.profile?.full_name || "").trim() ||
    String(requester.user?.email || "").trim() ||
    teacher ||
    "Staff member";
  const effectiveTeacher = teacher || submittedBy;

  const subject = `Classroom removal alert: ${studentName}`;
  const html = buildAlertEmailHtml({
    studentName,
    classroom,
    teacher: effectiveTeacher,
    reason,
    submittedBy,
  });
  const text = buildAlertEmailText({
    studentName,
    classroom,
    teacher: effectiveTeacher,
    reason,
    submittedBy,
  });
  const smsBody = buildAlertSmsText({
    studentName,
    classroom,
    teacher: effectiveTeacher,
    reason,
  });

  const emailResponse = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: emailRecipients,
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
        "Failed to send classroom removal email.",
    });
  }

  const smsResponse = await fetch(CLICKSEND_SMS_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${clickSendUsername}:${clickSendApiKey}`
      ).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: smsRecipients.map((to) => ({
        to,
        body: smsBody,
        from: clickSendSenderId,
        source: "javascript",
      })),
    }),
  });

  const smsResult = await smsResponse.json().catch(() => ({}));
  if (!smsResponse.ok || smsResult?.response_code !== "SUCCESS") {
    return res.status(400).json({
      error:
        smsResult?.response_msg ||
        smsResult?.message ||
        smsResult?.error ||
        "Failed to send classroom removal SMS.",
    });
  }

  return res.status(200).json({
    ok: true,
    emailRecipients: emailRecipients.length,
    smsRecipients: smsRecipients.length,
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
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { status: 500, error: profileError.message };
  }

  if (!profile || !["teacher", "supervisor", "coordinator", "admin"].includes(profile.role)) {
    return { status: 403, error: "Only logged-in staff can send classroom alerts." };
  }

  return { status: 200, user, profile };
}

function normalizeAustralianMobileNumber(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+614") && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith("614") && cleaned.length === 11) return `+${cleaned}`;
  if (cleaned.startsWith("04") && cleaned.length === 10) {
    return `+61${cleaned.slice(1)}`;
  }

  return "";
}

function buildAlertEmailHtml({ studentName, classroom, teacher, reason, submittedBy }) {
  return `
    <div style="font-family: Arial, sans-serif; color: #17334b; line-height: 1.5;">
      <h2 style="margin: 0 0 12px; color: #8a1f1f;">Classroom removal alert</h2>
      <p style="margin: 0 0 16px;">
        A staff member has requested student removal from class.
      </p>
      <div style="margin-bottom: 12px;"><strong>Student:</strong> ${escapeHtml(studentName)}</div>
      <div style="margin-bottom: 12px;"><strong>Class / room:</strong> ${escapeHtml(classroom)}</div>
      <div style="margin-bottom: 12px;"><strong>Teacher:</strong> ${escapeHtml(teacher)}</div>
      <div style="margin-bottom: 12px;"><strong>Submitted by:</strong> ${escapeHtml(submittedBy)}</div>
      <div style="margin-bottom: 12px;"><strong>Reason:</strong><br />${escapeHtml(reason).replace(/\n/g, "<br />")}</div>
    </div>
  `;
}

function buildAlertEmailText({ studentName, classroom, teacher, reason, submittedBy }) {
  return [
    "Classroom removal alert",
    "",
    `Student: ${studentName}`,
    `Class / room: ${classroom}`,
    `Teacher: ${teacher}`,
    `Submitted by: ${submittedBy}`,
    "",
    `Reason: ${reason}`,
  ].join("\n");
}

function buildAlertSmsText({ studentName, classroom, teacher, reason }) {
  const compactReason = reason.replace(/\s+/g, " ").trim();
  const trimmedReason =
    compactReason.length > 120 ? `${compactReason.slice(0, 117)}...` : compactReason;

  return `Strike Track alert: ${studentName} needs classroom removal. Room: ${classroom}. Teacher: ${teacher}. Reason: ${trimmedReason}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
