import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadForm } from '../app/landing/LeadForm';
import * as enterpriseLeadsClient from '../lib/enterprise-leads-client';

vi.mock('../lib/enterprise-leads-client');

describe('LeadForm (formulario completo del Hero)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the fields in order: empresa, correo, WhatsApp, cohorte, sitio web', () => {
    render(<LeadForm initialCorreo="ana@acme.com" initialCelular="+57 300 123 4567" />);
    const labels = ['Nombre de la empresa', 'Email', 'WhatsApp', 'Cantidad de cohorte', 'Sitio web de la empresa'].map((l) => screen.getByText(l));
    labels.forEach((el, i) => {
      if (i > 0) expect(labels[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    expect(screen.getByPlaceholderText('nombre@empresa.com')).toHaveValue('ana@acme.com');
    expect(screen.getByPlaceholderText('+57 300 123 4567')).toHaveValue('+57 300 123 4567');
  });

  it('shows the exact spec error on blur for a personal email domain', async () => {
    const user = userEvent.setup();
    render(<LeadForm />);
    await user.type(screen.getByPlaceholderText('nombre@empresa.com'), 'ana@gmail.com');
    await user.tab();
    expect(await screen.findByText('Introduce un correo electrónico corporativo válido.')).toBeInTheDocument();
  });

  it('submits the lead using the company name as the contact name', async () => {
    const user = userEvent.setup();
    vi.mocked(enterpriseLeadsClient.createEnterpriseLead).mockResolvedValue();
    render(<LeadForm initialCorreo="ana@acme.com" initialCelular="+57 300 123 4567" />);

    await user.type(screen.getByPlaceholderText('Nombre de tu empresa'), 'Acme Corp');
    await user.selectOptions(screen.getByLabelText('Cantidad de cohorte'), '11 – 30');
    await user.type(screen.getByPlaceholderText('empresa.com'), 'acme.com');
    await user.click(screen.getByRole('button', { name: 'Completar registro' }));

    expect(enterpriseLeadsClient.createEnterpriseLead).toHaveBeenCalledWith({
      nombre: 'Acme Corp',
      correo: 'ana@acme.com',
      celular: '+57 300 123 4567',
      empresa: 'Acme Corp',
      tamano: '11 – 30',
      sitioWeb: 'acme.com',
    });
    expect(await screen.findByText(/Gracias por tu interés en Ephirox/)).toBeInTheDocument();
  });

  it('blocks submission when the email is personal or the company is empty', async () => {
    const user = userEvent.setup();
    render(<LeadForm initialCorreo="ana@gmail.com" />);
    await user.type(screen.getByPlaceholderText('Nombre de tu empresa'), 'Acme');
    await user.click(screen.getByRole('button', { name: 'Completar registro' }));
    expect(enterpriseLeadsClient.createEnterpriseLead).not.toHaveBeenCalled();
    expect(await screen.findByText('Introduce un correo electrónico corporativo válido.')).toBeInTheDocument();
  });
});
