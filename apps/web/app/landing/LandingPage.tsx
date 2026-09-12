'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import './landing.css';
import { COSTOS, FRASE, SHIFTS, APP_LOGIN_URL } from './content';
import { HeroStatCard } from './HeroStatCard';
import { WordReveal } from './WordReveal';
import { PasosSticky } from './PasosSticky';
import { PasosMobileList } from './PasosMobileList';
import { CostosMobileCarousel } from './CostosMobileCarousel';
import { CategoriaTable } from './CategoriaTable';
import { Dia90Rail } from './Dia90Rail';
import { JuntaSection } from './JuntaChart';
import { DifCarousel } from './DifCarousel';
import { LeadForm } from './LeadForm';
import { ScrollReveal } from './ScrollReveal';

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

function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>) {
  const href = e.currentTarget.getAttribute('href') || '';
  if (!href.startsWith('#')) return;
  const el = document.getElementById(href.slice(1));
  if (!el) return;
  e.preventDefault();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

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
        <div className="header-actions" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18 }}>
          <a href={APP_LOGIN_URL} className="link-hover eph-a header-login-link" style={{ animationDelay: '160ms', fontSize: 13, color: 'rgba(245,241,232,0.6)' }}>
            <span className="header-login-full">¿Ya eres miembro? Iniciar sesión →</span>
            <span className="header-login-short">Entrar →</span>
          </a>
          <a className="cta-pill link-hover pill-hover eph-a" href="#llevarlo" onClick={handleAnchorClick} style={{ animationDelay: '200ms' }}>
            <span className="cta-pill-full">Llevar Ephirox a mi empresa</span>
            <span className="cta-pill-short">Llevar a mi empresa</span>
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
              Tu empresa llega hasta donde tu <em className="serif">cuerpo</em> te lo permite.
            </h1>
            <p className="lead eph-a" style={{ animationDelay: '520ms' }}>
              Ephirox mide lo que sucede dentro de ti — antes de que pase factura.
            </p>
            <div className="hero-cta-row eph-a" style={{ animationDelay: '680ms' }}>
              <a className="link-hover underline-link" href="#llevarlo" onClick={handleAnchorClick}>Llevar Ephirox a mi empresa</a>
            </div>
          </div>

          <HeroStatCard className="eph-a" style={{ animationDelay: '760ms' }} />
        </section>

        <section className="reconocimiento-section">
          <div className="reconocimiento-wrap">
            <ScrollReveal className="reconocimiento-quote">
              <span className="reconocimiento-rule" aria-hidden="true" />
              <p>No es falta de disciplina. Es que no puedes arreglar <em className="serif">lo que no puedes ver.</em></p>
            </ScrollReveal>

            <ScrollReveal className="reconocimiento-cols">
              <p className="reconocimiento-col-left">Comes mal, duermes peor, vives en alerta. Ya intentaste el gimnasio, la dieta, el programa de tu empresa. Nada cambió.</p>
              <p className="reconocimiento-col-right">No te frena lo que ya sabes. Te frena tu <em className="serif">punto ciego</em>: lo que tu cuerpo lleva meses diciéndote y ningún chequeo anual te ha mostrado.</p>
            </ScrollReveal>

            <ScrollReveal className="reconocimiento-cierre">
              <p>Y lo que tú no ves en ti, tu equipo directivo tampoco. <span className="reconocimiento-cierre-accent">Tarde o temprano, la empresa lo paga.</span></p>
            </ScrollReveal>
          </div>
        </section>

        <section className="contexto" id="contexto">
          <div className="contexto-wrap">
            <h2>Lo que sientes tú, ya se lo estás cobrando a tu <em>empresa</em>.</h2>
            <p className="body">
              El 34% de los trabajadores en Colombia se ausenta del trabajo por ansiedad o estrés. Pero cuando quien se agota es la persona que toma las decisiones más importantes, esto deja de ser una ausencia: reemplazar ese liderazgo cuesta entre el 30% y el 50% de su salario anual — en algunos casos documentados, hasta nueve meses de salario completo.
            </p>

            <div className="costos-grid">
              {COSTOS.map((c) => (
                <div className="cost-card" key={c.num}>
                  <Image src={c.img} alt={c.alt} fill quality={82} sizes="(min-width: 769px) 30vw, 90vw" style={{ objectFit: 'cover' }} className="cost-card-bg" />
                  <div className="cost-card-text">
                    <span className="num">{c.num}</span>
                    <p>{c.texto}</p>
                    <span className="src">{c.src}</span>
                  </div>
                </div>
              ))}
            </div>
            <CostosMobileCarousel />

            <div className="leer-block">
              <WordReveal text={FRASE} />
            </div>
          </div>
        </section>

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
              <h2><span className="a">Anticipamos</span><em className="b">lo que otros descubren demasiado tarde</em></h2>
              <p className="categoria-intro-p">Esto es lo que cambia cuando el riesgo se detecta antes de que se materialice — indicador{' '}por{' '}indicador.</p>
            </ScrollReveal>
            <CategoriaTable />
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
                {SHIFTS.map((s, i) => (
                  <ScrollReveal className="shift-row" delayMs={i * 90} key={s.antes}>
                    <p className="antes">{s.antes}</p>
                    <p className="despues">{s.despues}</p>
                  </ScrollReveal>
                ))}
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
            <div className="divider-banner-text">
              <p>Redefining limits.</p>
            </div>
          </div>

          <section className="dia90-section">
            <div className="dia90-wrap">
              <div className="dia90-head">
                <span className="eyebrow">DÍA 90</span>
                <h2>Lo que vas a reconocer en ti al tercer mes.</h2>
              </div>
              <Dia90Rail />
            </div>
          </section>
        </div>

        <section className="junta-section">
          <JuntaSection />
        </section>

        <section className="dif-section">
          <div className="dif-wrap">
            <DifCarousel />
          </div>
        </section>

        <section className="llevarlo" id="llevarlo">
          <div className="llevarlo-wrap">
            <div className="llevarlo-copy">
              <h2>Llevar Ephirox a mi <em>empresa</em>.</h2>
              <p>Te ayudamos a preparar la propuesta que se aprueba.</p>
            </div>
            <LeadForm />
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="brandline">
              <RingIcon size={22} />
              <span>EPHIROX</span>
            </div>
            <span className="claim">El lujo de tener salud.</span>
            <div className="notes">
              <span>Privado y confidencial.</span>
              <span>Cada protocolo validado por un especialista humano.</span>
            </div>
            <a className="cta-pill link-hover pill-hover" href="#llevarlo" onClick={handleAnchorClick} style={{ justifySelf: 'start' }}>Contactar</a>
          </div>

          <div className="footer-col">
            <span className="eyebrow">PROGRAMA</span>
            <a className="link-hover" href="#contexto" onClick={handleAnchorClick}>El costo de no verlo</a>
            <a className="link-hover" href="#categoria" onClick={handleAnchorClick}>¿Por qué Ephirox?</a>
            <a className="link-hover" href="#beneficios" onClick={handleAnchorClick}>Beneficios</a>
          </div>

          <div className="footer-col">
            <span className="eyebrow">COMPAÑÍA</span>
            <a className="link-hover" href="#llevarlo" onClick={handleAnchorClick}>Llevarlo a mi empresa</a>
          </div>

          <div className="footer-col">
            <span className="eyebrow">CONTACTO</span>
            <div className="footer-contact-item">
              <span className="label">Email</span>
              <a className="link-hover" href="mailto:contacto@ephirox.com">contacto@ephirox.com</a>
            </div>
            <div className="footer-contact-item">
              <span className="label">Instagram</span>
              <a className="link-hover" href="https://instagram.com/ephirox_" target="_blank" rel="noopener">@ephirox_</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="copy">© 2026 Ephirox. Programa de optimización de hábitos y rendimiento. No constituye diagnóstico ni tratamiento médico.</span>
          <div className="legal">
            <a className="link-hover" href="/terminos">Términos</a>
            <a className="link-hover" href="/privacidad">Privacidad</a>
          </div>
        </div>
      </footer>

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
