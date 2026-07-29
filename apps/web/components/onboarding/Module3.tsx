'use client';

import { useState } from 'react';
import { callOcr, uploadInbodyFile, updateClientObjetivos } from '../../lib/onboarding-client';
import { parseOcrText } from '../../lib/parse-ocr-text';

export type Module3Draft = {
  weight: string;
  height: string;
  bodyFat: string;
  objetivos: { peso: string; grasa_corporal: string; masa_muscular: string };
  antropometria: { cintura: string; brazos: string; hombros: string; piernas: string; gluteo: string };
  inbody: {
    pesoTotal: string;
    smm: string;
    grasaPct: string;
    pesoObjetivo: string;
    grasaVisceral: string;
    bmr: string;
    anguloFase: string;
    ecwTbw: string;
    masaOsea: string;
    altura: string;
    imc: string;
    version: string | null;
    fileUrl: string | null;
    fileName: string | null;
    ocrDone: boolean;
  };
  photos: Partial<Record<'frente' | 'lado_derecho' | 'lado_izquierdo' | 'espalda', File>>;
};

export const EMPTY_MODULE3_DRAFT: Module3Draft = {
  weight: '', height: '', bodyFat: '',
  objetivos: { peso: '', grasa_corporal: '', masa_muscular: '' },
  antropometria: { cintura: '', brazos: '', hombros: '', piernas: '', gluteo: '' },
  inbody: {
    pesoTotal: '', smm: '', grasaPct: '', pesoObjetivo: '', grasaVisceral: '', bmr: '', anguloFase: '',
    ecwTbw: '', masaOsea: '', altura: '', imc: '', version: null, fileUrl: null, fileName: null, ocrDone: false,
  },
  photos: {},
};

// Ángulo de fase y toda la sección de medidas antropométricas quedan
// opcionales a propósito, igual que MODULE3_REQUIRED_FIELDS en el legacy.
const INBODY_REQUIRED_KEYS = ['pesoTotal', 'smm', 'grasaPct', 'pesoObjetivo', 'grasaVisceral', 'bmr', 'ecwTbw', 'masaOsea', 'altura'] as const;

export function validateModule3(draft: Module3Draft): string[] {
  const invalid: string[] = [];
  if (!draft.weight.trim()) invalid.push('weight');
  if (!draft.height.trim()) invalid.push('height');
  if (!draft.bodyFat.trim()) invalid.push('bodyFat');
  if (!draft.objetivos.peso) invalid.push('objetivo_peso');
  if (!draft.objetivos.grasa_corporal) invalid.push('objetivo_grasa_corporal');
  if (!draft.objetivos.masa_muscular) invalid.push('objetivo_masa_muscular');
  for (const key of INBODY_REQUIRED_KEYS) {
    if (!draft.inbody[key]) invalid.push(`inbody_${key}`);
  }
  return invalid;
}

export function computeImc(pesoTotal: string, altura: string): string {
  const w = parseFloat(pesoTotal) || 0;
  const h = parseFloat(altura) || 0;
  return w > 0 && h > 0 ? (w / Math.pow(h / 100, 2)).toFixed(1) : '';
}

const PHOTO_ANGLES = [
  { key: 'frente', label: 'Frente' },
  { key: 'lado_derecho', label: 'Lado derecho' },
  { key: 'lado_izquierdo', label: 'Lado izquierdo' },
  { key: 'espalda', label: 'Espalda' },
] as const;

const INBODY_NUMBER_FIELDS = [
  ['pesoTotal', 'Peso total (InBody)'],
  ['smm', 'Masa muscular esquelética'],
  ['grasaPct', '% Grasa corporal'],
  ['pesoObjetivo', 'Peso objetivo'],
  ['grasaVisceral', 'Grasa visceral'],
  ['bmr', 'Metabolismo basal (BMR)'],
  ['anguloFase', 'Ángulo de fase'],
  ['ecwTbw', 'Agua corporal total (L)'],
  ['masaOsea', 'Masa ósea'],
  ['altura', 'Estatura (InBody)'],
] as const;

