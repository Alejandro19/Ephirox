import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithSWR as render } from './swr-test-utils';
import PanelMembresias from '../components/account/PanelMembresias';
import * as clientsClient from '../lib/clients-client';
import * as membershipClient from '../lib/membership-client';

vi.mock('../lib/clients-client');
vi.mock('../lib/membership-client');

const confirmPaymentMock = vi.fn();
vi.mock('@stripe/stripe-js', () => ({ loadStripe: () => Promise.resolve({}) }));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ confirmPayment: confirmPaymentMock }),
  useElements: () => ({}),
}));

const CLIENT_ID = 'client-1';

const PRICES = [
  { id: 'p1', clientType: 'coaching_1_1', durationMonths: 1, amountCents: 9900, currency: 'usd' },
  { id: 'p2', clientType: 'coaching_1_1', durationMonths: 3, amountCents: 26900, currency: 'usd' },
  { id: 'p3', clientType: 'coaching_online', durationMonths: 1, amountCents: 4900, currency: 'usd' },
  { id: 'p4', clientType: 'coaching_online', durationMonths: 3, amountCents: 12900, currency: 'usd' },
  { id: 'p5', clientType: 'mentoring', durationMonths: 3, amountCents: 400000, currency: 'usd' },
];

function baseClient(overrides: Partial<clientsClient.ClientDetail> = {}): clientsClient.ClientDetail {
  return {
    id: CLIENT_ID, name: 'Ana', email: 'ana@example.com', plan: 'Miembro',
    status: 'active', clientType: 'coaching_online', plan_end_date: '2099-01-01',
    ...overrides,
  } as clientsClient.ClientDetail;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(membershipClient.getMembershipPrices).mockResolvedValue(PRICES);
});

describe('PanelMembresias', () => {
  it('shows "Vigente hasta" (no payment form) only for the tier the client already has active and unexpired', async () => {
    vi.mocked(clientsClient.fetchClient).mockResolvedValue(baseClient({ clientType: 'coaching_online', plan_end_date: '2099-01-01' }));
    render(<PanelMembresias clientId={CLIENT_ID} />);

    expect(await screen.findByText(/Vigente hasta/)).toBeInTheDocument();
    // Presencial y Elite no coinciden con el tier activo → deben mostrar "Pagar".
    const payButtons = screen.getAllByText('Pagar');
    expect(payButtons).toHaveLength(2);
  });

  it('shows the payment form for a tier whose plan already expired, even if it matches the client type', async () => {
    vi.mocked(clientsClient.fetchClient).mockResolvedValue(baseClient({ clientType: 'coaching_online', plan_end_date: '2020-01-01' }));
    render(<PanelMembresias clientId={CLIENT_ID} />);

    await waitFor(() => expect(screen.queryByText(/Vigente hasta/)).not.toBeInTheDocument());
    expect(screen.getAllByText('Pagar')).toHaveLength(3);
  });

  it('shows a fixed "3 meses" label with no duration selector for Elite', async () => {
    vi.mocked(clientsClient.fetchClient).mockResolvedValue(baseClient({ clientType: 'lead_wellness', plan_end_date: null }));
    render(<PanelMembresias clientId={CLIENT_ID} />);

    await screen.findAllByText('Pagar');
    const eliteHeading = screen.getByText('Club Elite');
    const eliteCard = eliteHeading.closest('div')!;
    // Sin selector de duración en Elite: "3 meses" aparece como texto fijo,
    // nunca como botón (a diferencia de Presencial/Online, que sí ofrecen
    // "3 meses" como una opción clickeable dentro de sus propias cards).
    expect(within(eliteCard).getByText('3 meses')).toBeInTheDocument();
    expect(within(eliteCard).queryByRole('button', { name: '3 meses' })).not.toBeInTheDocument();
  });

  it('does not mark the plan as active until the backend confirms the payment (never trusts confirmPayment alone)', async () => {
    vi.mocked(clientsClient.fetchClient).mockResolvedValue(baseClient({ clientType: 'lead_wellness', plan_end_date: null }));
    vi.mocked(membershipClient.createMembershipCheckout).mockResolvedValue({ clientSecret: 'secret_x', membershipPaymentId: 'pay_1' });
    confirmPaymentMock.mockResolvedValue({ error: undefined });

    let resolveStatus: (value: { status: 'pending' | 'succeeded' | 'failed' }) => void;
    const pendingStatusPromise = new Promise<{ status: 'pending' | 'succeeded' | 'failed' }>((resolve) => {
      resolveStatus = resolve;
    });
    vi.mocked(membershipClient.getMembershipPaymentStatus).mockReturnValue(pendingStatusPromise);

    render(<PanelMembresias clientId={CLIENT_ID} />);
    await screen.findAllByText('Pagar');

    const payButtons = screen.getAllByText('Pagar');
    fireEvent.click(payButtons[0]); // Presencial (primer card)

    const paymentElement = await screen.findByTestId('payment-element');
    const form = paymentElement.closest('form')!;
    fireEvent.click(within(form).getByRole('button', { name: 'Pagar' }));

    await waitFor(() => expect(confirmPaymentMock).toHaveBeenCalled());
    expect(await screen.findByText('Confirmando tu pago…')).toBeInTheDocument();
    expect(screen.queryByText('Pago confirmado — tu membresía ya está activa.')).not.toBeInTheDocument();

    resolveStatus!({ status: 'succeeded' });
    expect(await screen.findByText('Pago confirmado — tu membresía ya está activa.')).toBeInTheDocument();
  });
});
