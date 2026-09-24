import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeroDemoForm } from '../app/landing/HeroDemoForm';
import { LeadModal } from '../app/landing/LeadModal';

describe('HeroDemoForm', () => {
  it('rejects a personal email and does not open the full form', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<HeroDemoForm onContinue={onContinue} />);
    await user.type(screen.getByPlaceholderText('su@empresa.com'), 'ana@gmail.com');
    await user.type(screen.getByPlaceholderText('+57 300 123 4567'), '300 123 4567');
    await user.click(screen.getByRole('button', { name: 'Solicitar una Demo' }));
    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.getByText('Introduce un correo electrónico corporativo válido.')).toBeInTheDocument();
  });

  it('hands the corporate email and WhatsApp to the full form once valid', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<HeroDemoForm onContinue={onContinue} />);
    await user.type(screen.getByPlaceholderText('su@empresa.com'), 'ana@acme.com');
    await user.type(screen.getByPlaceholderText('+57 300 123 4567'), '300 123 4567');
    await user.click(screen.getByRole('button', { name: 'Solicitar una Demo' }));
    expect(onContinue).toHaveBeenCalledWith('ana@acme.com', '+57 300 123 4567');
    expect(screen.getByText('Gracias, ahora cuéntenos un poco más sobre su negocio.')).toBeInTheDocument();
  });
});

describe('LeadModal', () => {
  it('shows the full form prefilled with the hero values and closes with Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<LeadModal correo="ana@acme.com" celular="+57 300 123 4567" onClose={onClose} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('nombre@empresa.com')).toHaveValue('ana@acme.com');
    expect(screen.getByPlaceholderText('+57 300 123 4567')).toHaveValue('+57 300 123 4567');
    expect(screen.getByText('Nombre de la empresa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Completar registro' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});

import { ChatWidget } from '../app/landing/ChatWidget';

describe('ChatWidget', () => {
  it('lists the contact options as WhatsApp links to the business number when open', () => {
    render(<ChatWidget open onToggle={vi.fn()} whatsappNumber="573214973677" />);
    const vendedor = screen.getByRole('link', { name: /Contactar a un vendedor/ });
    expect(vendedor.getAttribute('href')).toContain('https://wa.me/573214973677?text=');
    expect(screen.getByRole('link', { name: /Soy cliente y tengo una duda/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contactar a soporte/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Estoy interesado\/a en/ })).toBeInTheDocument();
  });

  it('shows only the floating button when closed and toggles on click', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ChatWidget open={false} onToggle={onToggle} whatsappNumber="573214973677" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Chatea con nosotros/ }));
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
