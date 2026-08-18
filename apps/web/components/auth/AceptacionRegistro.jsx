"use client";

import { useRef, useState, useCallback } from "react";
import { Check, FileText, ShieldCheck, Lock, ChevronDown } from "lucide-react";
import {
  DATA_POLICY_VERSION,
  TERMS_VERSION,
  DATOS_CONTENT,
  TERMINOS_CONTENT,
} from "./legal-content";

/**
 * Paso de aceptación legal en el registro — La Tribu
 *
 * Se inserta como el ÚLTIMO paso antes de activar cualquier tipo de cuenta
 * (Club Explorador auto-aprobado, o solicitud de Membresía Premium),
 * y también tras el callback de SSO (Google/Apple) cuando se detecta
 * una identidad nueva sin cuenta previa — toda cuenta nueva pasa por aquí,
 * sin excepción, sin importar el método de autenticación.
 *
 * El texto completo de cada documento vive en ./legal-content.js y se
 * renderiza AQUÍ, dentro del mismo panel con scroll — no hay redirección
 * a otra página. Cada documento debe desplazarse hasta el final antes de
 * habilitar su casilla, igual que un instalador de software.
 *
 * onComplete(payload) recibe lo que el backend debe guardar como evidencia
 * de aceptación: versión de cada documento, marca de tiempo y los tres
 * consentimientos.
 */

function Blocks({ blocks }) {
  return blocks.map((b, i) => {
    if (b.p) {
      return (
        <p key={i} className="text-[13.5px] leading-relaxed mb-2.5" style={{ color: "#5A5248" }}>
          {b.p}
        </p>
      );
    }
    if (b.note) {
      return (
        <p key={i} className="text-[12.5px] italic leading-relaxed mb-2.5" style={{ color: "#8A8070" }}>
          {b.note}
        </p>
      );
    }
    if (b.ul) {
      return (
        <ul key={i} className="mb-2.5 space-y-1.5">
          {b.ul.map((item, j) => (
            <li key={j} className="text-[13.5px] leading-relaxed pl-4 relative" style={{ color: "#5A5248" }}>
              <span className="absolute left-0" style={{ color: "#C9A66B" }}>•</span>
              {item}
            </li>
          ))}
        </ul>
      );
    }
    return null;
  });
}

const PANEL_BG = "#F7F2E8";

function ScrollableDoc({ items, onReachEnd, scrolled }) {
  const ref = useRef(null);
  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) onReachEnd();
  }, [onReachEnd]);

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-[24rem] overflow-y-auto pr-3 border-t"
        style={{ borderColor: "#E4DDCE" }}
      >
        {items.map((it, i) => (
          <div key={i} className="pt-5 pb-1">
            <h4 className="font-serif text-[15px] mb-1.5" style={{ color: "#1A1712" }}>{it.h}</h4>
            <Blocks blocks={it.blocks} />
          </div>
        ))}
        {/* Reserved space so the fade never overlaps real text */}
        <div className="h-11" />
      </div>
      {!scrolled && (
        <div
          className="absolute bottom-0 left-0 right-3 h-11 pointer-events-none flex items-end justify-center pb-1.5"
          style={{ background: `linear-gradient(to bottom, transparent, ${PANEL_BG} 70%)` }}
        >
          <span className="flex items-center gap-1 text-[11px]" style={{ color: "#8A8070" }}>
            <ChevronDown size={13} /> desplázate para continuar
          </span>
        </div>
      )}
    </div>
  );
}

function Consent({ label, checked, enabled, onToggle, locked }) {
  return (
    <button
      type="button"
      onClick={enabled ? onToggle : undefined}
      disabled={!enabled}
      className="w-full flex items-start gap-3 py-3 text-left transition-opacity"
      style={{ opacity: enabled ? 1 : 0.45, cursor: enabled ? "pointer" : "not-allowed" }}
    >
      <span
        className="mt-0.5 flex-shrink-0 flex items-center justify-center rounded-[5px] border transition-colors"
        style={{
          width: 18, height: 18,
          borderColor: checked ? "#C9A66B" : "#B9AF9B",
          background: checked ? "#C9A66B" : "transparent",
        }}
      >
        {checked && <Check size={12} color="#FAF7F1" strokeWidth={3} />}
        {!checked && locked && <Lock size={9} color="#B9AF9B" />}
      </span>
      <span className="text-[13.5px] leading-snug" style={{ color: "#1A1712" }}>{label}</span>
    </button>
  );
}

