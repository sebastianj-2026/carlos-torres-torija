const bcrypt = require('bcrypt');

const usuarios = [
  { nombre: 'Sebastian', password: 'Bowie2026$8' },
  { nombre: 'Abril', password: 'Abril1969122' },
  { nombre: 'Lorena', password: 'Lorena2026' },
  { nombre: 'Marvin', password: 'Marvin2026' },
];

async function generarHashes() {
  for (const usuario of usuarios) {
    const hash = await bcrypt.hash(usuario.password, 12);
    console.log(`-- ${usuario.nombre}`);
    console.log(`UPDATE usuarios SET password_hash = '${hash}' WHERE nombre_completo = '${usuario.nombre}';\n`);
  }
}

generarHashes();