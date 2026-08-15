'use client';

import { useState } from 'react';
import TherapistTopbar from './TherapistTopbar';
import { type TherapistModuleKey } from './therapist-nav';
import { TherapistCasesModule } from './TherapistCasesModule';

const PLACEHOLDER_COPY: Record<Exclude<TherapistModuleKey, 'casos'>, { title: string; description: string }> = {
  perfil: {
    title: 'Mi perfil',
    description: 'Aquí verás tus reconocimientos por antigüedad y casos acompañados.',
  },
  clientes: {
    title: 'Mis clientes',
    description: 'El listado completo de clientes de mentoría que tienes asignados, incluso los que aún no tienen un caso clínico abierto.',
  },
  agenda: {
    title: 'Mi agenda',
    description: 'Tu disponibilidad y próximas sesiones, conectada con lo que el cliente ve al agendar contigo.',
  },
  recursos: {
    title: 'Recursos clínicos',
    description: 'Material y guías de apoyo para tu práctica dentro de La Tribu.',
  },
  comunidad: {
    title: 'Cuerpo terapéutico del Club',
    description: 'Un espacio para conectar con otros terapeutas de la red de La Tribu.',
  },
  dashboards: {
    title: 'Dashboards',
    description: 'Métricas de tus casos y tu impacto dentro del programa de Mentoría.',
  },
};

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 24, fontWeight: 700, color: 'var(--ink)', margin: '0 0 8px' }}>
        {title}
      </h1>
      <p style={{ fontSize: 13, color: 'var(--ink-secondary)', margin: '0 0 24px', maxWidth: 480 }}>{description}</p>
      <div
        style={{
          background: 'var(--paper)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-card)',
          padding: '40px 24px', textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink-secondary)' }}>Próximamente</p>
      </div>
    </div>
  );
}

export function TherapistShell() {
  const [activeModule, setActiveModule] = useState<TherapistModuleKey>('casos');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TherapistTopbar activeModule={activeModule} onNavigate={setActiveModule} />
      <div className="therapist-main-content" style={{ flex: 1, minWidth: 0, background: 'var(--page-bg)', overflowY: 'auto' }}>
        {activeModule === 'casos' ? (
          <TherapistCasesModule />
        ) : (
          <ComingSoon {...PLACEHOLDER_COPY[activeModule]} />
        )}
      </div>
      <style jsx>{`
        .therapist-main-content {
          padding: 36px 44px;
        }
        @media (max-width: 640px) {
          .therapist-main-content {
            padding: 20px 16px;
          }
        }
      `}</style>
    </div>
  );
}
