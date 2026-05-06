import {
  buttonStyle,
  cardStyle,
  inputStyle,
  sectionCopyStyle,
  sectionTitleStyle,
} from "../styles/uiStyles";

export default function CreateSessionCard({
  newSession,
  setNewSession,
  handleCreateSession,
}) {
  return (
    <div
      style={{ ...cardStyle, maxWidth: "none", width: "100%", boxSizing: "border-box" }}
    >
      <h2 style={sectionTitleStyle}>Create Detention</h2>
      <p style={sectionCopyStyle}>
        Add the next detention slot with a clear time and location.
      </p>
      <form onSubmit={handleCreateSession}>
        <input
          style={inputStyle}
          placeholder="Detention name"
          value={newSession.name}
          onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
        />
        <input
          style={inputStyle}
          type="date"
          value={newSession.date}
          onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
        />
        <input
          style={inputStyle}
          placeholder="Time"
          value={newSession.time}
          onChange={(e) => setNewSession({ ...newSession, time: e.target.value })}
        />
        <input
          style={inputStyle}
          placeholder="Location"
          value={newSession.location}
          onChange={(e) =>
            setNewSession({ ...newSession, location: e.target.value })
          }
        />
        <button style={buttonStyle} type="submit">
          Create Detention
        </button>
      </form>
    </div>
  );
}
