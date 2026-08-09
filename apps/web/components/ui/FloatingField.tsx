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

// Floating label: el label empieza dentro del campo y sube al hacer foco o
// al tener contenido (técnica `peer` + placeholder=" " del design brief).
// El placeholder nativo nunca se muestra (siempre placeholder-transparent):
// un campo solo debe comunicar UNA cosa a la vez — el label — no un label
// más un texto de ayuda superpuesto. Un campo deshabilitado (ej. "Ciudad"
// antes de elegir país) fuerza el label arriba/chico igual que si tuviera
// valor, ya que el estado visual "deshabilitado" ya comunica que no está
// listo para usarse.
export default function FloatingField({
  id, label, value, onChange, type = "text", disabled, invalid, placeholder, step, list, hint,
}: FloatingFieldProps) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        step={step}
        list={list}
        placeholder={placeholder ?? " "}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`peer h-16 w-full rounded-xl border ${invalid ? "border-[var(--danger)]" : "border-[#E7DFC9]"} bg-white px-3.5 pb-3 pt-7 text-[15px] text-[#2B2621] placeholder-transparent outline-none transition-colors focus:border-[var(--gold)] disabled:cursor-not-allowed disabled:bg-[#F5F1E9] disabled:opacity-70`}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3.5 right-3.5 top-5 truncate text-[12px] font-semibold leading-none text-[#8A8377] transition-all duration-150 peer-focus:text-[var(--gold)] ${
          disabled ? "top-3" : "peer-focus:top-3 peer-[:not(:placeholder-shown)]:top-3"
        }`}
      >
        {label}
      </label>
      {invalid && <p role="alert" className="mt-1.5 text-xs text-[var(--danger)]">Este campo es obligatorio.</p>}
      {!invalid && hint && <p className="mt-1.5 text-xs text-[var(--ink-soft)]">{hint}</p>}
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
    <div className="relative">
      <textarea
        id={id}
        placeholder=" "
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={`peer w-full resize-none rounded-xl border ${invalid ? "border-[var(--danger)]" : "border-[#E7DFC9]"} bg-white px-3.5 pb-2 pt-7 text-[15px] text-[#2B2621] placeholder-transparent outline-none transition-colors focus:border-[var(--gold)]`}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-3.5 right-3.5 top-3 truncate text-[12px] font-semibold text-[#8A8377] transition-all duration-150 peer-placeholder-shown:top-5 peer-focus:top-3 peer-focus:text-[var(--gold)]"
      >
        {label}
      </label>
      {invalid && <p role="alert" className="mt-1.5 text-xs text-[var(--danger)]">Este campo es obligatorio.</p>}
    </div>
  );
}
