"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { CLIENT_NAV, VIEW_TO_PATH, type AppState } from "../../lib/constants";
import { getModuleAccessState } from "../../lib/module-access";
import NotificationBell from "./NotificationBell";
import BrandRing from "../ui/BrandRing";
import { CrownBadge } from "../ui/CrownBadge";
import { ModuleExpiredModal } from "./ModuleExpiredModal";
import { IconLock, IconSettings, IconLogout } from "../ui/icons";

type ClientTopbarProps = {
  viewKey: string;
};

const COLLAPSE_BREAKPOINT = 1280;

// Fila simple de ícono + texto para el dropdown de la cuenta — pensada para
// que agregar una opción nueva sea sumar una fila más, no rediseñar el
// dropdown (antes eran botones-píldora con borde propio, no escalaba bien).
function AccountMenuRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 9,
        background: hover ? "var(--page-bg)" : "transparent", border: "none",
        padding: "9px 14px", fontSize: 12.5, fontWeight: 500,
        color: "var(--ink-secondary)", cursor: "pointer", textAlign: "left",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", color: "var(--ink-secondary)" }}>{icon}</span>
      {label}
    </button>
  );
}

export default function ClientTopbar({ viewKey }: ClientTopbarProps) {
  const router = useRouter();
  const { user, clientType, onboardingComplete, moduleAccess, planExpired, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [expiredModalOpen, setExpiredModalOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const navigate = useCallback(
    (key: string) => {
      const path = VIEW_TO_PATH[key] || `/${key}`;
      router.push(path);
      setDrawerOpen(false);
    },
    [router],
  );

  // Un módulo 'expired' está incluido en la membresía pero se venció — en
  // vez de navegar, se avisa con el modal (ver getModuleAccessState, misma
  // función que usan las cards del home).
  const handleNavClick = useCallback(
    (key: string) => {
      if (getModuleAccessState(key, { moduleAccess, planExpired }) === "expired") {
        setDrawerOpen(false);
        setExpiredModalOpen(true);
        return;
      }
      navigate(key);
    },
    [moduleAccess, planExpired, navigate],
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    if (accountOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [accountOpen]);

  const sn: AppState = {
    role: "cliente",
    clientType: clientType ?? null,
    onboardingComplete,
    planExpired: false,
  };

  const items = CLIENT_NAV.filter((item) => (item.visible ? item.visible(sn) : true));
  const initial = (user?.name ?? "U").charAt(0).toUpperCase();

  // Precarga todas las rutas del topbar una vez montado: el set de módulos por
  // rol es chico, así que el siguiente clic ya encuentra el chunk tibio.
  useEffect(() => {
    items.forEach((item) => {
      router.prefetch(VIEW_TO_PATH[item.key] || `/${item.key}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <button
          onClick={() => router.push("/")}
          aria-label="Ir al menú principal"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "Fraunces, Georgia, serif",
            fontSize: 19,
            fontWeight: 700,
            color: "var(--hero-piedra-text)",
            flexShrink: 0,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <BrandRing size={24} background="var(--hero-piedra-start)" />
          La Tribu
        </button>

        <nav className="client-nav-row" style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          {items.map((item) => {
            const active = viewKey === item.key;
            const state = getModuleAccessState(item.key, { moduleAccess, planExpired });
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={`client-nav-tab${active ? " active" : ""}`}
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {item.label}
                  {state === "expired" && <CrownBadge circleSize={14} iconSize={8} />}
                  {state === "not_included" && <IconLock size={10} />}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="client-topbar-actions" style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: "auto" }}>
          <span className="bell-circle">
            <NotificationBell />
          </span>
          <div ref={accountRef} style={{ position: "relative" }}>
            <button
              onClick={() => setAccountOpen((v) => !v)}
              aria-label="Membresía"
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
                borderRadius: "var(--radius-card)", padding: "6px 0", zIndex: 90,
                overflow: "hidden",
              }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: "var(--ink)",
                  padding: "8px 14px 10px", borderBottom: "1px solid var(--border-hairline)",
                }}>
                  {user?.name ?? "Miembro"}
                </div>
                {/* Navegación — agregar futuras filas acá (mismo AccountMenuRow) */}
                <div style={{ padding: "4px 0", borderBottom: "1px solid var(--border-hairline)" }}>
                  <AccountMenuRow
                    icon={<IconSettings size={14} />}
                    label="Configuración"
                    onClick={() => {
                      setAccountOpen(false);
                      router.push("/configuracion");
                    }}
                  />
                </div>
                {/* Sesión */}
                <div style={{ padding: "4px 0" }}>
                  <AccountMenuRow icon={<IconLogout size={14} />} label="Cerrar sesión" onClick={logout} />
                </div>
              </div>
            )}
          </div>
          <button
            className="client-hamburger"
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
        className={`client-drawer${drawerOpen ? " open" : ""}`}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "82vw", maxWidth: 300,
          background: "var(--page-bg)", zIndex: 110, padding: "24px 20px",
          transition: "transform 0.28s ease",
          display: "flex", flexDirection: "column", gap: 4,
        }}
      >
        <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 16 }}>
          La Tribu
        </span>
        {items.map((item) => {
          const active = viewKey === item.key;
          const state = getModuleAccessState(item.key, { moduleAccess, planExpired });
          return (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              style={{
                background: "none", border: "none", textAlign: "left", cursor: "pointer",
                padding: "12px 4px", fontSize: 14,
                fontWeight: active ? 500 : 400,
                color: active ? "var(--ink)" : "var(--ink-secondary)",
                borderBottom: "1px solid var(--border-hairline)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {item.label}
                {state === "expired" && <CrownBadge circleSize={14} iconSize={8} />}
                {state === "not_included" && <IconLock size={11} />}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => {
            setDrawerOpen(false);
            router.push("/configuracion");
          }}
          style={{
            marginTop: "auto", background: "none", border: "1px solid var(--border-input)",
            borderRadius: "9999px", padding: "10px 16px", fontSize: 13, fontWeight: 500,
            color: "var(--ink-secondary)", cursor: "pointer",
          }}
        >
          Configuración
        </button>
        <button
          onClick={logout}
          style={{
            marginTop: 8, background: "none", border: "1px solid var(--border-input)",
            borderRadius: "9999px", padding: "10px 16px", fontSize: 13, fontWeight: 500,
            color: "var(--ink-secondary)", cursor: "pointer",
          }}
        >
          Cerrar sesión
        </button>
      </div>

      <ModuleExpiredModal open={expiredModalOpen} onClose={() => setExpiredModalOpen(false)} />

      <style jsx>{`
        .client-nav-tab::after {
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
        .client-nav-tab:hover::after {
          width: calc(100% - 24px);
        }
        .client-nav-tab.active::after {
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
        .client-drawer {
          transform: translateX(100%);
        }
        .client-drawer.open {
          transform: translateX(0);
          box-shadow: -8px 0 24px rgba(0, 0, 0, 0.18);
        }
        @media (max-width: ${COLLAPSE_BREAKPOINT}px) {
          .client-nav-row {
            display: none !important;
          }
          .client-hamburger {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
