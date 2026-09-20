'use client';

import { useCallback, useEffect, useState } from 'react';
import { listLabPanels, extractLabPanel, upsertLabPanel, type LabPanel, type ExtractedMarker } from '../../lib/lab-panels-client';
import { OCR_FIELD_MAP, type LabFieldMeta } from '../../lib/parse-lab-ocr-text';
import { RangeBar, type RangeZone } from './charts/RangeBar';
import FloatingField from '../ui/FloatingField';
import FileField from '../ui/FileField';

// Mismo diccionario de labels que Module10 (onboarding, semana 0) — reusado
// aquí puramente como metadata de display, nunca para parsear (eso vive en
// el backend, ver lab-ai-extraction.service.ts).
const MARKER_LABELS = new Map(OCR_FIELD_MAP.map((f) => [f.field, f]));

// Zonas de referencia para el RangeBar (spec 27.6) — deriva bajo/normal/alto
// del rango óptimo ya definido en OCR_FIELD_MAP (mismo dato que ya se usaba
// para el status del grid, ahora también dibuja la barra). No se estira más
// allá del rango real para marcadores con "sin límite superior" (ej. HDL,
// opt[1] >= 900) — ahí "alto" no aplica.
function buildRangeZones(meta: LabFieldMeta): { domainMin: number; domainMax: number; zones: RangeZone[] } {
  const [min, max] = meta.opt;
  const span = Math.max(1, max - min);
  const pad = Math.min(span * 0.6, Math.max(span, min || 1));
  const domainMin = Math.max(0, min - pad);
  const noUpperBound = max >= 900;
  const domainMax = noUpperBound ? max : max + pad;
  const zones: RangeZone[] = [
    { min: domainMin, max: min, color: 'var(--eph-low)', label: `Bajo (<${min})` },
    { min, max, color: 'var(--eph-good)', label: noUpperBound ? `Normal (≥${min})` : `Normal (${min}–${max})` },
  ];
  if (!noUpperBound) zones.push({ min: max, max: domainMax, color: 'var(--eph-warn)', label: `Alto (>${max})` });
  return { domainMin, domainMax, zones };
}

const CHECKPOINTS = [6, 12] as const;
const CHECKPOINT_LABELS: Record<number, string> = { 6: 'Semana 6', 12: 'Semana 12' };

const STATUS_LABELS: Record<string, string> = { pendiente: 'Pendiente', en_revision: 'En revisión', aprobado: 'Aprobado' };

function statusBadgeClasses(status: string): string {
  if (status === 'aprobado') return 'border border-[var(--eph-accent)] text-[var(--eph-accent)]';
  if (status === 'en_revision') return 'border border-[var(--eph-steel)] text-[var(--eph-steel)]';
  return 'border border-[var(--eph-line-2)] text-[var(--eph-muted)]';
}

