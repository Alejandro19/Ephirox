import Link from 'next/link';
import './legal.css';

type Block = { p?: string; note?: string; ul?: string[] };
type Section = { h: string; blocks: Block[] };

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.p) return <p key={i}>{b.p}</p>;
        if (b.note) return <p key={i} className="note">{b.note}</p>;
        if (b.ul) {
          return (
            <ul key={i}>
              {b.ul.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        return null;
      })}
    </>
  );
}

export function LegalDocument({ title, version, items }: { title: string; version: string; items: Section[] }) {
  return (
    <div className="eph-legal">
      <header className="eph-legal-header">
        {/* Absoluto a propósito: esta página se sirve igual en ephirox.com y
            app.ephirox.com (ver middleware.ts), y "volver al inicio" siempre
            debe ser la landing de marketing, no la raíz del dominio que haya
            servido esta página. */}
        <a href="https://ephirox.com" className="eph-legal-brand">EPHIROX</a>
        <a href="https://ephirox.com" className="eph-legal-back">Volver al inicio</a>
      </header>
      <main className="eph-legal-main">
        <h1>{title}</h1>
        <p className="eph-legal-version">Versión {version}</p>
        {items.map((it, i) => (
          <section className="eph-legal-section" key={i}>
            <h2>{it.h}</h2>
            <Blocks blocks={it.blocks} />
          </section>
        ))}
      </main>
      <footer className="eph-legal-footer">
        <span>© 2026 Ephirox.</span>
        <Link href="/terminos">Términos</Link>
        <Link href="/privacidad">Privacidad</Link>
      </footer>
    </div>
  );
}
