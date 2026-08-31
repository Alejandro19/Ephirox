"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { getSessionToken } from "../../lib/api-client";
import { IconBell } from "../ui/icons";

type NotificationItem = {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
  clientId?: string;
};

const API_BASE = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3003"}/api`;

export default function NotificationBell() {
  const router = useRouter();
  const { role, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = getSessionToken();
      if (!token || !user?.id) return;

      const url =
        role === "admin"
          ? `${API_BASE}/admin/notifications`
          : `${API_BASE}/clients/${user.id}/notifications`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const items: NotificationItem[] = Array.isArray(data) ? data : data.notifications ?? [];
        setNotifications(items.slice(0, 20));
        setHasUnread(items.some((n) => !n.read));
      }
    } catch {
      // Silently fail — notifications are non-critical
    }
  }, [role, user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  async function markRead(id: string) {
    const token = getSessionToken();
    if (!token) return;
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      setHasUnread(next.some((n) => !n.read));
      return next;
    });
    try {
      const url =
        role === "admin"
          ? `${API_BASE}/admin/notifications/${id}/read`
          : `${API_BASE}/clients/${user?.id}/notifications/${id}/read`;
      await fetch(url, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    } catch {
      // Silently fail — a stale "unread" state on next refetch is harmless
    }
  }

  return (
    <div ref={bellRef} style={{ position: "relative" }}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchNotifications();
        }}
        aria-label="Notificaciones"
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "inline-flex",
          color: "var(--eph-text)",
          padding: "4px 6px",
          opacity: 0.85,
          transition: "opacity 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.85";
        }}
      >
        <IconBell size={18} />
        {/* Punto de no leído */}
        {hasUnread && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 4,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--eph-accent)",
            }}
          />
        )}
      </button>

      {/* Fixed + inset en mobile (en vez de absolute/right:0 anclado al ícono)
          para que nunca se salga de la pantalla en viewports angostos. */}
      {open && (
        <div
          className="notif-dropdown"
          style={{
            background: "var(--eph-surface)",
            border: "1px solid var(--eph-line)",
            borderRadius: 0,
            padding: 6,
            zIndex: 50,
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {notifications.length === 0 ? (
            <div
              className="font-mono"
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--eph-muted)",
                padding: "18px 10px",
                textAlign: "center",
              }}
            >
              No hay notificaciones
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="font-body"
                style={{
                  fontSize: 12.5,
                  color: "var(--eph-text)",
                  padding: "9px 8px",
                  borderBottom: "1px solid var(--eph-line)",
                  lineHeight: 1.4,
                  background: n.read ? "transparent" : "var(--eph-surface-2)",
                  borderRadius: 0,
                }}
              >
                <div>{n.message}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <span className="font-mono" style={{ fontSize: 9, color: "var(--eph-muted)" }}>
                    {new Date(n.createdAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span style={{ display: "flex", gap: 8 }}>
                    {role === "admin" && n.clientId && (
                      <button
                        type="button"
                        onClick={() => { setOpen(false); router.push(`/admin/clients/${n.clientId}`); }}
                        className="font-mono"
                        style={{
                          background: "none", border: "none", padding: 0, cursor: "pointer",
                          fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--eph-accent)",
                        }}
                      >
                        Ver cliente
                      </button>
                    )}
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="font-mono"
                        style={{
                          background: "none", border: "none", padding: 0, cursor: "pointer",
                          fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--eph-accent)",
                        }}
                      >
                        Marcar leída
                      </button>
                    )}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <style jsx>{`
        .notif-dropdown {
          position: absolute;
          top: 36px;
          right: 0;
          width: 320px;
        }
        @media (max-width: 480px) {
          .notif-dropdown {
            position: fixed;
            top: 72px;
            left: 12px;
            right: 12px;
            width: auto;
          }
        }
      `}</style>
    </div>
  );
}