const ANTROPOMETRIA_FIELDS = [
  ['cintura', 'Cintura (cm)'],
  ['brazos', 'Brazos (cm)'],
  ['hombros', 'Hombros (cm)'],
  ['piernas', 'Piernas (cm)'],
  ['gluteo', 'Glúteo (cm)'],
] as const;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export type Module3Props = {
  clientId: string;
  draft: Module3Draft;
  onChange: (draft: Module3Draft) => void;
  invalidFields: Set<string>;
};

export function Module3({ clientId, draft, onChange, invalidFields }: Module3Props) {
  const [ocrStatus, setOcrStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);

  function setObjetivo(metrica: keyof Module3Draft['objetivos'], valor: string) {
    const objetivos = { ...draft.objetivos, [metrica]: valor };
    onChange({ ...draft, objetivos });
    // No fatal — igual que setObjetivo() en el legacy, el borrador local
    // avanza aunque esta escritura en segundo plano falle.
    updateClientObjetivos(clientId, objetivos).catch((e: Error) => {
      console.error('No se pudo guardar el objetivo:', e.message);
    });
  }

  async function handleInbodyFile(file: File) {
    if (file.size > 25 * 1024 * 1024) {
      setOcrStatus({ message: 'El archivo excede 25 MB.', isError: true });
      return;
    }
    setOcrBusy(true);
    setOcrStatus({ message: 'Procesando archivo…', isError: false });
    try {
      const base64 = await fileToBase64(file);
      const { text } = await callOcr(clientId, base64);
      if (!text.trim()) throw new Error('No se pudo extraer texto. Exporta el reporte como JPG/PNG e intenta de nuevo.');
      const parsed = parseOcrText(text);
      const parsedCount = Object.entries(parsed).filter(([k, v]) => k !== '_version' && v != null).length;
      if (parsedCount === 0) throw new Error('No se detectaron campos. Intenta con una captura JPG/PNG del reporte InBody.');

      const nextInbody = {
        ...draft.inbody,
        pesoTotal: parsed.peso_total != null ? String(parsed.peso_total) : '',
        smm: parsed.smm != null ? String(parsed.smm) : '',
        grasaPct: parsed.grasa_pct != null ? String(parsed.grasa_pct) : '',
        pesoObjetivo: parsed.peso_objetivo != null ? String(parsed.peso_objetivo) : '',
        grasaVisceral: parsed.grasa_visceral != null ? String(parsed.grasa_visceral) : '',
        bmr: parsed.bmr != null ? String(parsed.bmr) : '',
        anguloFase: parsed.angulo_fase != null ? String(parsed.angulo_fase) : '',
        ecwTbw: parsed.ecw_tbw != null ? String(parsed.ecw_tbw) : '',
        masaOsea: parsed.masa_osea != null ? String(parsed.masa_osea) : '',
        altura: parsed.height != null ? String(parsed.height) : '',
        version: parsed._version ?? null,
        ocrDone: true,
      };
      nextInbody.imc = computeImc(nextInbody.pesoTotal, nextInbody.altura);

      let fileAttached = false;
      let fileUrl: string | null = null;
      let fileName: string | null = null;
      try {
        const uploaded = await uploadInbodyFile(clientId, file);
        fileUrl = uploaded.file_url;
        fileName = uploaded.file_name;
        fileAttached = true;
      } catch (e) {
        console.error('inbody-upload falló:', e);
      }

      onChange({ ...draft, inbody: { ...nextInbody, fileUrl, fileName } });
      setOcrStatus({
        message: fileAttached
          ? `${parsedCount} campos detectados y rellenados. Archivo adjuntado.`
          : `${parsedCount} campos detectados y rellenados, pero el archivo original NO se pudo adjuntar — inténtalo de nuevo antes de continuar.`,
        isError: !fileAttached,
      });
    } catch (e) {
      setOcrStatus({ message: e instanceof Error ? e.message : 'Error al procesar el archivo.', isError: true });
    } finally {
      setOcrBusy(false);
    }
  }

  return (
    <div>
      <section>
        <h3>Composición corporal</h3>
        <label htmlFor="field-weight">Peso (kg)</label>
        <input id="field-weight" type="number" value={draft.weight} onChange={(e) => onChange({ ...draft, weight: e.target.value })} />
        {invalidFields.has('weight') && <p role="alert">Este campo es obligatorio.</p>}

        <label htmlFor="field-height">Estatura (cm)</label>
        <input id="field-height" type="number" value={draft.height} onChange={(e) => onChange({ ...draft, height: e.target.value })} />
        {invalidFields.has('height') && <p role="alert">Este campo es obligatorio.</p>}

        <label htmlFor="field-body-fat">% Grasa corporal (si lo conoces)</label>
        <input id="field-body-fat" type="number" value={draft.bodyFat} onChange={(e) => onChange({ ...draft, bodyFat: e.target.value })} />
        {invalidFields.has('bodyFat') && <p role="alert">Este campo es obligatorio.</p>}

        <h4>Tus objetivos de composición corporal</h4>
        {(['peso', 'grasa_corporal', 'masa_muscular'] as const).map((metrica) => (
          <div key={metrica}>
            <label htmlFor={`objetivo-${metrica}`}>¿Cuál es tu objetivo de {metrica.replace('_', ' ')}?</label>
            <select id={`objetivo-${metrica}`} value={draft.objetivos[metrica]} onChange={(e) => setObjetivo(metrica, e.target.value)}>
              <option value="">Selecciona…</option>
              <option value="bajar">Bajar</option>
              <option value="mantener">Mantener</option>
              <option value="subir">Subir</option>
            </select>
            {invalidFields.has(`objetivo_${metrica}`) && <p role="alert">Este campo es obligatorio.</p>}
          </div>
        ))}
      </section>

      <section>
        <h3>Cargar análisis InBody</h3>
        <label htmlFor="field-inbody-file">Sube el PDF o una foto de tu reporte InBody</label>
        <input
          id="field-inbody-file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          disabled={ocrBusy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleInbodyFile(file);
          }}
        />
        {ocrStatus && <p role={ocrStatus.isError ? 'alert' : 'status'}>{ocrStatus.message}</p>}
        {draft.inbody.version && <p>Versión detectada: {draft.inbody.version}</p>}

        {INBODY_NUMBER_FIELDS.map(([key, label]) => (
          <div key={key}>
            <label htmlFor={`inbody-${key}`}>{label}</label>
            <input
              id={`inbody-${key}`}
              type="number"
              value={draft.inbody[key]}
              onChange={(e) => {
                const nextInbody = { ...draft.inbody, [key]: e.target.value };
                if (key === 'pesoTotal' || key === 'altura') nextInbody.imc = computeImc(nextInbody.pesoTotal, nextInbody.altura);
                onChange({ ...draft, inbody: nextInbody });
              }}
            />
            {invalidFields.has(`inbody_${key}`) && <p role="alert">Este campo es obligatorio.</p>}
          </div>
        ))}
        <label htmlFor="inbody-imc">IMC calculado</label>
        <input id="inbody-imc" type="text" value={draft.inbody.imc} disabled />
      </section>

      <section>
        <h3>Medidas antropométricas (opcional)</h3>
        {ANTROPOMETRIA_FIELDS.map(([key, label]) => (
          <div key={key}>
            <label htmlFor={`antropometria-${key}`}>{label}</label>
            <input
              id={`antropometria-${key}`}
              type="number"
              value={draft.antropometria[key]}
              onChange={(e) => onChange({ ...draft, antropometria: { ...draft.antropometria, [key]: e.target.value } })}
            />
          </div>
        ))}
      </section>

      <section>
        <h3>Fotos de progreso (opcional)</h3>
        {PHOTO_ANGLES.map((angle) => (
          <div key={angle.key}>
            <label htmlFor={`photo-${angle.key}`}>{angle.label}</label>
            <input
              id={`photo-${angle.key}`}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                onChange({ ...draft, photos: { ...draft.photos, [angle.key]: file } });
              }}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