export default function AceptacionRegistro({ onComplete = () => {} }) {
  const [tab, setTab] = useState("datos");
  const [scrolled, setScrolled] = useState({ datos: false, terminos: false });
  const [accepted, setAccepted] = useState({ datos: false, terminos: false, sensible: false });
  const [done, setDone] = useState(false);

  const markScrolled = (k) => setScrolled((s) => (s[k] ? s : { ...s, [k]: true }));
  const toggle = (k) => setAccepted((a) => ({ ...a, [k]: !a[k] }));

  const allAccepted = accepted.datos && accepted.terminos && accepted.sensible;

  const handleContinue = () => {
    if (!allAccepted) return;
    setDone(true);
    onComplete({
      dataPolicyVersion: DATA_POLICY_VERSION,
      termsVersion: TERMS_VERSION,
      acceptedAt: new Date().toISOString(),
      sensitiveDataConsent: true,
    });
  };

  if (done) {
    return (
      <div className="min-h-[560px] flex items-center justify-center" style={{ background: "#FAF7F1" }}>
        <div className="text-center px-8">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
            style={{ border: "1.5px solid #C9A66B" }}
          >
            <Check size={22} color="#C9A66B" strokeWidth={2.5} />
          </div>
          <h2 className="font-serif text-[22px] mb-2" style={{ color: "#1A1712" }}>Todo listo</h2>
          <p className="text-[13.5px]" style={{ color: "#5A5248" }}>
            Registramos tu aceptación con fecha y versión de cada documento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[560px] flex items-center justify-center px-4 py-10" style={{ background: "#FAF7F1" }}>
      <div
        className="w-full max-w-[500px] rounded-2xl border p-7 sm:p-8"
        style={{ borderColor: "#E4DDCE", background: "#FFFEFB", boxShadow: "0 1px 3px rgba(26,23,18,0.05)" }}
      >
        <div className="flex items-center gap-2 mb-5">
          <span className="font-serif text-[13px] tracking-[0.18em]" style={{ color: "#C9A66B" }}>LA TRIBU</span>
        </div>

        <h1 className="font-serif text-[22px] mb-6 leading-snug" style={{ color: "#1A1712" }}>Protección de datos y condiciones de uso</h1>

        <div className="flex gap-2 mb-4">
          {[
            { k: "datos", label: "Datos personales", Icon: ShieldCheck },
            { k: "terminos", label: "Términos de uso", Icon: FileText },
          ].map(({ k, label, Icon }) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] border transition-colors"
              style={
                tab === k
                  ? { background: "#1A1712", borderColor: "#1A1712", color: "#FAF7F1" }
                  : { background: "transparent", borderColor: "#D8D0BE", color: "#5A5248" }
              }
            >
              <Icon size={13} />
              {label}
              {scrolled[k] && <Check size={12} className="ml-0.5" />}
            </button>
          ))}
        </div>

        <div className="rounded-xl border p-5" style={{ borderColor: "#E4DDCE", background: PANEL_BG }}>
          {tab === "datos" ? (
            <ScrollableDoc items={DATOS_CONTENT} scrolled={scrolled.datos} onReachEnd={() => markScrolled("datos")} />
          ) : (
            <ScrollableDoc items={TERMINOS_CONTENT} scrolled={scrolled.terminos} onReachEnd={() => markScrolled("terminos")} />
          )}
        </div>

        <div className="mt-2 divide-y" style={{ borderColor: "#EDE7D9" }}>
          <Consent
            label="He leído y acepto la Política de Tratamiento de Datos Personales."
            checked={accepted.datos}
            enabled={scrolled.datos}
            locked={!scrolled.datos}
            onToggle={() => toggle("datos")}
          />
          <Consent
            label="He leído y acepto los Términos y Condiciones de Uso."
            checked={accepted.terminos}
            enabled={scrolled.terminos}
            locked={!scrolled.terminos}
            onToggle={() => toggle("terminos")}
          />
          <Consent
            label="Autorizo el tratamiento de mis datos sensibles de salud (mediciones, sueño, recuperación) para los fines descritos. Entiendo que es voluntario."
            checked={accepted.sensible}
            enabled={true}
            locked={false}
            onToggle={() => toggle("sensible")}
          />
        </div>

        <button
          type="button"
          disabled={!allAccepted}
          onClick={handleContinue}
          className="w-full mt-5 rounded-full text-[14px] font-medium transition-colors"
          style={{
            height: 48,
            background: allAccepted ? "#1A1712" : "transparent",
            color: allAccepted ? "#FAF7F1" : "#A79E8C",
            border: allAccepted ? "1px solid #1A1712" : "1px solid #D8D0BE",
            cursor: allAccepted ? "pointer" : "not-allowed",
          }}
        >
          Continuar
        </button>

        <p className="text-[11px] text-center mt-3" style={{ color: "#A79E8C" }}>
          {DATA_POLICY_VERSION} · {TERMS_VERSION}
        </p>
      </div>
    </div>
  );
}
