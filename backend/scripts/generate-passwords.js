const bcrypt = require('bcrypt');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Passwords are read from environment variables (never hardcoded).
// Define them in backend/.env, e.g.:
//   SEED_PWD_SEBASTIAN=...
const usuarios = [
  { nombre: 'Sebastian', envVar: 'SEED_PWD_SEBASTIAN' },
];

async function generarHashes() {
  const faltantes = usuarios.filter((u) => !process.env[u.envVar]);
  if (faltantes.length > 0) {
    console.error('Faltan variables de entorno con las contraseñas:');
    faltantes.forEach((u) => console.error(`  - ${u.envVar} (usuario ${u.nombre})`));
    console.error('\nDefínelas en backend/.env antes de ejecutar este script.');
    process.exit(1);
  }

  for (const usuario of usuarios) {
    const hash = await bcrypt.hash(process.env[usuario.envVar], 12);
    console.log(`-- ${usuario.nombre}`);
    console.log(`UPDATE usuarios SET password_hash = '${hash}' WHERE nombre_completo = '${usuario.nombre}';\n`);
  }
}

generarHashes();
