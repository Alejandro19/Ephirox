// Puerto de parseTimeToSeconds (index.html:2520-2526) — acepta "mm:ss" o un
// número suelto; cualquier valor vacío/no parseable/≤0 cae silenciosamente a
// 30s, igual que el legacy (nunca se valida en el formulario admin).
export function parseTimeToSeconds(value: string | null): number {
  if (!value) return 30;
  const trimmed = value.trim();
  const mmss = trimmed.match(/^(\d+):(\d+)$/);
  let seconds: number;
  if (mmss) {
    seconds = Number(mmss[1]) * 60 + Number(mmss[2]);
  } else {
    seconds = Number(trimmed.replace(/[^0-9.-]/g, ''));
  }
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 30;
}
