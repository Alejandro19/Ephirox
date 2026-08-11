'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  clientGetMyCase,
  clientCompleteTask,
  clientRequestHelp,
  type BlindspotTask,
  type BlindspotSessionLog,
  type BlindspotCaseStatus,
} from '@/lib/blindspot-client';
import { PermissionDeniedError } from '@/lib/api-client';
import LockedOverlay from '@/components/ui/LockedOverlay';
import { COACH_WHATSAPP_NUMBER } from '@/lib/constants';

const STATUS_LABEL: Record<BlindspotCaseStatus, string> = {
  evaluando: 'En evaluación con Alejandro',
  referido: 'Referido a tu terapeuta',
  en_proceso: 'En proceso',
  cerrado: 'Proceso cerrado',
};

const PROGRESS_LABEL: Record<BlindspotSessionLog['progressMarker'], string> = {
  avance: 'Avance',
  estable: 'Estable',
  retroceso: 'Retroceso',
  cerrado: 'Cerrado',
};

export function ClientBlindspotPanel({ clientType }: { clientType: string | null }) {
  if (clientType !== 'mentoring') {
    return (
      <LockedOverlay
        title="Solo disponible para Mentoría"
        subtitle="Punto Ciego — la auditoría de tu punto ciego con referido a terapeuta especializado — es parte del plan Mentoring."
        ctaLabel="Conocer planes"
        onCta={() => window.open(`https://wa.me/${COACH_WHATSAPP_NUMBER}`, '_blank')}
      >
        <BlindspotBody />
      </LockedOverlay>
    );
  }
  return <BlindspotBody />;
}

function BlindspotBody() {
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<{ id: string; caseNumber: number; status: BlindspotCaseStatus; therapistName: string | null } | null>(null);
  const [tasks, setTasks] = useState<BlindspotTask[]>([]);
  const [sessionLogs, setSessionLogs] = useState<BlindspotSessionLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [permissionLocked, setPermissionLocked] = useState(false);
  const [helpSent, setHelpSent] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const res = await clientGetMyCase();
      setCaseData(res.case);
      setTasks(res.tasks);
      setSessionLogs(res.sessionLogs);
    } catch (e) {
      if (e instanceof PermissionDeniedError) setPermissionLocked(true);
      else setError(e instanceof Error ? e.message : 'Error al cargar tu Punto Ciego.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function handleCompleteTask(taskId: string) {
    try {
      await clientCompleteTask(taskId);
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar la tarea.');
    }
  }

  async function handleHelp() {
    setHelpLoading(true);
    try {
      await clientRequestHelp();
      setHelpSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar la solicitud.');
    } finally {
      setHelpLoading(false);
    }
  }

  if (loading) {
    return <p className="text-[13px] text-[var(--ink-secondary)]">Cargando...</p>;
  }

  if (permissionLocked) {
    return (
      <LockedOverlay title="Módulo no disponible" subtitle="Este módulo ya no está disponible para tu tipo de cuenta.">
        <div style={{ minHeight: 200 }} />
      </LockedOverlay>
    );
  }

  if (error) {
    return <p className="text-[13px] text-[var(--danger)]">{error}</p>;
  }

  if (!caseData) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-6">
        <h2 className="mb-2 font-serif text-lg font-bold text-[var(--ink)]">Punto Ciego</h2>
        <p className="text-[13px] text-[var(--ink-secondary)]">
          Alejandro aún no ha iniciado tu evaluación en este módulo. Cuando la agenden contigo, aparecerá aquí.
        </p>
      </section>
    );
  }

  const pendingTasks = tasks.filter((t) => t.status === 'pendiente');
  const doneTasks = tasks.filter((t) => t.status !== 'pendiente');

  return (
    <div>
      <section className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-6">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A5FA0]">Punto Ciego · Caso #{caseData.caseNumber}</p>
        <h2 className="mb-2 font-serif text-lg font-bold text-[var(--ink)]">{STATUS_LABEL[caseData.status]}</h2>
        {caseData.therapistName && (
          <p className="text-[13px] text-[var(--ink-secondary)]">
            Terapeuta asignado: <span className="font-semibold text-[var(--ink)]">{caseData.therapistName}</span>
          </p>
        )}
      </section>

      {tasks.length > 0 && (
        <section className="border-t border-[var(--border-hairline)] py-6">
          <h3 className="mb-3.5 font-serif text-base font-bold text-[var(--ink)]">Tus tareas</h3>
          <ul className="flex flex-col gap-2">
            {pendingTasks.map((task) => (
              <li key={task.id} className="flex items-start justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-hairline)] p-3.5">
                <div>
                  <p className="text-[13.5px] font-semibold text-[var(--ink)]">{task.title}</p>
                  {task.description && <p className="mt-1 text-[12px] text-[var(--ink-secondary)]">{task.description}</p>}
                  {task.dueDate && <p className="mt-1 text-[11px] text-[var(--ink-secondary)]">Antes de: {task.dueDate}</p>}
                </div>
                <button
                  onClick={() => handleCompleteTask(task.id)}
                  className="shrink-0 rounded-full border border-[var(--border-hairline)] px-3 py-1.5 text-[11px] font-semibold text-[var(--ink)] hover:bg-black/5"
                >
                  Marcar hecha
                </button>
              </li>
            ))}
            {doneTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-hairline)] p-3.5 opacity-60">
                <p className="text-[13.5px] font-semibold text-[var(--ink)] line-through">{task.title}</p>
                <span className="text-[11px] text-[var(--ink-secondary)]">{task.status === 'completada' ? 'Completada' : 'Omitida'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sessionLogs.length > 0 && (
        <section className="border-t border-[var(--border-hairline)] py-6">
          <h3 className="mb-3.5 font-serif text-base font-bold text-[var(--ink)]">Tu avance</h3>
          <ul className="flex flex-col gap-3">
            {sessionLogs.map((log) => (
              <li key={log.id} className="border-l-2 border-[var(--border-hairline)] pl-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-secondary)]">
                  {log.sessionDate} · {PROGRESS_LABEL[log.progressMarker]}
                </p>
                {log.clientNote && <p className="mt-1 text-[13px] text-[var(--ink)]">{log.clientNote}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border-t border-[var(--border-hairline)] py-6">
        {helpSent ? (
          <p className="text-[13px] text-[var(--ink-secondary)]">Le avisamos a Alejandro. Te contactará lo antes posible.</p>
        ) : (
          <>
            <p className="mb-2 text-[13px] text-[var(--ink-secondary)]">¿Necesitas ayuda urgente?</p>
            <button
              onClick={handleHelp}
              disabled={helpLoading}
              className="rounded-full border border-[var(--border-hairline)] px-4 py-2 text-[12px] font-semibold text-[var(--ink)] hover:bg-black/5 disabled:opacity-50"
            >
              {helpLoading ? 'Enviando...' : 'Avisar a Alejandro ahora'}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
