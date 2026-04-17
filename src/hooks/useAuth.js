import { useEffect, useEffectEvent, useState } from "react";
import { fetchProfile } from "../lib/supabaseRest";
import { supabase } from "../lib/supabaseClient";

export function useAuth() {
  const [authSession, setAuthSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [booting, setBooting] = useState(Boolean(supabase));
  const [error, setError] = useState("");
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);

  async function loadProfile(user) {
    try {
      const data = await fetchProfile(user.id, user.access_token || authSession?.access_token);

      setProfile(
        data || {
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || "",
          role: user.user_metadata?.role || "coordinator",
          year_levels: user.user_metadata?.year_levels || [],
        }
      );
    } catch (err) {
      setError(err.message || "Failed to load profile.");
    }
  }

  const loadProfileEvent = useEffectEvent(loadProfile);

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      return () => {
        isMounted = false;
      };
    }

    async function init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;
        setAuthSession(session);
        setBooting(false);
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        setPasswordRecoveryMode(params.get("type") === "recovery");

        if (session?.user) {
          await loadProfileEvent({
            ...session.user,
            access_token: session.access_token,
          });
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Failed to start app.");
        setBooting(false);
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (_event === "PASSWORD_RECOVERY") {
        setPasswordRecoveryMode(true);
      } else if (_event === "SIGNED_OUT") {
        setPasswordRecoveryMode(false);
      }

      setAuthSession(session);
      setBooting(false);

      if (session?.user) {
        await loadProfileEvent({
          ...session.user,
          access_token: session.access_token,
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(signOutError.message);
      }
    } catch (err) {
      setError(err.message || "Logout failed.");
    }
  }

  return {
    authSession,
    profile,
    booting,
    authError: error,
    setAuthError: setError,
    handleLogout,
    passwordRecoveryMode,
    setPasswordRecoveryMode,
  };
}
