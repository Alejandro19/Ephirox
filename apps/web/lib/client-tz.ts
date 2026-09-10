// Mismo patrón ya usado en TrainingShell.tsx/training/page.tsx (duplicado
// ahí, no se toca) — acá centralizado para checkins-client.ts/cortisol-client.ts,
// los dos únicos call-sites nuevos que lo necesitan.
export function clientTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
