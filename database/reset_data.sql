-- ================================================================
-- RESET COMPLETO DE DATOS — mantiene esquema y usuario Sebastian
-- Ejecutar en Neon Console > SQL Editor
-- ================================================================

DO $$
DECLARE
  tbl text;
  tablas text[] := ARRAY[
    -- Auditoría / logs (sin FKs hacia otras tablas de negocio)
    'bitacora_accesos',
    'logs_auditoria',
    'bitacora_legal',
    -- Documentos y archivos
    'documentos_cliente',
    'referencias_cliente',
    'documentos_prestamo',
    'archivos_prestamo',
    'documentos_juicio',
    -- Historial / pagos / movimientos
    'historial_pagos_prestamo',
    'moratorios_prestamo',
    'historial_inversiones',
    'movimientos_inversionistas',
    'historial_pagos_global',
    'recibos_pago',
    'historial_ingresos_central',
    'historial_ingresos',
    -- Participantes / obligaciones
    'participantes_prestamo',
    'obligaciones_cobro_prestamo',
    -- Tesorería
    'movimientos_caja',
    'traspasos',
    'pagos_cuentas_pagar',
    'cuentas_por_pagar',
    'cuentas_pagar',
    -- Inmuebles
    'cuentas_por_cobrar',
    'contratos_arrendamiento',
    'inquilinos',
    -- Nóminas
    'nominas_pagadas',
    -- Ingresos extras (pueden no existir)
    'cortes_estacionamiento',
    'cortes_cancha',
    'pensiones_estacionamiento',
    'ingresos_directos',
    'metricas_cancha',
    'movimientos_extras_pension',
    -- Juicios
    'gastos_legales',
    'juicios',
    -- Egresos / deudas
    'deudas_bancarias',
    'creditos_bancarios',
    -- Catálogos con datos
    'proveedores_beneficiarios',
    'categorias_egresos',
    'categorias_movimiento',
    'cuentas_bancarias',
    -- Entidades principales
    'prestamos',
    'inversiones',
    'inmuebles',
    'empleados',
    'inversionistas',
    'clientes'
  ];
BEGIN
  FOREACH tbl IN ARRAY tablas LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('TRUNCATE TABLE %I CASCADE', tbl);
      RAISE NOTICE 'OK: %', tbl;
    ELSE
      RAISE NOTICE 'SKIP (no existe): %', tbl;
    END IF;
  END LOOP;

  -- Borrar usuarios que NO sean Sebastian
  DELETE FROM usuarios WHERE correo != 'sebastianjat49@gmail.com';
  RAISE NOTICE 'Usuarios no-Sebastian eliminados';
END $$;
