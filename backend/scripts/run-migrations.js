require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '../../database');

const MIGRATION_ORDER = [
  // Base
  'schema.sql',
  'clientes.sql',
  'inversionistas.sql',
  'prestamos.sql',
  'migration_v2_fechas_capital.sql',
  'migration_v3_garantias.sql',
  // Tesorería / egresos base
  'migration_tesoreria.sql',
  'migration_cobros.sql',
  'migration_cuentas_pagar.sql',
  'migration_egresos_deuda.sql',         // crea categorias_egresos + cuentas_por_pagar
  'migration_centros_costo.sql',         // necesita categorias_egresos + cuentas_por_pagar
  'migration_creditos_bancarios.sql',    // necesita categorias_egresos
  // Inmuebles y sus dependientes
  'migration_inmuebles.sql',             // necesita cuentas_por_pagar
  'migration_renta_externa.sql',         // necesita inmuebles
  'migration_inquilinos_v2.sql',         // necesita inquilinos
  'migration_cxc_separados.sql',         // necesita contratos_arrendamiento → crea historial_ingresos_central
  'migration_pagos_global.sql',          // necesita contratos_arrendamiento
  'migration_cortes_estacionamiento.sql',// necesita historial_ingresos_central
  'migration_cortes_cancha.sql',         // necesita historial_ingresos_central
  // Resto
  'migration_juicios.sql',
  'migration_bolsa_capital.sql',
  'migration_proyeccion_cxc_prestamos.sql',
  'migration_dia_pago_inversionistas.sql',
  'migration_nominas.sql',
  'migration_nominas_v2.sql',
  'migration_gastos_categorias_series.sql',
  'migration_abril_categorias.sql',
  'migration_reset_categorias.sql',      // necesita centro_costo (migration_centros_costo)
  'migration_ine_frente_reverso.sql',
  'migration_creditos_tasa_anual.sql',
  'migration_participantes_archivos.sql',// al final, ya no necesita inversionista_id
];

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Conectado a Neon.\n');

  for (const file of MIGRATION_ORDER) {
    const filePath = path.join(DB_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP (archivo no encontrado): ${file}`);
      continue;
    }
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await client.query(sql);
      console.log(`  OK: ${file}`);
    } catch (err) {
      console.error(`  ERROR en ${file}: ${err.message}`);
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
  }

  await client.end();
  console.log('\nMigraciones completadas.');
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
