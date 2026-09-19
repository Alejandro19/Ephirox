"use client";

import { useState } from "react";
import AdminClientList from "@/components/admin/AdminClientList";
import { EnterpriseLeadsPanel } from "@/components/admin/EnterpriseLeadsPanel";
import { AdminMentorList } from "@/components/admin/AdminMentorList";
import { QuotesPanel } from "@/components/admin/QuotesPanel";
import { PhrasesPanel } from "@/components/admin/PhrasesPanel";

const subtabButtonStyle = (active: boolean): React.CSSProperties => ({
  border: "none", background: "transparent", cursor: "pointer",
  padding: "8px 4px", marginRight: 20, position: "relative",
  fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
  fontSize: 12, fontWeight: 700, color: active ? "var(--eph-accent)" : "var(--eph-muted)",
});

type ClientsSubtab = "clientes" | "leads" | "mentores" | "frases";

const SUBTABS: { key: ClientsSubtab; label: string }[] = [
  { key: "clientes", label: "Clientes" },
  { key: "leads", label: "Leads" },
  { key: "mentores", label: "Mentores" },
  { key: "frases", label: "Frases" },
];

// Leads, Mentores y Frases se integran acá como pestañas adicionales (mismo
// patrón que "Casos Etiquetados" dentro de Protocolos) — antes vivían como
// ítems propios del menú Administration.
export default function AdminClientsPage() {
  const [sub, setSub] = useState<ClientsSubtab>("clientes");

  return (
    <div>
      <div style={{ display: "flex", borderBottom: "1px solid var(--eph-line)", marginBottom: 24 }}>
        {SUBTABS.map((tab) => (
          <button key={tab.key} type="button" style={subtabButtonStyle(sub === tab.key)} onClick={() => setSub(tab.key)}>
            {tab.label}
            {sub === tab.key && (
              <span style={{ position: "absolute", left: 0, right: 20, bottom: -1, height: 2, background: "var(--eph-accent)" }} />
            )}
          </button>
        ))}
      </div>

      {sub === "clientes" && <AdminClientList />}
      {sub === "leads" && <EnterpriseLeadsPanel />}
      {sub === "mentores" && <AdminMentorList />}
      {sub === "frases" && (
        <>
          <QuotesPanel />
          <PhrasesPanel />
        </>
      )}
    </div>
  );
}
