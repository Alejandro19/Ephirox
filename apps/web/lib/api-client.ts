const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export type LoginResult = {
  success: boolean;
  token?: string;
  role?: 'admin' | 'cliente';
  user?: { id: string; name: string; email: string };
  onboardingComplete?: boolean;
  clientType?: string;
  error?: string;
};

export async function loginRequest(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export function saveSession(token: string): void {
  window.localStorage.setItem('latribu_token', token);
}

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('latribu_token');
}
