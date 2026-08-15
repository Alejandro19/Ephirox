"use client";

import { useEffect, useState } from "react";

type ImageFieldProps = {
  id: string;
  label: string;
  onFileChange: (file: File | null) => void;
};

const helperStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  lineHeight: 1.5,
  color: "var(--ink-secondary)",
};

export default function ImageField({ id, label, onFileChange }: ImageFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    onFileChange(file);
  }

  return (
    <div style={{ position: "relative" }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 12, fontWeight: 400, color: "var(--ink-secondary)", marginBottom: 4 }}>
        {label}
      </label>
      {previewUrl ? (
        <label htmlFor={id} style={{ position: "relative", display: "block", borderRadius: 10, overflow: "hidden", aspectRatio: "16 / 9", cursor: "pointer" }}>
          <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <span
            style={{
              position: "absolute", bottom: 8, right: 8, borderRadius: 9999, padding: "4px 10px",
              background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 11, fontWeight: 600,
            }}
          >
            Cambiar foto
          </span>
        </label>
      ) : (
        <label
          htmlFor={id}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            aspectRatio: "16 / 9", borderRadius: 10, border: "1.5px dashed rgba(138,134,124,.4)",
            background: "var(--page-bg)", color: "var(--ink-secondary)", fontSize: 13, cursor: "pointer",
          }}
        >
          Elegir foto…
        </label>
      )}
      <input id={id} type="file" accept="image/jpeg,image/png" onChange={handleChange} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }} />
      <p style={helperStyle}>
        JPG o PNG · relación 16:9 (horizontal) · mínimo 1200×675px · máx. 5MB. Evitá fotos verticales (se recortan mal)
        y texto superpuesto (el título ya se muestra debajo).
      </p>
    </div>
  );
}
