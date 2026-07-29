'use client';

import { useState } from 'react';
import { computeHiddenFieldIds, validateWizardModule } from '@latribu/shared-types';
import { WIZARD_MODULES, CONDITIONAL_RULES } from '../../lib/wizard-modules';
import { WizardField } from './WizardField';
import { CountryCityPicker, type CountryCityValue } from './CountryCityPicker';
import { Module3, EMPTY_MODULE3_DRAFT, validateModule3, type Module3Draft } from './Module3';
import {
  putPersonalInfo,
  uploadPersonalInfoFile,
  createAnthropometric,
  createPhoto,
  createInbodyRecord,
} from '../../lib/onboarding-client';

type WizardData = Record<string, string | string[]>;

const PHOTO_ANGLE_KEYS = ['frente', 'lado_derecho', 'lado_izquierdo', 'espalda'] as const;

export type WizardShellProps = {
  clientId: string;
};

export function WizardShell({ clientId }: WizardShellProps) {
  const [step, setStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [otroValues, setOtroValues] = useState<Record<string, string>>({});
  const [pendingCheckupFile, setPendingCheckupFile] = useState<File | null>(null);
  const [module3Draft, setModule3Draft] = useState<Module3Draft>(EMPTY_MODULE3_DRAFT);
  const [invalidFieldIds, setInvalidFieldIds] = useState<Set<string>>(new Set());
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  const mod = WIZARD_MODULES.find((m) => m.n === step)!;
  const hiddenFieldIds = computeHiddenFieldIds(CONDITIONAL_RULES, wizardData);

  function handleFieldChange(id: string, value: string | string[]) {
    setWizardData((prev) => ({ ...prev, [id]: value }));
  }

  function handleOtroChange(id: string, value: string) {
    setOtroValues((prev) => ({ ...prev, [id]: value }));
  }

  function handleFileChange(id: string, file: File | null) {
    if (id === 'checkup_file') setPendingCheckupFile(file);
    setWizardData((prev) => ({ ...prev, [id]: file?.name || '' }));
  }

  function handleCountryCityChange(patch: Partial<CountryCityValue>) {
    setWizardData((prev) => ({
      ...prev,
      ...(patch.country !== undefined ? { country: patch.country } : {}),
      ...(patch.city !== undefined ? { city: patch.city } : {}),
      ...(patch.phoneCode !== undefined ? { phone_code: patch.phoneCode } : {}),
      ...(patch.phoneNumber !== undefined ? { phone_number: patch.phoneNumber } : {}),
    }));
  }

  async function finalize() {
    setFinalizing(true);
    setFinalizeError(null);
    try {
      let onboardingReport: Record<string, unknown> = { ...wizardData };
      for (const [fieldId, otro] of Object.entries(otroValues)) {
        onboardingReport[`${fieldId}_otro`] = otro;
      }
      if (pendingCheckupFile) {
        const uploaded = await uploadPersonalInfoFile(clientId, pendingCheckupFile, onboardingReport);
        onboardingReport = {
          ...onboardingReport,
          checkup_file_url: uploaded.file_url,
          checkup_file_name: uploaded.file_name,
          checkup_uploaded_at: uploaded.uploaded_at,
        };
      }

      await putPersonalInfo(clientId, {
        birthdate: wizardData.birthdate as string,
        gender: wizardData.gender as string,
        occupation: wizardData.occupation as string,
        marital_status: wizardData.marital_status as string,
        country: wizardData.country as string,
        city: wizardData.city as string,
        phone_code: wizardData.phone_code as string,
        phone_number: wizardData.phone_number as string,
        weight: module3Draft.weight ? Number(module3Draft.weight) : null,
        height: module3Draft.height ? Number(module3Draft.height) : null,
        body_fat: module3Draft.bodyFat ? Number(module3Draft.bodyFat) : null,
        onboarding_report: onboardingReport,
        complete: true,
      });

      const monthNum = 1; // primer registro del onboarding — siempre mes 1
      const { cintura, brazos, hombros, piernas, gluteo } = module3Draft.antropometria;
      if (cintura || brazos || hombros || piernas || gluteo) {
        await createAnthropometric(clientId, {
          fecha: new Date().toISOString().slice(0, 10),
          peso: module3Draft.weight ? Number(module3Draft.weight) : null,
          cintura: cintura ? Number(cintura) : null,
          brazos: brazos ? Number(brazos) : null,
          hombros: hombros ? Number(hombros) : null,
          piernas: piernas ? Number(piernas) : null,
          gluteo: gluteo ? Number(gluteo) : null,
          mes_num: monthNum,
        });
      }

      for (const angle of PHOTO_ANGLE_KEYS) {
        const file = module3Draft.photos[angle];
        if (file) await createPhoto(clientId, file, angle, monthNum);
      }

      if (module3Draft.inbody.ocrDone && module3Draft.inbody.pesoTotal) {
        await createInbodyRecord(clientId, {
          fecha: new Date().toISOString().slice(0, 10),
          version: module3Draft.inbody.version,
          peso_total: Number(module3Draft.inbody.pesoTotal),
          smm: module3Draft.inbody.smm ? Number(module3Draft.inbody.smm) : null,
          grasa_pct: module3Draft.inbody.grasaPct ? Number(module3Draft.inbody.grasaPct) : null,
          imc: module3Draft.inbody.imc ? Number(module3Draft.inbody.imc) : null,
          peso_objetivo: module3Draft.inbody.pesoObjetivo ? Number(module3Draft.inbody.pesoObjetivo) : null,
          grasa_visceral: module3Draft.inbody.grasaVisceral ? Number(module3Draft.inbody.grasaVisceral) : null,
          bmr: module3Draft.inbody.bmr ? Number(module3Draft.inbody.bmr) : null,
          angulo_fase: module3Draft.inbody.anguloFase ? Number(module3Draft.inbody.anguloFase) : null,
          ecw_tbw: module3Draft.inbody.ecwTbw ? Number(module3Draft.inbody.ecwTbw) : null,
          masa_osea: module3Draft.inbody.masaOsea ? Number(module3Draft.inbody.masaOsea) : null,
          altura: module3Draft.inbody.altura ? Number(module3Draft.inbody.altura) : null,
          mes_num: monthNum,
          file_url: module3Draft.inbody.fileUrl,
          file_name: module3Draft.inbody.fileName,
        });
      }

      setComplete(true);
    } catch (e) {
      setFinalizeError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setFinalizing(false);
    }
  }

  function handleContinue() {
    if (mod.custom === 'country') {
      const invalid: string[] = [];
      if (!wizardData.country) invalid.push('country');
      if (!wizardData.city) invalid.push('city');
      if (!wizardData.phone_number) invalid.push('phone_number');
      invalid.push(...validateWizardModule(mod.fields, wizardData, hiddenFieldIds));
      setInvalidFieldIds(new Set(invalid));
      if (invalid.length > 0) return;
      setStep(2);
      return;
    }
    if (mod.custom === 'body') {
      const invalid = validateModule3(module3Draft);
      setInvalidFieldIds(new Set(invalid));
      if (invalid.length > 0) return;
      setStep(4);
      return;
    }
    const invalid = validateWizardModule(mod.fields, wizardData, hiddenFieldIds);
    setInvalidFieldIds(new Set(invalid));
    if (invalid.length > 0) return;
    if (step < 9) {
      setStep(step + 1);
      return;
    }
    void finalize();
  }

  if (complete) {
    return (
      <div>
        <h1>¡Listo!</h1>
        <p>Datos guardados. Tu coach te contactará lo antes posible.</p>
      </div>
    );
  }

  return (
    <div>
      <p>
        Módulo {step} de 9 · {mod.title}
      </p>

      {mod.custom === 'country' && (
        <CountryCityPicker
          value={{
            country: (wizardData.country as string) || '',
            city: (wizardData.city as string) || '',
            phoneCode: (wizardData.phone_code as string) || '+57',
            phoneNumber: (wizardData.phone_number as string) || '',
          }}
          onChange={handleCountryCityChange}
        />
      )}

      {mod.custom === 'body' && (
        <Module3 clientId={clientId} draft={module3Draft} onChange={setModule3Draft} invalidFields={invalidFieldIds} />
      )}

      {mod.fields.map((field) => (
          <WizardField
            key={field.id}
            field={field}
            value={wizardData[field.id]}
            otroValue={otroValues[field.id]}
            hidden={hiddenFieldIds.has(field.id)}
            invalid={invalidFieldIds.has(field.id)}
            onChange={handleFieldChange}
            onOtroChange={handleOtroChange}
            onFileChange={handleFileChange}
          />
        ))}

      {finalizeError && <p role="alert">{finalizeError}</p>}

      <button type="button" disabled={step === 1} onClick={() => setStep(step - 1)}>
        Anterior
      </button>
      <button type="button" disabled={finalizing} onClick={handleContinue}>
        {step === 9 ? 'Finalizar' : 'Continuar'}
      </button>
    </div>
  );
}
