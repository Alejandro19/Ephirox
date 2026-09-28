'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import './landing.css';
import { SENALES, COSTOS, BENEFICIOS, SHIFTS, APP_LOGIN_URL } from './content';
import { HeroStatCard } from './HeroStatCard';
import { PasosSticky } from './PasosSticky';
import { PasosMobileList } from './PasosMobileList';
import { CategoriaTable } from './CategoriaTable';
import { JuntaSection } from './JuntaChart';
import { HeroDemoForm } from './HeroDemoForm';
import { LeadModal } from './LeadModal';
import { ChatWidget } from './ChatWidget';
import { ExecutiveScoreModal } from './ExecutiveScoreModal';
import { ScrollReveal } from './ScrollReveal';
import { CostosMobileCarousel } from './CostosMobileCarousel';
import { COACH_WHATSAPP_NUMBER } from '@/lib/constants';


// Puerto 1:1 de docs/ephirox-landing.html — mismo copy, mismas imágenes
// (docs/img, copiadas a public/landing), mismas interacciones (tarjeta de
// estadísticas rotativa, scroll pineado de "cómo lo medimos", carrusel de
// diferenciadores, tabla comparativa, gráfico de Junta). El formulario NO usa
// el TODO del original ("aquí debes conectar tu backend") — ya postea al
// endpoint real de apps/api (ver LeadForm.tsx / lib/enterprise-leads-client.ts).

const CSS_VARS = {
  '--ink': '#17130E',
  '--ink-soft': 'rgba(23,19,14,0.66)',
  '--cream': '#F5F1E8',
  '--cream-soft': 'rgba(245,241,232,0.6)',
  '--gold': '#C9A66B',
  '--gold-light': '#E3C795',
  '--gold-cream': '#DDBE8A',
  '--gold-dark': '#8C6A2F',
  '--bg-dark': '#0b0a08',
  '--bg-dark-2': '#17130f',
  '--bg-panel': '#100E0B',
  '--bg-light': '#F3EDE1',
} as React.CSSProperties;

function RingIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 132 132" style={{ width: size, height: size }} aria-hidden="true">
      <circle cx="66" cy="66" r="58" fill="none" stroke="#C9A66B" strokeWidth="4" strokeDasharray="272 92" transform="rotate(-224.3 66 66)" />
      <circle cx="66" cy="66" r="8" fill="#C9A66B" />
    </svg>
  );
}

function LoginIcon({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      style={{ width: size, height: size }}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-4.14 3.36-7 7.5-7s7.5 2.86 7.5 7" />
    </svg>
  );
}

