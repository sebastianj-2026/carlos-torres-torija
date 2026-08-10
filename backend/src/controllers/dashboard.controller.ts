import { Request, Response } from 'express';
import pool from '../config/database';

export const getKpis = async (_req: Request, res: Response): Promise<void> => {
  try {
    const hoy  = new Date();
    const mes  = hoy.getMonth() + 1;
    const anio = hoy.getFullYear();

    const [
      liquidezRes,
      pendienteCobroRes,
      pasivoRes,
      contratosVencerRes,
      morosidadRes,
      ingresosRes,
      egresosRes,
    ] = await Promise.all([
      // liquidez_total = cuentas bancarias activas + saldo neto caja chica
      pool.query(`
        SELECT
          COALESCE((SELECT SUM(saldo_actual) FROM cuentas_bancarias WHERE activa = true), 0) +
          COALESCE((SELECT SUM(CASE WHEN tipo = 'entrada' THEN monto ELSE -monto END) FROM movimientos_caja), 0)
        AS liquidez_total
      `),

      // pendiente_cobro = módulo inmuebles/CxC eliminado → 0
      Promise.resolve({ rows: [{ pendiente_cobro: 0 }] as any[] }),

      // pasivo_total = capital de inversiones (créditos bancarios eliminados)
      pool.query(`
        SELECT COALESCE((SELECT SUM(monto_actual) FROM inversiones), 0) AS pasivo_total
      `),

      // contratos_por_vencer = módulo inmobiliaria eliminado → 0
      Promise.resolve({ rows: [{ contratos_por_vencer: 0 }] as any[] }),

      // indice_morosidad = módulo inmuebles/CxC eliminado → 0
      Promise.resolve({ rows: [{ vencido: 0, total_exigible: 0 }] as any[] }),

      // ingresos del mes por origen (historial_ingresos_central)
      pool.query(`
        SELECT origen, COALESCE(SUM(monto_utilidad + monto_capital_recuperado), 0) AS total
        FROM historial_ingresos_central
        WHERE periodo_mes  = $1
          AND periodo_anio = $2
        GROUP BY origen
      `, [mes, anio]),

      // egresos pagados del mes por centro_costo + salidas de caja chica como "Extras"
      pool.query(`
        SELECT centro_costo, COALESCE(SUM(monto_total), 0) AS total
        FROM cuentas_por_pagar
        WHERE estatus = 'pagado'
          AND EXTRACT(MONTH FROM fecha_limite_pago) = $1
          AND EXTRACT(YEAR  FROM fecha_limite_pago) = $2
        GROUP BY centro_costo

        UNION ALL

        SELECT 'Extras' AS centro_costo, COALESCE(SUM(monto), 0) AS total
        FROM movimientos_caja
        WHERE tipo = 'salida'
          AND EXTRACT(MONTH FROM fecha) = $1
          AND EXTRACT(YEAR  FROM fecha) = $2
      `, [mes, anio]),
    ]);

    // ── Liquidez ──────────────────────────────────────────────────
    const liquidez_total = parseFloat(liquidezRes.rows[0].liquidez_total);

    // ── Pendiente cobro ───────────────────────────────────────────
    const pendiente_cobro = parseFloat(pendienteCobroRes.rows[0].pendiente_cobro);

    // ── Pasivo ────────────────────────────────────────────────────
    const pasivo_total = parseFloat(pasivoRes.rows[0].pasivo_total);

    // ── Contratos por vencer ──────────────────────────────────────
    const contratos_por_vencer = contratosVencerRes.rows[0].contratos_por_vencer as number;

    // ── Morosidad ─────────────────────────────────────────────────
    const vencido        = parseFloat(morosidadRes.rows[0].vencido);
    const total_exigible = parseFloat(morosidadRes.rows[0].total_exigible);
    const indice_morosidad =
      total_exigible > 0
        ? parseFloat(((vencido / total_exigible) * 100).toFixed(2))
        : 0;

    // ── Ingresos ──────────────────────────────────────────────────
    const ingresosMap: Record<string, number> = {};
    for (const row of ingresosRes.rows) {
      ingresosMap[row.origen as string] = parseFloat(row.total);
    }
    const categorias_ingresos = {
      rentas:          ingresosMap['Inmueble']        ?? 0,
      estacionamiento: ingresosMap['Estacionamiento'] ?? 0,
      cancha:          ingresosMap['Cancha']           ?? 0,
      prestamos:       ingresosMap['Prestamo']         ?? 0,
    };
    const total_ingresos = parseFloat(
      Object.values(categorias_ingresos).reduce((a, b) => a + b, 0).toFixed(2)
    );

    // ── Egresos ───────────────────────────────────────────────────
    const egresosMap: Record<string, number> = {};
    for (const row of egresosRes.rows) {
      const key = row.centro_costo as string;
      egresosMap[key] = (egresosMap[key] ?? 0) + parseFloat(row.total);
    }
    const categorias_egresos = {
      abril:              egresosMap['Abril']          ?? 0,
      oficina:            egresosMap['Oficina']        ?? 0,
      creditos_bancarios: egresosMap['Bancos']         ?? 0,
      inversionistas:     egresosMap['Inversionistas'] ?? 0,
      extras:             egresosMap['Extras']         ?? 0,
    };
    const total_egresos = parseFloat(
      Object.values(categorias_egresos).reduce((a, b) => a + b, 0).toFixed(2)
    );

    // ── Resultado ─────────────────────────────────────────────────
    const utilidad_neta = parseFloat((total_ingresos - total_egresos).toFixed(2));

    res.json({
      mes,
      anio,
      liquidez_total,
      pendiente_cobro,
      pasivo_total,
      contratos_por_vencer,
      indice_morosidad,
      total_ingresos,
      categorias_ingresos,
      total_egresos,
      categorias_egresos,
      utilidad_neta,
    });
  } catch (error) {
    console.error('Error al obtener KPIs del dashboard:', error);
    res.status(500).json({ mensaje: 'Error interno al calcular KPIs.' });
  }
};

