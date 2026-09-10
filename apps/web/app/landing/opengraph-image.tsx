import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Ephirox — Redefining limits.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Misma identidad que el panel de marca de /login (Isotipo.tsx): fondo
// carbón, anillo doble dorado, wordmark Cormorant Garamond + tagline
// itálica. Satori (motor de ImageResponse) no resuelve custom properties
// CSS, así que los tokens --eph-* se repiten acá como hex literales.
async function loadGoogleFont(family: string, text: string) {
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`)
  ).text();
  const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/);
  if (!match) throw new Error(`No se pudo cargar la fuente: ${family}`);
  const res = await fetch(match[1]);
  return res.arrayBuffer();
}

export default async function Image() {
  const WORDMARK = 'EPHIROX';
  const TAGLINE = 'Redefining limits.';
  const CAPTION = 'SISTEMA DE OPTIMIZACIÓN EJECUTIVA';

  const [wordmarkFont, taglineFont, captionFont] = await Promise.all([
    loadGoogleFont('Cormorant+Garamond:wght@300', WORDMARK),
    loadGoogleFont('Cormorant+Garamond:ital,wght@1,500', TAGLINE),
    loadGoogleFont('JetBrains+Mono:wght@300', CAPTION),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 42%, #1a1512 0%, #0b0a08 70%)',
        }}
      >
        <svg width="132" height="132" viewBox="0 0 132 132" fill="none">
          <circle
            cx="66" cy="66" r="62"
            stroke="#C9A66B" strokeWidth={3}
            strokeDasharray="329 60.6"
            transform="rotate(-61.9 66 66)"
          />
          <circle
            cx="66" cy="66" r="47"
            stroke="#F5F1E8" strokeOpacity={0.5}
            strokeWidth={2}
            strokeDasharray="250 45.3"
            transform="rotate(-242.3 66 66)"
          />
          <circle cx="66" cy="66" r={7} fill="#C9A66B" />
        </svg>

        <div
          style={{
            display: 'flex',
            marginTop: 40,
            fontFamily: 'Cormorant Garamond',
            fontWeight: 300,
            fontSize: 74,
            letterSpacing: 18,
            color: '#F5F1E8',
          }}
        >
          {WORDMARK}
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 20,
            fontFamily: 'Cormorant Garamond',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 32,
            color: '#C9A66B',
          }}
        >
          {TAGLINE}
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 44,
            fontFamily: 'JetBrains Mono',
            fontWeight: 300,
            fontSize: 15,
            letterSpacing: 6,
            color: 'rgba(245,241,232,0.45)',
          }}
        >
          {CAPTION}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Cormorant Garamond', data: wordmarkFont, weight: 300, style: 'normal' },
        { name: 'Cormorant Garamond', data: taglineFont, weight: 500, style: 'italic' },
        { name: 'JetBrains Mono', data: captionFont, weight: 300, style: 'normal' },
      ],
    }
  );
}
