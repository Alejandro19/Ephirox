'use client';

import { useEffect, useState } from 'react';
import { getNutrition, type NutritionPlan, type MenuMeal } from '../../lib/nutrition-client';
import { listSupplements, type Supplement } from '../../lib/supplements-client';
import { pickMantra } from '../../lib/mantra-bank';
import IdentityHeader from '../ui/IdentityHeader';
import MantraCard from '../ui/MantraCard';

function MealIcon({ name }: { name: string }) {
  const isSnack = /snack|merienda|fruta|colaci[oó]n/i.test(name || '');
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mr-2 flex-shrink-0 text-[var(--hero-piedra-accent)]">
      {isSnack ? (
        <>
          <path
            d="M10 6.8c-2.4-2.1-5.7-.5-5.7 3.1 0 3.1 2.6 6.1 5.7 6.1s5.7-3 5.7-6.1c0-3.6-3.3-5.2-5.7-3.1Z"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="none"
          />
          <path d="M10 6.8V4.3M8.6 4.2c0-1 .9-1.9 2-1.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="10" cy="10" r="7.3" stroke="currentColor" strokeWidth="1.4" fill="none" />
          <circle cx="10" cy="10" r="3.3" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </>
      )}
    </svg>
  );
}

function MealBlock({ meal, isFirst }: { meal: MenuMeal; isFirst: boolean }) {
  return (
    <div className={`py-3.5 ${isFirst ? '' : 'border-t border-[var(--border-hairline)]'}`}>
      <div className="mb-2 flex items-center font-serif text-base font-semibold text-[var(--ink)]">
        <MealIcon name={meal.name} />
        {meal.name}
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {(meal.options || []).map((opt, i) => (
          <div key={i}>
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-[var(--hero-piedra-accent)]">{opt.label}</p>
            <ul className="space-y-1 text-sm leading-relaxed text-[var(--ink)]">
              {opt.items.map((item, j) => (
                <li key={j} className="relative pl-3.5 before:absolute before:left-0 before:top-[8px] before:h-[5px] before:w-[5px] before:rounded-full before:bg-[var(--hero-piedra-accent)] before:content-['']">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function MacroRing({ value, label }: { value: number | null | undefined; label: string }) {
  return (
    <div
      className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-full border-2"
      style={{ borderColor: 'var(--hero-piedra-accent)', background: 'rgba(46,38,24,.06)', color: 'var(--hero-piedra-text)' }}
    >
      <span className="text-[13px] font-bold leading-none">{value ?? '-'}g</span>
      <span className="mt-0.5 text-[8px] uppercase tracking-wide" style={{ color: 'var(--hero-piedra-text-muted)' }}>{label}</span>
    </div>
  );
}

function MacroStat({ value, label }: { value: string | number | null | undefined; label: string }) {
  return (
    <div className="rounded-xl bg-[var(--page-bg)] px-1.5 py-3 text-center">
      <div className="font-serif text-xl font-bold text-[var(--ink)]">{value ?? '—'}</div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wide text-[var(--ink-secondary)]">{label}</div>
    </div>
  );
}

function supplementTimePill(timing: string | null): string | null {
  const t = (timing || '').toLowerCase();
  if (t.includes('mañana') || t.includes('desayuno')) return 'Mañana';
  if (t.includes('medio') || t.includes('almuerzo') || t.includes('tarde')) return 'Mediodía';
  if (t.includes('noche') || t.includes('dormir') || t.includes('cena')) return 'Noche';
  return null;
}

const SUPPLEMENT_ICON_PATHS: Record<string, React.ReactNode> = {
  sueño: <path d="M11.5 3.5A6.5 6.5 0 1 0 14.5 16a8 8 0 0 1-3-12.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />,
  adaptógeno: (
    <path
      d="M9 16c-4-1-6-5-4-9 4 0 7 2 8 5 1-3 4-5 8-5 2 4 0 8-4 9-2 .5-3.5.5-4 3-.5-2.5-2-2.5-4-3Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  rendimiento: <path d="M11 2 4 12h5l-1 8 8-11h-5l0-7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />,
  nootrópico: (
    <>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M9 5.5v3.5l2.3 2.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  base: (
    <>
      <rect x="4" y="2" width="10" height="14" rx="5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M4 9h10" stroke="currentColor" strokeWidth="1.4" />
    </>
  ),
};

function SupplementIcon({ category }: { category: string | null }) {
  const key = (category || '').toLowerCase();
  const path = SUPPLEMENT_ICON_PATHS[key] || SUPPLEMENT_ICON_PATHS.base;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      {path}
    </svg>
  );
}

// Puerto de downloadNutritionPdf (index.html:3865-3969, arquitectura previa
// al monorepo): genera un PDF con la identidad de marca (portada, macros,
// menú, recomendaciones, suplementos y cierre) abriendo una ventana en
// blanco y disparando el diálogo de impresión — "Guardar como PDF" es una
// opción nativa de ese diálogo en todos los navegadores modernos. Reemplaza
// el enlace a un PDF subido manualmente por el admin: el documento se arma
// siempre a partir de los datos vigentes del plan.
const NUTRITION_PDF_CSS = `
@page{margin:0;}
*{box-sizing:border-box;}
body{font-family:'Inter',Arial,sans-serif;color:#2B2621;padding:26mm 20mm 24mm;max-width:760px;margin:0 auto;}
.pdf-meal,.pdf-supp-row,.pdf-closing,.pdf-section{break-inside:avoid;page-break-inside:avoid;}
.pdf-meal,.pdf-section{padding-top:12mm;}
.pdf-header{display:flex;flex-direction:column;align-items:flex-start;text-align:left;margin-top:0;}
.pdf-wordmark{font-family:'Fraunces',serif;font-weight:700;font-size:22pt;line-height:1.25;color:#5B7A4E;margin:0;}
.pdf-tagline{font-size:9pt;color:#8A8377;margin:4px 0 14px;}
.pdf-rule{border:none;border-top:1.5px solid #5B7A4E;margin:0 0 40px;}
.pdf-title{font-family:'Fraunces',serif;font-weight:700;font-size:19pt;line-height:1.25;color:#2B2621;margin:0 0 6px;text-align:center;}
.pdf-summary{font-size:9.5pt;line-height:1.6;color:#6B6459;text-align:left;max-width:560px;margin:0 0 24px;}
.pdf-summary strong{color:#2B2621;}
.pdf-macros{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #E7DFC9;border-radius:10px;overflow:hidden;margin:0 0 28px;}
.pdf-macros > div{padding:12px 6px;text-align:center;border-left:1px solid #E7DFC9;}
.pdf-macros > div:first-child{border-left:none;}
.pdf-macros .pm-val{display:block;font-family:'Fraunces',serif;font-weight:700;font-size:13pt;color:#2B2621;}
.pdf-macros .pm-lbl{font-size:8pt;color:#8A8377;text-transform:uppercase;letter-spacing:.04em;}
.pdf-meal{margin-bottom:22px;}
.pdf-meal-title{font-family:'Fraunces',serif;font-weight:700;font-size:13pt;line-height:1.25;color:#2B2621;margin:0 0 4px;}
.pdf-meal-rule{border:none;border-top:1px solid #E7DFC9;margin:0 0 10px;}
.pdf-options{display:flex;gap:26px;}
.pdf-option{flex:1;}
.pdf-option-label{font-size:9pt;font-weight:700;color:#B36B5E;text-transform:uppercase;letter-spacing:.04em;margin:0 0 6px;}
.pdf-option ul{margin:0;padding-left:16px;font-size:10.5pt;line-height:1.55;}
.pdf-section-title{font-family:'Fraunces',serif;font-weight:700;font-size:13pt;line-height:1.25;color:#2B2621;margin:0 0 12px;padding-bottom:6px;border-bottom:1.5px solid #E7DFC9;}
.pdf-supp-section{background:#F7FAF3;border-radius:14px;padding:18px 20px;padding-top:12mm;}
.pdf-supp-title{color:#5B7A4E;border-bottom-color:#5B7A4E;}
.pdf-reco ul{margin:0;padding-left:16px;font-size:10.5pt;line-height:1.6;}
.pdf-supp-row{margin-bottom:10px;}
.pdf-supp-name{font-weight:700;font-size:11pt;}
.pdf-supp-detail{font-size:9.5pt;color:#8A8377;margin-top:2px;}
.pdf-closing{text-align:center;margin:36px 0 4px;padding-top:12mm;}
.pdf-closing-rule{width:30%;margin:0 auto 16px;border:none;border-top:1px solid #E7DFC9;}
.pdf-closing-quote{font-family:'Fraunces',serif;font-style:italic;font-weight:500;font-size:12pt;line-height:1.5;color:#2B2621;}
.pdf-footer{text-align:center;margin-top:60px;}
.pdf-footer-word{font-family:'Fraunces',serif;font-weight:700;font-size:15pt;color:#5B7A4E;margin:0 0 6px;}
.pdf-footer-tagline{font-size:8pt;color:#8A8377;margin:0;}
`;

function mdBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function downloadNutritionPdf(plan: NutritionPlan, supplements: Supplement[]) {
  const menu = Array.isArray(plan.menuPlan) ? plan.menuPlan : [];
  const recommendations = Array.isArray(plan.recommendations) ? plan.recommendations : [];
  const w = window.open('', '_blank');
  if (!w) {
    window.alert('Habilita las ventanas emergentes para descargar el PDF.');
    return;
  }
  const mealsHtml = menu.length
    ? menu
        .map(
          (m) => `
      <div class="pdf-meal">
        <div class="pdf-meal-title">${m.name}</div>
        <hr class="pdf-meal-rule">
        <div class="pdf-options">
          ${(m.options || [])
            .map(
              (o) => `
            <div class="pdf-option">
              <p class="pdf-option-label">${o.label}</p>
              <ul>${(o.items || []).map((it) => `<li>${it}</li>`).join('')}</ul>
            </div>`
            )
            .join('')}
        </div>
      </div>`
        )
        .join('')
    : '<p style="font-size:10.5pt;color:#8A8377;">Tu mentor aún no ha cargado el menú de este plan.</p>';
  const hasMacros = plan.dailyCals || plan.proteinG || plan.carbsG || plan.fatG;
  const macrosHtml = hasMacros
    ? `<div class="pdf-macros">
        <div><span class="pm-val">${plan.dailyCals || '—'}</span><span class="pm-lbl">Kcal</span></div>
        <div><span class="pm-val">${plan.proteinG || '—'}g</span><span class="pm-lbl">Proteína</span></div>
        <div><span class="pm-val">${plan.carbsG || '—'}g</span><span class="pm-lbl">Carbohidratos</span></div>
        <div><span class="pm-val">${plan.fatG || '—'}g</span><span class="pm-lbl">Grasas</span></div>
      </div>`
    : '';
  const recoHtml = recommendations.length
    ? `<div class="pdf-reco pdf-section"><p class="pdf-section-title">Recomendaciones adicionales</p><ul>${recommendations
        .map((r) => `<li>${r}</li>`)
        .join('')}</ul></div>`
    : '';
  const suppHtml = supplements.length
    ? `<div class="pdf-section pdf-supp-section"><p class="pdf-section-title pdf-supp-title">Esquema de suplementación</p>${supplements
        .map(
          (s) =>
            `<div class="pdf-supp-row"><div class="pdf-supp-name">${s.name}</div><div class="pdf-supp-detail">${
              [s.dose, s.timing].filter(Boolean).join(' · ') || s.benefit || ''
            }</div></div>`
        )
        .join('')}</div>`
    : '';
  const closingHtml = plan.closingMessage
    ? `<div class="pdf-closing"><hr class="pdf-closing-rule"><p class="pdf-closing-quote">${plan.closingMessage}</p></div>`
    : '';
  w.document.write(
    `<!doctype html><html><head><title>Plan nutricional</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,700;1,500&family=Inter:wght@400;700&display=swap" rel="stylesheet">
    <style>${NUTRITION_PDF_CSS}</style></head><body>
    <div class="pdf-header">
      <p class="pdf-wordmark">La Tribu</p>
      <p class="pdf-tagline">Comunidad de bienestar y alto rendimiento.</p>
    </div>
    <hr class="pdf-rule">
    <p class="pdf-title">Plan nutricional</p>
    ${plan.summary ? `<p class="pdf-summary">${mdBold(plan.summary)}</p>` : ''}
    ${macrosHtml}
    ${mealsHtml}
    ${recoHtml}
    ${suppHtml}
    ${closingHtml}
    <div class="pdf-footer">
      <p class="pdf-footer-word">La Tribu</p>
      <p class="pdf-footer-tagline">Comunidad de bienestar y alto rendimiento.</p>
    </div>
    </body></html>`
  );
  w.document.close();
  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    w.focus();
    w.print();
  };
  if (w.document.fonts && w.document.fonts.ready) {
    Promise.race([w.document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 500))])
      .then(triggerPrint)
      .catch(triggerPrint);
  } else {
    setTimeout(triggerPrint, 150);
  }
}

// Puerto de printAsPdf + downloadSupplementsPdf (index.html:3548-3987): sin
// dependencias, abre una ventana en blanco con una tabla simple y dispara el
// diálogo de impresión del navegador — "Guardar como PDF" es una opción
// nativa de ese diálogo en todos los navegadores modernos.
function downloadSupplementsPdf(supplements: Supplement[]) {
  const w = window.open('', '_blank');
  if (!w) {
    window.alert('Habilita las ventanas emergentes para descargar el PDF.');
    return;
  }
  const rows = supplements
    .map(
      (s) =>
        `<tr><td>${s.name}</td><td>${s.brand || '-'}</td><td>${s.dose || '-'}</td><td>${s.timing || '-'}</td><td>${s.category || '-'}</td><td>${s.benefit || '-'}</td></tr>`
    )
    .join('');
  const table = supplements.length
    ? `<table><tr><th>Nombre</th><th>Marca</th><th>Dosis</th><th>Momento</th><th>Categoría</th><th>Beneficio</th></tr>${rows}</table>`
    : '<p>Sin suplementos asignados.</p>';
  w.document.write(
    `<html><head><title>Esquema de Suplementación</title><style>body{font-family:sans-serif;padding:24px;color:#222}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{padding:8px;border:1px solid #ccc;text-align:left}</style></head><body><h1>Esquema de Suplementación</h1>${table}</body></html>`
  );
  w.document.close();
  w.focus();
  w.print();
}

export function ClientNutritionPanel({ clientId }: { clientId: string }) {
  const [plan, setPlan] = useState<NutritionPlan>({});
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllMeals, setShowAllMeals] = useState(false);
  const [mantra] = useState(() => pickMantra('nutrition'));

  useEffect(() => {
    Promise.all([getNutrition(clientId), listSupplements(clientId).catch(() => [])])
      .then(([{ plan: fetchedPlan }, supplementList]) => {
        setPlan(fetchedPlan);
        setSupplements(supplementList);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  const header = (
    <>
      <IdentityHeader title="Nutrición" subtitle="Plan de alimentación y protocolos asignados por tu mentor." />
      {mantra && <MantraCard mantra={mantra} />}
    </>
  );

  if (loading) {
    return (
      <div>
        {header}
        <p className="text-sm text-[var(--ink-secondary)]">Cargando tu plan de nutrición…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div>
        {header}
        <p role="alert" className="text-[var(--danger)]">{error}</p>
      </div>
    );
  }

  const menu = Array.isArray(plan.menuPlan) ? plan.menuPlan : [];
  const recommendations = Array.isArray(plan.recommendations) ? plan.recommendations : [];
  const hasPlan = plan.dailyCals != null || menu.length > 0 || !!plan.pdfUrl;

  if (!hasPlan) {
    return (
      <div>
        {header}
        <p className="text-[var(--ink-secondary)]">Todavía no tienes un plan de nutrición asignado.</p>
      </div>
    );
  }

  const nextMeal = menu[0];
  const nextMealDish = nextMeal?.options?.[0]?.items?.[0];

  return (
    <div>
      {header}

      {menu.length > 0 && (
        <div
          className="relative mt-8 mb-6 overflow-hidden rounded-[var(--radius-hero)] p-7"
          style={{ background: 'linear-gradient(135deg, var(--hero-piedra-start), var(--hero-piedra-end))', color: 'var(--hero-piedra-text)' }}
        >
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--hero-piedra-accent)' }}>
                {nextMeal ? `TU MENÚ · ${nextMeal.name.toUpperCase()}` : 'TU PLAN NUTRICIONAL'}
              </p>
              <p className="mb-1.5 font-serif text-xl font-semibold">{nextMealDish || nextMeal?.name || 'Aún sin menú registrado'}</p>
              {plan.dailyCals ? <p className="text-[13px]" style={{ color: 'var(--hero-piedra-text-muted)' }}>Meta: {plan.dailyCals} kcal/día</p> : null}
            </div>
            <div className="flex flex-shrink-0 gap-3.5">
              <MacroRing value={plan.proteinG} label="Prot" />
              <MacroRing value={plan.carbsG} label="Carbs" />
              <MacroRing value={plan.fatG} label="Grasa" />
            </div>
          </div>
        </div>
      )}

      <section className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-6 mb-5">
        <h2 className="mb-4 font-serif text-lg font-bold text-[var(--ink)]">Tu objetivo nutricional</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MacroStat value={plan.dailyCals} label="Kcal / día" />
          <MacroStat value={plan.proteinG != null ? `${plan.proteinG}g` : undefined} label="Proteína" />
          <MacroStat value={plan.carbsG != null ? `${plan.carbsG}g` : undefined} label="Carbohidratos" />
          <MacroStat value={plan.fatG != null ? `${plan.fatG}g` : undefined} label="Grasas" />
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-6 mb-5">
        <h2 className="mb-4 font-serif text-lg font-bold text-[var(--ink)]">Vista previa de tu plan</h2>
        {menu.length ? (
          <>
            <MealBlock meal={menu[0]} isFirst />
            {showAllMeals && menu.slice(1).map((m, i) => <MealBlock key={i} meal={m} isFirst={false} />)}
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => downloadNutritionPdf(plan, supplements)}
                className="inline-flex h-12 items-center rounded-full bg-[var(--hero-piedra-accent)] px-5 text-sm font-semibold text-white"
              >
                Descargar PDF
              </button>
              {menu.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowAllMeals((v) => !v)}
                  className="inline-flex h-12 items-center gap-1.5 rounded-full border border-[var(--border-input)] px-5 text-sm text-[var(--ink)]"
                >
                  {showAllMeals ? 'Ver menos' : 'Ver más'}
                  <span className={`inline-block transition-transform ${showAllMeals ? 'rotate-180' : ''}`}>⌄</span>
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-[var(--ink-secondary)]">Tu mentor aún no ha cargado el plan de alimentación.</p>
        )}
      </section>

      {(recommendations.length > 0 || plan.closingMessage) && (
        <section className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-6 mb-5">
          {recommendations.length > 0 && (
            <>
              <h2 className="mb-3 font-serif text-lg font-bold text-[var(--ink)]">Recomendaciones</h2>
              <ul className="space-y-1.5 text-sm leading-relaxed text-[var(--ink)]">
                {recommendations.map((r, i) => (
                  <li key={i} className="relative pl-3.5 before:absolute before:left-0 before:top-[8px] before:h-[5px] before:w-[5px] before:rounded-full before:bg-[var(--hero-piedra-accent)] before:content-['']">
                    {r}
                  </li>
                ))}
              </ul>
            </>
          )}
          {plan.closingMessage && (
            <p className={`font-serif text-base italic leading-relaxed text-[var(--ink)] ${recommendations.length ? 'mt-4 border-t border-[var(--border-hairline)] pt-4' : ''}`}>
              &quot;{plan.closingMessage}&quot;
            </p>
          )}
        </section>
      )}

      <section className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-6 mb-5">
        <h2 className="mb-4 font-serif text-lg font-bold text-[var(--ink)]">Esquema de suplementación</h2>
        {supplements.length ? (
          <div>
            {supplements.map((s, i) => {
              const pill = supplementTimePill(s.timing);
              return (
                <div key={s.id} className={`flex items-center gap-3 py-3 ${i === 0 ? '' : 'border-t border-[var(--border-hairline)]'}`}>
                  <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full bg-[var(--page-bg)]" style={{ color: 'var(--hero-piedra-accent)' }}>
                    <SupplementIcon category={s.category} />
                  </div>
                  <div className="flex-1">
                    <div className="font-serif text-sm font-semibold text-[var(--ink)]">{s.name}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--ink-secondary)]">{[s.dose, s.timing].filter(Boolean).join(' · ')}</div>
                  </div>
                  {pill && (
                    <span
                      className="ml-auto flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold"
                      style={{ background: 'var(--border-hairline)', color: 'var(--hero-piedra-accent)' }}
                    >
                      {pill}
                    </span>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => downloadSupplementsPdf(supplements)}
              className="mt-3.5 rounded-full border border-[var(--border-input)] bg-transparent px-5 py-2.5 text-sm text-[var(--ink)]"
            >
              Descargar PDF
            </button>
          </div>
        ) : (
          <p className="py-6 text-center text-[var(--ink-secondary)]">Aún no tienes suplementos asignados.</p>
        )}
      </section>
    </div>
  );
}
