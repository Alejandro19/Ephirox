import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExecutiveScoreModal } from '../app/landing/ExecutiveScoreModal';
import * as enterpriseLeadsClient from '../lib/enterprise-leads-client';

vi.mock('../lib/enterprise-leads-client');

async function answerAll(user: ReturnType<typeof userEvent.setup>, label: string) {
  for (let i = 0; i < 15; i++) {
    await user.click(screen.getByRole('button', { name: label }));
  }
}

async function submitContactAndVerify(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Ver mi resultado' }));
  await user.type(await screen.findByPlaceholderText('000000'), '123456');
  await user.click(screen.getByRole('button', { name: 'Verificar y continuar' }));
}

async function fillContact(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('Tu nombre'), 'Ana Ríos');
  await user.type(screen.getByPlaceholderText('Nombre de tu empresa'), 'Acme');
  await user.type(screen.getByPlaceholderText('nombre@empresa.com'), 'ana@acme.com');
  await user.type(screen.getByPlaceholderText('+57 300 123 4567'), '300 123 4567');
}

describe('ExecutiveScoreModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens with the discreet intro (title, subtitle, duration) and no health/wellness language', () => {
    render(<ExecutiveScoreModal onClose={vi.fn()} />);
    expect(screen.getByText('Descubre si estás operando a tu máximo nivel de rendimiento ejecutivo.')).toBeInTheDocument();
    expect(screen.getByText(/3–5 minutos/)).toBeInTheDocument();
    expect(screen.queryByText(/wellness|burnout|health/i)).not.toBeInTheDocument();
  });

  it('asks for contact BEFORE showing the result, then shows the score, segment and executive language', async () => {
    const user = userEvent.setup();
    vi.mocked(enterpriseLeadsClient.requestLeadVerification).mockResolvedValue();
    vi.mocked(enterpriseLeadsClient.confirmLeadVerification).mockResolvedValue('tok');
    vi.mocked(enterpriseLeadsClient.createEnterpriseLead).mockResolvedValue();
    render(<ExecutiveScoreModal onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Comenzar evaluación' }));
    expect(screen.getByText(/1 de 15/)).toBeInTheDocument();
    await answerAll(user, 'Siempre');

    expect(screen.getByText('¿Cuántas personas dependen directamente de tus decisiones?')).toBeInTheDocument();
    const continuar = screen.getByRole('button', { name: 'Continuar' });
    expect(continuar).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '50 – 200' }));
    await user.click(screen.getAllByRole('button', { name: 'Sí' })[0]);
    await user.click(screen.getAllByRole('button', { name: 'No' })[1]);
    await user.click(continuar);

    // El resultado todavía NO se ve: primero el contacto.
    expect(screen.queryByLabelText('100 de 100')).not.toBeInTheDocument();
    expect(screen.getByText('Tu resultado está listo')).toBeInTheDocument();
    await fillContact(user);
    await submitContactAndVerify(user);

    expect(await screen.findByLabelText('100 de 100')).toBeInTheDocument();
    expect(screen.getByText(/Optimización\./)).toBeInTheDocument();
    expect(screen.getByText('Fortaleza principal')).toBeInTheDocument();
    expect(screen.getByText('Principal riesgo')).toBeInTheDocument();
    expect(screen.getByText('Tu rendimiento actual tiene oportunidades de mejora.')).toBeInTheDocument();
    expect(screen.queryByText(/compra ahora/i)).not.toBeInTheDocument();
    const cta = screen.getByRole('link', { name: 'Agendar sesión estratégica' });
    expect(cta.getAttribute('href')).toContain('https://wa.me/573214973677?text=');
  });

  it('saves the lead with the answers before revealing the result, and does not reveal it if saving fails', async () => {
    const user = userEvent.setup();
    vi.mocked(enterpriseLeadsClient.requestLeadVerification).mockResolvedValue();
    vi.mocked(enterpriseLeadsClient.confirmLeadVerification).mockResolvedValue('tok');
    vi.mocked(enterpriseLeadsClient.createEnterpriseLead).mockRejectedValueOnce(new Error('Sin conexión'));
    render(<ExecutiveScoreModal onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Comenzar evaluación' }));
    await answerAll(user, 'A veces'); // 2 en todo → 50/100 → riesgo elevado
    await user.click(screen.getByRole('button', { name: 'Menos de 10' }));
    await user.click(screen.getAllByRole('button', { name: 'No' })[0]);
    await user.click(screen.getAllByRole('button', { name: 'Sí' })[1]); // evaluar equipo
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await fillContact(user);
    await submitContactAndVerify(user);

    // Primer intento falla: sigue en el formulario, sin resultado.
    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
    expect(screen.queryByLabelText('50 de 100')).not.toBeInTheDocument();

    vi.mocked(enterpriseLeadsClient.createEnterpriseLead).mockResolvedValue();
    await user.click(screen.getByRole('button', { name: 'Verificar y continuar' }));
    expect(await screen.findByLabelText('50 de 100')).toBeInTheDocument();
    expect(screen.getByText(/Riesgo elevado\./)).toBeInTheDocument();
    expect(enterpriseLeadsClient.createEnterpriseLead).toHaveBeenLastCalledWith(
      expect.objectContaining({
        nombre: 'Ana Ríos',
        empresa: 'Acme',
        correo: 'ana@acme.com',
        evaluacion: { respuestas: Array(15).fill(2), personas: 'Menos de 10', equipoDirectivo: false, evaluarEquipo: true },
      })
    );
  });

  it('lets the person go back to the previous question', async () => {
    const user = userEvent.setup();
    render(<ExecutiveScoreModal onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Comenzar evaluación' }));
    await user.click(screen.getByRole('button', { name: 'Casi siempre' }));
    expect(screen.getByText(/2 de 15/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '← Atrás' }));
    expect(screen.getByText(/1 de 15/)).toBeInTheDocument();
  });
});
