import { smallButtonStyle, topBarStyle } from "../styles/uiStyles";
import StrikeTrackLogo from "./StrikeTrackLogo";

export default function AppHeader({
  handleLogout,
  onOpenAccount,
  accountActive,
}) {
  return (
    <div style={topBarStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-start" }}>
        <StrikeTrackLogo size={164} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          style={{
            ...smallButtonStyle,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            padding: 0,
            border: accountActive
              ? "1px solid rgba(92,231,170,0.7)"
              : smallButtonStyle.border,
            background: accountActive
              ? "rgba(92,231,170,0.2)"
              : smallButtonStyle.background,
          }}
          onClick={onOpenAccount}
          aria-label="Open account"
          title="Account"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M4 21C4 17.6863 7.58172 15 12 15C16.4183 15 20 17.6863 20 21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          style={{
            ...smallButtonStyle,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            padding: 0,
          }}
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M10 17L15 12L10 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15 12H4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M12 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
