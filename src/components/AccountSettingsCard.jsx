import { useState } from "react";

import {
  buttonStyle,
  cardStyle,
  inputStyle,
  sectionCopyStyle,
  sectionTitleStyle,
} from "../styles/uiStyles";

export default function AccountSettingsCard({
  profile,
  recoveryMode,
  updatingProfile,
  updatingPassword,
  onUpdateProfile,
  onUpdatePassword,
}) {
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [mobileNumber, setMobileNumber] = useState(profile?.mobile_number || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (password !== confirmPassword) {
      return;
    }

    const ok = await onUpdatePassword(password, confirmPassword);
    if (ok) {
      setPassword("");
      setConfirmPassword("");
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    await onUpdateProfile({
      fullName,
      email,
      mobileNumber,
    });
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitleStyle}>
        {recoveryMode ? "Reset Password" : "Account Settings"}
      </h2>
      <p style={sectionCopyStyle}>
        {recoveryMode
          ? "Set a new password to complete your email recovery flow."
          : "You can update your password here. Account creation is restricted to admins."}
      </p>
      {!recoveryMode ? (
        <>
          <form onSubmit={handleProfileSubmit}>
            <input
              style={inputStyle}
              placeholder="Full name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
            <input
              style={inputStyle}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              style={inputStyle}
              placeholder="Mobile number"
              value={mobileNumber}
              onChange={(event) => setMobileNumber(event.target.value)}
            />
            <div style={{ color: "#4b587c", marginBottom: 16 }}>
              <div style={{ marginTop: 4 }}>
                {profile?.role || "coordinator"}
                {profile?.year_levels?.length
                  ? ` · Year levels: ${profile.year_levels.join(", ")}`
                  : ""}
              </div>
            </div>
            <button
              type="submit"
              style={buttonStyle}
              disabled={
                updatingProfile ||
                !String(fullName || "").trim() ||
                !String(email || "").trim()
              }
            >
              {updatingProfile ? "Saving..." : "Save details"}
            </button>
          </form>
          <div style={{ height: 18 }} />
        </>
      ) : null}
      <form onSubmit={handlePasswordSubmit}>
        <input
          style={inputStyle}
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <input
          style={inputStyle}
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        {password && confirmPassword && password !== confirmPassword ? (
          <p style={{ color: "#8a341f", marginTop: 0 }}>Passwords do not match.</p>
        ) : null}
        <button
          type="submit"
          style={buttonStyle}
          disabled={!password || !confirmPassword || password !== confirmPassword || updatingPassword}
        >
          {updatingPassword ? "Saving..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
