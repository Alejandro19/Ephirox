// apps/web/components/onboarding/WizardField.tsx
'use client';

import type { WizardFieldConfig } from '@latribu/shared-types';

export type WizardFieldProps = {
  field: WizardFieldConfig;
  value: string | string[] | undefined;
  otroValue?: string;
  hidden?: boolean;
  invalid?: boolean;
  onChange: (id: string, value: string | string[]) => void;
  onOtroChange?: (id: string, value: string) => void;
  onFileChange?: (id: string, file: File | null) => void;
};

export function WizardField({ field, value, otroValue, hidden, invalid, onChange, onOtroChange, onFileChange }: WizardFieldProps) {
  if (hidden) return null;

  if (field.type === 'select') {
    return (
      <div>
        <label htmlFor={`field-${field.id}`}>{field.label}</label>
        <select id={`field-${field.id}`} value={(value as string) || ''} onChange={(e) => onChange(field.id, e.target.value)}>
          <option value="">Selecciona…</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {invalid && <p role="alert">Este campo es obligatorio.</p>}
      </div>
    );
  }

  if (field.type === 'segmented') {
    const min = field.min ?? 1;
    const max = field.max ?? 6;
    const current = value !== undefined && value !== '' ? Number(value) : undefined;
    const cells: number[] = [];
    for (let n = min; n <= max; n++) cells.push(n);
    return (
      <div>
        <span id={`field-${field.id}-label`}>{field.label}</span>
        <div role="group" aria-labelledby={`field-${field.id}-label`}>
          {cells.map((n) => (
            <button key={n} type="button" aria-pressed={n === current} onClick={() => onChange(field.id, String(n))}>
              {n}
            </button>
          ))}
        </div>
        {invalid && <p role="alert">Este campo es obligatorio.</p>}
      </div>
    );
  }

  if (field.type === 'chevron') {
    const min = field.min ?? 0;
    const step = field.step ?? 1;
    const current = value !== undefined && value !== '' ? Number(value) : min;
    return (
      <div>
        <label htmlFor={`field-${field.id}`}>{field.label}</label>
        <output htmlFor={`field-${field.id}`}>{current}</output>
        <input type="hidden" id={`field-${field.id}`} value={current} readOnly />
        <button type="button" aria-label={`Aumentar ${field.label}`} onClick={() => onChange(field.id, String(Math.max(min, Math.round((current + step) * 10) / 10)))}>
          ▲
        </button>
        <button type="button" aria-label={`Disminuir ${field.label}`} onClick={() => onChange(field.id, String(Math.max(min, Math.round((current - step) * 10) / 10)))}>
          ▼
        </button>
        {invalid && <p role="alert">Este campo es obligatorio.</p>}
      </div>
    );
  }

  if (field.type === 'slider') {
    const min = field.min ?? 1;
    const max = field.max ?? 10;
    const current = value !== undefined && value !== '' ? Number(value) : min;
    return (
      <div>
        <label htmlFor={`field-${field.id}`}>
          {field.label} ({current})
        </label>
        <input type="range" id={`field-${field.id}`} min={min} max={max} value={current} onChange={(e) => onChange(field.id, e.target.value)} />
        <div>
          <span>{field.minLabel}</span>
          <span>{field.maxLabel}</span>
        </div>
        {invalid && <p role="alert">Este campo es obligatorio.</p>}
      </div>
    );
  }

  if (field.type === 'time') {
    return (
      <div>
        <label htmlFor={`field-${field.id}`}>{field.label}</label>
        <input type="time" id={`field-${field.id}`} value={(value as string) || ''} onChange={(e) => onChange(field.id, e.target.value)} />
        {invalid && <p role="alert">Este campo es obligatorio.</p>}
      </div>
    );
  }

  if (field.type === 'chips') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset>
        <legend>{field.label}</legend>
        {(field.options || []).map((option) => (
          <label key={option}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => {
                const next = selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option];
                onChange(field.id, next);
              }}
            />
            {option}
          </label>
        ))}
        {selected.includes('Otro') && (
          <input
            type="text"
            aria-label={`Especifica ${field.label}`}
            placeholder="Especifica…"
            value={otroValue || ''}
            onChange={(e) => onOtroChange?.(field.id, e.target.value)}
          />
        )}
        {invalid && <p role="alert">Este campo es obligatorio.</p>}
      </fieldset>
    );
  }

  if (field.type === 'file') {
    return (
      <div>
        <label htmlFor={`field-${field.id}`}>{field.label}</label>
        <input type="file" id={`field-${field.id}`} onChange={(e) => onFileChange?.(field.id, e.target.files?.[0] || null)} />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <label htmlFor={`field-${field.id}`}>{field.label}</label>
        <textarea id={`field-${field.id}`} value={(value as string) || ''} onChange={(e) => onChange(field.id, e.target.value)} />
        {invalid && <p role="alert">Este campo es obligatorio.</p>}
      </div>
    );
  }

  // text, date
  return (
    <div>
      <label htmlFor={`field-${field.id}`}>{field.label}</label>
      <input type={field.type} id={`field-${field.id}`} value={(value as string) || ''} onChange={(e) => onChange(field.id, e.target.value)} />
      {invalid && <p role="alert">Este campo es obligatorio.</p>}
    </div>
  );
}
