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
    <div style={cardStyle}>
      <h2 style={sectionTitleStyle}>Create Session</h2>
      <p style={sectionCopyStyle}>
        Add the next detention slot with a clear time, location, and supervisor.
      </p>
      <form onSubmit={handleCreateSession}>
        <input
          style={inputStyle}
          placeholder="Session name"
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
        <input
          style={inputStyle}
          placeholder="Supervisor"
          value={newSession.supervisor}
          onChange={(e) =>
            setNewSession({ ...newSession, supervisor: e.target.value })
          }
        />
        <button style={buttonStyle} type="submit">
          Create Session
        </button>
      </form>
    </div>
  );
}
