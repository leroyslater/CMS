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

export default function ChronicleImportCard({
  handleChronicleSync,
  handleChronicleUpload,
  chronicleSyncYear,
  setChronicleSyncYear,
  chronicleSyncModifiedSince,
  setChronicleSyncModifiedSince,
  chronicleSyncing,
  chronicleSearch,
  setChronicleSearch,
  chronicleYearFilter,
  setChronicleYearFilter,
  chronicleHomegroupFilter,
  setChronicleHomegroupFilter,
  chronicleOnly3Plus,
  setChronicleOnly3Plus,
  chronicleSessionId,
  setChronicleSessionId,
  sessions,
  chronicleYearOptions,
  chronicleHomegroupOptions,
  assignSelectedChronicleGroups,
  filteredChronicle,
  selectedChronicleKeys,
  toggleChronicleSelection,
  setSelectedChronicleKey,
  getChronicleStatus,
  assignChronicleGroupToSession,
  selectedChronicleGroup,
}) {
  const chronicleWeeks = useMemo(
    () =>
      filteredChronicle
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
    [filteredChronicle]
  );
  const summary = useMemo(() => {
    const candidateCount = filteredChronicle.length;
    const incidentCount = filteredChronicle.reduce(
      (total, group) => total + group.rows.length,
      0
    );
    const thresholdCount = filteredChronicle.filter((group) => group.count >= 3).length;
    const readyCount = filteredChronicle.filter((group) => {
      const status = getChronicleStatus(group);
      return group.count >= 3 && !status.assigned;
    }).length;

    return {
      weekCount: chronicleWeeks.length,
      candidateCount,
      incidentCount,
      thresholdCount,
      readyCount,
    };
  }, [chronicleWeeks.length, filteredChronicle, getChronicleStatus]);
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [uploadInputKey, setUploadInputKey] = useState(0);

  function toggleWeek(weekKey) {
    setExpandedWeeks((prev) => ({
      ...prev,
      [weekKey]: !prev[weekKey],
    }));
  }

  async function onChronicleFileChange(event) {
    await handleChronicleUpload(event);
    setUploadInputKey((prev) => prev + 1);
  }

  return (
    <>
      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Chronicle Sync</h2>
        <p style={sectionCopyStyle}>
          Sync Chronicle data directly from Compass, or use a CSV upload as a fallback.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <input
            style={inputStyle}
            type="number"
            min="2000"
            max="2100"
            placeholder="Year"
            value={chronicleSyncYear}
            onChange={(event) => setChronicleSyncYear(event.target.value)}
          />
          <input
            style={inputStyle}
            type="date"
            value={chronicleSyncModifiedSince}
            onChange={(event) => setChronicleSyncModifiedSince(event.target.value)}
          />
          <button
            type="button"
            style={buttonStyle}
            onClick={handleChronicleSync}
            disabled={chronicleSyncing}
          >
            {chronicleSyncing ? "Syncing..." : "Sync from Compass"}
          </button>
        </div>
        <p style={{ ...sectionCopyStyle, marginTop: 14 }}>
          CSV fallback
        </p>
        <input
          key={uploadInputKey}
          style={inputStyle}
          type="file"
          accept=".csv"
          onChange={onChronicleFileChange}
        />
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Chronicle Records</h2>
        <p style={sectionCopyStyle}>
          Filter imported Chronicle entries, review weekly groupings, and assign eligible students to sessions.
        </p>
        <div style={statGridStyle}>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Weeks</div>
            <div style={statValueStyle}>{summary.weekCount}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Student Weeks</div>
            <div style={statValueStyle}>{summary.candidateCount}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Incidents</div>
            <div style={statValueStyle}>{summary.incidentCount}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>3+ Threshold</div>
            <div style={statValueStyle}>{summary.thresholdCount}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Ready To Assign</div>
            <div style={statValueStyle}>{summary.readyCount}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <input
            style={inputStyle}
            placeholder="Search student"
            value={chronicleSearch}
            onChange={(e) => setChronicleSearch(e.target.value)}
          />
          <select
            style={inputStyle}
            value={chronicleYearFilter}
            onChange={(e) => setChronicleYearFilter(e.target.value)}
          >
            <option value="">All years</option>
            {chronicleYearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            style={inputStyle}
            value={chronicleHomegroupFilter}
            onChange={(e) => setChronicleHomegroupFilter(e.target.value)}
          >
            <option value="">All homegroups</option>
            {chronicleHomegroupOptions.map((homegroup) => (
              <option key={homegroup} value={homegroup}>
                {homegroup}
              </option>
            ))}
          </select>
          <label>
            <input
              type="checkbox"
              checked={chronicleOnly3Plus}
              onChange={(e) => setChronicleOnly3Plus(e.target.checked)}
            />{" "}
            Only 3+
          </label>
          <select
            style={inputStyle}
            value={chronicleSessionId}
            onChange={(e) => setChronicleSessionId(e.target.value)}
          >
            <option value="">Choose detention session</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name} - {session.date}
              </option>
            ))}
          </select>
          <button type="button" style={buttonStyle} onClick={assignSelectedChronicleGroups}>
            Assign selected
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          {chronicleWeeks.length === 0 ? (
            <p>No Chronicle candidates match the current filters.</p>
          ) : (
            chronicleWeeks.map((week) => (
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
                  <span>Week: {week.weekLabel}</span>
                  <span>{expandedWeeks[week.weekKey] ? "Hide" : "Show"}</span>
                </div>
                {expandedWeeks[week.weekKey]
                  ? week.groups.map((group) => {
                  const status = getChronicleStatus(group);
                  const canSelect = group.count >= 3 && !status.assigned;
                  const isReady = group.count >= 3 && !status.assigned;
                  const badgeLabel = status.assigned
                    ? "Assigned"
                    : isReady
                      ? "Threshold met"
                      : "Monitoring";
                  const badgeStyle = status.assigned
                    ? {
                        color: brandPalette.navy,
                        background: brandPalette.mintSoft,
                        border: "1px solid rgba(92,231,170,0.45)",
                      }
                    : isReady
                      ? {
                          color: brandPalette.navyDeep,
                          background: "rgba(92,231,170,0.16)",
                          border: "1px solid rgba(92,231,170,0.45)",
                        }
                      : {
                          color: brandPalette.navy,
                          background: "rgba(17,44,71,0.06)",
                          border: "1px solid rgba(17,44,71,0.12)",
                        };

                  return (
                    <div
                      key={group.key}
                      style={{
                        border: isReady
                          ? `2px solid ${brandPalette.mintStrong}`
                          : `1px solid ${brandPalette.border}`,
                        padding: 14,
                        marginBottom: 10,
                        cursor: "pointer",
                        borderRadius: 18,
                        background: isReady
                          ? "rgba(92,231,170,0.1)"
                          : "rgba(255,255,255,0.82)",
                      }}
                      onClick={() => setSelectedChronicleKey(group.key)}
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
                            checked={selectedChronicleKeys.includes(group.key)}
                            disabled={!canSelect}
                            onChange={() => toggleChronicleSelection(group.key)}
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
                                setSelectedChronicleKey(
                                  selectedChronicleGroup?.key === group.key ? "" : group.key
                                );
                              }}
                            >
                              <strong>{group.name}</strong>
                            </button>
                            <div
                              style={{
                                marginTop: 6,
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                                alignItems: "center",
                                color: brandPalette.muted,
                                fontSize: 13,
                              }}
                            >
                              <span>{group.count} Chronicle{group.count === 1 ? "" : "s"}</span>
                              {group.homegroup ? <span>{group.homegroup}</span> : null}
                              {group.yearLevel ? <span>Year {group.yearLevel}</span> : null}
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "5px 10px",
                                  borderRadius: 999,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  ...badgeStyle,
                                }}
                              >
                                {badgeLabel}
                              </span>
                            </div>
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
                                assignChronicleGroupToSession(group);
                              }}
                            >
                              {status.assigned ? "Already assigned" : "Assign to session"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {selectedChronicleGroup?.key === group.key ? (
                        <div style={{ marginTop: 14 }}>
                          <div style={{ fontWeight: "bold", marginBottom: 8 }}>
                            Chronicle Incident Detail
                          </div>
                          {group.rows.map((row, index) => (
                            <div
                              key={`${group.key}-${index}`}
                              style={{ ...entryCardStyle, marginTop: 8 }}
                            >
                              <div style={{ fontWeight: "bold" }}>{row.occurredText}</div>
                              <div>
                                <strong>Details:</strong> {row.details || "No details"}
                              </div>
                              <div>
                                <strong>Chronicle Type:</strong>{" "}
                                {row.chronicleType || "Unknown"}
                              </div>
                              <div>
                                <strong>Original Publisher:</strong>{" "}
                                {row.originalPublisher || "-"}
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
