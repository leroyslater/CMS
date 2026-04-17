/* global process */

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

  const {
    data: { user: requester },
    error: requesterError,
  } = await requesterSupabase.auth.getUser();

  if (requesterError || !requester) {
    return res.status(401).json({ error: "Invalid auth token." });
  }

  const { data: requesterProfile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", requester.id)
    .maybeSingle();

  if (profileError) {
    return res.status(500).json({ error: profileError.message });
  }

  if (requesterProfile?.role !== "admin") {
    return res.status(403).json({ error: "Only admins can create accounts." });
  }

  const { email, password, fullName, role } = req.body || {};

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ error: "Email, password, full name, and role are required." });
  }

  const { data: createdUserData, error: createUserError } =
    await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
      },
    });

  if (createUserError || !createdUserData?.user) {
    return res
      .status(400)
      .json({ error: createUserError?.message || "Failed to create account." });
  }

  const { error: upsertProfileError } = await adminSupabase.from("profiles").upsert({
    id: createdUserData.user.id,
    email,
    full_name: fullName,
    role,
  });

  if (upsertProfileError) {
    return res.status(500).json({ error: upsertProfileError.message });
  }

  return res.status(200).json({
    userId: createdUserData.user.id,
  });
}