// ================================================================
// GET /api/dashboard/boss-kpis
// Centro de comando gerencial — flujo real del mes
// ================================================================
export const getBossKpis = async (_req: Request, res: Response): Promise<void> => {
  try {
    const hoy  = new Date();
    const mes  = hoy.getMonth() + 1;
    const anio = hoy.getFullYear();

    const [
      liquidezRes,
      ocupacionRes,
      cobranzaRes,
      ingresosRes,
      egresosOpRes,
      nominaRes,
      creditosMesRes,
      juiciosRes,
      urgentesRes,
      contratosVencerRes,
    ] = await Promise.all([

      // 1. Dinero real: bancos activos + saldo neto caja chica
      pool.query(`
        SELECT
          COALESCE((SELECT SUM(saldo_actual) FROM cuentas_bancarias WHERE activa = true), 0) +
          COALESCE((SELECT SUM(CASE WHEN tipo = 'entrada' THEN monto ELSE -monto END)
                    FROM movimientos_caja), 0)
        AS dinero_total
      `),

      // 2. Ocupación inmobiliaria — módulo eliminado → 0
      Promise.resolve({ rows: [{ rentados: 0, total: 0 }] as any[] }),

      // 3. Eficiencia de cobranza de rentas — módulo inmuebles eliminado → 0
      Promise.resolve({ rows: [{ cobrado: 0, esperado: 0 }] as any[] }),

      // 4. Ingresos del mes desglosados (historial_ingresos_central)
      pool.query(`
        SELECT
          COALESCE(SUM(monto_utilidad + monto_capital_recuperado), 0)
            AS total,
          COALESCE(SUM(monto_utilidad + monto_capital_recuperado) FILTER (WHERE origen = 'Inmueble'),        0) AS rentas,
          COALESCE(SUM(monto_utilidad + monto_capital_recuperado) FILTER (WHERE origen = 'Estacionamiento'), 0) AS estacionamiento,
          COALESCE(SUM(monto_utilidad + monto_capital_recuperado) FILTER (WHERE origen = 'Cancha'),          0) AS cancha,
          COALESCE(SUM(monto_utilidad + monto_capital_recuperado) FILTER (WHERE origen = 'Prestamo'),        0) AS prestamos
        FROM historial_ingresos_central
        WHERE periodo_mes = $1 AND periodo_anio = $2
      `, [mes, anio]),

      // 5. Egresos operativos del mes: Oficina + Abril + caja chica
      // SOLO flujo real de efectivo; no incluye saldos de deuda
      pool.query(`
        SELECT
          COALESCE(SUM(cpp.monto_total), 0) +
          COALESCE((
            SELECT SUM(monto) FROM movimientos_caja
            WHERE tipo = 'salida'
              AND EXTRACT(MONTH FROM fecha) = $1
              AND EXTRACT(YEAR  FROM fecha) = $2
          ), 0) AS total_egresos_op
        FROM cuentas_por_pagar cpp
        WHERE cpp.estatus = 'pagado'
          AND cpp.centro_costo IN ('Oficina', 'Abril')
          AND EXTRACT(MONTH FROM cpp.fecha_limite_pago) = $1
          AND EXTRACT(YEAR  FROM cpp.fecha_limite_pago) = $2
      `, [mes, anio]),

      // 6. Costo total de nómina pagada este mes
      pool.query(`
        SELECT COALESCE(SUM(monto_total_pagado), 0) AS costo_nomina
        FROM   nominas_pagadas
        WHERE  EXTRACT(MONTH FROM fecha_pago) = $1
          AND  EXTRACT(YEAR  FROM fecha_pago) = $2
      `, [mes, anio]),

      // 7. Pago real a créditos este mes (mensualidades, NO saldo total de deuda)
      pool.query(`
        SELECT COALESCE(SUM(monto_total), 0) AS pago_creditos_mes
        FROM   cuentas_por_pagar
        WHERE  estatus      = 'pagado'
          AND  centro_costo = 'Bancos'
          AND  EXTRACT(MONTH FROM fecha_limite_pago) = $1
          AND  EXTRACT(YEAR  FROM fecha_limite_pago) = $2
      `, [mes, anio]),

      // 8. Juicios activos + capital congelado en esos préstamos
      pool.query(`
        SELECT
          COUNT(*)::INTEGER               AS juicios_count,
          COALESCE(SUM(p.saldo_pendiente), 0) AS dinero_congelado
        FROM   juicios j
        JOIN   prestamos p ON p.id = j.prestamo_id
        WHERE  j.activo = true
      `),

      // 9. Cuentas por pagar pendientes que vencen en ≤15 días
      pool.query(`
        SELECT
          COALESCE(SUM(monto_total), 0) AS monto_urgente,
          COUNT(*)::INTEGER              AS count_urgente
        FROM cuentas_por_pagar
        WHERE estatus NOT IN ('pagado', 'cancelado')
          AND fecha_limite_pago <= CURRENT_DATE + INTERVAL '15 days'
      `),

      // 10. Contratos por vencer — módulo inmobiliaria eliminado → 0
      Promise.resolve({ rows: [{ contratos_por_vencer: 0 }] as any[] }),
    ]);

    // ── Bloque 1 ─────────────────────────────────────────────────
    const dinero_bancos_caja = parseFloat(liquidezRes.rows[0].dinero_total);

    const rentados      = parseInt(ocupacionRes.rows[0].rentados,      10);
    const totalInmuebles = parseInt(ocupacionRes.rows[0].total,        10);
    const tasa_ocupacion = totalInmuebles > 0
      ? parseFloat(((rentados / totalInmuebles) * 100).toFixed(1)) : 0;

    const rentas_cobradas  = parseFloat(cobranzaRes.rows[0].cobrado);
    const rentas_esperadas = parseFloat(cobranzaRes.rows[0].esperado);
    const eficiencia_cobranza = rentas_esperadas > 0
      ? parseFloat(((rentas_cobradas / rentas_esperadas) * 100).toFixed(1)) : 0;

    // ── Bloque 2 ─────────────────────────────────────────────────
    const ir = ingresosRes.rows[0];
    const total_ingresos = parseFloat(ir.total);
    const ingresos_desglose = {
      rentas:          parseFloat(ir.rentas),
      estacionamiento: parseFloat(ir.estacionamiento),
      cancha:          parseFloat(ir.cancha),
      prestamos:       parseFloat(ir.prestamos),
    };

    const total_egresos_op   = parseFloat(egresosOpRes.rows[0].total_egresos_op);
    const costo_nomina       = parseFloat(nominaRes.rows[0].costo_nomina);
    const pago_creditos_mes  = parseFloat(creditosMesRes.rows[0].pago_creditos_mes);

    const total_salidas  = parseFloat((total_egresos_op + costo_nomina + pago_creditos_mes).toFixed(2));
    const utilidad_neta  = parseFloat((total_ingresos - total_salidas).toFixed(2));
    const ratio_deuda_ingreso = total_ingresos > 0
      ? parseFloat(((pago_creditos_mes / total_ingresos) * 100).toFixed(1)) : 0;

    // ── Bloque 3 ─────────────────────────────────────────────────
    const juicios_count      = juiciosRes.rows[0].juicios_count      as number;
    const dinero_congelado   = parseFloat(juiciosRes.rows[0].dinero_congelado);
    const monto_urgente      = parseFloat(urgentesRes.rows[0].monto_urgente);
    const count_urgente      = urgentesRes.rows[0].count_urgente      as number;
    const contratos_por_vencer = contratosVencerRes.rows[0].contratos_por_vencer as number;

    res.json({
      mes, anio,
      bloque1: {
        dinero_bancos_caja,
        tasa_ocupacion,
        inmuebles_rentados: rentados,
        total_inmuebles:    totalInmuebles,
        eficiencia_cobranza,
        rentas_cobradas,
        rentas_esperadas,
      },
      bloque2: {
        total_ingresos,
        ingresos_desglose,
        total_egresos_op,
        costo_nomina,
        pago_creditos_mes,
        ratio_deuda_ingreso,
        utilidad_neta,
        total_salidas,
      },
      bloque3: {
        juicios: {
          count:            juicios_count,
          dinero_congelado,
        },
        cuentas_urgentes: {
          monto: monto_urgente,
          count: count_urgente,
        },
        contratos_por_vencer,
      },
    });
  } catch (error) {
    console.error('Error al obtener Boss KPIs:', error);
    res.status(500).json({ mensaje: 'Error interno al calcular Boss KPIs.' });
  }
};

