import cron from 'node-cron';
import { runRegulationCapacityNightlyJob } from '../services/regulation-capacity.service.js';

// Corre después del sweep de wearables (03:00) y del cron de Carga
// Cognitiva (03:30) — mismo criterio de horario, sin dependencia real entre
// ellos más allá de necesitar el wearable del día ya sincronizado.
export function scheduleRegulationCapacityCron(): void {
  cron.schedule('40 3 * * *', () => {
    runRegulationCapacityNightlyJob().catch((e) => console.error('regulation-capacity-cron falló', e));
  });
}
