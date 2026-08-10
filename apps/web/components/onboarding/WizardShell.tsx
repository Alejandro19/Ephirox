'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { computeHiddenFieldIds, validateWizardModule, type WizardFieldConfig } from '@latribu/shared-types';
import { WIZARD_MODULES, WIZARD_MODULE_10, CONDITIONAL_RULES, WIZARD_GROUP_ICON } from '../../lib/wizard-modules';
import { WizardField } from './WizardField';
import { CountryCityPicker, type CountryCityValue } from './CountryCityPicker';
import { Module3, EMPTY_MODULE3_DRAFT, validateModule3, type Module3Draft } from './Module3';
import { Module10, EMPTY_MODULE10_DRAFT, type Module10Draft } from './Module10';
import IdentityHeader from '../ui/IdentityHeader';
import RingProgress from '../ui/RingProgress';
import { upsertLabPanel } from '../../lib/lab-panels-client';
import {
  putPersonalInfo,
  uploadPersonalInfoFile,
  createAnthropometric,
  createPhoto,
  createInbodyRecord,
} from '../../lib/onboarding-client';

type WizardData = Record<string, string | string[]>;

const PHOTO_ANGLE_KEYS = ['frente', 'lado_derecho', 'lado_izquierdo', 'espalda'] as const;

// Un campo "ancho" (chips, textarea, o un select con pregunta muy larga)
// necesita la fila completa para no verse apretado — ver WizardField.tsx,
// que ya les da sm:col-span-2.
function isWideField(field: WizardFieldConfig): boolean {
  return (
    field.type === 'chips' ||
    field.type === 'textarea' ||
    field.type === 'country-picker' ||
    (field.type === 'select' && field.label.length > 55)
  );
}

// 'segmented'/'chevron'/'time'/'file' dibujan su label ARRIBA de la caja (una
// fila aparte, ~24px de alto); el resto de los campos (select, text, date,
// slider) no tienen esa fila — su caja empieza pegada al borde superior de su
// celda. Emparejados en una misma fila de la grilla, eso deja las dos cajas a
// distinta altura (ver capturas: "Hora del último café" vs "Consumo de
// alcohol", "Último chequeo médico" vs "Subir chequeo médico"). Cuando el par
// mezcla ambos estilos, el campo sin fila de label recibe un `pt-6` para
// bajar su caja y emparejarla con la del otro.
const EXTERNAL_LABEL_TYPES = new Set(['segmented', 'chevron', 'time', 'file']);

// El emparejamiento de filas se calcula UNA sola vez a partir de la lista
// estática de campos del módulo — nunca a partir de cuáles están ocultos en
// este momento. Antes se filtraban los campos ocultos ANTES de armar los
// pares, así que cuando un campo condicional (ej. "¿Cuáles probióticos?")
// pasaba de oculto a visible, el emparejamiento de TODAS las filas
// siguientes cambiaba de a uno — React desmontaba y volvía a montar en
// cascada cada fila restante del módulo con keys nuevas. Ese remount masivo,
// en un único clic, es lo que dejaba la página con scroll "varado" en un
// hueco en blanco (la altura vieja ya no correspondía al contenido nuevo,
// más corto). Ahora las filas son fijas: activar/desactivar un campo
// condicional solo agrega o quita SU PROPIA fila — el resto nunca se
// remonta.
// Agrupación temática visual (cards estilo Oura, ver metadata `group` en
// lib/wizard-modules.ts): campos contiguos con el mismo `group` van juntos
// en una sola card. Campos sin `group` (o el módulo entero, ej. Módulo 2 no
// aplica) caen en un grupo `null` que se renderiza sin card envolvente.
function groupFieldsIntoCards(fields: WizardFieldConfig[]): { group: string | null; fields: WizardFieldConfig[] }[] {
  const cards: { group: string | null; fields: WizardFieldConfig[] }[] = [];
  for (const field of fields) {
    const key = field.group ?? null;
    const last = cards[cards.length - 1];
    if (last && last.group === key) {
      last.fields.push(field);
    } else {
      cards.push({ group: key, fields: [field] });
    }
  }
  return cards;
}

