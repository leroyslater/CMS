import { useState } from "react";

import {
  buttonStyle,
  cardStyle,
  entryCardStyle,
  inputStyle,
  sectionCopyStyle,
  sectionTitleStyle,
  smallButtonStyle,
} from "../styles/uiStyles";

export default function AdminAccountsCard({
  accounts,
  loadingAccounts,
  creatingAccount,
  savingAccountId,
  deletingAccountId,
  resettingPasswordId,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onResetPassword,
}) {
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createFullName, setCreateFullName] = useState("");
  const [createRole, setCreateRole] = useState("supervisor");
  const [createYearLevels, setCreateYearLevels] = useState("");
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editForm, setEditForm] = useState({
    email: "",
    fullName: "",
    role: "supervisor",
    yearLevels: "",
  });

  async function handleCreate(event) {
    event.preventDefault();
    const ok = await onCreateAccount({
      email: createEmail,
      password: createPassword,
      fullName: createFullName,
      role: createRole,
      yearLevels: createYearLevels,
    });

    if (ok) {
      setCreateEmail("");
      setCreatePassword("");
      setCreateFullName("");
      setCreateRole("supervisor");
      setCreateYearLevels("");
    }
  }

  function startEditing(account) {
    setEditingAccountId(account.id);
    setEditForm({
      email: account.email || "",
      fullName: account.full_name || "",
      role: account.role || "supervisor",
      yearLevels: (account.year_levels || []).join(", "),
    });
  }

  return (
    <>
      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Create Account</h2>
        <p style={sectionCopyStyle}>
          Admins can create users and set an initial password. Users can then update their own password from the Account page.
        </p>
        <form onSubmit={handleCreate}>
          <input
            style={inputStyle}
            type="email"
            placeholder="Email"
            value={createEmail}
            onChange={(event) => setCreateEmail(event.target.value)}
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="Temporary password"
            value={createPassword}
            onChange={(event) => setCreatePassword(event.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="Full name"
            value={createFullName}
            onChange={(event) => setCreateFullName(event.target.value)}
          />
          <select
            style={inputStyle}
            value={createRole}
            onChange={(event) => setCreateRole(event.target.value)}
          >
            <option value="supervisor">Supervisor</option>
            <option value="coordinator">Coordinator</option>
            <option value="admin">Admin</option>
          </select>
          <input
            style={inputStyle}
            placeholder="Year levels (comma separated, e.g. 7, 8)"
            value={createYearLevels}
            onChange={(event) => setCreateYearLevels(event.target.value)}
          />
          <button
            type="submit"
            style={buttonStyle}
            disabled={!createEmail || !createPassword || !createFullName || creatingAccount}
          >
            {creatingAccount ? "Creating..." : "Create account"}
          </button>
        </form>
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>All Users</h2>
        <p style={sectionCopyStyle}>
          Review, edit, delete, and reset passwords for all user accounts.
        </p>
        {loadingAccounts ? (
          <p>Loading users...</p>
        ) : accounts.length === 0 ? (
          <p>No users found.</p>
        ) : (
          accounts.map((account) => (
            <div key={account.id} style={entryCardStyle}>
              {editingAccountId === account.id ? (
                <>
                  <input
                    style={inputStyle}
                    type="email"
                    value={editForm.email}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                  <input
                    style={inputStyle}
                    value={editForm.fullName}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, fullName: event.target.value }))
                    }
                  />
                  <select
                    style={inputStyle}
                    value={editForm.role}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, role: event.target.value }))
                    }
                  >
                    <option value="supervisor">Supervisor</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="admin">Admin</option>
                  </select>
                  <input
                    style={inputStyle}
                    placeholder="Year levels (comma separated, e.g. 7, 8)"
                    value={editForm.yearLevels}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, yearLevels: event.target.value }))
                    }
                  />
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={buttonStyle}
                      disabled={savingAccountId === account.id}
                      onClick={async () => {
                        const ok = await onUpdateAccount({
                          id: account.id,
                          email: editForm.email,
                          fullName: editForm.fullName,
                          role: editForm.role,
                          yearLevels: editForm.yearLevels,
                        });
                        if (ok) {
                          setEditingAccountId(null);
                        }
                      }}
                    >
                      {savingAccountId === account.id ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      type="button"
                      style={smallButtonStyle}
                      onClick={() => setEditingAccountId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: "bold" }}>
                    {account.full_name || "Unnamed user"}
                  </div>
                  <div style={{ color: "#4b587c", marginTop: 4 }}>{account.email}</div>
                  <div style={{ color: "#4b587c", marginTop: 4 }}>
                    {account.role} · Last sign-in:{" "}
                    {account.last_sign_in_at
                      ? new Date(account.last_sign_in_at).toLocaleString("en-AU")
                      : "Never"}
                  </div>
                  {account.year_levels?.length ? (
                    <div style={{ color: "#4b587c", marginTop: 4 }}>
                      Year levels: {account.year_levels.join(", ")}
                    </div>
                  ) : null}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                    <button
                      type="button"
                      style={smallButtonStyle}
                      onClick={() => startEditing(account)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      style={smallButtonStyle}
                      disabled={resettingPasswordId === account.id}
                      onClick={() => onResetPassword(account.id, account.email)}
                    >
                      {resettingPasswordId === account.id ? "Sending..." : "Reset password"}
                    </button>
                    <button
                      type="button"
                      style={{
                        ...smallButtonStyle,
                        border: "1px solid #f1c7b1",
                        color: "#8a341f",
                      }}
                      disabled={deletingAccountId === account.id}
                      onClick={() => onDeleteAccount(account.id, account.email)}
                    >
                      {deletingAccountId === account.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