function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>) {
  const href = e.currentTarget.getAttribute('href') || '';
  if (!href.startsWith('#')) return;
  const el = document.getElementById(href.slice(1));
  if (!el) return;
  e.preventDefault();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

// Formulario del Hero oculto temporalmente (pedido de Alejandro) — poner en
// true para volver a mostrarlo; el modal de demo sigue abriéndose desde el footer.
// Datos de la card de señales: misma forma que HERO_STATS (cifra/texto/fuente).
const SENAL_ITEMS = SENALES.map((s) => ({ cifra: s.label, texto: s.texto, fuente: s.kicker.toUpperCase() }));

const SHOW_HERO_DEMO_FORM = false;

export function LandingPage({ initialScoreOpen = false }: { initialScoreOpen?: boolean } = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [beneficiosOpen, setBeneficiosOpen] = useState<string[]>([]);
  const [scoreOpen, setScoreOpen] = useState(initialScoreOpen);
  // Entradas "externas" (link del login, CTA final antes del footer) saltan
  // la pantalla de "Comenzar evaluación" y van directo al cuestionario; el
  // botón dentro de "El enemigo invisible" conserva la intro.
  const [scoreSkipIntro, setScoreSkipIntro] = useState(initialScoreOpen);
  const [leadModal, setLeadModal] = useState<{ correo: string; celular: string } | null>(null);

  useEffect(() => {
    let raf: number | null = null;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        setScrolled(y > 30);
        setShowBackToTop(y > window.innerHeight * 0.8);
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    // El modal ya se decide en el servidor (initialScoreOpen, ver page.tsx)
    // para que no haya flash del Hero — acá solo se limpia el parámetro de
    // la URL una vez montado, así una recarga no lo vuelve a abrir solo.
    if (new URLSearchParams(window.location.search).get('executiveScore') === '1') {
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
  }, []);

  function scrollToTop() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  return (
    <div className="eph-landing2" style={{ ...CSS_VARS, background: 'var(--bg-dark-2)', color: 'var(--cream)' }}>
      <header className="site-header">
        <div className="bar-bg" style={{ opacity: scrolled ? 1 : 0 }} />
        <div className="brand eph-a" style={{ animationDelay: '120ms' }}>
          <RingIcon size={24} />
          <span>EPHIROX</span>
        </div>
        <div className="header-actions" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <a href={APP_LOGIN_URL} aria-label="Iniciar sesión" className="link-hover eph-a header-login-link" style={{ animationDelay: '160ms', fontSize: 13, color: 'rgba(245,241,232,0.6)' }}>
            <span className="header-login-full">¿Ya eres miembro? Iniciar sesión →</span>
            <span className="header-login-short"><LoginIcon size={20} /></span>
          </a>
          <a className="cta-pill link-hover pill-hover eph-a" href="#chat" onClick={(e) => { e.preventDefault(); setChatOpen(true); }} style={{ animationDelay: '200ms' }}>
            <span className="cta-pill-full">Habla con un asesor</span>
            <span className="cta-pill-short">Habla con un asesor</span>
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="bg">
            <Image
              src="/landing/hero.jpg"
              alt="Ejecutivo en la naturaleza"
              fill
              priority
              unoptimized
              sizes="100vw"
              style={{ objectFit: 'cover', objectPosition: '76% 14%', filter: 'saturate(0.86) contrast(1.05)' }}
            />
          </div>
          <div className="grad" />
          <div className="topgrad" />
          <div className="botgrad" />

          <div className="hero-ring eph-ring">
            <svg viewBox="0 0 132 132" style={{ width: '100%', height: '100%' }} aria-hidden="true">
              <circle cx="66" cy="66" r="62" fill="none" stroke="#C9A66B" strokeOpacity="0.16" strokeWidth="0.3" strokeDasharray="329 60.6" transform="rotate(-61.9 66 66)" />
              <circle cx="66" cy="66" r="47" fill="none" stroke="#C9A66B" strokeOpacity="0.09" strokeWidth="0.25" strokeDasharray="250 45.3" transform="rotate(-242.3 66 66)" />
            </svg>
          </div>

          <div className="hero-content">
            <h1 className="eph-a" style={{ animationDelay: '320ms' }}>
              Tu empresa llega hasta<br className="hero-h1-break" /> donde tu <em className="serif">cuerpo</em> te lo permite.
            </h1>
            <p className="lead eph-a" style={{ animationDelay: '520ms' }}>
              Ephirox detecta las señales invisibles que afectan tu energía, claridad mental y capacidad de liderazgo antes de que te pasen factura.
            </p>
            {SHOW_HERO_DEMO_FORM && (
              <div className="eph-a" style={{ animationDelay: '620ms' }}>
                <HeroDemoForm onContinue={(correo, celular) => setLeadModal({ correo, celular })} />
              </div>
            )}
          </div>

        </section>

        <section className="contexto" id="contexto">
          <div className="contexto-wrap">
            <ScrollReveal className="contexto-fila">
              <span className="eyebrow contexto-eyebrow">EL COSTO DE NO ACTUAR</span>
              <h2 className="contexto-titulo">Lo que sientes tú, ya se lo estás cobrando a tu <em>empresa</em>.</h2>
            </ScrollReveal>

            <ScrollReveal className="costos-grid">
              {COSTOS.map((c) => (
                <div className="cost-card" key={c.num}>
                  <Image src={c.img} alt={c.alt} fill quality={82} sizes="(min-width: 769px) 30vw, 90vw" style={{ objectFit: 'cover' }} className={`cost-card-bg${c.num === '10X' ? ' is-bright-source' : ''}`} />
                  <div className="cost-card-text">
                    <span className="num">{c.num}</span>
                    <p>{c.texto}</p>
                  </div>
                  <span className="cost-card-src">{c.src}</span>
                </div>
              ))}
            </ScrollReveal>
            <CostosMobileCarousel />
          </div>
        </section>

        <section className="senales" id="senales">
          <div className="senales-wrap">
            <ScrollReveal className="senales-head">
              <span className="eyebrow senales-eyebrow">EL ENEMIGO INVISIBLE</span>
              <h2 className="senales-titulo">Los síntomas aparecen tarde. <em>Las señales no.</em></h2>
            </ScrollReveal>
            <ScrollReveal className="senales-card-col">
              <HeroStatCard className="senales-card" items={SENAL_ITEMS} />
            </ScrollReveal>
            <ScrollReveal className="senales-cierre" >
              <div id="score" className="senales-cierre-inner">
                <p>¿Cuáles de estas señales ya tienes? Evalúa en minutos tu energía, claridad mental, recuperación y resiliencia.</p>
                <button type="button" className="score-section-cta" onClick={() => { setScoreSkipIntro(false); setScoreOpen(true); }}>Solicitar Executive Score</button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <div id="beneficios">
          <section className="cambia-section">
            <div className="cambia-wrap">
              <ScrollReveal className="cambia-head">
                <span className="eyebrow">LO QUE CAMBIA</span>
                <h2>El control que creías haber perdido, <em>vuelve</em>.</h2>
              </ScrollReveal>
              <div className="shifts-list">
                <div className="shift-labels" aria-hidden="true">
                  <span className="label-antes">Antes</span>
                  <span className="label-despues">Después</span>
                </div>
                {SHIFTS.map((s, i) => (
                  <ScrollReveal className="shift-row" delayMs={i * 90} key={s.antes}>
                    <p className="antes">{s.antes}</p>
                    <p className="despues">{s.despues}</p>
                  </ScrollReveal>
                ))}
              </div>
              <div className="beneficios-bloque">
                <span className="eyebrow beneficios-kicker">Y ESO SE TRADUCE EN:</span>
                <ScrollReveal className="beneficios-grid">
                  {BENEFICIOS.map((b) => {
                    const open = beneficiosOpen.includes(b.titulo);
                    return (
                      <div className={`beneficio${open ? ' is-open' : ''}`} key={b.titulo}>
                        <button
                          type="button"
                          className="beneficio-chip"
                          aria-expanded={open}
                          onClick={() => setBeneficiosOpen((cur) => (cur.includes(b.titulo) ? cur.filter((t) => t !== b.titulo) : [...cur, b.titulo]))}
                        >
                          {b.titulo}
                        </button>
                        <div className="beneficio-desc"><p>{b.sub}</p></div>
                      </div>
                    );
                  })}
                </ScrollReveal>
              </div>
            </div>
          </section>

          <div className="divider-banner">
            <Image
              src="/landing/junta.jpg"
              alt=""
              fill
              unoptimized
              style={{ objectFit: 'cover', filter: 'saturate(0.9) contrast(1.03)' }}
            />
            <div className="divider-banner-shade" />
          </div>
        </div>

        <div className="medimos-intro">
          <ScrollReveal>
            <span className="eyebrow">¿CÓMO LO MEDIMOS?</span>
            <h2>No es una sensación. Es un registro.</h2>
          </ScrollReveal>
        </div>

        <PasosSticky />
        <PasosMobileList />

        <section className="categoria" id="categoria">
          <div className="categoria-wrap">
            <ScrollReveal className="categoria-head">
              <span className="eyebrow categoria-eyebrow">¿POR QUÉ EPHIROX?</span>
              <h2 className="categoria-titulo">No reaccionamos al riesgo,<br />lo <em>anticipamos</em>.</h2>
            </ScrollReveal>
            <CategoriaTable />
          </div>
        </section>

        <section className="junta-section">
          <JuntaSection />
        </section>

        <section className="score-final">
          <div className="hero-ring eph-ring" aria-hidden="true">
            <svg viewBox="0 0 132 132" style={{ width: '100%', height: '100%' }}>
              <circle cx="66" cy="66" r="62" fill="none" stroke="#C9A66B" strokeOpacity="0.16" strokeWidth="0.3" strokeDasharray="329 60.6" transform="rotate(-61.9 66 66)" />
              <circle cx="66" cy="66" r="47" fill="none" stroke="#C9A66B" strokeOpacity="0.09" strokeWidth="0.25" strokeDasharray="250 45.3" transform="rotate(-242.3 66 66)" />
            </svg>
          </div>
          <ScrollReveal className="score-final-wrap">
            <p className="score-final-texto">El primer paso no es un contrato. Es un diagnóstico de minutos.</p>
            <a
              className="score-final-cta"
              href="#score"
              onClick={(e) => { e.preventDefault(); setScoreSkipIntro(true); setScoreOpen(true); }}
            >
              Solicitar Executive Score <span aria-hidden="true">→</span>
            </a>
          </ScrollReveal>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="brandline">
              <RingIcon size={22} />
              <span>EPHIROX</span>
            </div>
            <div className="notes">
              <span>Ephirox es la plataforma de bienestar con inteligencia artificial para founders y C-Levels que quieren sostener su rendimiento sin sacrificar su salud.</span>
            </div>
          </div>

          <div className="footer-col">
            <span className="eyebrow">PROGRAMA</span>
            <a className="link-hover" href="#contexto" onClick={handleAnchorClick}>El costo de no verlo</a>
            <a className="link-hover" href="#categoria" onClick={handleAnchorClick}>¿Por qué Ephirox?</a>
            <a className="link-hover" href="#beneficios" onClick={handleAnchorClick}>Beneficios</a>
          </div>

          <div className="footer-col">
            <span className="eyebrow">CONTACTO</span>
            <div className="footer-contact-item">
              <span className="label">Email</span>
              <a className="link-hover" href="mailto:contacto@ephirox.com">contacto@ephirox.com</a>
            </div>
            <div className="footer-contact-item">
              <span className="label">LinkedIn</span>
              <a className="link-hover" href="https://www.linkedin.com/company/146593282" target="_blank" rel="noopener">Ephirox</a>
            </div>
            <div className="footer-contact-item">
              <span className="label">Instagram</span>
              <a className="link-hover" href="https://instagram.com/ephirox_" target="_blank" rel="noopener">@ephirox_</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="copy">© 2026 Ephirox. No constituye diagnóstico ni tratamiento médico.</span>
          <div className="legal">
            <a className="link-hover" href="/terminos">Términos</a>
            <a className="link-hover" href="/privacidad">Privacidad</a>
          </div>
        </div>
      </footer>

      <ChatWidget open={chatOpen} onToggle={setChatOpen} whatsappNumber={COACH_WHATSAPP_NUMBER} />

      {scoreOpen && <ExecutiveScoreModal skipIntro={scoreSkipIntro} onClose={() => setScoreOpen(false)} />}

      {leadModal && <LeadModal correo={leadModal.correo} celular={leadModal.celular} onClose={() => setLeadModal(null)} />}

      <button
        type="button"
        aria-label="Volver al inicio"
        className={`back-to-top${showBackToTop ? ' is-visible' : ''}`}
        onClick={scrollToTop}
      >
        ↑
      </button>
    </div>
  );
}
