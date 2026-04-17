import { useState } from "react";

import {
  buttonStyle,
  cardStyle,
  inputStyle,
  sectionCopyStyle,
  sectionTitleStyle,
} from "../styles/uiStyles";

export default function AccountSettingsCard({
  recoveryMode,
  updatingPassword,
  onUpdatePassword,
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(event) {
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
      <form onSubmit={handleSubmit}>
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
