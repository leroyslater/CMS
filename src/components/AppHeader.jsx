import { smallButtonStyle, topBarStyle } from "../styles/uiStyles";

export default function AppHeader({
  profile,
  authSession,
  handleLogout,
  sessionsCount,
  studentsCount,
  isSupervisor,
}) {
  return (
    <div style={topBarStyle}>
      <div>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            opacity: 0.8,
          }}
        >
          Operations Dashboard
        </p>
        <h1 style={{ margin: 0, fontSize: 40, letterSpacing: "-0.04em" }}>
          Coordinator Management System
        </h1>
        <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.82)" }}>
          {profile?.full_name || authSession?.user?.email || "User"}
          {profile?.role ? ` · ${profile.role}` : ""}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {!isSupervisor ? (
          <div style={{ textAlign: "right", color: "rgba(255,255,255,0.86)", fontSize: 14 }}>
            <div>{studentsCount} students loaded</div>
            <div>{sessionsCount} sessions available</div>
          </div>
        ) : null}
        <button type="button" style={smallButtonStyle} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
