import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuotesPanel } from '../components/admin/QuotesPanel';
import * as quotesClient from '../lib/quotes-client';

const sampleQuotes = [
  { id: 'q1', quote: 'Estoy en mi mejor momento', author: 'La Tribu', active: true },
  { id: 'q2', quote: 'Sin autor', author: null, active: true },
];

describe('QuotesPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(quotesClient, 'listQuotes').mockResolvedValue(sampleQuotes);
  });

  it('renders the fetched quotes, with and without an author', async () => {
    render(<QuotesPanel />);
    await waitFor(() => expect(screen.getByText('Estoy en mi mejor momento')).toBeInTheDocument());
    expect(screen.getByText('— La Tribu')).toBeInTheDocument();
    expect(screen.getByText('Sin autor')).toBeInTheDocument();
  });

  it('creates a quote and refetches the list', async () => {
    const createSpy = vi.spyOn(quotesClient, 'createQuote').mockResolvedValue({
      id: 'q3',
      quote: 'Nueva quote',
      author: null,
      active: true,
    });
    render(<QuotesPanel />);
    await waitFor(() => expect(screen.getByText('Estoy en mi mejor momento')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Frase'), { target: { value: 'Nueva quote' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith('Nueva quote', null));
  });

  it('blocks creating a quote with empty text', async () => {
    const createSpy = vi.spyOn(quotesClient, 'createQuote');
    render(<QuotesPanel />);
    await waitFor(() => expect(screen.getByText('Estoy en mi mejor momento')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('deletes a quote', async () => {
    const deleteSpy = vi.spyOn(quotesClient, 'deleteQuote').mockResolvedValue(undefined);
    render(<QuotesPanel />);
    await waitFor(() => expect(screen.getByText('Estoy en mi mejor momento')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith('q1'));
  });

  it('edits a quote', async () => {
    const updateSpy = vi.spyOn(quotesClient, 'updateQuote').mockResolvedValue({ ...sampleQuotes[0], quote: 'Editada' });
    render(<QuotesPanel />);
    await waitFor(() => expect(screen.getByText('Estoy en mi mejor momento')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
    fireEvent.change(screen.getByLabelText('Frase'), { target: { value: 'Editada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith('q1', { quote: 'Editada', author: 'La Tribu' }));
  });

  it('does not render an active/inactive toggle button', async () => {
    render(<QuotesPanel />);
    await waitFor(() => expect(screen.getByText('Estoy en mi mejor momento')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Activa|Inactiva/ })).not.toBeInTheDocument();
  });
});
