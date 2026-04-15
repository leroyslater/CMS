import {
  authCardStyle,
  buttonStyle,
  inputStyle,
  pageStyle,
  sectionCopyStyle,
  smallButtonStyle,
} from "../styles/uiStyles";

export default function AuthScreen({
  mode,
  setMode,
  fullName,
  setFullName,
  role,
  setRole,
  email,
  setEmail,
  password,
  setPassword,
  handleSubmit,
  error,
  message,
}) {
  return (
    <div style={pageStyle}>
      <div style={authCardStyle}>
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#bf721f",
            fontWeight: 700,
          }}
        >
          School Behaviour Operations
        </p>
        <h1 style={{ marginTop: 0, fontSize: 40, letterSpacing: "-0.04em", color: "#030c2e" }}>
          Coordinator Management System
        </h1>
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
            style={mode === "signup" ? buttonStyle : smallButtonStyle}
            onClick={() => setMode("signup")}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <>
              <input
                style={inputStyle}
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <select
                style={inputStyle}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="supervisor">Supervisor</option>
                <option value="coordinator">Coordinator</option>
              </select>
            </>
          ) : null}

          <input
            style={inputStyle}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button style={buttonStyle} type="submit">
            {mode === "login" ? "Login" : "Create account"}
          </button>
        </form>

        {error ? <p style={{ color: "#8a341f", marginTop: 12 }}>{error}</p> : null}
        {message ? <p style={{ color: "#071c74", marginTop: 12 }}>{message}</p> : null}
      </div>
    </div>
  );
}
