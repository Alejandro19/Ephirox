"use client";

type FileFieldProps = {
  id: string;
  label: string;
  accept?: string;
  disabled?: boolean;
  uploading?: boolean;
  invalid?: boolean;
  helper?: string;
  fileName?: string | null;
  onFileChange: (file: File | null) => void;
};

function AttachIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function UploadArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="animate-bounce">
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

export default function FileField({ id, label, accept, disabled, uploading, invalid, helper, fileName, onFileChange }: FileFieldProps) {
  const inactive = disabled || uploading;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", fontSize: 12, fontWeight: 400,
        color: "var(--ink-secondary)", marginBottom: 8 }}>
        <span aria-hidden style={{ marginRight: 6, color: "var(--ring-accent)", display: "inline-flex" }}><AttachIcon /></span>
        {label}
      </div>
      <label
        htmlFor={id}
        aria-busy={uploading || undefined}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          height: 64, borderRadius: 12,
          border: uploading
            ? "1.5px solid var(--ring-accent)"
            : invalid
              ? "1.5px dashed var(--danger)"
              : "1.5px dashed rgba(138,134,124,.4)",
          background: uploading ? "rgba(201,166,107,.1)" : "var(--page-bg)",
          fontSize: 13, fontWeight: uploading ? 600 : 400,
          color: uploading ? "var(--ring-accent)" : fileName ? "var(--ink)" : "var(--ink-secondary)",
          cursor: inactive ? "not-allowed" : "pointer",
          textAlign: "center", padding: "0 14px", overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {uploading ? (
          <>
            <UploadArrowIcon />
            Subiendo…
          </>
        ) : (
          <>
            <span aria-hidden style={{ display: "inline-flex", flexShrink: 0, color: "var(--ring-accent)" }}>
              <AttachIcon />
            </span>
            {fileName || "Elegir archivo…"}
          </>
        )}
      </label>
      <input
        id={id}
        type="file"
        aria-label={label}
        accept={accept}
        disabled={inactive}
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}
      />
      {invalid && <p role="alert" style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>Este campo es obligatorio.</p>}
      {!invalid && helper && <p style={{ fontSize: 12, color: "var(--ink-secondary)", marginTop: 6 }}>{helper}</p>}
    </div>
  );
}
