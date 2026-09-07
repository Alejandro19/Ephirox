import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

describe('middleware', () => {
  it('redirects to /login preserving the deep-link query string when there is no token', () => {
    const req = new NextRequest('http://localhost:3000/training?m=entrenamiento&a=confirmar');
    const res = middleware(req);
    const location = res.headers.get('location');
    expect(location).not.toBeNull();
    const url = new URL(location as string);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('from')).toBe('/training?m=entrenamiento&a=confirmar');
  });

  it('redirects to /login with just the pathname in "from" when there is no query string', () => {
    const req = new NextRequest('http://localhost:3000/training');
    const res = middleware(req);
    const url = new URL(res.headers.get('location') as string);
    expect(url.searchParams.get('from')).toBe('/training');
  });

  it('lets the request through (no redirect) when a session token cookie is present', () => {
    const req = new NextRequest('http://localhost:3000/training?m=entrenamiento&a=confirmar');
    req.cookies.set('latribu_token', 'fake-token');
    const res = middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('never redirects public paths like /login itself', () => {
    const req = new NextRequest('http://localhost:3000/login?m=entrenamiento&a=confirmar');
    const res = middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  // La decisión de host lee el header `Host` crudo, no `request.nextUrl`/
  // `request.url` (en `next dev` esos dos siempre reflejan el host real del
  // servidor, no el que mandó el cliente — confirmado corriendo el server
  // local con un Host spoofeado por curl). `new NextRequest(url)` no
  // sintetiza un header Host solo, así que estos tests lo pasan a mano, como
  // haría cualquier request HTTP real.
  describe('dominio de marketing (ephirox.com)', () => {
    it('reescribe "/" a /landing sin redirigir (la URL visible sigue siendo "/")', () => {
      const req = new NextRequest('https://ephirox.com/', { headers: { host: 'ephirox.com' } });
      const res = middleware(req);
      expect(res.headers.get('location')).toBeNull();
      expect(res.headers.get('x-middleware-rewrite')).toBe('https://ephirox.com/landing');
    });

    it('reescribe "/" a /landing también en www.ephirox.com', () => {
      const req = new NextRequest('https://www.ephirox.com/', { headers: { host: 'www.ephirox.com' } });
      const res = middleware(req);
      expect(res.headers.get('x-middleware-rewrite')).toBe('https://www.ephirox.com/landing');
    });

    it('redirige cualquier otra ruta (ej. el NFC) al dominio real del producto, preservando path y query', () => {
      const req = new NextRequest('https://ephirox.com/training?m=entrenamiento&a=confirmar', { headers: { host: 'ephirox.com' } });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('https://app.ephirox.com/training?m=entrenamiento&a=confirmar');
    });

    it('deja pasar assets estáticos sin redirigir ni reescribir', () => {
      const req = new NextRequest('https://ephirox.com/favicon.svg', { headers: { host: 'ephirox.com' } });
      const res = middleware(req);
      expect(res.headers.get('location')).toBeNull();
      expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    });
  });

  it('/landing es pública también en app.ephirox.com/localhost (preview local, visita directa)', () => {
    const req = new NextRequest('http://localhost:3000/landing');
    const res = middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('no-regresión: app.ephirox.com sigue el auth-gate normal (redirige a /login sin token)', () => {
    const req = new NextRequest('https://app.ephirox.com/training?m=entrenamiento&a=confirmar', { headers: { host: 'app.ephirox.com' } });
    const res = middleware(req);
    const url = new URL(res.headers.get('location') as string);
    expect(url.hostname).toBe('app.ephirox.com');
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('from')).toBe('/training?m=entrenamiento&a=confirmar');
  });
});
