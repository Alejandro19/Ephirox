import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadForm } from '../app/landing/LeadForm';
import * as enterpriseLeadsClient from '../lib/enterprise-leads-client';

vi.mock('../lib/enterprise-leads-client');

describe('LeadForm (punto 12.1 — revelado progresivo + correo corporativo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with only Paso 1 visible (Correo, Nombre, Apellido) — no qualification fields yet', () => {
    render(<LeadForm />);
    expect(screen.getByText('Correo de trabajo')).toBeInTheDocument();
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Apellido')).toBeInTheDocument();
    expect(screen.queryByText('Empresa')).not.toBeInTheDocument();
    expect(screen.queryByText('Cargo')).not.toBeInTheDocument();
    expect(screen.queryByText('WhatsApp')).not.toBeInTheDocument();
  });

  it('reveals Paso 2 only once both Nombre and Apellido have content, not with just one of them', async () => {
    const user = userEvent.setup();
    render(<LeadForm />);

    await user.type(screen.getByPlaceholderText('Tu nombre'), 'Ana');
    expect(screen.queryByText('Empresa')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Tu apellido'), 'Ríos');
    expect(screen.getByText('Empresa')).toBeInTheDocument();
    expect(screen.getByText('Cargo')).toBeInTheDocument();
    expect(screen.getByText('Tamaño de cohorte')).toBeInTheDocument();
    expect(screen.getByText('Sede / país')).toBeInTheDocument();
    expect(screen.getByText('Sitio web de la empresa')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
  });

  it('prefills WhatsApp with +57 and País with Colombia once Paso 2 is revealed', async () => {
    const user = userEvent.setup();
    render(<LeadForm />);
    await user.type(screen.getByPlaceholderText('Tu nombre'), 'Ana');
    await user.type(screen.getByPlaceholderText('Tu apellido'), 'Ríos');

    expect(screen.getByPlaceholderText('+57 300 123 4567')).toHaveValue('+57 ');
    expect(screen.getByLabelText('Sede / país')).toHaveValue('Colombia');
  });

  it('offers the full country list, not just a handful of options', async () => {
    const user = userEvent.setup();
    render(<LeadForm />);
    await user.type(screen.getByPlaceholderText('Tu nombre'), 'Ana');
    await user.type(screen.getByPlaceholderText('Tu apellido'), 'Ríos');

    const paisSelect = screen.getByLabelText('Sede / país') as HTMLSelectElement;
    expect(paisSelect.options.length).toBeGreaterThan(50);
    expect(screen.getByRole('option', { name: 'Alemania' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Argentina' })).toBeInTheDocument();
  });

  it('swaps the WhatsApp dial code when the país changes, keeping any digits already typed', async () => {
    const user = userEvent.setup();
    render(<LeadForm />);
    await user.type(screen.getByPlaceholderText('Tu nombre'), 'Ana');
    await user.type(screen.getByPlaceholderText('Tu apellido'), 'Ríos');

    const whatsapp = screen.getByPlaceholderText('+57 300 123 4567');
    expect(whatsapp).toHaveValue('+57 ');

    await user.type(whatsapp, '300 123 4567');
    await user.selectOptions(screen.getByLabelText('Sede / país'), 'México');
    expect(whatsapp).toHaveValue('+52 300 123 4567');

    // Cambiar de nuevo no debe duplicar ni perder el indicativo previo.
    await user.selectOptions(screen.getByLabelText('Sede / país'), 'Argentina');
    expect(whatsapp).toHaveValue('+54 300 123 4567');
  });

  it('does not show a correo error while typing, only on blur', async () => {
    const user = userEvent.setup();
    render(<LeadForm />);
    const correoInput = screen.getByPlaceholderText('nombre@empresa.com');
    await user.type(correoInput, 'algo@gmail');
    expect(screen.queryByText('Introduce un correo electrónico corporativo válido.')).not.toBeInTheDocument();
  });

  it('shows the exact spec error message on blur for a personal email domain', async () => {
    const user = userEvent.setup();
    render(<LeadForm />);
    const correoInput = screen.getByPlaceholderText('nombre@empresa.com');
    await user.type(correoInput, 'ana@gmail.com');
    await user.tab();
    expect(await screen.findByText('Introduce un correo electrónico corporativo válido.')).toBeInTheDocument();
  });

  it('clears the correo error once the person starts correcting it', async () => {
    const user = userEvent.setup();
    render(<LeadForm />);
    const correoInput = screen.getByPlaceholderText('nombre@empresa.com');
    await user.type(correoInput, 'ana@gmail.com');
    await user.tab();
    await screen.findByText('Introduce un correo electrónico corporativo válido.');

    await user.type(correoInput, '.mx');
    expect(screen.queryByText('Introduce un correo electrónico corporativo válido.')).not.toBeInTheDocument();
  });

  it('submits the full lead with concatenated nombre + apellido and the Paso 2 fields', async () => {
    const user = userEvent.setup();
    vi.mocked(enterpriseLeadsClient.createEnterpriseLead).mockResolvedValue();
    render(<LeadForm />);

    await user.type(screen.getByPlaceholderText('nombre@empresa.com'), 'ana@acme.com');
    await user.type(screen.getByPlaceholderText('Tu nombre'), 'Ana');
    await user.type(screen.getByPlaceholderText('Tu apellido'), 'Ríos');
    await user.type(screen.getByPlaceholderText('Nombre de tu empresa'), 'Acme Corp');
    await user.selectOptions(screen.getByLabelText('Cargo'), 'CEO');
    await user.selectOptions(screen.getByLabelText('Tamaño de cohorte'), '11 – 30');
    await user.type(screen.getByPlaceholderText('empresa.com'), 'acme.com');
    await user.type(screen.getByPlaceholderText('+57 300 123 4567'), '300 123 4567');

    await user.click(screen.getByRole('button', { name: 'Solicitar una demo' }));

    expect(enterpriseLeadsClient.createEnterpriseLead).toHaveBeenCalledWith({
      nombre: 'Ana Ríos',
      correo: 'ana@acme.com',
      celular: '+57 300 123 4567',
      empresa: 'Acme Corp',
      rol: 'CEO',
      tamano: '11 – 30',
      pais: 'Colombia',
      sitioWeb: 'acme.com',
    });
    expect(await screen.findByText(/gracias por tu interés en Ephirox/)).toBeInTheDocument();
  });

  it('blocks submission (never calls createEnterpriseLead) when the email is personal, even if Paso 2 is fully filled', async () => {
    const user = userEvent.setup();
    render(<LeadForm />);
    await user.type(screen.getByPlaceholderText('nombre@empresa.com'), 'ana@gmail.com');
    await user.type(screen.getByPlaceholderText('Tu nombre'), 'Ana');
    await user.type(screen.getByPlaceholderText('Tu apellido'), 'Ríos');
    await user.type(screen.getByPlaceholderText('+57 300 123 4567'), '300 123 4567');

    await user.click(screen.getByRole('button', { name: 'Solicitar una demo' }));

    expect(enterpriseLeadsClient.createEnterpriseLead).not.toHaveBeenCalled();
    expect(await screen.findByText('Introduce un correo electrónico corporativo válido.')).toBeInTheDocument();
  });
});
