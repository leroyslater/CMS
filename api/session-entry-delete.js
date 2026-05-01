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

  const requester = await getAllowedRequester(requesterSupabase, adminSupabase);
  if (requester.error) {
    return res.status(requester.status).json({ error: requester.error });
  }

  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map((value) => String(value).trim()).filter(Boolean)
    : [];

  if (ids.length === 0) {
    return res.status(400).json({ error: "At least one entry id is required." });
  }

  const { data, error } = await adminSupabase
    .from("entries")
    .delete()
    .in("id", ids)
    .select("id");

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({
    deletedIds: (data || []).map((row) => row.id),
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

  if (!profile || profile.role === "supervisor") {
    return { status: 403, error: "Only coordinators and admins can remove students from sessions." };
  }

  return { status: 200, user };
}
