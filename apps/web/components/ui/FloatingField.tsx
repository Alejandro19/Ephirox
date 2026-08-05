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
};

// Floating label: el label empieza dentro del campo y sube al hacer foco o
// al tener contenido (técnica `peer` + placeholder=" " del design brief).
export default function FloatingField({
  id, label, value, onChange, type = "text", disabled, invalid, placeholder, step, list,
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
        className={`peer h-12 w-full rounded-xl border ${invalid ? "border-[var(--danger)]" : "border-[#E7DFC9]"} bg-white px-3.5 pt-4 text-[15px] text-[#2B2621] outline-none transition-colors focus:border-[var(--gold)] disabled:cursor-not-allowed disabled:bg-[#F5F1E9] disabled:opacity-70 ${placeholder ? "" : "placeholder-transparent"}`}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3.5 right-3.5 truncate text-[15px] text-[#8A8377] transition-all duration-150 peer-focus:text-[var(--gold)] ${
          // Si hay un placeholder de ayuda (ej. "Primero selecciona tu país"),
          // el label queda flotando arriba siempre, para no pisar ese texto
          // que ocupa el centro del campo.
          placeholder
            ? "top-3 translate-y-0 text-[11px]"
            : "top-1/2 -translate-y-1/2 peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-[11px] peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px]"
        }`}
      >
        {label}
      </label>
      {invalid && <p role="alert" className="mt-1.5 text-xs text-[var(--danger)]">Este campo es obligatorio.</p>}
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

export function FloatingTextarea({ id, label, value, onChange, invalid, rows = 3 }: FloatingTextareaProps) {
  return (
    <div className="relative">
      <textarea
        id={id}
        placeholder=" "
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={`peer w-full resize-none rounded-xl border ${invalid ? "border-[var(--danger)]" : "border-[#E7DFC9]"} bg-white px-3.5 pb-2 pt-5 text-[15px] text-[#2B2621] placeholder-transparent outline-none transition-colors focus:border-[var(--gold)]`}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-3.5 right-3.5 top-3 truncate text-[11px] text-[#8A8377] transition-all duration-150 peer-placeholder-shown:top-4 peer-placeholder-shown:text-[15px] peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-[var(--gold)]"
      >
        {label}
      </label>
      {invalid && <p role="alert" className="mt-1.5 text-xs text-[var(--danger)]">Este campo es obligatorio.</p>}
    </div>
  );
}
