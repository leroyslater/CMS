import { useState } from "react";

import {
  cardStyle,
  inputStyle,
  sectionCopyStyle,
  sectionTitleStyle,
} from "../styles/uiStyles";

export default function StudentUploadCard({
  handleStudentUpload,
  studentCount,
}) {
  const [uploadInputKey, setUploadInputKey] = useState(0);

  async function onStudentFileChange(event) {
    await handleStudentUpload(event);
    setUploadInputKey((prev) => prev + 1);
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitleStyle}>Student Upload</h2>
      <p style={sectionCopyStyle}>
        Upload a CSV with columns: SUSSI ID, Last Name, First Name, and Form Group.
      </p>
      <input
        key={uploadInputKey}
        style={inputStyle}
        type="file"
        accept=".csv"
        onChange={onStudentFileChange}
      />
      <p style={{ color: "#5d5a55", fontSize: 14, marginBottom: 0 }}>
        Uploaded students: {studentCount}
      </p>
    </div>
  );
}
