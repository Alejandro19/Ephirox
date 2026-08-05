"use client";

import { useAuth } from "@/lib/auth-context";

// ============================================================
// STUB TEMPORAL — placeholder de inicio mientras se migra el
// App Shell / Dashboard real (Bloque 2 del plan de migración).
// El middleware ya garantiza que solo se llega aquí autenticado.
// ============================================================
export default function HomePage() {
  const { isLoading, user, role, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0D0D0D] text-white/60 text-sm">
        Cargando sesión…
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0D0D0D] text-white p-4">
      <div className="max-w-sm w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center space-y-4">
        <p className="text-xs uppercase tracking-widest text-amber-200/70">Sesión activa</p>
        <h1 className="text-2xl font-semibold">{user?.name ?? "Usuario"}</h1>
        <p className="text-sm text-zinc-400">{user?.email}</p>
        <p className="text-xs text-zinc-500">Rol: {role ?? "desconocido"}</p>
        <button
          type="button"
          onClick={() => { logout(); window.location.href = "/login"; }}
          className="mt-4 w-full h-11 rounded-xl bg-[#E4D4B7] text-zinc-900 font-semibold hover:bg-[#D9C8A8] transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
