"use client";

import { useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import SidebarRing from "./SidebarRing";
import {
  CLIENT_NAV,
  ADMIN_NAV,
  ADMIN_HUB_SUBITEMS,
  MODULE_THEME,
  ARC_COLOR_VAR,
  VIEW_TO_PATH,
  PATH_TO_VIEW,
} from "../../lib/constants";
import { useAuth } from "../../lib/auth-context";

function deriveViewKey(pathname: string): string {
  return PATH_TO_VIEW[pathname] ?? "training";
}

function navItemStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "12px 14px", borderRadius: "12px",
    color: active ? "var(--terracota)" : "var(--ink-soft)",
    fontWeight: 600, fontSize: "14px",
    marginBottom: "4px",
    background: active ? "var(--terracota-soft)" : "none",
    border: "none", width: "100%", textAlign: "left",
    cursor: "pointer",
  };
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, user, clientType, onboardingComplete, logout } = useAuth();
  const viewKey = deriveViewKey(pathname);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminHubOpen, setAdminHubOpen] = useState(false);

  const navigate = useCallback(
    (key: string) => {
      const path = VIEW_TO_PATH[key] || `/${key}`;
      router.push(path);
      setMobileOpen(false);
    },
    [router],
  );

  const isAdmin = role === "admin";

  if (!role) return null;

  return (
    <>
      {mobileOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 90 }}
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        style={{
          width: 250, background: "var(--paper)", borderRight: "1px solid var(--line)",
          padding: "28px 18px", display: "flex", flexDirection: "column", flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", margin: "0 8px 4px", fontFamily: "Fraunces, Georgia, serif" }}>
          La Tribu
        </div>
        <SidebarRing viewKey={viewKey} />
        <nav id="nav-items" style={{ flex: 1 }}>
          {isAdmin
            ? renderAdminNav(adminHubOpen, setAdminHubOpen, viewKey, navigate)
            : renderClientNav(clientType, onboardingComplete, viewKey, navigate)}
        </nav>
        <div style={{ marginTop: "auto", padding: "14px" }}>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 10, padding: "0 4px" }}>
            {user?.name ?? ""} · {isAdmin ? "Admin" : "Miembro"}
          </div>
          <button
            onClick={logout}
            style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8,
              padding: "6px 14px", fontSize: 12, color: "var(--ink-soft)", width: "100%" }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <style jsx>{`
        @media (max-width: 900px) {
          aside { position: fixed; top: 0; left: 0; bottom: 0; width: 82vw; max-width: 300px;
            z-index: 100; transform: translateX(-100%); transition: transform .28s ease; }
          aside.open { transform: translateX(0); box-shadow: 8px 0 24px rgba(0,0,0,.18); }
        }
      `}</style>
    </>
  );
}

function renderAdminNav(
  adminHubOpen: boolean,
  setAdminHubOpen: (v: boolean | ((v: boolean) => boolean)) => void,
  viewKey: string,
  navigate: (key: string) => void,
) {
  return ADMIN_NAV.map((item) => {
    if (item.key === "admin-hub") {
      const expanded = adminHubOpen;
      return (
        <div key={item.key}>
          <button className="nav-item" onClick={() => setAdminHubOpen((v) => !v)} style={navItemStyle(expanded)}>
            {item.label}
          </button>
          {expanded && ADMIN_HUB_SUBITEMS.map((sub) => (
            <button key={sub.key} className="nav-item" onClick={() => navigate(sub.key)}
              style={{ ...navItemStyle(viewKey === sub.key), paddingLeft: 32, fontSize: 13, fontWeight: 500 }}>
              {sub.label}
            </button>
          ))}
        </div>
      );
    }
    return (
      <button key={item.key} className="nav-item" onClick={() => navigate(item.key)} style={navItemStyle(viewKey === item.key)}>
        {item.label}
      </button>
    );
  });
}

function renderClientNav(
  clientType: string | null,
  onboardingComplete: boolean,
  viewKey: string,
  navigate: (key: string) => void,
) {
  const sn = { role: "cliente" as const, clientType: clientType ?? null, onboardingComplete, planExpired: false };
  return CLIENT_NAV.filter((item) => (item.visible ? item.visible(sn) : true)).map((item) => {
    const cfg = MODULE_THEME[item.key];
    const dotColor = cfg ? `var(${ARC_COLOR_VAR[cfg.arc]})` : "var(--ink-soft)";
    const locked = clientType === "lead_wellness" && (item.key === "training" || item.key === "nutrition");
    const active = viewKey === item.key;
    return (
      <button key={item.key} className="nav-item" onClick={() => navigate(item.key)} style={navItemStyle(active)}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, display: "inline-block", background: dotColor, marginRight: 8 }} />
        {item.label}
        {locked && <span style={{ fontSize: 12, marginLeft: 4 }}>🔒</span>}
      </button>
    );
  });
}