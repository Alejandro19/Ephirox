'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { loginRequest, saveSession } from '../../../lib/api-client';
import { getPendingAction, isTrainingConfirmAction } from '../../../lib/deep-link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await loginRequest(email, password);
    setSubmitting(false);
    if (!result.success || !result.token) {
      setError(result.error || 'Error al iniciar sesión.');
      return;
    }
    saveSession(result.token);

    if (result.role === 'cliente' && isTrainingConfirmAction(getPendingAction())) {
      router.push('/training');
      return;
    }

    if (result.role === 'cliente' && result.clientType !== 'lead_wellness' && !result.onboardingComplete) {
      router.push('/onboarding');
      return;
    }
    router.push('/admin/clients');
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Iniciar sesión</h1>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <label htmlFor="password">Contraseña</label>
      <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
