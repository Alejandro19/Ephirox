import { jsPDF } from 'jspdf';
import { EXECUTIVE_CATEGORIES, EXECUTIVE_CATEGORY_LABELS, type ExecutiveResult } from '@latribu/shared-types';

// "Recibir mi Informe Ejecutivo" — PDF de 4 páginas (historial de decisiones,
// punto G): 1) score+resumen, 2) fortaleza+riesgo lado a lado, 3) interpretación
// (5 barras + contexto), 4) próximos pasos + CTA. Generado 100% client-side
// (sin backend ni email) — es la recompensa inmediata tras dejar el contacto,
// no un envío posterior.

const GOLD = '#8C6A2F';
const INK = '#17130E';
const MUTED = '#5A5148';
const PAGE_W = 210;
const MARGIN = 22;
const CONTENT_W = PAGE_W - MARGIN * 2;

function kicker(doc: jsPDF, text: string, y: number): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(GOLD);
  doc.text(text.toUpperCase(), MARGIN, y, { charSpace: 0.4 });
  return y + 7;
}

function heading(doc: jsPDF, text: string, y: number, size = 16): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.setTextColor(INK);
  const lines = doc.splitTextToSize(text, CONTENT_W);
  doc.text(lines, MARGIN, y);
  return y + lines.length * (size * 0.42) + 4;
}

function body(doc: jsPDF, text: string, y: number, width = CONTENT_W): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(MUTED);
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, MARGIN, y);
  return y + lines.length * 5.2;
}

function footer(doc: jsPDF, page: number) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor('#A99B87');
  doc.text('EPHIROX · EXECUTIVE PERFORMANCE SCORE™', MARGIN, 285);
  doc.text(`${page}/4`, PAGE_W - MARGIN, 285, { align: 'right' });
}

export function generateExecutivePdf(input: {
  nombre: string;
  empresa: string;
  result: ExecutiveResult;
  segmento: { label: string; mensaje: string };
  fortaleza: { titulo: string; texto: string };
  riesgo: { titulo: string; texto: string; impactos: string[] };
}): void {
  const { nombre, empresa, result, segmento, fortaleza, riesgo } = input;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Página 1 — Score + resumen ejecutivo
  let y = 30;
  y = kicker(doc, 'Executive Performance Score™', y);
  y = heading(doc, `Informe ejecutivo de ${nombre}`, y, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(MUTED);
  doc.text(empresa, MARGIN, y);
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(56);
  doc.setTextColor(GOLD);
  doc.text(`${result.score}`, MARGIN, y + 14);
  doc.setFontSize(16);
  doc.setTextColor(MUTED);
  doc.text('/100', MARGIN + doc.getTextWidth(`${result.score}`) + 30, y + 14);
  y += 24;

  y = kicker(doc, 'Riesgo ejecutivo', y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(INK);
  doc.text(`${segmento.label}.`, MARGIN, y);
  y += 6;
  y = body(doc, segmento.mensaje, y);
  footer(doc, 1);

  // Página 2 — Fortaleza principal + Principal riesgo, lado a lado
  doc.addPage();
  y = 30;
  y = kicker(doc, 'Interpretación ejecutiva', y);
  y = heading(doc, 'Mayor fortaleza y principal riesgo', y, 16);
  y += 4;
  const colW = (CONTENT_W - 10) / 2;
  const colStartY = y;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(GOLD);
  doc.text('MAYOR FORTALEZA', MARGIN, y);
  let yLeft = y + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(INK);
  doc.text(fortaleza.titulo, MARGIN, yLeft);
  yLeft += 7;
  yLeft = body(doc, fortaleza.texto, yLeft, colW);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(GOLD);
  doc.text('PRINCIPAL RIESGO', MARGIN + colW + 10, colStartY);
  let yRight = colStartY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(INK);
  doc.text(riesgo.titulo, MARGIN + colW + 10, yRight);
  yRight += 7;
  const riesgoLines = doc.splitTextToSize(riesgo.texto, colW);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(MUTED);
  doc.text(riesgoLines, MARGIN + colW + 10, yRight);
  yRight += riesgoLines.length * 5.2;

  y = Math.max(yLeft, yRight) + 10;
  y = kicker(doc, 'Impacto potencial', y);
  y = body(doc, 'Si esta tendencia continúa, puede afectar:', y);
  y += 2;
  riesgo.impactos.forEach((impacto) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(MUTED);
    doc.text(`•  ${impacto}`, MARGIN + 2, y);
    y += 6.5;
  });
  footer(doc, 2);

  // Página 3 — Interpretación ejecutiva: 5 barras + contexto
  doc.addPage();
  y = 30;
  y = kicker(doc, 'Perfil de rendimiento', y);
  y = heading(doc, 'Interpretación ejecutiva', y, 16);
  y += 6;

  const barMaxW = CONTENT_W - 60;
  EXECUTIVE_CATEGORIES.forEach((c) => {
    const value = result.categorias[c];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(INK);
    doc.text(EXECUTIVE_CATEGORY_LABELS[c], MARGIN, y);
    doc.setDrawColor('#E4DCC9');
    doc.setFillColor('#F2ECE2');
    doc.roundedRect(MARGIN, y + 3, barMaxW, 4, 1, 1, 'F');
    doc.setFillColor(GOLD);
    doc.roundedRect(MARGIN, y + 3, Math.max(4, (value / 100) * barMaxW), 4, 1, 1, 'F');
    doc.setFontSize(9.5);
    doc.setTextColor(MUTED);
    doc.text(`${value}%`, MARGIN + barMaxW + 6, y + 6.5);
    y += 15;
  });

  y += 4;
  y = body(
    doc,
    'Este perfil refleja tu propia percepción de energía, claridad mental, resiliencia, recuperación y base fisiológica durante las últimas semanas — es un indicador orientativo, no un diagnóstico médico.',
    y
  );
  footer(doc, 3);

  // Página 4 — Próximos pasos + CTA
  doc.addPage();
  y = 30;
  y = kicker(doc, 'Próximos pasos', y);
  y = heading(doc, 'Tu rendimiento actual tiene oportunidades de mejora.', y, 18);
  y += 2;
  y = body(
    doc,
    'Tus resultados sugieren que existen factores invisibles que podrían afectar tu energía, claridad mental y capacidad de liderazgo.',
    y
  );
  y += 4;
  y = body(
    doc,
    'Agenda una sesión estratégica para revisar tus resultados y determinar si calificas para el Executive Program.',
    y
  );
  y += 14;
  doc.setDrawColor(GOLD);
  doc.setFillColor(GOLD);
  doc.roundedRect(MARGIN, y, 74, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor('#17130E');
  doc.text('Agendar sesión estratégica', MARGIN + 6, y + 7.8);
  y += 24;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor('#A99B87');
  doc.text('Indicador orientativo de rendimiento ejecutivo; no constituye diagnóstico ni tratamiento médico.', MARGIN, y);
  footer(doc, 4);

  const safeName = nombre.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ejecutivo';
  doc.save(`Executive-Performance-Score-${safeName}.pdf`);
}
