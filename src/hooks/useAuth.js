import { useEffect, useEffectEvent, useState } from "react";
import { fetchProfile } from "../lib/supabaseRest";
import { supabase } from "../lib/supabaseClient";

const PASSWORD_RECOVERY_STORAGE_KEY = "strike-track-password-recovery";

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
          mobile_number: user.user_metadata?.mobile_number || "",
        }
      );
    } catch (err) {
      setError(err.message || "Failed to load profile.");
    }
  }

  const loadProfileEvent = useEffectEvent(loadProfile);

  function getRecoveryStateFromUrl() {
    if (typeof window === "undefined") {
      return {
        isRecovery: false,
        recoveryCode: "",
      };
    }

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(window.location.search);
    const hashType = hashParams.get("type");
    const searchType = searchParams.get("type");
    const recoveryCode = searchParams.get("code") || "";
    const hasRecoveryTokens =
      Boolean(hashParams.get("access_token") && hashParams.get("refresh_token")) ||
      Boolean(searchParams.get("token_hash"));
    const isRecovery =
      hashType === "recovery" ||
      searchType === "recovery" ||
      hasRecoveryTokens ||
      Boolean(recoveryCode);

    return {
      isRecovery,
      recoveryCode,
    };
  }

  function setStoredRecoveryMode(nextValue) {
    if (typeof window === "undefined") return;

    if (nextValue) {
      window.sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, "true");
    } else {
      window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
    }
  }

  function getStoredRecoveryMode() {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === "true";
  }

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      return () => {
        isMounted = false;
      };
    }

    async function init() {
      try {
        const recoveryState = getRecoveryStateFromUrl();

        if (recoveryState.recoveryCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            recoveryState.recoveryCode
          );

          if (exchangeError && !exchangeError.message?.toLowerCase().includes("already")) {
            throw exchangeError;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;
        setAuthSession(session);
        setBooting(false);
        const shouldRecover = recoveryState.isRecovery || getStoredRecoveryMode();
        setPasswordRecoveryMode(shouldRecover);
        setStoredRecoveryMode(shouldRecover);

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
        setStoredRecoveryMode(true);
      } else if (_event === "SIGNED_OUT") {
        setPasswordRecoveryMode(false);
        setStoredRecoveryMode(false);
      } else {
        const shouldRecover =
          getRecoveryStateFromUrl().isRecovery || getStoredRecoveryMode();
        setPasswordRecoveryMode(shouldRecover);
        setStoredRecoveryMode(shouldRecover);
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