// ================================================================
// GET /api/dashboard/analytics?mes=&anio=
// Radiografía completa: flujo, eficiencia, riesgo legal, rankings
// ================================================================
const tagQuery = (label: string, q: Promise<any>) =>
  q.catch((e: Error) => { throw new Error(`[analytics:${label}] ${e.message}`); });

export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const hoy  = new Date();
    const mes  = parseInt(req.query.mes  as string) || hoy.getMonth() + 1;
    const anio = parseInt(req.query.anio as string) || hoy.getFullYear();

    const [
      liquidezRes,
      ingresosRes,
      egresosRes,
      eficienciaRes,
      pensionesRes,
      juiciosRes,
      pagadoresRes,
      deudoresRes,
      abonosCapRes,
    ] = await Promise.all([

      // 1. Liquidez real
      tagQuery('liquidez', pool.query(`
        SELECT
          COALESCE((SELECT SUM(saldo_actual) FROM cuentas_bancarias WHERE activa = true), 0) +
          COALESCE((SELECT SUM(CASE WHEN tipo='entrada' THEN monto ELSE -monto END) FROM movimientos_caja), 0)
        AS liquidez_total
      `)),

      // 2. Ingresos: préstamos (módulos rentas/cancha/estacionamiento eliminados → 0)
      tagQuery('ingresos', pool.query(`
        SELECT
          0::NUMERIC AS rentas_propias,
          0::NUMERIC AS rentas_externas,
          COALESCE((
            SELECT SUM(monto_utilidad + monto_capital_recuperado)
            FROM   historial_ingresos_central
            WHERE  origen = 'Prestamo' AND periodo_mes = $1 AND periodo_anio = $2
          ), 0) AS prestamos,
          0::NUMERIC AS cancha,
          0::NUMERIC AS estacionamiento,
          0::NUMERIC AS otros
      `, [mes, anio])),

      // 3. Egresos: cpp por centro_costo + nómina + caja chica (flujo real, no saldos)
      tagQuery('egresos', pool.query(`
        SELECT categoria, COALESCE(SUM(total), 0) AS monto
        FROM (
          SELECT centro_costo AS categoria, SUM(monto_total) AS total
          FROM   cuentas_por_pagar
          WHERE  estatus = 'pagado'
            AND  EXTRACT(MONTH FROM fecha_limite_pago) = $1
            AND  EXTRACT(YEAR  FROM fecha_limite_pago) = $2
          GROUP  BY centro_costo

          UNION ALL

          SELECT 'Nomina', SUM(monto_total_pagado)
          FROM   nominas_pagadas
          WHERE  EXTRACT(MONTH FROM fecha_pago) = $1
            AND  EXTRACT(YEAR  FROM fecha_pago) = $2

          UNION ALL

          SELECT 'Extras', SUM(monto)
          FROM   movimientos_caja
          WHERE  tipo = 'salida'
            AND  EXTRACT(MONTH FROM fecha) = $1
            AND  EXTRACT(YEAR  FROM fecha) = $2
        ) t
        GROUP BY categoria
      `, [mes, anio])),

      // 4. Eficiencia: rentas cobradas vs esperadas, intereses cobrados vs esperados
      tagQuery('eficiencia', pool.query(`
        SELECT
          0::NUMERIC AS rentas_cobradas,
          0::NUMERIC AS rentas_esperadas,
          COALESCE((
            SELECT SUM(monto_utilidad)
            FROM   historial_ingresos_central
            WHERE  origen = 'Prestamo' AND periodo_mes = $1 AND periodo_anio = $2
          ), 0) AS intereses_cobrados,
          COALESCE((
            SELECT SUM(ROUND(saldo_pendiente * tasa_interes_mensual / 100, 2))
            FROM   prestamos WHERE estatus IN ('activo', 'atrasado')
          ), 0) AS intereses_esperados
      `, [mes, anio])),

      // 5. Pensiones activas — tabla migration_ingresos_hub.sql pendiente de aplicar en Neon
      Promise.resolve({ rows: [{ pensiones_activas: 0 }] }),

      // 6. Juicios activos con saldo del préstamo asociado
      tagQuery('juicios', pool.query(`
        SELECT j.id, j.etapa_procesal, j.notas,
               p.saldo_pendiente,
               CONCAT(c.nombres, ' ', c.apellido_paterno) AS cliente_nombre
        FROM   juicios j
        JOIN   prestamos p ON p.id = j.prestamo_id
        JOIN   clientes  c ON c.id = j.cliente_id
        WHERE  j.activo = true
        ORDER  BY p.saldo_pendiente DESC
      `)),

      // 7. Top 5 pagadores del mes (préstamos + rentas)
      tagQuery('pagadores', pool.query(`
        SELECT CONCAT(c.nombres, ' ', c.apellido_paterno) AS nombre,
               SUM(hic.monto_utilidad + hic.monto_capital_recuperado) AS total
        FROM   historial_ingresos_central hic
        JOIN   prestamos p ON p.id = hic.referencia_id
        JOIN   clientes  c ON c.id = p.cliente_id
        WHERE  hic.origen = 'Prestamo' AND hic.periodo_mes = $1 AND hic.periodo_anio = $2
        GROUP  BY c.id, c.nombres, c.apellido_paterno
        ORDER  BY total DESC LIMIT 5
      `, [mes, anio])),

      // 8. Top 5 deudores: módulo inmuebles/CxC eliminado → vacío
      tagQuery('deudores', Promise.resolve({ rows: [] as any[] })),

      // 9. Abonos a capital de préstamos este mes
      tagQuery('abonos', pool.query(`
        SELECT CONCAT(c.nombres, ' ', c.apellido_paterno) AS nombre,
               SUM(hic.monto_capital_recuperado) AS abono
        FROM   historial_ingresos_central hic
        JOIN   prestamos p ON p.id = hic.referencia_id
        JOIN   clientes  c ON c.id = p.cliente_id
        WHERE  hic.origen = 'Prestamo'
          AND  hic.monto_capital_recuperado > 0
          AND  hic.periodo_mes = $1 AND hic.periodo_anio = $2
        GROUP  BY c.id, c.nombres, c.apellido_paterno
        ORDER  BY abono DESC LIMIT 5
      `, [mes, anio])),
    ]);

    // ── Parse ingresos ─────────────────────────────────────────────
    const ir = ingresosRes.rows[0];
    const rentas_propias   = parseFloat(ir.rentas_propias);
    const rentas_externas  = parseFloat(ir.rentas_externas);
    const cancha           = parseFloat(ir.cancha);
    const estacionamiento  = parseFloat(ir.estacionamiento);
    const prestamos_ing    = parseFloat(ir.prestamos);
    const otros            = parseFloat(ir.otros);
    const total_ingresos   = parseFloat(
      (rentas_propias + rentas_externas + cancha + estacionamiento + prestamos_ing + otros).toFixed(2)
    );

    // ── Parse egresos ──────────────────────────────────────────────
    const em: Record<string, number> = {};
    for (const row of egresosRes.rows) em[row.categoria as string] = parseFloat(row.monto);
    const e_abril          = em['Abril']          ?? 0;
    const e_oficina        = em['Oficina']        ?? 0;
    const e_nomina         = em['Nomina']         ?? 0;
    const e_inversionistas = em['Inversionistas'] ?? 0;
    const e_creditos       = em['Bancos']         ?? 0;
    const e_extras         = em['Extras']         ?? 0;
    const total_egresos    = parseFloat(
      (e_abril + e_oficina + e_nomina + e_inversionistas + e_creditos + e_extras).toFixed(2)
    );

    // ── Parse eficiencia ───────────────────────────────────────────
    const ef = eficienciaRes.rows[0];
    const rentas_cobradas      = parseFloat(ef.rentas_cobradas);
    const rentas_esperadas     = parseFloat(ef.rentas_esperadas);
    const intereses_cobrados   = parseFloat(ef.intereses_cobrados);
    const intereses_esperados  = parseFloat(ef.intereses_esperados);
    const eficiencia_rentas    = rentas_esperadas   > 0
      ? parseFloat(((rentas_cobradas   / rentas_esperadas)   * 100).toFixed(1)) : 0;
    const eficiencia_prestamos = intereses_esperados > 0
      ? parseFloat(((intereses_cobrados / intereses_esperados) * 100).toFixed(1)) : 0;

    // ── Parse juicios ──────────────────────────────────────────────
    const capital_atorado = juiciosRes.rows.reduce(
      (s: number, r: any) => s + parseFloat(r.saldo_pendiente), 0
    );

    res.json({
      mes, anio,
      bloque_a: {
        liquidez_total:   parseFloat(liquidezRes.rows[0].liquidez_total),
        total_ingresos,
        total_egresos,
        utilidad_mensual: parseFloat((total_ingresos - total_egresos).toFixed(2)),
      },
      bloque_b: { rentas_propias, rentas_externas, cancha, estacionamiento, prestamos: prestamos_ing, otros, total: total_ingresos },
      bloque_c: { abril: e_abril, oficina: e_oficina, nominas: e_nomina, inversionistas: e_inversionistas, creditos: e_creditos, extras: e_extras, total: total_egresos },
      bloque_d: { eficiencia_rentas, rentas_cobradas, rentas_esperadas, eficiencia_prestamos, intereses_cobrados, intereses_esperados, pensiones_activas: pensionesRes.rows[0].pensiones_activas },
      bloque_e: {
        pago_total_inversionistas:  e_inversionistas,
        ingresos_prestamos_mes:     intereses_cobrados,
        utilidad_oficina_inversion: parseFloat((intereses_cobrados - e_inversionistas).toFixed(2)),
      },
      bloque_f: {
        conteo_casos:  juiciosRes.rows.length,
        capital_atorado: parseFloat(capital_atorado.toFixed(2)),
        casos: juiciosRes.rows.map((r: any) => ({
          id:              r.id as string,
          cliente_nombre:  r.cliente_nombre  as string,
          etapa_procesal:  r.etapa_procesal  as string,
          saldo_pendiente: parseFloat(r.saldo_pendiente),
          notas:           r.notas ?? null,
        })),
      },
      bloque_g: {
        top_pagadores:  pagadoresRes.rows.map((r: any) => ({ nombre: r.nombre as string, total: parseFloat(r.total) })),
        top_deudores:   deudoresRes.rows.map((r: any)  => ({ nombre: r.nombre as string, deuda: parseFloat(r.deuda) })),
        abonos_capital: abonosCapRes.rows.map((r: any) => ({ nombre: r.nombre as string, abono: parseFloat(r.abono) })),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error interno al calcular Analytics.';
    console.error('Error al obtener Analytics Dashboard:', msg);
    res.status(500).json({ mensaje: msg });
  }
};
