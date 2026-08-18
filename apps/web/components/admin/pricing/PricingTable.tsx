"use client";

import { useEffect, useState } from "react";
import { updateMembershipPrice, type MembershipPrice } from "../../../lib/membership-client";
import { MEMBERSHIP_LABELS } from "../../../lib/constants";
import { showToast } from "../../layout/AppShell";

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600,
  color: "var(--ink-secondary)", textTransform: "uppercase",
  letterSpacing: "0.04em", borderBottom: "1px solid var(--border-hairline)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px", fontSize: 13, color: "var(--ink)", verticalAlign: "middle",
};

const inputStyle: React.CSSProperties = {
  width: 120, height: 32, borderRadius: 0, border: "none",
  borderBottom: "1px solid var(--border-input)", padding: "0 2px 4px",
  fontSize: 14, fontWeight: 600, background: "transparent", color: "var(--ink)",
  outline: "none", boxSizing: "border-box",
};

function centsToDollarsInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default function PricingTable({ prices, onSaved }: { prices: MembershipPrice[]; onSaved: () => void }) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    setEdits(Object.fromEntries(prices.map((p) => [p.id, centsToDollarsInput(p.amountCents)])));
  }, [prices]);

  const handleSave = async (price: MembershipPrice) => {
    const dollars = Number(edits[price.id]);
    if (!Number.isFinite(dollars) || dollars < 0) {
      showToast("Ingresa un monto válido.", "error");
      return;
    }
    setSaving(price.id);
    try {
      await updateMembershipPrice(price.id, Math.round(dollars * 100));
      showToast("Precio guardado.", "success");
      onSaved();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al guardar.", "error");
    } finally {
      setSaving(null);
    }
  };

  const sorted = [...prices].sort((a, b) =>
    a.clientType === b.clientType ? a.durationMonths - b.durationMonths : a.clientType.localeCompare(b.clientType)
  );

  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Membresía", "Duración", "Monto (USD)", ""].map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((price) => (
            <tr key={price.id} style={{ borderBottom: "1px solid var(--border-hairline)" }}>
              <td style={tdStyle}>{MEMBERSHIP_LABELS[price.clientType] || price.clientType}</td>
              <td style={tdStyle}>{price.durationMonths} {price.durationMonths === 1 ? "mes" : "meses"}</td>
              <td style={tdStyle}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={edits[price.id] ?? ""}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [price.id]: e.target.value }))}
                  style={inputStyle}
                />
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                <button
                  onClick={() => handleSave(price)}
                  disabled={saving === price.id}
                  style={{
                    padding: "6px 16px", borderRadius: "9999px", border: "1px solid var(--border-hairline)",
                    background: "transparent", color: "var(--ink-secondary)", fontSize: 12, fontWeight: 600,
                    cursor: saving === price.id ? "not-allowed" : "pointer", opacity: saving === price.id ? 0.6 : 1,
                  }}
                >
                  Guardar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
