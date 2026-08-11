"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { ADMIN_NAV, ADMIN_HUB_SUBITEMS, VIEW_TO_PATH } from "../../lib/constants";
import NotificationBell from "./NotificationBell";

type AdminTopbarProps = {
  viewKey: string;
};

const COLLAPSE_BREAKPOINT = 1280;
const HUB_SUBKEYS = ADMIN_HUB_SUBITEMS.map((item) => item.key);
const FLAT_NAV = ADMIN_NAV.filter((item) => item.key !== "admin-hub");

export default function AdminTopbar({ viewKey }: AdminTopbarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const hubRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const navigate = useCallback(
    (key: string) => {
      const path = VIEW_TO_PATH[key] || `/${key}`;
      router.push(path);
      setDrawerOpen(false);
      setHubOpen(false);
    },
    [router],
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (hubRef.current && !hubRef.current.contains(e.target as Node)) setHubOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    }
    if (hubOpen || accountOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [hubOpen, accountOpen]);

  const hubActive = HUB_SUBKEYS.includes(viewKey);
  const initial = (user?.name ?? "A").charAt(0).toUpperCase();

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 80,
          display: "flex",
          alignItems: "center",
          gap: 32,
          height: 68,
          padding: "0 32px",
          background: "linear-gradient(135deg, var(--hero-piedra-start), var(--hero-piedra-end))",
        }}
      >
        <span
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            fontSize: 19,
            fontWeight: 700,
            color: "var(--hero-piedra-text)",
            flexShrink: 0,
          }}
        >
          La Tribu
        </span>

        <nav className="admin-nav-row" style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <div ref={hubRef} style={{ position: "relative" }}>
            <button
              onClick={() => setHubOpen((v) => !v)}
              className={`admin-nav-tab${hubActive ? " active" : ""}`}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: 12,
                fontWeight: hubActive ? 500 : 400,
                color: hubActive ? "var(--hero-piedra-text)" : "var(--hero-piedra-text-muted)",
                padding: "8px 12px",
                position: "relative",
              }}
            >
              Administración
            </button>
            {hubOpen && (
              <div
                style={{
                  position: "absolute", top: 40, left: 0, minWidth: 180,
                  background: "var(--paper)", border: "1px solid var(--border-hairline)",
                  borderRadius: "var(--radius-card)", padding: 6, zIndex: 90,
                }}
              >
                {ADMIN_HUB_SUBITEMS.map((sub) => (
                  <button
                    key={sub.key}
                    onClick={() => navigate(sub.key)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      background: viewKey === sub.key ? "rgba(201,166,107,.14)" : "none",
                      border: "none", borderRadius: "var(--radius-control)",
                      padding: "10px 12px", fontSize: 13,
                      fontWeight: viewKey === sub.key ? 600 : 500,
                      color: viewKey === sub.key ? "var(--ring-accent)" : "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {FLAT_NAV.map((item) => {
            const active = viewKey === item.key;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                className={`admin-nav-tab${active ? " active" : ""}`}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontSize: 12,
                  fontWeight: active ? 500 : 400,
                  color: active ? "var(--hero-piedra-text)" : "var(--hero-piedra-text-muted)",
                  padding: "8px 12px",
                  position: "relative",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="admin-topbar-actions" style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span className="bell-circle">
            <NotificationBell />
          </span>
          <div ref={accountRef} style={{ position: "relative" }}>
            <button
              onClick={() => setAccountOpen((v) => !v)}
              aria-label="Cuenta"
              style={{
                width: 32, height: 32, borderRadius: "50%",
                border: "1px solid var(--hero-piedra-accent)",
                background: accountOpen ? "var(--hero-piedra-accent)" : "transparent",
                color: accountOpen ? "var(--hero-piedra-start)" : "var(--hero-piedra-text)",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s ease, color 0.2s ease",
              }}
            >
              {initial}
            </button>
            {accountOpen && (
              <div style={{
                position: "absolute", top: 40, right: 0, width: 200,
                background: "var(--paper)", border: "1px solid var(--border-hairline)",
                borderRadius: "var(--radius-card)", padding: 10, zIndex: 90,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", padding: "4px 6px" }}>
                  {user?.name ?? "Admin"}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-secondary)", padding: "0 6px 6px" }}>Admin</div>
                <button
                  onClick={logout}
                  style={{
                    width: "100%", marginTop: 6, background: "none",
                    border: "1px solid var(--border-input)", borderRadius: "9999px",
                    padding: "8px 14px", fontSize: 12, fontWeight: 500,
                    color: "var(--ink-secondary)", cursor: "pointer",
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
          <button
            className="admin-hamburger"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            style={{
              display: "none", background: "none", border: "none",
              padding: 6, flexDirection: "column", gap: 4, cursor: "pointer",
            }}
          >
            <span style={{ display: "block", width: 20, height: 2, background: "var(--hero-piedra-text)", borderRadius: 2 }} />
            <span style={{ display: "block", width: 20, height: 2, background: "var(--hero-piedra-text)", borderRadius: 2 }} />
            <span style={{ display: "block", width: 20, height: 2, background: "var(--hero-piedra-text)", borderRadius: 2 }} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 105 }}
        />
      )}
      <div
        className={`admin-drawer${drawerOpen ? " open" : ""}`}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "82vw", maxWidth: 300,
          background: "var(--page-bg)", zIndex: 110, padding: "24px 20px", overflowY: "auto",
          transform: "translateX(100%)", transition: "transform 0.28s ease",
          display: "flex", flexDirection: "column", gap: 4,
        }}
      >
        <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 16 }}>
          La Tribu
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--ink-secondary)", padding: "8px 4px 2px" }}>
          Administración
        </span>
        {ADMIN_HUB_SUBITEMS.map((sub) => (
          <button
            key={sub.key}
            onClick={() => navigate(sub.key)}
            style={{
              background: "none", border: "none", textAlign: "left", cursor: "pointer",
              padding: "10px 4px 10px 14px", fontSize: 13.5,
              fontWeight: viewKey === sub.key ? 600 : 400,
              color: viewKey === sub.key ? "var(--ink)" : "var(--ink-secondary)",
              borderBottom: "1px solid var(--border-hairline)",
            }}
          >
            {sub.label}
          </button>
        ))}
        {FLAT_NAV.map((item) => {
          const active = viewKey === item.key;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              style={{
                background: "none", border: "none", textAlign: "left", cursor: "pointer",
                padding: "12px 4px", fontSize: 14,
                fontWeight: active ? 500 : 400,
                color: active ? "var(--ink)" : "var(--ink-secondary)",
                borderBottom: "1px solid var(--border-hairline)",
              }}
            >
              {item.label}
            </button>
          );
        })}
        <button
          onClick={logout}
          style={{
            marginTop: "auto", background: "none", border: "1px solid var(--border-input)",
            borderRadius: "9999px", padding: "10px 16px", fontSize: 13, fontWeight: 500,
            color: "var(--ink-secondary)", cursor: "pointer",
          }}
        >
          Cerrar sesión
        </button>
      </div>

      <style jsx>{`
        .admin-nav-tab::after {
          content: "";
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 2px;
          height: 2px;
          background: var(--hero-piedra-accent);
          width: 0%;
          transition: width 0.18s ease;
        }
        .admin-nav-tab:hover::after {
          width: calc(100% - 24px);
        }
        .admin-nav-tab.active::after {
          width: calc(100% - 24px);
        }
        .bell-circle {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid var(--hero-piedra-accent);
          transition: background 0.2s ease;
        }
        .bell-circle:hover {
          background: var(--hero-espresso);
        }
        .admin-drawer.open {
          transform: translateX(0);
          box-shadow: -8px 0 24px rgba(0, 0, 0, 0.18);
        }
        @media (max-width: ${COLLAPSE_BREAKPOINT}px) {
          .admin-nav-row {
            display: none !important;
          }
          .admin-hamburger {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
