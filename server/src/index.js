import { app } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
import { iniciarEnvioRecordatorios } from './servicios/recordatorios.js';

const servidor = app.listen(config.puerto, () => {
  console.log(`API de Malignos Barber escuchando en http://localhost:${config.puerto}`);
});
const detenerRecordatorios = iniciarEnvioRecordatorios();

function apagar() {
  detenerRecordatorios();
  servidor.close(() => pool.end().then(() => process.exit(0)));
}
process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
