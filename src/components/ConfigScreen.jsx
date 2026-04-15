import { cardStyle, pageStyle, preStyle } from "../styles/uiStyles";

export default function ConfigScreen() {
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Supabase not configured</h1>
        <p style={{ color: "#555" }}>
          Add your Supabase project values to <code>.env</code> and restart the
          Vite dev server.
        </p>
        <pre style={preStyle}>
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
      </div>
    </div>
  );
}
