"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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

const API_BASE = "http://localhost:3003/api";

export default function NotificationBell() {
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
          color: "var(--ink-secondary)",
          padding: "4px 6px",
          opacity: 0.75,
          transition: "opacity 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.75";
        }}
      >
        <IconBell size={18} />
        {/* Unread dot — Oura-style gold indicator */}
        {hasUnread && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 4,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--danger)",
            }}
          />
        )}
      </button>

      {/* Dropdown panel — Oura card style: no shadow, subtle border, pill-radius */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: 36,
            right: 0,
            width: 320,
            background: "var(--paper)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-card)",
            padding: 6,
            zIndex: 50,
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {notifications.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--ink-secondary)",
                padding: "16px 10px",
                textAlign: "center",
              }}
            >
              No hay notificaciones
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  fontSize: 12,
                  color: "var(--ink)",
                  padding: "9px 8px",
                  borderBottom: "1px solid var(--border-hairline)",
                  lineHeight: 1.4,
                  background: n.read ? "transparent" : "var(--page-bg)",
                  borderRadius: n.read ? "0" : "8px",
                }}
              >
                <div>{n.message}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: "var(--ink-secondary)" }}>
                    {new Date(n.createdAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span style={{ display: "flex", gap: 8 }}>
                    {role === "admin" && n.clientId && (
                      <a
                        href={`/admin/clients/${n.clientId}`}
                        style={{ fontSize: 10, fontWeight: 600, color: "var(--ring-accent)", textDecoration: "none" }}
                      >
                        Ver cliente
                      </a>
                    )}
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        style={{
                          background: "none", border: "none", padding: 0, cursor: "pointer",
                          fontSize: 10, fontWeight: 600, color: "var(--ring-accent)",
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
    </div>
  );
}
