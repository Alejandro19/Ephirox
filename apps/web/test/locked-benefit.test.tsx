import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LockedBenefit from '../components/ui/LockedBenefit';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LockedBenefit', () => {
  it('variant="apply" shows the membership-request copy and sends the CTA to /login?view=premium', async () => {
    const user = userEvent.setup();
    // @ts-expect-error jsdom doesn't implement navigation
    delete window.location;
    // @ts-expect-error partial Location stub is enough for this assertion
    window.location = { href: '' };
    render(<LockedBenefit variant="apply" benefit="reservar retiros" />);

    expect(screen.getByText('Beneficio exclusivo del Club')).toBeInTheDocument();
    expect(screen.getByText('Solicita tu membresía para desbloquear reservar retiros y más.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Solicita tu membresía' }));
    expect(window.location.href).toBe('/login?view=premium');
  });

  it('variant="upgrade" with a requiredLevel names the specific tier', () => {
    render(<LockedBenefit variant="upgrade" benefit="el protocolo de sueño personalizado" requiredLevel="Club Elite" />);
    expect(screen.getByText('Beneficio exclusivo de Club Elite')).toBeInTheDocument();
    expect(screen.getByText('Sube de categoría en tu membresía para desbloquear el protocolo de sueño personalizado y más.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sube de categoría' })).toBeInTheDocument();
  });

  it('variant="upgrade" without a requiredLevel falls back to generic copy', () => {
    render(<LockedBenefit variant="upgrade" benefit="reservar retiros" />);
    expect(screen.getByText('Beneficio exclusivo de una membresía superior')).toBeInTheDocument();
  });

  it('variant="upgrade" opens the coach WhatsApp link on CTA click', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<LockedBenefit variant="upgrade" benefit="reservar retiros" />);
    await user.click(screen.getByRole('button', { name: 'Sube de categoría' }));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank');
  });
});
