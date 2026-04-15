import { statGridStyle, statCardStyle, statLabelStyle, statValueStyle } from "../styles/uiStyles";

export default function DashboardStats({ stats }) {
  return (
    <div style={statGridStyle}>
      {stats.map((stat) => (
        <div key={stat.label} style={statCardStyle}>
          <div style={statLabelStyle}>{stat.label}</div>
          <div style={statValueStyle}>{stat.value}</div>
          <div style={{ fontSize: 13, color: "#4b587c" }}>{stat.note}</div>
        </div>
      ))}
    </div>
  );
}
