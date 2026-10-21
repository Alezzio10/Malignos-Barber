import { app } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
import { iniciarEnvioRecordatorios } from './servicios/recordatorios.js';

// En Express 5 este callback también recibe el error si el servidor no pudo arrancar.
const servidor = app.listen(config.puerto, (error) => {
  if (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `No se pudo iniciar la API: el puerto ${config.puerto} ya está en uso. ` +
          'Cierra el otro proceso que lo ocupa o cambia PORT en .env.',
      );
    } else {
      console.error('No se pudo iniciar la API:', error);
    }
    process.exit(1);
  }
  console.log(`API de Malignos Barber escuchando en http://localhost:${config.puerto}`);
});
const detenerRecordatorios = iniciarEnvioRecordatorios();

function apagar() {
  detenerRecordatorios();
  servidor.close(() => pool.end().then(() => process.exit(0)));
}
process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
