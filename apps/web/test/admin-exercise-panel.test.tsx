import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminExercisePanel } from '../components/training/AdminExercisePanel';
import * as trainingClient from '../lib/training-client';
import * as quotesClient from '../lib/quotes-client';

vi.mock('../lib/training-client');
vi.mock('../lib/quotes-client');

describe('AdminExercisePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(trainingClient.getClientTrainingDays).mockResolvedValue(2);
    vi.mocked(trainingClient.listExercises).mockResolvedValue([
      {
        id: 'e1',
        clientId: 'c1',
        title: 'Sentadilla',
        dayNumber: 1,
        category: 'strength',
        series: 4,
        reps: '10',
        duration: null,
        restTime: '01:00',
        youtubeUrl: null,
        description: null,
        recommendations: null,
        sortOrder: 0,
      },
      {
        id: 'e2',
        clientId: 'c1',
        title: 'Peso muerto',
        dayNumber: 1,
        category: 'strength',
        series: 3,
        reps: '8',
        duration: null,
        restTime: '01:30',
        youtubeUrl: null,
        description: null,
        recommendations: null,
        sortOrder: 1,
      },
    ]);
    vi.mocked(quotesClient.listQuotes).mockResolvedValue([
      { id: 'q1', quote: 'Frase corta', author: null, active: true },
      {
        id: 'q2',
        quote: 'Una frase muy larga que definitivamente supera los sesenta caracteres de límite visual',
        author: null,
        active: true,
      },
    ]);
    vi.mocked(quotesClient.getClientAssignedQuoteId).mockResolvedValue(null);
  });

  it('lists exercises grouped by day and disables reorder at the extremes', async () => {
    render(<AdminExercisePanel clientId="c1" />);
    await screen.findByText('Sentadilla');
    const upButtons = screen.getAllByRole('button', { name: 'Subir' });
    const downButtons = screen.getAllByRole('button', { name: 'Bajar' });
    expect(upButtons[0]).toBeDisabled();
    expect(downButtons[downButtons.length - 1]).toBeDisabled();
  });

  it('creates an exercise and refetches the list', async () => {
    vi.mocked(trainingClient.createExercise).mockResolvedValue({
      id: 'e3',
      clientId: 'c1',
      title: 'Zancadas',
      dayNumber: 1,
      category: 'strength',
      series: 3,
      reps: '12',
      duration: null,
      restTime: '01:00',
      youtubeUrl: null,
      description: null,
      recommendations: null,
      sortOrder: 2,
    });
    render(<AdminExercisePanel clientId="c1" />);
    await screen.findByText('Sentadilla');
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Zancadas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear ejercicio' }));
    await waitFor(() => expect(trainingClient.createExercise).toHaveBeenCalled());
    expect(trainingClient.listExercises).toHaveBeenCalledTimes(2);
  });

  it('deletes an exercise and refetches the list', async () => {
    vi.mocked(trainingClient.deleteExercise).mockResolvedValue(undefined);
    render(<AdminExercisePanel clientId="c1" />);
    await screen.findByText('Sentadilla');
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
    await waitFor(() => expect(trainingClient.deleteExercise).toHaveBeenCalledWith('c1', 'e1'));
    expect(trainingClient.listExercises).toHaveBeenCalledTimes(2);
  });

  it('refetches (instead of merging the response in place) after reordering, so the new order actually renders', async () => {
    vi.mocked(trainingClient.reorderExercise).mockResolvedValue([
      {
        id: 'e2',
        clientId: 'c1',
        title: 'Peso muerto',
        dayNumber: 1,
        category: 'strength',
        series: 3,
        reps: '8',
        duration: null,
        restTime: '01:30',
        youtubeUrl: null,
        description: null,
        recommendations: null,
        sortOrder: 0,
      },
      {
        id: 'e1',
        clientId: 'c1',
        title: 'Sentadilla',
        dayNumber: 1,
        category: 'strength',
        series: 4,
        reps: '10',
        duration: null,
        restTime: '01:00',
        youtubeUrl: null,
        description: null,
        recommendations: null,
        sortOrder: 1,
      },
    ]);
    render(<AdminExercisePanel clientId="c1" />);
    await screen.findByText('Sentadilla');
    fireEvent.click(screen.getAllByRole('button', { name: 'Bajar' })[0]);
    await waitFor(() => expect(trainingClient.reorderExercise).toHaveBeenCalledWith('c1', 'e1', 'down'));
    // handleReorder must call refetch() rather than manually merging sortOrder
    // fields into place-holding array positions (which never changes render
    // order until a reload).
    await waitFor(() => expect(trainingClient.listExercises).toHaveBeenCalledTimes(2));
  });

  it('still renders a day group beyond the configured trainingDays if an exercise is assigned to it', async () => {
    vi.mocked(trainingClient.getClientTrainingDays).mockResolvedValue(1);
    vi.mocked(trainingClient.listExercises).mockResolvedValue([
      {
        id: 'e3',
        clientId: 'c1',
        title: 'Ejercicio huérfano',
        dayNumber: 3,
        category: 'strength',
        series: 3,
        reps: '10',
        duration: null,
        restTime: '01:00',
        youtubeUrl: null,
        description: null,
        recommendations: null,
        sortOrder: 0,
      },
    ]);
    render(<AdminExercisePanel clientId="c1" />);
    await screen.findByText('Ejercicio huérfano');
    expect(screen.getByRole('heading', { name: 'Día 3' })).toBeInTheDocument();
  });
});

describe('AdminExercisePanel — Frase asignada', () => {
  it('renders the assigned-quote select with a random option and truncated long options', async () => {
    render(<AdminExercisePanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByLabelText('Frase asignada a este cliente')).toBeInTheDocument());
    expect(screen.getByRole('option', { name: 'Aleatoria del pool general' })).toBeInTheDocument();
    expect(screen.getByText(/Una frase muy larga.*…/)).toBeInTheDocument();
  });

  it("pre-selects the client's currently assigned quote", async () => {
    vi.mocked(quotesClient.getClientAssignedQuoteId).mockResolvedValue('q1');
    render(<AdminExercisePanel clientId="client-1" />);
    const select = (await screen.findByLabelText('Frase asignada a este cliente')) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('q1'));
  });

  it('calls assignQuote with the selected quote id', async () => {
    vi.mocked(quotesClient.assignQuote).mockResolvedValue(undefined);
    render(<AdminExercisePanel clientId="client-1" />);
    const select = await screen.findByLabelText('Frase asignada a este cliente');
    fireEvent.change(select, { target: { value: 'q1' } });
    await waitFor(() => expect(quotesClient.assignQuote).toHaveBeenCalledWith('client-1', 'q1'));
  });

  it('calls assignQuote with null when "Aleatoria del pool general" is selected', async () => {
    vi.mocked(quotesClient.getClientAssignedQuoteId).mockResolvedValue('q1');
    vi.mocked(quotesClient.assignQuote).mockResolvedValue(undefined);
    render(<AdminExercisePanel clientId="client-1" />);
    const select = await screen.findByLabelText('Frase asignada a este cliente');
    await waitFor(() => expect((select as HTMLSelectElement).value).toBe('q1'));
    fireEvent.change(select, { target: { value: '' } });
    await waitFor(() => expect(quotesClient.assignQuote).toHaveBeenCalledWith('client-1', null));
  });
});