function CheckpointCard({ clientId, semana, panel, onSaved }: { clientId: string; semana: number; panel: LabPanel | undefined; onSaved: () => void | Promise<void> }) {
  const [markers, setMarkers] = useState<ExtractedMarker[] | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sourceFileHash, setSourceFileHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ message: string; isError: boolean } | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setStatus({ message: 'Procesando archivo (OCR + IA)…', isError: false });
    try {
      const result = await extractLabPanel(clientId, semana, file);
      setMarkers(result.markers);
      setFileUrl(result.fileUrl);
      setFileName(result.fileName);
      setSourceFileHash(result.sourceFileHash);
      const detected = result.markers.filter((m) => m.detected).length;
      const missing = result.markers.length - detected;
      setStatus({
        message: detected === 0
          ? 'No se detectó ningún biomarcador. Verifica que el archivo sea legible.'
          : missing > 0
            ? `✓ ${detected} biomarcadores detectados · ${missing} no detectados (el equipo los revisará).`
            : `✓ ${detected} biomarcadores detectados.`,
        isError: detected === 0,
      });
    } catch (e) {
      setStatus({ message: e instanceof Error ? e.message : 'Error al procesar el archivo.', isError: true });
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!markers) return;
    setBusy(true);
    try {
      const datos = markers.reduce<Record<string, number>>((acc, m) => {
        if (m.detected && m.value != null) acc[m.marker_id] = m.value;
        return acc;
      }, {});
      await upsertLabPanel(clientId, {
        semana,
        fecha,
        datos,
        fileUrl: fileUrl ?? undefined,
        fileName: fileName ?? undefined,
        sourceFileHash: sourceFileHash ?? undefined,
      });
      setStatus({ message: 'Laboratorio guardado — el equipo lo revisará.', isError: false });
      await onSaved();
    } catch (e) {
      setStatus({ message: e instanceof Error ? e.message : 'Error al guardar.', isError: true });
    } finally {
      setBusy(false);
    }
  }

  const alreadySaved = !!panel;
  const displayMarkers: Array<{ id: string; value: number | null; detected: boolean }> = alreadySaved
    ? Object.entries(panel!.datos || {}).map(([id, value]) => ({ id, value, detected: true }))
    : (markers ?? []).map((m) => ({ id: m.marker_id, value: m.value, detected: m.detected }));

  return (
    <div className="border p-7" style={{ borderColor: 'var(--eph-line)', background: 'var(--eph-surface)', borderRadius: 14 }}>
      <div className="mb-4 flex items-center gap-2">
        <span className="font-display text-xl" style={{ color: 'var(--eph-text)' }}>Laboratorio {CHECKPOINT_LABELS[semana]}</span>
        {alreadySaved && (
          <span className={`inline-block rounded-[999px] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${statusBadgeClasses(panel!.status)}`}>
            {STATUS_LABELS[panel!.status] || panel!.status}
          </span>
        )}
      </div>

      {!alreadySaved && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FloatingField id={`lab-checkpoint-${semana}-fecha`} label="Fecha del análisis" type="date" value={fecha} onChange={setFecha} />
          <FileField
            id={`lab-checkpoint-${semana}-file`}
            label="Subir PDF o imagen de laboratorio"
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={busy}
            uploading={busy}
            fileName={fileName}
            helper="Extraemos los biomarcadores automáticamente con OCR + IA · PDF, JPG, PNG"
            onFileChange={(file) => { if (file) void handleFile(file); }}
          />
        </div>
      )}

      {status && (
        <p role={status.isError ? 'alert' : 'status'} className={`mb-3 font-body text-sm ${status.isError ? 'text-[var(--eph-danger)]' : 'text-[var(--eph-accent)]'}`}>
          {status.message}
        </p>
      )}

      {displayMarkers.length > 0 && (
        <div className="mb-4">
          {displayMarkers.map((m) => {
            const meta = MARKER_LABELS.get(m.id);
            if (!m.detected || m.value == null || !meta) {
              return (
                <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--eph-line)', fontSize: 13, color: 'var(--eph-muted)' }}>
                  {meta?.lbl || m.id} — No detectado
                </div>
              );
            }
            const { domainMin, domainMax, zones } = buildRangeZones(meta);
            return (
              <RangeBar
                key={m.id}
                name={meta.lbl}
                value={m.value}
                unit={` ${meta.unit}`}
                zones={zones}
                domainMin={domainMin}
                domainMax={domainMax}
              />
            );
          })}
        </div>
      )}

      {!alreadySaved && markers && markers.some((m) => m.detected) && (
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="rounded-none px-5 py-2 font-mono text-[10px] uppercase tracking-[0.1em] disabled:opacity-60"
          style={{ background: 'var(--eph-accent)', color: 'var(--eph-ink)' }}
        >
          {busy ? 'Guardando…' : 'Guardar laboratorio'}
        </button>
      )}
    </div>
  );
}

export function ClientLabCheckpoints({ clientId }: { clientId: string }) {
  const [panels, setPanels] = useState<LabPanel[] | null>(null);

  const load = useCallback(async () => {
    setPanels(await listLabPanels(clientId).catch(() => []));
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  if (panels === null) return null;

  // Más protagonismo (pedido explícito) — ancho completo, sin compartir
  // espacio con ninguna otra card; ya no lleva su propio <h2>: vive dentro
  // del wrapper de categoría "Salud" (CategorySection) en ClientEvolutionPanel.
  return (
    <div className="space-y-5">
      {CHECKPOINTS.map((semana) => (
        <CheckpointCard key={semana} clientId={clientId} semana={semana} panel={panels.find((p) => p.semanaNumero === semana)} onSaved={load} />
      ))}
    </div>
  );
}
