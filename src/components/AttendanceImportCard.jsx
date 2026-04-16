import { useMemo, useState } from "react";

import {
  buttonStyle,
  cardStyle,
  entryCardStyle,
  inputStyle,
  sectionCopyStyle,
  sectionTitleStyle,
} from "../styles/uiStyles";

export default function AttendanceImportCard({
  handleAttendanceUpload,
  attendanceSearch,
  setAttendanceSearch,
  attendanceYearFilter,
  setAttendanceYearFilter,
  attendanceHomegroupFilter,
  setAttendanceHomegroupFilter,
  attendanceOnly3Plus,
  setAttendanceOnly3Plus,
  attendanceSessionId,
  setAttendanceSessionId,
  sessions,
  attendanceYearOptions,
  attendanceHomegroupOptions,
  assignSelectedAttendanceGroups,
  filteredAttendance,
  selectedAttendanceKeys,
  toggleAttendanceSelection,
  setSelectedAttendanceKey,
  getAttendanceStatus,
  assignAttendanceGroupToSession,
  selectedAttendanceGroup,
}) {
  const attendanceWeeks = useMemo(
    () =>
      filteredAttendance.reduce((sections, group) => {
        const existingSection = sections.find(
          (section) => section.weekKey === group.weekKey
        );

        if (existingSection) {
          existingSection.groups.push(group);
          return sections;
        }

        sections.push({
          weekKey: group.weekKey,
          weekLabel: group.weekLabel,
          groups: [group],
        });

        return sections;
      }, []),
    [filteredAttendance]
  );
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [uploadInputKey, setUploadInputKey] = useState(0);

  function toggleWeek(weekKey) {
    setExpandedWeeks((prev) => ({
      ...prev,
      [weekKey]: !prev[weekKey],
    }));
  }

  async function onAttendanceFileChange(event) {
    await handleAttendanceUpload(event);
    setUploadInputKey((prev) => prev + 1);
  }

  return (
    <>
      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Attendance Import</h2>
        <p style={sectionCopyStyle}>
          Upload the late attendance CSV to save late arrivals and calculate weekly thresholds.
        </p>
        <input
          key={uploadInputKey}
          style={inputStyle}
          type="file"
          accept=".csv"
          onChange={onAttendanceFileChange}
        />
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Attendance Records</h2>
        <p style={sectionCopyStyle}>
          Review weekly late counts and assign students with 3 or more late arrivals to detention.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <input
            style={inputStyle}
            placeholder="Search student"
            value={attendanceSearch}
            onChange={(e) => setAttendanceSearch(e.target.value)}
          />
          <select
            style={inputStyle}
            value={attendanceYearFilter}
            onChange={(e) => setAttendanceYearFilter(e.target.value)}
          >
            <option value="">All years</option>
            {attendanceYearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            style={inputStyle}
            value={attendanceHomegroupFilter}
            onChange={(e) => setAttendanceHomegroupFilter(e.target.value)}
          >
            <option value="">All homegroups</option>
            {attendanceHomegroupOptions.map((homegroup) => (
              <option key={homegroup} value={homegroup}>
                {homegroup}
              </option>
            ))}
          </select>
          <label>
            <input
              type="checkbox"
              checked={attendanceOnly3Plus}
              onChange={(e) => setAttendanceOnly3Plus(e.target.checked)}
            />{" "}
            Only 3+
          </label>
          <select
            style={inputStyle}
            value={attendanceSessionId}
            onChange={(e) => setAttendanceSessionId(e.target.value)}
          >
            <option value="">Choose detention session</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name} - {session.date}
              </option>
            ))}
          </select>
          <button type="button" style={buttonStyle} onClick={assignSelectedAttendanceGroups}>
            Assign selected
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          {attendanceWeeks.length === 0 ? (
            <p>No attendance candidates match the current filters.</p>
          ) : (
            attendanceWeeks.map((week) => (
              <div key={week.weekKey} style={{ marginBottom: 18 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#bf721f",
                    marginBottom: 10,
                    cursor: "pointer",
                  }}
                  onClick={() => toggleWeek(week.weekKey)}
                >
                  <span>Week: {week.weekLabel}</span>
                  <span>{expandedWeeks[week.weekKey] ? "Hide" : "Show"}</span>
                </div>
                {expandedWeeks[week.weekKey]
                  ? week.groups.map((group) => {
                      const status = getAttendanceStatus(group);
                      const canSelect = group.count >= 3 && !status.assigned;

                      return (
                        <div
                          key={group.key}
                          style={{
                            border:
                              group.count >= 3
                                ? "2px solid #bf721f"
                                : "1px solid #d0d1d7",
                            padding: 10,
                            marginBottom: 10,
                            cursor: "pointer",
                          }}
                          onClick={() => setSelectedAttendanceKey(group.key)}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                            }}
                          >
                            <div style={{ display: "flex", gap: 10 }}>
                              <input
                                type="checkbox"
                                checked={selectedAttendanceKeys.includes(group.key)}
                                disabled={!canSelect}
                                onChange={() => toggleAttendanceSelection(group.key)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div>
                                <button
                                  type="button"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    margin: 0,
                                    font: "inherit",
                                    cursor: "pointer",
                                    color: "inherit",
                                    textAlign: "left",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAttendanceKey(
                                      selectedAttendanceGroup?.key === group.key
                                        ? ""
                                        : group.key
                                    );
                                  }}
                                >
                                  <strong>{group.name}</strong> - {group.count}
                                </button>
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div>{status.label}</div>
                              {group.count >= 3 ? (
                                <button
                                  type="button"
                                  style={buttonStyle}
                                  disabled={status.assigned}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    assignAttendanceGroupToSession(group);
                                  }}
                                >
                                  {status.assigned ? "Already assigned" : "Assign to session"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                          {selectedAttendanceGroup?.key === group.key ? (
                            <div style={{ marginTop: 14 }}>
                              <div style={{ fontWeight: "bold", marginBottom: 8 }}>
                                Attendance Incident Detail
                              </div>
                              {group.rows.map((row, index) => (
                                <div
                                  key={`${group.key}-${index}`}
                                  style={{ ...entryCardStyle, marginTop: 8 }}
                                >
                                  <div style={{ fontWeight: "bold" }}>
                                    {row.startText} · {row.period || "No period"}
                                  </div>
                                  <div>
                                    <strong>Arrival:</strong> {row.arrivalText || "-"}
                                  </div>
                                  <div>
                                    <strong>Minutes late:</strong> {row.minutesLate}
                                  </div>
                                  <div>
                                    <strong>Activity:</strong> {row.activityName || "-"}
                                  </div>
                                  <div>
                                    <strong>Teacher:</strong> {row.teacher || "-"}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  : null}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
