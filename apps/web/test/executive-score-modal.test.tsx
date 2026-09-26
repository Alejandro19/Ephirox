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

describe('ExecutiveScoreModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens with the discreet intro (title, subtitle, duration) and no health/wellness language', () => {
    render(<ExecutiveScoreModal onClose={vi.fn()} />);
    expect(screen.getByText('Descubre si estás operando a tu máximo nivel de rendimiento ejecutivo.')).toBeInTheDocument();
    expect(screen.getByText(/3–5 minutos/)).toBeInTheDocument();
    expect(screen.queryByText(/wellness|burnout|health/i)).not.toBeInTheDocument();
  });

  it('walks 15 questions, then the 3 business questions, and shows a high score with the Optimización segment', async () => {
    const user = userEvent.setup();
    render(<ExecutiveScoreModal onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Comenzar evaluación' }));
    expect(screen.getByText(/1 de 15/)).toBeInTheDocument();
    await answerAll(user, 'Siempre');

    expect(screen.getByText('¿Cuántas personas dependen directamente de tus decisiones?')).toBeInTheDocument();
    const verResultado = screen.getByRole('button', { name: 'Ver mi resultado' });
    expect(verResultado).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '50 – 200' }));
    await user.click(screen.getAllByRole('button', { name: 'Sí' })[0]);
    await user.click(screen.getAllByRole('button', { name: 'No' })[1]);
    await user.click(verResultado);

    expect(screen.getByLabelText('100 de 100')).toBeInTheDocument();
    expect(screen.getByText(/Optimización\./)).toBeInTheDocument();
    expect(screen.getByText('Fortaleza principal')).toBeInTheDocument();
    expect(screen.getByText('Principal riesgo')).toBeInTheDocument();
    expect(screen.getByText('Tu rendimiento actual tiene oportunidades de mejora.')).toBeInTheDocument();
    expect(screen.queryByText(/compra ahora/i)).not.toBeInTheDocument();
  });

  it('sends the answers with the lead when the executive review is requested', async () => {
    const user = userEvent.setup();
    vi.mocked(enterpriseLeadsClient.createEnterpriseLead).mockResolvedValue();
    render(<ExecutiveScoreModal onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Comenzar evaluación' }));
    await answerAll(user, 'A veces'); // 2 en todo → 50/100 → riesgo elevado
    await user.click(screen.getByRole('button', { name: 'Menos de 10' }));
    await user.click(screen.getAllByRole('button', { name: 'No' })[0]);
    await user.click(screen.getAllByRole('button', { name: 'Sí' })[1]); // evaluar equipo
    await user.click(screen.getByRole('button', { name: 'Ver mi resultado' }));
    expect(screen.getByLabelText('50 de 100')).toBeInTheDocument();
    expect(screen.getByText(/Riesgo elevado\./)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Solicitar revisión ejecutiva' }));
    await user.type(screen.getByPlaceholderText('Tu nombre'), 'Ana Ríos');
    await user.type(screen.getByPlaceholderText('Nombre de tu empresa'), 'Acme');
    await user.type(screen.getByPlaceholderText('nombre@empresa.com'), 'ana@acme.com');
    await user.type(screen.getByPlaceholderText('+57 300 123 4567'), '300 123 4567');
    await user.click(screen.getByRole('button', { name: 'Solicitar revisión ejecutiva' }));

    expect(enterpriseLeadsClient.createEnterpriseLead).toHaveBeenCalledWith(
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
