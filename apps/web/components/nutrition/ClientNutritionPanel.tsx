'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { getNutrition, type NutritionPlan, type MenuMeal } from '../../lib/nutrition-client';
import { listSupplements, type Supplement } from '../../lib/supplements-client';
import { listActiveTips, type NutritionTip } from '../../lib/nutrition-tips-client';
import { listActiveRecipes, type Recipe } from '../../lib/recipes-client';
import { PermissionDeniedError } from '../../lib/api-client';
import { pickMantra } from '../../lib/mantra-bank';
import IdentityHeader from '../ui/IdentityHeader';
import RingProgress from '../ui/RingProgress';
import LockedBenefit from '../ui/LockedBenefit';
import { ProtocolDisclaimerFooter } from '../ui/ProtocolDisclaimerFooter';
import { IconFileDownload } from '../ui/icons';
import { InsightsSection } from '../insights/InsightsSection';

function MealIcon({ name }: { name: string }) {
  const isSnack = /snack|merienda|fruta|colaci[oó]n/i.test(name || '');
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mr-2 flex-shrink-0 text-[var(--eph-accent)]">
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
    <div className={`py-3.5 ${isFirst ? '' : 'border-t border-[var(--eph-line)]'}`}>
      <div className="mb-2 flex items-center font-display text-base font-normal text-[var(--eph-text)]">
        <MealIcon name={meal.name} />
        {meal.name}
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {(meal.options || []).map((opt, i) => (
          <div key={i}>
            <p className="mb-1 font-mono text-[10px] font-normal uppercase tracking-[0.1em] text-[var(--eph-accent)]">{opt.label}</p>
            <ul className="space-y-1 text-sm leading-relaxed text-[var(--eph-text)]">
              {opt.items.map((item, j) => (
                <li key={j} className="relative pl-3.5 before:absolute before:left-0 before:top-[8px] before:h-[5px] before:w-[5px] before:rounded-full before:bg-[var(--eph-accent)] before:content-['']">
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

// % de las kcal diarias que aporta cada macro (prot×4 / carb×4 / grasa×9),
// no progreso consumido — registrar comidas del día no existe hoy en el
// sistema. Si no hay dailyCals asignado, se usa la suma de kcal de las
// macros como referencia para no mostrar 0% de forma engañosa.
function macroKcalPct(grams: number | null | undefined, kcalPerGram: number, totalKcal: number): number {
  if (!totalKcal || grams == null) return 0;
  return Math.round(((grams * kcalPerGram) / totalKcal) * 100);
}

function MacroRing({ grams, pct, label }: { grams: number | null | undefined; pct: number; label: string }) {
  return (
    <RingProgress value={pct} size={68} strokeWidth={6} color="espresso" trackColor="var(--eph-line-2)">
      <div className="flex flex-col items-center justify-center">
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3 }}>
          <span className="eph-num-mono font-mono text-[14px] font-normal leading-none" style={{ color: 'var(--eph-text)' }}>{grams ?? '-'}</span>
          <span className="font-mono" style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--eph-muted)' }}>G</span>
        </span>
        <span className="mt-0.5 text-[9px] uppercase tracking-wide" style={{ color: 'var(--eph-muted)' }}>{label}</span>
      </div>
    </RingProgress>
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
body{font-family:'Jost',Arial,sans-serif;color:#1C1613;background:#EDE6DC;padding:26mm 20mm 10mm;max-width:760px;margin:0 auto;}
.pdf-meal,.pdf-supp-row,.pdf-closing,.pdf-section{break-inside:avoid;page-break-inside:avoid;}
.pdf-meal,.pdf-section{padding-top:12mm;}
.pdf-header{display:flex;flex-direction:column;align-items:flex-start;text-align:left;margin-top:0;}
.pdf-wordmark{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:22pt;line-height:1.25;color:#C9A46A;margin:0;}
.pdf-tagline{font-size:9pt;color:#8A8377;margin:4px 0 14px;}
.pdf-rule{border:none;border-top:1.5px solid #C9A46A;margin:0 0 40px;}
.pdf-title{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:19pt;line-height:1.25;color:#2B2621;margin:0 0 6px;text-align:center;}
.pdf-summary{font-size:9.5pt;line-height:1.6;color:#6B6459;text-align:left;max-width:560px;margin:0 0 24px;}
.pdf-summary strong{color:#2B2621;}
.pdf-macros{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #E7DFC9;border-radius:0;overflow:hidden;margin:0 0 28px;}
.pdf-macros > div{padding:12px 6px;text-align:center;border-left:1px solid #E7DFC9;}
.pdf-macros > div:first-child{border-left:none;}
.pdf-macros .pm-val{display:block;font-family:'Cormorant Garamond',serif;font-weight:600;font-size:13pt;color:#2B2621;}
.pdf-macros .pm-lbl{font-size:8pt;color:#8A8377;text-transform:uppercase;letter-spacing:.04em;}
.pdf-meal{margin-bottom:22px;}
.pdf-meal-title{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:13pt;line-height:1.25;color:#2B2621;margin:0 0 4px;}
.pdf-meal-rule{border:none;border-top:1px solid #E7DFC9;margin:0 0 10px;}
.pdf-options{display:flex;gap:26px;}
.pdf-option{flex:1;}
.pdf-option-label{font-size:9pt;font-weight:700;color:#B36B5E;text-transform:uppercase;letter-spacing:.04em;margin:0 0 6px;}
.pdf-option ul{margin:0;padding-left:16px;font-size:10.5pt;line-height:1.55;}
.pdf-section-title{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:13pt;line-height:1.25;color:#2B2621;margin:0 0 12px;padding-bottom:6px;border-bottom:1.5px solid #E7DFC9;}
.pdf-supp-section{background:#E4DBC9;border-radius:0;padding:18px 20px;padding-top:12mm;}
.pdf-supp-title{color:#C9A46A;border-bottom-color:#C9A46A;}
.pdf-reco ul{margin:0;padding-left:16px;font-size:10.5pt;line-height:1.6;}
.pdf-supp-row{margin-bottom:10px;}
.pdf-supp-name{font-weight:700;font-size:11pt;}
.pdf-supp-detail{font-size:9.5pt;color:#8A8377;margin-top:2px;}
.pdf-closing{text-align:center;margin:20px 0 4px;padding-top:12mm;}
.pdf-closing-rule{width:30%;margin:0 auto 16px;border:none;border-top:1px solid #E7DFC9;}
.pdf-closing-quote{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:500;font-size:12pt;line-height:1.5;color:#2B2621;}
.pdf-footer{text-align:center;margin-top:24px;page-break-inside:avoid;break-inside:avoid;}
.pdf-footer-word{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:15pt;color:#C9A46A;margin:0 0 6px;}
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
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,500&family=Jost:wght@400;600&display=swap" rel="stylesheet">
    <style>${NUTRITION_PDF_CSS}</style></head><body>
    <div class="pdf-header">
      <p class="pdf-wordmark">Ephirox</p>
      <p class="pdf-tagline">Redefining limits.</p>
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
      <p class="pdf-footer-word">Ephirox</p>
      <p class="pdf-footer-tagline">Redefining limits.</p>
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

async function fetchNutritionBundle(clientId: string) {
  const [{ plan }, supplements, tips, recipes] = await Promise.all([
    getNutrition(clientId),
    listSupplements(clientId).catch(() => []),
    listActiveTips(clientId).catch(() => []),
    listActiveRecipes(clientId).catch(() => []),
  ]);
  return { plan, supplements, tips, recipes };
}

export function ClientNutritionPanel({ clientId, clientType }: { clientId: string; clientType?: string | null }) {
  const [showAllMeals, setShowAllMeals] = useState(false);
  const [mantra] = useState(() => pickMantra('nutrition'));
  const { data, error, isLoading } = useSWR(['nutrition-bundle', clientId], () => fetchNutritionBundle(clientId));

  const header = (
    <>
      <IdentityHeader title="Nutrition" subtitle="Plan de alimentación y protocolos asignados por tu mentor." />
      {mantra && (
        <p className="mb-6 font-display text-base italic leading-relaxed text-[var(--eph-muted)]">
          &ldquo;{mantra}&rdquo;
        </p>
      )}
    </>
  );
  const insights = clientType === 'mentoring' ? <InsightsSection clientId={clientId} moduleKey="nutricion" /> : null;

  if (isLoading) {
    return (
      <div>
        {header}
        <p className="text-sm text-[var(--eph-muted)]">Cargando tu plan de nutrición…</p>
      </div>
    );
  }
  if (error instanceof PermissionDeniedError) {
    return (
      <div>
        {header}
        <LockedBenefit benefit="tu plan de nutrición" />
      </div>
    );
  }
  if (error) {
    return (
      <div>
        {header}
        <p role="alert" className="text-[var(--eph-danger)]">{(error as Error).message}</p>
      </div>
    );
  }
  if (!data) return null;

  const { plan, supplements, tips, recipes } = data;
  const menu = Array.isArray(plan.menuPlan) ? plan.menuPlan : [];
  const recommendations = Array.isArray(plan.recommendations) ? plan.recommendations : [];
  const hasPlan = plan.dailyCals != null || menu.length > 0 || !!plan.pdfUrl;

  if (!hasPlan) {
    return (
      <div>
        {header}
        {insights}
        <p className="text-[var(--eph-muted)]">Todavía no tienes un plan de nutrición asignado.</p>
      </div>
    );
  }

  const totalKcal = plan.dailyCals || (plan.proteinG ?? 0) * 4 + (plan.carbsG ?? 0) * 4 + (plan.fatG ?? 0) * 9;
  const proteinPct = macroKcalPct(plan.proteinG, 4, totalKcal);
  const carbsPct = macroKcalPct(plan.carbsG, 4, totalKcal);
  const fatPct = macroKcalPct(plan.fatG, 9, totalKcal);

  return (
    <div>
      {header}
      {insights}

      <div
        className="relative mt-8 mb-6 overflow-hidden rounded-[0] p-7"
        style={{ background: 'var(--eph-surface)', color: 'var(--eph-text)' }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-[180px] w-[180px] rounded-full"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--eph-accent) 18%, transparent) 0%, transparent 70%)' }}
        />
        <div className="relative z-10 mb-5 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] font-normal uppercase tracking-[0.14em]" style={{ color: 'var(--eph-accent)' }}>
            Tu objetivo · hoy
          </p>
          {plan.dailyCals ? (
            <p className="text-[13px] font-semibold" style={{ color: 'var(--eph-muted)' }}>{plan.dailyCals} kcal/día</p>
          ) : null}
        </div>
        <p className="relative z-10 mb-6 font-display text-xl font-normal">Meta nutricional diaria</p>
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-6 sm:justify-start">
          <MacroRing grams={plan.proteinG} pct={proteinPct} label="Prot" />
          <MacroRing grams={plan.carbsG} pct={carbsPct} label="Carbs" />
          <MacroRing grams={plan.fatG} pct={fatPct} label="Grasa" />
        </div>
      </div>

      <section className="rounded-[0] border border-[var(--eph-line)] bg-[var(--eph-surface)] p-6 mb-5">
        <h2 className="mb-4 font-display text-lg font-normal text-[var(--eph-text)]">Vista previa de tu plan</h2>
        {menu.length ? (
          <>
            <MealBlock meal={menu[0]} isFirst />
            {showAllMeals && menu.slice(1).map((m, i) => <MealBlock key={i} meal={m} isFirst={false} />)}
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => downloadNutritionPdf(plan, supplements)}
                className="inline-flex h-12 items-center rounded-[999px] bg-[var(--eph-accent)] px-5 text-sm font-medium text-[var(--eph-ink)]"
              >
                Descargar PDF
              </button>
              {menu.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowAllMeals((v) => !v)}
                  className="inline-flex h-12 items-center gap-1.5 rounded-full border border-[var(--eph-line-2)] px-5 text-sm text-[var(--eph-text)]"
                >
                  {showAllMeals ? 'Ver menos' : 'Ver más'}
                  <span className={`inline-block transition-transform ${showAllMeals ? 'rotate-180' : ''}`}>⌄</span>
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-[var(--eph-muted)]">Tu mentor aún no ha cargado el plan de alimentación.</p>
        )}
      </section>

      {(recommendations.length > 0 || plan.closingMessage) && (
        <section className="rounded-[0] border border-[var(--eph-line)] bg-[var(--eph-surface)] p-6 mb-5">
          {recommendations.length > 0 && (
            <>
              <h2 className="mb-3 font-display text-lg font-normal text-[var(--eph-text)]">Recomendaciones</h2>
              <ul className="space-y-1.5 text-sm leading-relaxed text-[var(--eph-text)]">
                {recommendations.map((r, i) => (
                  <li key={i} className="relative pl-3.5 before:absolute before:left-0 before:top-[8px] before:h-[5px] before:w-[5px] before:rounded-full before:bg-[var(--eph-accent)] before:content-['']">
                    {r}
                  </li>
                ))}
              </ul>
            </>
          )}
          {plan.closingMessage && (
            <p className={`font-display text-base italic leading-relaxed text-[var(--eph-text)] ${recommendations.length ? 'mt-4 border-t border-[var(--eph-line)] pt-4' : ''}`}>
              &quot;{plan.closingMessage}&quot;
            </p>
          )}
        </section>
      )}

      <section className="rounded-[0] border border-[var(--eph-line)] bg-[var(--eph-surface)] p-6 mb-5">
        <h2 className="mb-4 font-display text-lg font-normal text-[var(--eph-text)]">Esquema de suplementación</h2>
        {supplements.length ? (
          <div>
            {supplements.map((s, i) => {
              const pill = supplementTimePill(s.timing);
              return (
                <div key={s.id} className={`flex items-center gap-3 py-3 ${i === 0 ? '' : 'border-t border-[var(--eph-line)]'}`}>
                  <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full bg-[var(--eph-surface-2)]" style={{ color: 'var(--eph-accent)' }}>
                    <SupplementIcon category={s.category} />
                  </div>
                  <div className="flex-1">
                    <div className="font-display text-sm font-normal text-[var(--eph-text)]">{s.name}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--eph-muted)]">{[s.dose, s.timing].filter(Boolean).join(' · ')}</div>
                  </div>
                  {pill && (
                    <span
                      className="ml-auto flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold"
                      style={{ background: 'var(--eph-line)', color: 'var(--eph-accent)' }}
                    >
                      {pill}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-6 text-center text-[var(--eph-muted)]">Aún no tienes suplementos asignados.</p>
        )}
      </section>

      {recipes.length > 0 && (
        <section className="mt-2 mb-6 border-t border-[var(--eph-line)] pt-5">
          <h2 className="mb-3 font-display text-lg font-normal text-[var(--eph-text)]">Recetas saludables</h2>
          <div>
            {recipes.map((recipe: Recipe, i: number) => (
              <div key={recipe.id} className={`flex items-center gap-3 py-3 ${i === 0 ? '' : 'border-t'}`} style={{ borderColor: 'var(--eph-line)', borderTopWidth: i === 0 ? 0 : '0.5px' }}>
                <span aria-hidden className="flex-shrink-0" style={{ color: 'var(--eph-accent)' }}>
                  <IconFileDownload size={18} />
                </span>
                <p className="flex-1 truncate font-display text-sm font-normal text-[var(--eph-text)]">{recipe.name}</p>
                <div className="flex flex-shrink-0 gap-2.5">
                  <a
                    href={recipe.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border px-3.5 py-1.5 text-xs font-semibold text-[var(--eph-text)]"
                    style={{ borderColor: 'var(--eph-line-2)' }}
                  >
                    Ver
                  </a>
                  <a
                    href={recipe.pdfUrl}
                    download={recipe.pdfName}
                    className="rounded-full border px-3.5 py-1.5 text-xs font-semibold text-[var(--eph-text)]"
                    style={{ borderColor: 'var(--eph-line-2)' }}
                  >
                    Descargar
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tips.length > 0 && (
        <section className="mt-2 mb-6 border-t border-[var(--eph-line)] pt-5">
          <h2 className="mb-3 font-display text-lg font-normal text-[var(--eph-text)]">Tips and tricks</h2>
          <ul className="space-y-2 text-sm leading-relaxed text-[var(--eph-text)]">
            {tips.map((tip: NutritionTip) => (
              <li key={tip.id} className="relative pl-3.5 before:absolute before:left-0 before:top-[8px] before:h-[5px] before:w-[5px] before:rounded-full before:bg-[var(--eph-accent)] before:content-['']">
                {tip.content}
              </li>
            ))}
          </ul>
        </section>
      )}
      <ProtocolDisclaimerFooter />
    </div>
  );
}