function groupFieldsIntoRows(fields: WizardFieldConfig[]): WizardFieldConfig[][] {
  const rows: WizardFieldConfig[][] = [];
  let pendingNarrow: WizardFieldConfig | null = null;
  for (const field of fields) {
    if (isWideField(field)) {
      if (pendingNarrow) {
        rows.push([pendingNarrow]);
        pendingNarrow = null;
      }
      rows.push([field]);
    } else if (pendingNarrow) {
      rows.push([pendingNarrow, field]);
      pendingNarrow = null;
    } else {
      pendingNarrow = field;
    }
  }
  if (pendingNarrow) rows.push([pendingNarrow]);
  return rows;
}

export type WizardShellProps = {
  clientId: string;
  variant: 'standard' | 'mentoring';
};

export function WizardShell({ clientId, variant }: WizardShellProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [otroValues, setOtroValues] = useState<Record<string, string>>({});
  const [pendingCheckupFile, setPendingCheckupFile] = useState<File | null>(null);
  const [module3Draft, setModule3Draft] = useState<Module3Draft>(EMPTY_MODULE3_DRAFT);
  const [module10Draft, setModule10Draft] = useState<Module10Draft>(EMPTY_MODULE10_DRAFT);
  const [invalidFieldIds, setInvalidFieldIds] = useState<Set<string>>(new Set());
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  // Módulo 10 (Dispositivos y Laboratorios) solo existe para la variante
  // Mentoring — resuelta por la matriz de Roles y Perfiles (ver
  // onboarding/page.tsx), no por un clientType hardcodeado.
  const modules = variant === 'mentoring' ? [...WIZARD_MODULES, WIZARD_MODULE_10] : WIZARD_MODULES;
  const totalModules = modules.length;
  const mod = modules.find((m) => m.n === step)!;
  const hiddenFieldIds = computeHiddenFieldIds(CONDITIONAL_RULES, wizardData);

  // Revalida en vivo SOLO cuando ya hay errores visibles (el usuario intentó
  // avanzar con el paso incompleto) — así un campo deja de verse en rojo en
  // cuanto se completa, en vez de quedar marcado inválido hasta el próximo
  // clic en "Continuar". Sin errores visibles no se toca nada, para no
  // validar de más mientras el usuario recién está llenando el formulario.
  function revalidateWizardData(next: WizardData) {
    if (invalidFieldIds.size === 0) return;
    const nextHidden = computeHiddenFieldIds(CONDITIONAL_RULES, next);
    if (mod.custom === 'country') {
      const invalid: string[] = [];
      if (!next.country) invalid.push('country');
      if (!next.city) invalid.push('city');
      if (!next.phone_number) invalid.push('phone_number');
      invalid.push(...validateWizardModule(mod.fields, next, nextHidden));
      setInvalidFieldIds(new Set(invalid));
      return;
    }
    setInvalidFieldIds(new Set(validateWizardModule(mod.fields, next, nextHidden)));
  }

  function handleFieldChange(id: string, value: string | string[]) {
    const next = { ...wizardData, [id]: value };
    setWizardData(next);
    revalidateWizardData(next);
  }

  function handleOtroChange(id: string, value: string) {
    setOtroValues((prev) => ({ ...prev, [id]: value }));
  }

  function handleFileChange(id: string, file: File | null) {
    if (id === 'checkup_file') setPendingCheckupFile(file);
    const next = { ...wizardData, [id]: file?.name || '' };
    setWizardData(next);
    revalidateWizardData(next);
  }

  function handleCountryCityChange(patch: Partial<CountryCityValue>) {
    const next = {
      ...wizardData,
      ...(patch.country !== undefined ? { country: patch.country } : {}),
      ...(patch.city !== undefined ? { city: patch.city } : {}),
      ...(patch.phoneCode !== undefined ? { phone_code: patch.phoneCode } : {}),
      ...(patch.phoneNumber !== undefined ? { phone_number: patch.phoneNumber } : {}),
    };
    setWizardData(next);
    revalidateWizardData(next);
  }

  function handleModule3Change(next: Module3Draft) {
    setModule3Draft(next);
    if (invalidFieldIds.size > 0) {
      setInvalidFieldIds(new Set(validateModule3(next)));
    }
  }

  async function finalize() {
    setFinalizing(true);
    setFinalizeError(null);
    try {
      let onboardingReport: Record<string, unknown> = { ...wizardData };
      for (const [fieldId, otro] of Object.entries(otroValues)) {
        onboardingReport[`${fieldId}_otro`] = otro;
      }
      if (pendingCheckupFile) {
        const uploaded = await uploadPersonalInfoFile(clientId, pendingCheckupFile, onboardingReport);
        onboardingReport = {
          ...onboardingReport,
          checkup_file_url: uploaded.file_url,
          checkup_file_name: uploaded.file_name,
          checkup_uploaded_at: uploaded.uploaded_at,
        };
      }

      await putPersonalInfo(clientId, {
        name: wizardData.name as string,
        age: wizardData.age ? Number(wizardData.age) : null,
        birthdate: wizardData.birthdate as string,
        gender: wizardData.gender as string,
        occupation: wizardData.occupation as string,
        cedula: wizardData.cedula as string,
        id_type: wizardData.id_type as string,
        email: wizardData.email as string,
        marital_status: wizardData.marital_status as string,
        country: wizardData.country as string,
        city: wizardData.city as string,
        phone_code: wizardData.phone_code as string,
        phone_number: wizardData.phone_number as string,
        weight: module3Draft.inbody.pesoTotal ? Number(module3Draft.inbody.pesoTotal) : null,
        height: module3Draft.inbody.altura ? Number(module3Draft.inbody.altura) : null,
        body_fat: module3Draft.inbody.grasaPct ? Number(module3Draft.inbody.grasaPct) : null,
        onboarding_report: onboardingReport,
        complete: true,
      });

      const monthNum = 1; // primer registro del onboarding — siempre mes 1
      const { cintura, brazos, hombros, piernas, gluteo } = module3Draft.antropometria;
      if (cintura || brazos || hombros || piernas || gluteo) {
        await createAnthropometric(clientId, {
          fecha: new Date().toISOString().slice(0, 10),
          peso: module3Draft.inbody.pesoTotal ? Number(module3Draft.inbody.pesoTotal) : null,
          cintura: cintura ? Number(cintura) : null,
          brazos: brazos ? Number(brazos) : null,
          hombros: hombros ? Number(hombros) : null,
          piernas: piernas ? Number(piernas) : null,
          gluteo: gluteo ? Number(gluteo) : null,
          mes_num: monthNum,
        });
      }

      for (const angle of PHOTO_ANGLE_KEYS) {
        const file = module3Draft.photos[angle];
        if (file) await createPhoto(clientId, file, angle, monthNum);
      }

      if (module3Draft.inbody.ocrDone && module3Draft.inbody.pesoTotal) {
        await createInbodyRecord(clientId, {
          fecha: new Date().toISOString().slice(0, 10),
          version: module3Draft.inbody.version,
          peso_total: Number(module3Draft.inbody.pesoTotal),
          smm: module3Draft.inbody.smm ? Number(module3Draft.inbody.smm) : null,
          grasa_pct: module3Draft.inbody.grasaPct ? Number(module3Draft.inbody.grasaPct) : null,
          imc: module3Draft.inbody.imc ? Number(module3Draft.inbody.imc) : null,
          peso_objetivo: module3Draft.inbody.pesoObjetivo ? Number(module3Draft.inbody.pesoObjetivo) : null,
          grasa_visceral: module3Draft.inbody.grasaVisceral ? Number(module3Draft.inbody.grasaVisceral) : null,
          bmr: module3Draft.inbody.bmr ? Number(module3Draft.inbody.bmr) : null,
          angulo_fase: module3Draft.inbody.anguloFase ? Number(module3Draft.inbody.anguloFase) : null,
          ecw_tbw: module3Draft.inbody.ecwTbw ? Number(module3Draft.inbody.ecwTbw) : null,
          masa_osea: module3Draft.inbody.masaOsea ? Number(module3Draft.inbody.masaOsea) : null,
          altura: module3Draft.inbody.altura ? Number(module3Draft.inbody.altura) : null,
          mes_num: monthNum,
          file_url: module3Draft.inbody.fileUrl,
          file_name: module3Draft.inbody.fileName,
        });
      }

      if (variant === 'mentoring') {
        onboardingReport.m10_wearable = module10Draft.wearable;
        onboardingReport.m10_aw_hrv = module10Draft.appleHealth.hrv;
        onboardingReport.m10_aw_fc_reposo = module10Draft.appleHealth.fcReposo;
        onboardingReport.m10_aw_spo2 = module10Draft.appleHealth.spo2;
        onboardingReport.m10_aw_vo2max = module10Draft.appleHealth.vo2max;

        const labDatos = Object.entries(module10Draft.labDatos).reduce<Record<string, number>>((acc, [k, v]) => {
          if (v) acc[k] = Number(v);
          return acc;
        }, {});
        if (Object.keys(labDatos).length > 0) {
          await upsertLabPanel(clientId, { semana: module10Draft.labSemana, fecha: module10Draft.labFecha, datos: labDatos });
        }
      }

      setComplete(true);
    } catch (e) {
      setFinalizeError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setFinalizing(false);
    }
  }

  function handleContinue() {
    if (mod.custom === 'country') {
      const invalid: string[] = [];
      if (!wizardData.country) invalid.push('country');
      if (!wizardData.city) invalid.push('city');
      if (!wizardData.phone_number) invalid.push('phone_number');
      invalid.push(...validateWizardModule(mod.fields, wizardData, hiddenFieldIds));
      setInvalidFieldIds(new Set(invalid));
      if (invalid.length > 0) return;
      setStep(2);
      return;
    }
    if (mod.custom === 'body') {
      const invalid = validateModule3(module3Draft);
      setInvalidFieldIds(new Set(invalid));
      if (invalid.length > 0) return;
      setStep(4);
      return;
    }
    const invalid = validateWizardModule(mod.fields, wizardData, hiddenFieldIds);
    setInvalidFieldIds(new Set(invalid));
    if (invalid.length > 0) return;
    if (step < totalModules) {
      setStep(step + 1);
      return;
    }
    void finalize();
  }

  if (complete) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        {/* Tarjeta estilo notificación push (icono + nombre de app + "ahora"),
            en vez del check genérico centrado — pedido explícito del usuario. */}
        <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-4 shadow-[0_10px_35px_rgba(43,38,33,0.12)]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: 'rgba(217,183,126,.18)', color: 'var(--hero-espresso-accent)' }}>
              ✓
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-secondary)]">La Tribu</p>
                <p className="m-0 text-[11px] text-[var(--ink-secondary)]">ahora</p>
              </div>
              <p className="m-0 mt-0.5 font-serif text-base font-bold text-[var(--ink)]">¡Listo!</p>
              <p className="m-0 mt-1 text-sm leading-snug text-[var(--ink-secondary)]">
                Datos guardados. Tu coach te contactará lo antes posible.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/training')}
            className="mt-4 w-full rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95"
          >
            Aceptar
          </button>
        </div>
      </div>
    );
  }

  const formPct = Math.round((step / totalModules) * 100);

  return (
    <div>
      <IdentityHeader
        title="Información Personal"
        subtitle="Conocerte nos permite diseñar tu experiencia dentro de La Tribu."
      />

      {/* Progreso del formulario — sin bloque de color, RingProgress como único acento */}
      <div className="mb-6 flex items-center justify-between gap-5 border-t border-[var(--border-input)] pt-5">
        <div className="flex-1">
          <p className="m-0 mb-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ring-accent)' }}>
            Módulo {step} de {totalModules}
          </p>
          <p className="m-0 mb-1 font-serif text-[21px] font-semibold text-[var(--ink)]">{mod.title}</p>
          <p className="m-0 text-[13px] text-[var(--ink-secondary)]">{formPct}% de tu formulario completado</p>
        </div>
        <RingProgress value={formPct} size={70} strokeWidth={6} color="espresso" />
      </div>

      {/* Punticos de módulo */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {modules.map((m) => {
          const done = m.n < step;
          const current = m.n === step;
          return (
            <button
              key={m.n}
              type="button"
              onClick={() => setStep(m.n)}
              aria-current={current ? 'step' : undefined}
              aria-label={`Ir al módulo ${m.n}: ${m.title}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-bold transition-colors"
              style={{
                background: current ? "var(--ring-accent)" : "transparent",
                borderColor: current || done ? "var(--ring-accent)" : "var(--border-input)",
                color: current ? "#fff" : done ? "var(--ring-accent)" : "var(--ink-secondary)",
              }}
            >
              {m.n}
            </button>
          );
        })}
      </div>

      {/* Módulo actual — sección abierta, sin fondo de color propio */}
      <div className="border-t border-[var(--border-hairline)] py-6">
        <h2 className="m-0 mb-4 text-lg font-bold text-[var(--ink)]">
          Módulo {mod.n} · {mod.title}
        </h2>

        <div className="space-y-3.5">
          {groupFieldsIntoCards(mod.fields).map((card) => {
            const visibleFields = card.fields.filter((f) => !hiddenFieldIds.has(f.id));
            if (visibleFields.length === 0) return null;
            const GroupIcon = card.group ? WIZARD_GROUP_ICON[card.group] : undefined;
            const rows = (
              <div className="space-y-4">
                {groupFieldsIntoRows(card.fields).map((row) => {
                  const visibleRow = row.filter((field) => !hiddenFieldIds.has(field.id));
                  if (visibleRow.length === 0) return null;
                  // Si el campo que acompañaba a este en su fila está oculto por una
                  // condición (ej. "alcohol_type" cuando "alcohol" = "Nunca"), el
                  // que queda no debe dejar la otra mitad de la fila en blanco —
                  // ocupa el ancho completo mientras esté solo.
                  const alone = visibleRow.length === 1;
                  const mixedLabelStyle =
                    visibleRow.length === 2 && EXTERNAL_LABEL_TYPES.has(visibleRow[0].type) !== EXTERNAL_LABEL_TYPES.has(visibleRow[1].type);
                  return (
                    <div key={row.map((f) => f.id).join('+')} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {visibleRow.map((field) => {
                        const needsSpacer = mixedLabelStyle && !EXTERNAL_LABEL_TYPES.has(field.type);
                        const wrapperClass = [alone && 'sm:col-span-2', needsSpacer && 'sm:pt-6'].filter(Boolean).join(' ') || undefined;
                        return (
                        <div key={field.id} className={wrapperClass}>
                          {field.type === 'country-picker' ? (
                            <CountryCityPicker
                              value={{
                                country: (wizardData.country as string) || '',
                                city: (wizardData.city as string) || '',
                                phoneCode: (wizardData.phone_code as string) || '+57',
                                phoneNumber: (wizardData.phone_number as string) || '',
                              }}
                              onChange={handleCountryCityChange}
                              invalidFieldIds={invalidFieldIds}
                            />
                          ) : (
                          <WizardField
                            field={field}
                            value={wizardData[field.id]}
                            otroValue={otroValues[field.id]}
                            invalid={invalidFieldIds.has(field.id)}
                            onChange={handleFieldChange}
                            onOtroChange={handleOtroChange}
                            onFileChange={handleFileChange}
                          />
                          )}
                        </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
            if (!card.group) return <div key={card.fields[0].id}>{rows}</div>;
            return (
              <div
                key={card.fields[0].id}
                className="rounded-[14px] border border-[var(--border-hairline)] bg-[var(--paper)] p-5"
              >
                <div className="mb-4 flex items-center gap-2">
                  {GroupIcon && <GroupIcon size={16} style={{ color: 'var(--hero-piedra-accent)' }} />}
                  <span
                    className="text-[10.5px] font-bold uppercase tracking-[0.05em]"
                    style={{ color: 'var(--hero-piedra-accent)' }}
                  >
                    {card.group}
                  </span>
                </div>
                {rows}
              </div>
            );
          })}
        </div>

        {mod.custom === 'body' && (
          <div className="mt-4">
            <Module3 clientId={clientId} draft={module3Draft} onChange={handleModule3Change} invalidFields={invalidFieldIds} />
          </div>
        )}

        {mod.custom === 'devices' && (
          <div className="mt-4">
            <Module10 clientId={clientId} draft={module10Draft} onChange={setModule10Draft} />
          </div>
        )}

        {finalizeError && (
          <p role="alert" className="mt-4 rounded-xl border border-[var(--danger)] bg-[rgba(193,70,47,.08)] px-4 py-3 text-sm text-[var(--danger)]">
            {finalizeError}
          </p>
        )}

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="rounded-full border border-[var(--border-input)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--ink-secondary)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={finalizing}
            onClick={handleContinue}
            className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {finalizing ? 'Guardando…' : step === totalModules ? 'Finalizar' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}
