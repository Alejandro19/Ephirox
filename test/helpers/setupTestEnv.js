const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const testEnvPath = path.join(__dirname, '../../.env.test');
const prodEnvPath = path.join(__dirname, '../../.env');

if (!fs.existsSync(testEnvPath)) {
  throw new Error(
    'Falta .env.test — copia .env.test.example a .env.test y complétalo con ' +
    'un proyecto de Supabase DEDICADO A PRUEBAS antes de correr los tests.'
  );
}

const testEnv = dotenv.parse(fs.readFileSync(testEnvPath));

if (!testEnv.SUPABASE_URL || !testEnv.SUPABASE_SERVICE_ROLE_KEY || !testEnv.JWT_SECRET) {
  throw new Error(
    '.env.test debe definir SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y JWT_SECRET.'
  );
}

let prodEnv = {};
if (fs.existsSync(prodEnvPath)) {
  prodEnv = dotenv.parse(fs.readFileSync(prodEnvPath));
}

if (prodEnv.SUPABASE_URL && testEnv.SUPABASE_URL === prodEnv.SUPABASE_URL) {
  throw new Error(
    'SUPABASE_URL en .env.test es igual a la de .env (producción). Los tests ' +
    'NUNCA deben correr contra la base de datos real — crea un proyecto ' +
    'Supabase separado dedicado solo a pruebas.'
  );
}

for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] = value;
}
