import strikeTrackLogo from "../assets/strike-track-logo-transparent.png";

export default function StrikeTrackLogo({
  size = 56,
  variant = "light",
}) {
  const isDark = variant === "dark";

  return (
    <img
      src={strikeTrackLogo}
      alt="Strike Track"
      style={{
        height: size,
        width: Math.round(size * 5.15),
        objectFit: "contain",
        objectPosition: "left center",
        display: "block",
        borderRadius: 0,
        imageRendering: "auto",
        boxShadow: isDark ? "0 10px 22px rgba(3, 12, 46, 0.1)" : "none",
      }}
    />
  );
}
