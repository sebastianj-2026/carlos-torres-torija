/**
 * OFICINA TS — Generador de hashes bcrypt
 *
 * Uso:
 *   node scripts/generate-passwords.js
 *
 * Requisito: tener bcrypt instalado en el backend
 *   cd backend && npm install (ya incluye bcrypt)
 *
 * Luego copiar los hashes generados al script schema.sql
 * reemplazando cada 'HASH_AQUI' con el hash correspondiente.
 */

const bcrypt = require('../backend/node_modules/bcrypt');

const SALT_ROUNDS = 12;

// Usuarios y contraseñas del sistema
const usuarios = [
  { nombre: 'Sebastian',  correo: 'sebastianjat49@gmail.com',  password: 'Bowie2026$8'  },
  { nombre: 'Abril',      correo: 'abriltorres441@gmail.com',  password: 'Abril1969122' },
  { nombre: 'Lorena',     correo: 'torres_simoni@hotmail.com', password: 'Lorena2026'   },
  { nombre: 'Marvin',     correo: 'correo_pendiente@gmail.com', password: 'Marvin2026'  },
];

async function generarHashes() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  OFICINA TS — Hashes bcrypt para la base de datos');
  console.log('════════════════════════════════════════════════════════\n');

  for (const usuario of usuarios) {
    const hash = await bcrypt.hash(usuario.password, SALT_ROUNDS);

    console.log(`Usuario : ${usuario.nombre}`);
    console.log(`Correo  : ${usuario.correo}`);
    console.log(`Hash    : ${hash}`);
    console.log('─'.repeat(60));
  }

  console.log('\n📋 SQL listo para copiar:\n');

  for (const usuario of usuarios) {
    const hash = await bcrypt.hash(usuario.password, SALT_ROUNDS);
    console.log(
      `UPDATE usuarios SET password_hash = '${hash}' WHERE correo = '${usuario.correo}';`
    );
  }

  console.log('\n✅ Proceso completado. Pega los UPDATE en Supabase SQL Editor.\n');
}

generarHashes().catch((err) => {
  console.error('Error generando hashes:', err);
  process.exit(1);
});
