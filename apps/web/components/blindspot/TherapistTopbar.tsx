'use client';

import { useEffect, useRef, useState } from 'react';
import { getSessionToken, decodeTokenPayload, clearSession } from '@/lib/api-client';
import BrandRing from '../ui/BrandRing';
import { THERAPIST_NAV, type TherapistModuleKey } from './therapist-nav';

const COLLAPSE_BREAKPOINT = 1280;

export default function TherapistTopbar({
  activeModule,
  onNavigate,
}: {
  activeModule: TherapistModuleKey;
  onNavigate: (key: TherapistModuleKey) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const token = getSessionToken();
  const name = (token && decodeTokenPayload<{ name?: string }>(token)?.name) || 'Terapeuta';
  const initial = name.charAt(0).toUpperCase();

  function handleLogout() {
    clearSession();
    window.location.href = '/therapist-login';
  }

  function navigate(key: TherapistModuleKey) {
    onNavigate(key);
    setDrawerOpen(false);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    if (accountOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [accountOpen]);

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          height: 68,
          padding: '0 32px',
          background: 'linear-gradient(135deg, var(--hero-piedra-start), var(--hero-piedra-end))',
        }}
      >
        <button
          onClick={() => navigate('casos')}
          aria-label="Ir al menú principal"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: 19,
            fontWeight: 700,
            color: 'var(--hero-piedra-text)',
            flexShrink: 0,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <BrandRing size={24} background="var(--hero-piedra-start)" />
          La Tribu
        </button>

        <nav className="therapist-nav-row" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {THERAPIST_NAV.map((item) => {
            const active = activeModule === item.key;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                className={`therapist-nav-tab${active ? ' active' : ''}`}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontSize: 12,
                  fontWeight: active ? 500 : 400,
                  color: active ? 'var(--hero-piedra-text)' : 'var(--hero-piedra-text-muted)',
                  padding: '8px 12px',
                  position: 'relative',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="therapist-topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 'auto' }}>
          <div ref={accountRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setAccountOpen((v) => !v)}
              aria-label="Cuenta"
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '1px solid var(--hero-piedra-accent)',
                background: accountOpen ? 'var(--hero-piedra-accent)' : 'transparent',
                color: accountOpen ? 'var(--hero-piedra-start)' : 'var(--hero-piedra-text)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s ease, color 0.2s ease',
              }}
            >
              {initial}
            </button>
            {accountOpen && (
              <div style={{
                position: 'absolute', top: 40, right: 0, width: 200,
                background: 'var(--paper)', border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-card)', padding: 10, zIndex: 90,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', padding: '4px 6px' }}>{name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-secondary)', padding: '0 6px 6px' }}>Terapeuta</div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', marginTop: 6, background: 'none',
                    border: '1px solid var(--border-input)', borderRadius: '9999px',
                    padding: '8px 14px', fontSize: 12, fontWeight: 500,
                    color: 'var(--ink-secondary)', cursor: 'pointer',
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
          <button
            className="therapist-hamburger"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            style={{
              display: 'none', background: 'none', border: 'none',
              padding: 6, flexDirection: 'column', gap: 4, cursor: 'pointer',
            }}
          >
            <span style={{ display: 'block', width: 20, height: 2, background: 'var(--hero-piedra-text)', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 20, height: 2, background: 'var(--hero-piedra-text)', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 20, height: 2, background: 'var(--hero-piedra-text)', borderRadius: 2 }} />
          </button>
        </div>
      </header>

      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 105 }}
        />
      )}
      <div
        className={`therapist-drawer${drawerOpen ? ' open' : ''}`}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '82vw', maxWidth: 300,
          background: 'var(--page-bg)', zIndex: 110, padding: '24px 20px',
          transition: 'transform 0.28s ease',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}
      >
        <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>
          La Tribu
        </span>
        {THERAPIST_NAV.map((item) => {
          const active = activeModule === item.key;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              style={{
                background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
                padding: '12px 4px', fontSize: 14,
                fontWeight: active ? 500 : 400,
                color: active ? 'var(--ink)' : 'var(--ink-secondary)',
                borderBottom: '1px solid var(--border-hairline)',
              }}
            >
              {item.label}
            </button>
          );
        })}
        <button
          onClick={handleLogout}
          style={{
            marginTop: 'auto', background: 'none', border: '1px solid var(--border-input)',
            borderRadius: '9999px', padding: '10px 16px', fontSize: 13, fontWeight: 500,
            color: 'var(--ink-secondary)', cursor: 'pointer',
          }}
        >
          Cerrar sesión
        </button>
      </div>

      <style jsx>{`
        .therapist-nav-tab::after {
          content: '';
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 2px;
          height: 2px;
          background: var(--hero-piedra-accent);
          width: 0%;
          transition: width 0.18s ease;
        }
        .therapist-nav-tab:hover::after {
          width: calc(100% - 24px);
        }
        .therapist-nav-tab.active::after {
          width: calc(100% - 24px);
        }
        .therapist-drawer {
          transform: translateX(100%);
        }
        .therapist-drawer.open {
          transform: translateX(0);
          box-shadow: -8px 0 24px rgba(0, 0, 0, 0.18);
        }
        @media (max-width: ${COLLAPSE_BREAKPOINT}px) {
          .therapist-nav-row {
            display: none !important;
          }
          .therapist-hamburger {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
