import {
  authCardStyle,
  brandPalette,
  buttonStyle,
  inputStyle,
  pageStyle,
  sectionCopyStyle,
  smallButtonStyle,
} from "../styles/uiStyles";
import StrikeTrackLogo from "./StrikeTrackLogo";

export default function AuthScreen({
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  handleSubmit,
  handleForgotPassword,
  error,
  message,
}) {
  return (
    <div style={pageStyle}>
      <div style={authCardStyle}>
        <div
          style={{
            marginBottom: 18,
            display: "flex",
            justifyContent: "flex-start",
            background: brandPalette.navy,
            borderRadius: 24,
            padding: "18px 22px",
            boxShadow: "0 16px 30px rgba(15, 40, 64, 0.14)",
          }}
        >
          <StrikeTrackLogo size={184} variant="dark" />
        </div>
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: brandPalette.mintStrong,
            fontWeight: 700,
          }}
        >
          School Behaviour Operations
        </p>
        <p style={sectionCopyStyle}>Login for supervisors and coordinators.</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            style={mode === "login" ? buttonStyle : smallButtonStyle}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            style={mode === "forgot" ? buttonStyle : smallButtonStyle}
            onClick={() => setMode("forgot")}
          >
            Forgot Password
          </button>
        </div>

        <form onSubmit={mode === "login" ? handleSubmit : handleForgotPassword}>
          <input
            style={inputStyle}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode === "login" ? (
            <input
              style={inputStyle}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          ) : null}
          <button style={buttonStyle} type="submit">
            {mode === "login" ? "Login" : "Send reset link"}
          </button>
        </form>

        {error ? <p style={{ color: "#8a341f", marginTop: 12 }}>{error}</p> : null}
        {message ? <p style={{ color: brandPalette.navy, marginTop: 12 }}>{message}</p> : null}
      </div>
    </div>
  );
}
