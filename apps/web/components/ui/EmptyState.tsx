"use client";

export default function EmptyState({ message = "No hay datos por ahora." }: { message?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center text-center font-mono text-[10px] font-normal uppercase tracking-[0.16em]"
      style={{
        color: "var(--eph-faint)",
        padding: "40px 16px",
        backgroundImage: "repeating-linear-gradient(135deg, #121110 0 8px, #181614 8px 16px)",
        border: "1px solid var(--eph-line)",
      }}
    >
      {message}
    </div>
  );
}
