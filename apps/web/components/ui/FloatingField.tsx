"use client";

type FloatingFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  step?: string;
  list?: string;
  hint?: string;
};

// Jerarquía tipográfica pregunta/respuesta: el label es contexto secundario
// (12px, normal, --ink-secondary) y siempre va estático arriba del campo —
// nunca compite en tamaño con el valor. El valor es el dato real (14.5px,
// semibold, --ink), lo primero que el ojo detecta al escanear.
export default function FloatingField({
  id, label, value, onChange, type = "text", disabled, invalid, placeholder, step, list, hint,
}: FloatingFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-normal text-[var(--ink-secondary)]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        step={step}
        list={list}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 w-full border-0 border-b ${invalid ? "border-[var(--danger)]" : "border-[var(--border-input)]"} rounded-none bg-transparent px-0.5 py-1.5 text-[14.5px] font-semibold text-[var(--ink)] outline-none transition-colors placeholder:font-normal placeholder:text-[var(--ink-secondary)] focus:border-[var(--ink)] focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50`}
      />
      {invalid && <p role="alert" className="mt-1.5 text-xs text-[var(--danger)]">Este campo es obligatorio.</p>}
      {!invalid && hint && <p className="mt-1.5 text-xs text-[var(--ink-secondary)]">{hint}</p>}
    </div>
  );
}

type FloatingTextareaProps = {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  invalid?: boolean;
  rows?: number;
};

export function FloatingTextarea({ id, label, value, onChange, invalid, rows = 1 }: FloatingTextareaProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-normal text-[var(--ink-secondary)]">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full resize-none rounded-xl border ${invalid ? "border-[var(--danger)]" : "border-[var(--border-hairline)]"} bg-[var(--paper)] px-3.5 py-3 text-[14.5px] font-semibold text-[var(--ink)] outline-none transition-colors focus:border-[var(--ink)]`}
      />
      {invalid && <p role="alert" className="mt-1.5 text-xs text-[var(--danger)]">Este campo es obligatorio.</p>}
    </div>
  );
}
