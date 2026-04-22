import { useMemo, useState } from "react";

import {
  brandPalette,
  buttonStyle,
  cardStyle,
  entryCardStyle,
  inputStyle,
  sectionCopyStyle,
  sectionTitleStyle,
  statCardStyle,
  statGridStyle,
  statLabelStyle,
  statValueStyle,
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
  function formatSchoolWeekHeading(weekKey, fallbackLabel) {
    const weekStart = parseIsoDate(weekKey);
    if (!weekStart) return fallbackLabel;

    const weekEnding = new Date(weekStart);
    weekEnding.setDate(weekEnding.getDate() + 7);

    const termWeek = getVictorianTermWeek(weekEnding);
    const formattedDate = formatDateDisplay(weekEnding);

    if (!termWeek) {
      return `Week Ending: ${formattedDate}`;
    }

    return `Term ${termWeek.term} Week ${termWeek.week}: ${formattedDate}`;
  }

  const attendanceWeeks = useMemo(
    () =>
      filteredAttendance
        .reduce((sections, group) => {
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
        }, [])
        .sort((a, b) => b.weekKey.localeCompare(a.weekKey)),
    [filteredAttendance]
  );
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const summary = useMemo(() => {
    const groupCount = filteredAttendance.length;
    const incidentCount = filteredAttendance.reduce(
      (total, group) => total + group.rows.length,
      0
    );
    const thresholdCount = filteredAttendance.filter((group) => group.count >= 3).length;
    const schoolLateCount = filteredAttendance.reduce(
      (total, group) =>
        total +
        group.rows.filter((row) => row.attendanceType === "School late").length,
      0
    );
    const classLateCount = filteredAttendance.reduce(
      (total, group) =>
        total +
        group.rows.filter((row) => row.attendanceType === "Class late").length,
      0
    );

    return {
      groupCount,
      incidentCount,
      thresholdCount,
      schoolLateCount,
      classLateCount,
    };
  }, [filteredAttendance]);
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
        <h2 style={sectionTitleStyle}>Attendance CSV Import</h2>
        <p style={sectionCopyStyle}>
          Upload the attendance CSV report to load both school-late and class-late records. A real
          arrival time counts as school late. `-` in arrival time counts as class late.
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
          Review weekly late counts from the imported attendance CSV, then assign students with 3 or more late arrivals to detention.
        </p>
        <div style={statGridStyle}>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Student Weeks</div>
            <div style={statValueStyle}>{summary.groupCount}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Late Incidents</div>
            <div style={statValueStyle}>{summary.incidentCount}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>3+ Threshold</div>
            <div style={statValueStyle}>{summary.thresholdCount}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>School Late</div>
            <div style={statValueStyle}>{summary.schoolLateCount}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Class Late</div>
            <div style={statValueStyle}>{summary.classLateCount}</div>
          </div>
        </div>
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
                    color: brandPalette.mintStrong,
                    marginBottom: 10,
                    cursor: "pointer",
                  }}
                  onClick={() => toggleWeek(week.weekKey)}
                >
                  <span>{formatSchoolWeekHeading(week.weekKey, week.weekLabel)}</span>
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
                                ? `2px solid ${brandPalette.mintStrong}`
                                : `1px solid ${brandPalette.border}`,
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
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      gap: 12,
                                      alignItems: "center",
                                      marginBottom: 8,
                                    }}
                                  >
                                    <div style={{ fontWeight: "bold" }}>
                                      {row.startText} · {row.period || "No period"}
                                    </div>
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        padding: "6px 10px",
                                        borderRadius: 999,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color:
                                          row.attendanceType === "School late"
                                            ? brandPalette.navy
                                            : "#8a341f",
                                        background:
                                          row.attendanceType === "School late"
                                            ? brandPalette.mintSoft
                                            : "#fff2eb",
                                        border:
                                          row.attendanceType === "School late"
                                            ? "1px solid rgba(92,231,170,0.45)"
                                            : "1px solid #f1c7b1",
                                      }}
                                    >
                                      {row.attendanceType}
                                    </span>
                                  </div>
                                  <div>
                                    <strong>Class:</strong> {row.activityName || "-"}
                                  </div>
                                  <div>
                                    <strong>Arrival:</strong>{" "}
                                    {row.attendanceType === "Class late"
                                      ? "Not recorded"
                                      : row.arrivalText || "-"}
                                  </div>
                                  <div>
                                    <strong>Minutes late:</strong> {row.minutesLate}
                                  </div>
                                  <div>
                                    <strong>Type:</strong> {row.attendanceDescription || "-"}
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

const VICTORIAN_TERM_WEEKS_2026 = [
  { term: 1, firstWeekEnding: "2026-01-30", lastWeekEnding: "2026-04-03" },
  { term: 2, firstWeekEnding: "2026-04-24", lastWeekEnding: "2026-06-26" },
  { term: 3, firstWeekEnding: "2026-07-17", lastWeekEnding: "2026-09-18" },
  { term: 4, firstWeekEnding: "2026-10-09", lastWeekEnding: "2026-12-18" },
];

function parseIsoDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateDisplay(date) {
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getVictorianTermWeek(weekEndingDate) {
  const weekEndingKey = [
    weekEndingDate.getFullYear(),
    String(weekEndingDate.getMonth() + 1).padStart(2, "0"),
    String(weekEndingDate.getDate()).padStart(2, "0"),
  ].join("-");

  const term = VICTORIAN_TERM_WEEKS_2026.find(
    (item) =>
      weekEndingKey >= item.firstWeekEnding && weekEndingKey <= item.lastWeekEnding
  );

  if (!term) return null;

  const firstWeekEnding = parseIsoDate(term.firstWeekEnding);
  const weekOffset = Math.round((weekEndingDate - firstWeekEnding) / 604800000);

  return {
    term: term.term,
    week: weekOffset + 1,
  };
}
