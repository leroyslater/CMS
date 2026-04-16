export const pageStyle = {
  fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
  padding: 24,
  background:
    "radial-gradient(circle at top left, rgba(191,114,31,0.16) 0, rgba(191,114,31,0.16) 14%, transparent 34%), linear-gradient(180deg, #f9f9fa 0%, #e4e9f1 100%)",
  minHeight: "100vh",
};

export const twoColStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 20,
};

export const cardStyle = {
  maxWidth: 960,
  background: "rgba(255,255,255,0.9)",
  backdropFilter: "blur(14px)",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 20px 45px rgba(3, 12, 46, 0.08)",
  border: "1px solid rgba(7, 28, 116, 0.12)",
  marginBottom: 20,
};

export const authCardStyle = {
  maxWidth: 540,
  margin: "60px auto",
  background: "rgba(255,255,255,0.94)",
  padding: 32,
  borderRadius: 28,
  boxShadow: "0 30px 60px rgba(3, 12, 46, 0.12)",
  border: "1px solid rgba(7, 28, 116, 0.12)",
};

export const topBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
  gap: 16,
  padding: "28px 30px",
  borderRadius: 30,
  background:
    "linear-gradient(135deg, rgba(3, 12, 46, 0.98) 0%, rgba(7, 28, 116, 0.95) 100%)",
  color: "#fff",
  boxShadow: "0 22px 44px rgba(3, 12, 46, 0.22)",
};

export const inputStyle = {
  display: "block",
  width: "100%",
  padding: "13px 14px",
  marginBottom: 12,
  borderRadius: 14,
  border: "1px solid #d0d1d7",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.96)",
  color: "#030c2e",
  fontSize: 15,
};

export const buttonStyle = {
  padding: "12px 18px",
  borderRadius: 999,
  border: "none",
  background: "linear-gradient(135deg, #071c74 0%, #030c2e 100%)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
  letterSpacing: "0.02em",
  boxShadow: "0 10px 22px rgba(3, 12, 46, 0.18)",
};

export const smallButtonStyle = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.28)",
  background: "rgba(255,255,255,0.1)",
  cursor: "pointer",
  color: "inherit",
  fontWeight: 600,
};

export const entryCardStyle = {
  border: "1px solid #dcdde1",
  borderRadius: 18,
  padding: 14,
  marginBottom: 12,
  background: "rgba(255,255,255,0.82)",
};

export const preStyle = {
  marginTop: 16,
  padding: 16,
  borderRadius: 10,
  background: "#111827",
  color: "#f9fafb",
  overflowX: "auto",
};

export const sectionTitleStyle = {
  marginTop: 0,
  marginBottom: 6,
  fontSize: 24,
  color: "#030c2e",
  letterSpacing: "-0.03em",
};

export const sectionCopyStyle = {
  marginTop: 0,
  marginBottom: 18,
  color: "#4b587c",
  fontSize: 14,
};

export const statusSuccessStyle = {
  margin: "0 0 16px",
  padding: "12px 14px",
  borderRadius: 16,
  background: "#eef4ff",
  border: "1px solid #c7d2fc",
  color: "#071c74",
};

export const statusErrorStyle = {
  margin: "0 0 16px",
  padding: "12px 14px",
  borderRadius: 16,
  background: "#fff2eb",
  border: "1px solid #f1c7b1",
  color: "#8a341f",
};

export const statGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 16,
  marginBottom: 22,
};

export const statCardStyle = {
  borderRadius: 22,
  padding: 18,
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(7, 28, 116, 0.12)",
  boxShadow: "0 12px 28px rgba(3, 12, 46, 0.06)",
};

export const statLabelStyle = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#bf721f",
  marginBottom: 10,
  fontWeight: 700,
};

export const statValueStyle = {
  fontSize: 32,
  lineHeight: 1,
  marginBottom: 8,
  color: "#030c2e",
  fontWeight: 700,
};

export const navBarStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 22,
};

export const navButtonStyle = {
  padding: "12px 18px",
  borderRadius: 999,
  border: "1px solid rgba(7, 28, 116, 0.14)",
  background: "rgba(255,255,255,0.72)",
  color: "#071c74",
  cursor: "pointer",
  fontWeight: 700,
  letterSpacing: "0.02em",
  boxShadow: "0 8px 18px rgba(3, 12, 46, 0.06)",
};

export const navButtonActiveStyle = {
  background: "linear-gradient(135deg, #071c74 0%, #030c2e 100%)",
  color: "#fff",
  border: "1px solid transparent",
  boxShadow: "0 10px 22px rgba(3, 12, 46, 0.18)",
};
