/* global process */

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.APP_URL || "https://striketrack.org";
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
    return res.status(500).json({ error: "Server auth configuration is missing." });
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

  const requester = await getAdminRequester(requesterSupabase, adminSupabase);
  if (requester.error) {
    return res.status(requester.status).json({ error: requester.error });
  }

  if (req.method === "GET") {
    return handleListUsers(adminSupabase, res);
  }

  if (req.method === "POST") {
    const { action } = req.body || {};

    if (action === "create") {
      return handleCreateUser(adminSupabase, req.body, res);
    }

    if (action === "reset_password") {
      return handleResetPassword(adminSupabase, req.body, appUrl, res);
    }

    return res.status(400).json({ error: "Unknown action." });
  }

  if (req.method === "PATCH") {
    return handleUpdateUser(adminSupabase, req.body, res);
  }

  if (req.method === "DELETE") {
    return handleDeleteUser(adminSupabase, req.body, requester.user.id, res);
  }

  return res.status(405).json({ error: "Method not allowed." });
}

async function getAdminRequester(requesterSupabase, adminSupabase) {
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

  if (profile?.role !== "admin") {
    return { status: 403, error: "Only admins can manage accounts." };
  }

  return { status: 200, user };
}

async function handleListUsers(adminSupabase, res) {
  const {
    data: { users },
    error: usersError,
  } = await adminSupabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (usersError) {
    return res.status(500).json({ error: usersError.message });
  }

  const userIds = users.map((user) => user.id);
  const { data: profiles, error: profilesError } = await adminSupabase
    .from("profiles")
    .select("id, email, full_name, role, year_levels")
    .in("id", userIds);

  if (profilesError) {
    return res.status(500).json({ error: profilesError.message });
  }

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const merged = users.map((user) => {
    const profile = profileById.get(user.id);
    return {
      id: user.id,
      email: user.email || profile?.email || "",
      full_name: profile?.full_name || user.user_metadata?.full_name || "",
      role: profile?.role || user.user_metadata?.role || "coordinator",
      year_levels: normalizeYearLevels(profile?.year_levels ?? user.user_metadata?.year_levels),
      last_sign_in_at: user.last_sign_in_at || null,
      created_at: user.created_at || null,
    };
  });

  return res.status(200).json({ users: merged });
}

async function handleCreateUser(adminSupabase, body, res) {
  const { email, password, fullName, role, yearLevels } = body || {};

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ error: "Email, password, full name, and role are required." });
  }

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      year_levels: normalizeYearLevels(yearLevels),
    },
  });

  if (error || !data?.user) {
    return res.status(400).json({ error: error?.message || "Failed to create account." });
  }

  const { error: profileError } = await adminSupabase.from("profiles").upsert({
    id: data.user.id,
    email,
    full_name: fullName,
    role,
    year_levels: normalizeYearLevels(yearLevels),
  });

  if (profileError) {
    return res.status(500).json({ error: profileError.message });
  }

  return res.status(200).json({ userId: data.user.id });
}

async function handleUpdateUser(adminSupabase, body, res) {
  const { id, email, fullName, role, yearLevels } = body || {};

  if (!id || !email || !fullName || !role) {
    return res.status(400).json({ error: "User id, email, full name, and role are required." });
  }

  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(id, {
    email,
    user_metadata: {
      full_name: fullName,
      role,
      year_levels: normalizeYearLevels(yearLevels),
    },
  });

  if (updateError) {
    return res.status(400).json({ error: updateError.message });
  }

  const { error: profileError } = await adminSupabase.from("profiles").upsert({
    id,
    email,
    full_name: fullName,
    role,
    year_levels: normalizeYearLevels(yearLevels),
  });

  if (profileError) {
    return res.status(500).json({ error: profileError.message });
  }

  return res.status(200).json({ ok: true });
}

async function handleDeleteUser(adminSupabase, body, requesterId, res) {
  const { id } = body || {};

  if (!id) {
    return res.status(400).json({ error: "User id is required." });
  }

  if (id === requesterId) {
    return res.status(400).json({ error: "You cannot delete your own admin account." });
  }

  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(id);

  if (deleteError) {
    return res.status(400).json({ error: deleteError.message });
  }

  await adminSupabase.from("profiles").delete().eq("id", id);
  return res.status(200).json({ ok: true });
}

async function handleResetPassword(adminSupabase, body, appUrl, res) {
  const { email } = body || {};

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const { error } = await adminSupabase.auth.resetPasswordForEmail(email, {
    redirectTo: appUrl,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
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

  return [];
}
