import 'dotenv/config';
import { createApp } from './app.js';
import { scheduleWearableSyncCron } from './jobs/wearable-sync-cron.js';
import { scheduleCognitiveLoadCron } from './jobs/cognitive-load-cron.js';

// Railway (y la mayoría de plataformas de deploy) inyectan su propio PORT en
// tiempo de ejecución — hay que escucharlo ahí, no en un puerto fijo. En
// desarrollo local, sin esa variable definida, cae al 3003 de siempre.
const PORT = Number(process.env.PORT) || 3003;
const app = createApp();
scheduleWearableSyncCron();
scheduleCognitiveLoadCron();

// Fuerza a Express a escuchar en la IP universal '0.0.0.0'
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API escuchando en el puerto ${PORT} (IP Universal)`);
});
