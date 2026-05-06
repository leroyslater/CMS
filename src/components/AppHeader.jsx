import {
  mobileNavButtonStyle,
  navButtonActiveStyle,
  navButtonStyle,
  smallButtonStyle,
  topBarStyle,
} from "../styles/uiStyles";
import { useEffect, useState } from "react";

const headerButtonBaseStyle = {
  border: "1px solid rgba(255,255,255,0.22)",
  background: "rgba(255,255,255,0.96)",
  color: "#14314b",
  boxShadow: "0 10px 22px rgba(9, 26, 43, 0.16)",
};

const headerButtonHighlightStyle = {
  border: "1px solid rgba(92,231,170,0.72)",
  background:
    "linear-gradient(135deg, rgba(92,231,170,0.94) 0%, rgba(57,213,146,0.94) 100%)",
  color: "#0f2840",
  boxShadow: "0 12px 24px rgba(57, 213, 146, 0.24)",
};

export default function AppHeader({
  handleLogout,
  onOpenAccount,
  accountActive,
  pages = [],
  activePage,
  onSelectPage,
}) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    function updateIsMobile() {
      const nextIsMobile = window.innerWidth <= 768;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile) {
        setMenuOpen(false);
      }
    }

    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  const mobileButtonSize = isMobile ? 38 : 44;

  return (
    <div
      style={{
        ...topBarStyle,
        padding: isMobile ? "10px 12px" : "18px 22px",
        marginBottom: isMobile ? 12 : topBarStyle.marginBottom,
        borderRadius: isMobile ? 18 : topBarStyle.borderRadius,
        gap: isMobile ? 8 : topBarStyle.gap,
        alignItems: isMobile ? "stretch" : "center",
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          width: isMobile ? "100%" : "auto",
          flex: "0 0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: "flex-start",
            flex: "0 0 auto",
            fontSize: isMobile ? 28 : 34,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "#ffffff",
            whiteSpace: "nowrap",
          }}
        >
          Strike Track
        </div>
        {isMobile ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
            {pages.length > 0 ? (
              <button
                type="button"
                style={{
                  ...smallButtonStyle,
                  ...headerButtonBaseStyle,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: mobileButtonSize,
                  height: mobileButtonSize,
                  padding: 0,
                  ...(menuOpen ? headerButtonHighlightStyle : {}),
                }}
                onClick={() => setMenuOpen((current) => !current)}
                aria-label="Open navigation menu"
                title="Menu"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 7H20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M4 12H20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M4 17H20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            ) : null}
            <button
              type="button"
              style={{
                ...smallButtonStyle,
                ...headerButtonBaseStyle,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: mobileButtonSize,
                height: mobileButtonSize,
                padding: 0,
                ...(accountActive ? headerButtonHighlightStyle : {}),
              }}
              onClick={onOpenAccount}
              aria-label="Open account"
              title="Account"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M4 21C4 17.6863 7.58172 15 12 15C16.4183 15 20 17.6863 20 21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              type="button"
              style={{
                ...smallButtonStyle,
                ...headerButtonBaseStyle,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: mobileButtonSize,
                height: mobileButtonSize,
                padding: 0,
              }}
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M10 17L15 12L10 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15 12H4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M12 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
      {!isMobile && pages.length > 0 ? (
        <div
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            flex: "1 1 auto",
            flexWrap: "nowrap",
            minWidth: 0,
            justifyContent: "center",
            paddingBottom: 0,
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              style={{
                ...navButtonStyle,
                ...headerButtonBaseStyle,
                ...(activePage === page.id ? navButtonActiveStyle : {}),
                border:
                  activePage === page.id
                    ? navButtonActiveStyle.border
                    : headerButtonBaseStyle.border,
                background:
                  activePage === page.id
                    ? navButtonActiveStyle.background
                    : headerButtonBaseStyle.background,
                color:
                  activePage === page.id
                    ? navButtonActiveStyle.color
                    : headerButtonBaseStyle.color,
                boxShadow:
                  activePage === page.id
                    ? navButtonActiveStyle.boxShadow
                    : headerButtonBaseStyle.boxShadow,
                flex: "0 0 auto",
                whiteSpace: "nowrap",
              }}
              onClick={() => onSelectPage?.(page.id)}
            >
              {page.label}
            </button>
          ))}
        </div>
      ) : null}
      {isMobile && pages.length > 0 && menuOpen ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            flex: "0 0 auto",
            width: "100%",
            minWidth: 0,
            gridTemplateColumns: "1fr",
            paddingTop: 2,
            paddingBottom: 2,
          }}
        >
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              style={{
                ...mobileNavButtonStyle,
                ...headerButtonBaseStyle,
                ...(activePage === page.id ? navButtonActiveStyle : {}),
                border:
                  activePage === page.id
                    ? navButtonActiveStyle.border
                    : headerButtonBaseStyle.border,
                background:
                  activePage === page.id
                    ? navButtonActiveStyle.background
                    : headerButtonBaseStyle.background,
                color:
                  activePage === page.id
                    ? navButtonActiveStyle.color
                    : headerButtonBaseStyle.color,
                boxShadow:
                  activePage === page.id
                    ? navButtonActiveStyle.boxShadow
                    : headerButtonBaseStyle.boxShadow,
                justifyContent: "flex-start",
                width: "100%",
              }}
              onClick={() => {
                onSelectPage?.(page.id);
                setMenuOpen(false);
              }}
            >
              {page.label}
            </button>
          ))}
        </div>
      ) : null}
      {!isMobile ? (
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "0 0 auto" }}>
        <button
          type="button"
          style={{
            ...smallButtonStyle,
            ...headerButtonBaseStyle,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: mobileButtonSize,
            height: mobileButtonSize,
            padding: 0,
            ...(accountActive ? headerButtonHighlightStyle : {}),
          }}
          onClick={onOpenAccount}
          aria-label="Open account"
          title="Account"
        >
          <svg width={isMobile ? "16" : "18"} height={isMobile ? "16" : "18"} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M4 21C4 17.6863 7.58172 15 12 15C16.4183 15 20 17.6863 20 21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          style={{
            ...smallButtonStyle,
            ...headerButtonBaseStyle,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: mobileButtonSize,
            height: mobileButtonSize,
            padding: 0,
          }}
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
        >
          <svg width={isMobile ? "16" : "18"} height={isMobile ? "16" : "18"} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M10 17L15 12L10 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15 12H4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M12 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      ) : null}
    </div>
  );
}
