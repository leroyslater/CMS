export const brandPalette = {
  navy: "#14314b",
  navyDeep: "#0f2840",
  mint: "#5ce7aa",
  mintStrong: "#39d592",
  mintSoft: "#def9ee",
  text: "#17334b",
  muted: "#597489",
  border: "#c8d8e1",
  surface: "rgba(255,255,255,0.92)",
};

export const pageStyle = {
  fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
  padding: 24,
  background:
    "radial-gradient(circle at top left, rgba(92,231,170,0.18) 0, rgba(92,231,170,0.18) 14%, transparent 34%), linear-gradient(180deg, #f6fafc 0%, #dce7ef 100%)",
  minHeight: "100vh",
};

export const twoColStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 20,
};

export const cardStyle = {
  maxWidth: 960,
  background: brandPalette.surface,
  backdropFilter: "blur(14px)",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 20px 45px rgba(17, 44, 71, 0.1)",
  border: "1px solid rgba(17, 44, 71, 0.1)",
  marginBottom: 20,
};

export const authCardStyle = {
  maxWidth: 540,
  margin: "60px auto",
  background: "rgba(255,255,255,0.94)",
  padding: 32,
  borderRadius: 28,
  boxShadow: "0 30px 60px rgba(17, 44, 71, 0.14)",
  border: "1px solid rgba(17, 44, 71, 0.1)",
};

export const topBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
  gap: 16,
  padding: "22px 26px",
  borderRadius: 30,
  background: "#14314b",
  color: "#fff",
  boxShadow: "0 16px 30px rgba(15, 40, 64, 0.16)",
};

export const inputStyle = {
  display: "block",
  width: "100%",
  padding: "13px 14px",
  marginBottom: 12,
  borderRadius: 14,
  border: `1px solid ${brandPalette.border}`,
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.96)",
  color: brandPalette.text,
  fontSize: 15,
};

export const buttonStyle = {
  padding: "12px 18px",
  borderRadius: 999,
  border: "none",
  background: `linear-gradient(135deg, ${brandPalette.mintStrong} 0%, ${brandPalette.mint} 100%)`,
  color: brandPalette.navyDeep,
  cursor: "pointer",
  fontWeight: 800,
  letterSpacing: "0.02em",
  boxShadow: "0 10px 22px rgba(57, 213, 146, 0.22)",
};

export const secondaryButtonStyle = {
  padding: "10px 14px",
  borderRadius: 999,
  border: `1px solid ${brandPalette.border}`,
  background: "rgba(255,255,255,0.76)",
  color: brandPalette.navy,
  cursor: "pointer",
  fontWeight: 700,
  letterSpacing: "0.02em",
  boxShadow: "0 8px 18px rgba(17, 44, 71, 0.08)",
};

export const smallButtonStyle = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.28)",
  background: "rgba(92,231,170,0.12)",
  cursor: "pointer",
  color: "inherit",
  fontWeight: 600,
};

export const entryCardStyle = {
  border: `1px solid ${brandPalette.border}`,
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
  color: brandPalette.text,
  letterSpacing: "-0.03em",
};

export const sectionCopyStyle = {
  marginTop: 0,
  marginBottom: 18,
  color: brandPalette.muted,
  fontSize: 14,
};

export const statusSuccessStyle = {
  margin: "0 0 16px",
  padding: "12px 14px",
  borderRadius: 16,
  background: brandPalette.mintSoft,
  border: "1px solid rgba(92,231,170,0.45)",
  color: brandPalette.navy,
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
  border: "1px solid rgba(17, 44, 71, 0.1)",
  boxShadow: "0 12px 28px rgba(17, 44, 71, 0.08)",
};

export const statLabelStyle = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: brandPalette.mintStrong,
  marginBottom: 10,
  fontWeight: 700,
};

export const statValueStyle = {
  fontSize: 32,
  lineHeight: 1,
  marginBottom: 8,
  color: brandPalette.text,
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
  border: "1px solid rgba(17, 44, 71, 0.14)",
  background: "rgba(255,255,255,0.72)",
  color: brandPalette.navy,
  cursor: "pointer",
  fontWeight: 700,
  letterSpacing: "0.02em",
  boxShadow: "0 8px 18px rgba(17, 44, 71, 0.08)",
};

export const navButtonActiveStyle = {
  background: `linear-gradient(135deg, ${brandPalette.mintStrong} 0%, ${brandPalette.mint} 100%)`,
  color: brandPalette.navyDeep,
  border: "1px solid transparent",
  boxShadow: "0 10px 22px rgba(57, 213, 146, 0.22)",
};
