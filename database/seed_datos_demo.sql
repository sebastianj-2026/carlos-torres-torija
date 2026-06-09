-- ================================================================
-- SEED DATOS DEMO — Sistema Financiero
-- Contenido: 8 clientes · 4 inversionistas · 10 préstamos · 3 juicios
--            5 inmuebles (1 plaza) · 7 inquilinos · 5 cuentas bancarias
--            4 empleados · 1 crédito bancario · caja chica $5,000
-- Ejecutar en Neon Console → SQL Editor
-- ================================================================

DO $$
DECLARE
  -- Clientes regulares
  c1 UUID; c2 UUID; c3 UUID; c4 UUID; c5 UUID;
  -- Clientes en juicio
  cj1 UUID; cj2 UUID; cj3 UUID;

  -- Inversionistas + inversiones
  inv1 UUID; inv2 UUID; inv3 UUID; inv4 UUID;

  -- Préstamos regulares
  p1 UUID; p2 UUID; p3 UUID; p4 UUID; p5 UUID; p6 UUID; p7 UUID;
  -- Préstamos en juicio
  pj1 UUID; pj2 UUID; pj3 UUID;

  -- Inmuebles
  inm1 UUID; inm2 UUID; inm3 UUID; inm4 UUID; inm5 UUID;

  -- Inquilinos (4 regulares + 3 plaza)
  iq1 UUID; iq2 UUID; iq3 UUID; iq4 UUID;
  iqp1 UUID; iqp2 UUID; iqp3 UUID;

  -- Contratos (4 regulares + 3 plaza)
  ct1 UUID; ct2 UUID; ct3 UUID; ct4 UUID;
  ctp1 UUID; ctp2 UUID; ctp3 UUID;

  -- Empleados
  emp1 UUID; emp2 UUID; emp3 UUID; emp4 UUID;

BEGIN

  -- ================================================================
  -- 1. CLIENTES (5 regulares + 3 en juicio)
  -- ================================================================
  INSERT INTO clientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento, rfc,
    telefono_celular, correo, calle, numero_exterior, colonia, municipio, estado, codigo_postal,
    ocupacion, estatus)
  VALUES ('María', 'García', 'López', '1985-03-12', 'GALM850312HJ0',
    '5512345601', 'maria.garcia@email.com', 'Av. Insurgentes', '234', 'Del Valle',
    'Benito Juárez', 'Ciudad de México', '03100', 'Comerciante', 'activo')
  RETURNING id INTO c1;

  INSERT INTO clientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento, rfc,
    telefono_celular, correo, calle, numero_exterior, colonia, municipio, estado, codigo_postal,
    ocupacion, estatus)
  VALUES ('Roberto', 'Hernández', 'Soto', '1978-07-22', 'HESR780722GJ1',
    '3312345602', 'roberto.hdz@email.com', 'Calle Morelos', '18', 'Chapalita',
    'Guadalajara', 'Jalisco', '44500', 'Empleado', 'activo')
  RETURNING id INTO c2;

  INSERT INTO clientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento, rfc,
    telefono_celular, correo, calle, numero_exterior, colonia, municipio, estado, codigo_postal,
    ocupacion, estatus)
  VALUES ('Carmen', 'Flores', 'Ruiz', '1990-11-05', 'FORC901105MN2',
    '8112345603', 'carmen.flores@email.com', 'Av. Garza Sada', '1200', 'Del Paseo',
    'Monterrey', 'Nuevo León', '64920', 'Profesionista', 'activo')
  RETURNING id INTO c3;

  INSERT INTO clientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento, rfc,
    telefono_celular, correo, calle, numero_exterior, colonia, municipio, estado, codigo_postal,
    ocupacion, estatus)
  VALUES ('Alejandro', 'Mendoza', 'Cruz', '1982-04-18', 'MECA820418PB3',
    '2212345604', 'alejandro.mc@email.com', 'Blvd. Héroes del 5 de Mayo', '452', 'Centro',
    'Puebla', 'Puebla', '72000', 'Empresario', 'activo')
  RETURNING id INTO c4;

  INSERT INTO clientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento, rfc,
    telefono_celular, correo, calle, numero_exterior, colonia, municipio, estado, codigo_postal,
    ocupacion, estatus)
  VALUES ('Patricia', 'Vega', 'Morales', '1975-09-30', 'VEMP750930BC4',
    '6642345605', 'patricia.vega@email.com', 'Blvd. Agua Caliente', '3400', 'Aviación',
    'Tijuana', 'Baja California', '22014', 'Comerciante', 'activo')
  RETURNING id INTO c5;

  -- Clientes en juicio
  INSERT INTO clientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
    telefono_celular, correo, calle, numero_exterior, colonia, municipio, estado, codigo_postal,
    ocupacion, estatus, ubicacion_expediente)
  VALUES ('Luis', 'Torres', 'Ramírez', '1970-01-15',
    '5598765601', 'luis.torres@email.com', 'Calle Tepic', '77', 'Narvarte',
    'Benito Juárez', 'Ciudad de México', '03020', 'Comerciante', 'en_juicio',
    'Mora dic 2024. Sin contacto desde feb 2025.')
  RETURNING id INTO cj1;

  INSERT INTO clientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
    telefono_celular, correo, calle, numero_exterior, colonia, municipio, estado, codigo_postal,
    ocupacion, estatus, ubicacion_expediente)
  VALUES ('Ana', 'Martínez', 'Pérez', '1983-06-28',
    '5598765602', 'ana.martinez@email.com', 'Av. Universidad', '300', 'Copilco',
    'Coyoacán', 'Ciudad de México', '04360', 'Empleada', 'en_juicio',
    'Mora feb 2025. Sin contacto desde esa fecha.')
  RETURNING id INTO cj2;

  INSERT INTO clientes (nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
    telefono_celular, correo, calle, numero_exterior, colonia, municipio, estado, codigo_postal,
    ocupacion, estatus, ubicacion_expediente)
  VALUES ('Jorge', 'Castillo', 'Díaz', '1968-12-03',
    '4422345603', 'jorge.castillo@email.com', 'Av. Constitución', '155', 'Cimatario',
    'Querétaro', 'Querétaro', '76000', 'Empresario', 'en_juicio',
    'Emplazado mar 2025. Respuesta pendiente.')
  RETURNING id INTO cj3;

  -- ================================================================
  -- 2. INVERSIONISTAS (4) + INVERSIONES
  -- ================================================================
  INSERT INTO inversionistas (nombres, apellido_paterno, apellido_materno, telefono, correo, asignado_a)
  VALUES ('Eduardo', 'Sánchez', 'Gutiérrez', '5511001001', 'eduardo.sg@gmail.com', 'sebastian')
  RETURNING id INTO inv1;

  INSERT INTO inversionistas (nombres, apellido_paterno, apellido_materno, telefono, correo, asignado_a)
  VALUES ('Daniela', 'Romero', 'Luna', '5511002002', 'daniela.romero@gmail.com', 'sebastian')
  RETURNING id INTO inv2;

  INSERT INTO inversionistas (nombres, apellido_paterno, apellido_materno, telefono, correo, asignado_a)
  VALUES ('Carlos', 'Jiménez', 'Peña', '3311003003', 'carlos.jp@gmail.com', 'abril')
  RETURNING id INTO inv3;

  INSERT INTO inversionistas (nombres, apellido_paterno, apellido_materno, telefono, correo, asignado_a)
  VALUES ('Sofía', 'Navarro', 'Reyes', '3311004004', 'sofia.navarro@gmail.com', 'abril')
  RETURNING id INTO inv4;

  INSERT INTO inversiones (inversionista_id, monto_inicial, monto_actual, tasa_interes_mensual,
    dia_pago, forma_ingreso, estatus, fecha_inicio, fecha_vencimiento)
  VALUES (inv1, 500000, 500000, 2.5, 5, 'deposito', 'activo', '2026-05-01', '2027-05-01');

  INSERT INTO inversiones (inversionista_id, monto_inicial, monto_actual, tasa_interes_mensual,
    dia_pago, forma_ingreso, estatus, fecha_inicio, fecha_vencimiento)
  VALUES (inv2, 300000, 300000, 2.0, 5, 'deposito', 'activo', '2026-05-01', '2027-05-01');

  INSERT INTO inversiones (inversionista_id, monto_inicial, monto_actual, tasa_interes_mensual,
    dia_pago, forma_ingreso, estatus, fecha_inicio, fecha_vencimiento)
  VALUES (inv3, 250000, 250000, 2.5, 5, 'efectivo', 'activo', '2026-05-01', '2027-05-01');

  INSERT INTO inversiones (inversionista_id, monto_inicial, monto_actual, tasa_interes_mensual,
    dia_pago, forma_ingreso, estatus, fecha_inicio, fecha_vencimiento)
  VALUES (inv4, 150000, 150000, 2.0, 5, 'efectivo', 'activo', '2026-05-01', '2027-05-01');

  -- ================================================================
  -- 3. PRÉSTAMOS ACTIVOS (7) — primer pago mayo 2026
  -- ================================================================
  -- P1: María García — $150k hipotecario 12 meses 3%
  INSERT INTO prestamos (cliente_id, folio, tipo_garantia, monto_prestado, saldo_pendiente,
    tasa_interes_mensual, tasa_moratoria_mensual, plazo_meses,
    interes_anticipado, cantidad_entregada, apertura,
    fecha_inicio, fecha_vencimiento, notaria, estatus)
  VALUES (c1, 'PREST-2026-001', 'hipotecaria', 150000, 150000,
    3.0, 5.0, 12, 4500, 144500, 1000,
    '2026-05-01', '2027-05-01', 'Notaría 28 — Lic. García Reyes', 'activo')
  RETURNING id INTO p1;

  -- P2: Roberto Hernández — $80k aval 12 meses 3.5%
  INSERT INTO prestamos (cliente_id, folio, tipo_garantia, monto_prestado, saldo_pendiente,
    tasa_interes_mensual, tasa_moratoria_mensual, plazo_meses,
    interes_anticipado, cantidad_entregada,
    fecha_inicio, fecha_vencimiento, estatus)
  VALUES (c2, 'PREST-2026-002', 'pagare', 80000, 80000,
    3.5, 5.0, 12, 2800, 77200,
    '2026-05-01', '2027-05-01', 'activo')
  RETURNING id INTO p2;

  -- P3: Carmen Flores — $200k hipotecario 18 meses 2.5%
  INSERT INTO prestamos (cliente_id, folio, tipo_garantia, monto_prestado, saldo_pendiente,
    tasa_interes_mensual, tasa_moratoria_mensual, plazo_meses,
    interes_anticipado, cantidad_entregada, apertura,
    fecha_inicio, fecha_vencimiento, notaria, estatus)
  VALUES (c3, 'PREST-2026-003', 'hipotecaria', 200000, 200000,
    2.5, 4.0, 18, 5000, 194000, 1000,
    '2026-05-01', '2027-11-01', 'Notaría 14 — Lic. Torres Lara', 'activo')
  RETURNING id INTO p3;

  -- P4: Alejandro Mendoza — $50k pagaré 6 meses 4%
  INSERT INTO prestamos (cliente_id, folio, tipo_garantia, monto_prestado, saldo_pendiente,
    tasa_interes_mensual, tasa_moratoria_mensual, plazo_meses,
    interes_anticipado, cantidad_entregada,
    fecha_inicio, fecha_vencimiento, estatus)
  VALUES (c4, 'PREST-2026-004', 'pagare', 50000, 50000,
    4.0, 6.0, 6, 2000, 48000,
    '2026-05-01', '2026-11-01', 'activo')
  RETURNING id INTO p4;

  -- P5: Patricia Vega — $120k hipotecario 12 meses 3%
  INSERT INTO prestamos (cliente_id, folio, tipo_garantia, monto_prestado, saldo_pendiente,
    tasa_interes_mensual, tasa_moratoria_mensual, plazo_meses,
    interes_anticipado, cantidad_entregada, apertura,
    fecha_inicio, fecha_vencimiento, notaria, estatus)
  VALUES (c5, 'PREST-2026-005', 'hipotecaria', 120000, 120000,
    3.0, 5.0, 12, 3600, 115400, 1000,
    '2026-05-01', '2027-05-01', 'Notaría 9 — Lic. Morales Vega', 'activo')
  RETURNING id INTO p5;

  -- P6: María García — segundo préstamo $60k aval 6 meses 3.5%
  INSERT INTO prestamos (cliente_id, folio, tipo_garantia, monto_prestado, saldo_pendiente,
    tasa_interes_mensual, tasa_moratoria_mensual, plazo_meses,
    interes_anticipado, cantidad_entregada,
    fecha_inicio, fecha_vencimiento, estatus)
  VALUES (c1, 'PREST-2026-006', 'pagare', 60000, 60000,
    3.5, 5.0, 6, 2100, 57900,
    '2026-05-01', '2026-11-01', 'activo')
  RETURNING id INTO p6;

  -- P7: Alejandro Mendoza — segundo préstamo $35k pagaré 6 meses 4%
  INSERT INTO prestamos (cliente_id, folio, tipo_garantia, monto_prestado, saldo_pendiente,
    tasa_interes_mensual, tasa_moratoria_mensual, plazo_meses,
    interes_anticipado, cantidad_entregada,
    fecha_inicio, fecha_vencimiento, estatus)
  VALUES (c4, 'PREST-2026-007', 'pagare', 35000, 35000,
    4.0, 6.0, 6, 1400, 33600,
    '2026-05-01', '2026-11-01', 'activo')
  RETURNING id INTO p7;

  -- ================================================================
  -- 4. PRÉSTAMOS EN JUICIO (3)
  -- ================================================================
  INSERT INTO prestamos (cliente_id, folio, tipo_garantia, monto_prestado, saldo_pendiente,
    tasa_interes_mensual, tasa_moratoria_mensual, plazo_meses,
    interes_anticipado, cantidad_entregada,
    fecha_inicio, fecha_vencimiento, notaria, estatus, notas)
  VALUES (cj1, 'PREST-2024-041', 'hipotecaria', 180000, 180000,
    3.0, 5.0, 12, 5400, 174600,
    '2024-08-01', '2025-08-01', 'Notaría 22 — Lic. Ramírez', 'en_juicio',
    'Mora dic 2024. Demanda presentada ene 2025.')
  RETURNING id INTO pj1;

  INSERT INTO prestamos (cliente_id, folio, tipo_garantia, monto_prestado, saldo_pendiente,
    tasa_interes_mensual, tasa_moratoria_mensual, plazo_meses,
    interes_anticipado, cantidad_entregada,
    fecha_inicio, fecha_vencimiento, estatus, notas)
  VALUES (cj2, 'PREST-2024-055', 'pagare', 95000, 95000,
    3.5, 5.0, 12, 3325, 91675,
    '2024-10-01', '2025-10-01', 'en_juicio',
    'Mora feb 2025. Sin contacto con deudora.')
  RETURNING id INTO pj2;

  INSERT INTO prestamos (cliente_id, folio, tipo_garantia, monto_prestado, saldo_pendiente,
    tasa_interes_mensual, tasa_moratoria_mensual, plazo_meses,
    interes_anticipado, cantidad_entregada,
    fecha_inicio, fecha_vencimiento, notaria, estatus, notas)
  VALUES (cj3, 'PREST-2024-062', 'hipotecaria', 250000, 250000,
    2.5, 4.0, 18, 6250, 243750,
    '2024-09-01', '2026-03-01', 'Notaría 5 — Lic. Vega', 'en_juicio',
    'Emplazado mar 2025. Respuesta demandado pendiente.')
  RETURNING id INTO pj3;

  -- ================================================================
  -- 5. JUICIOS (3)
  -- ================================================================
  -- El trigger trg_crear_juicio_insert ya creó los 3 registros mínimos.
  -- Usamos ON CONFLICT DO UPDATE para agregar datos del abogado y etapa.
  INSERT INTO juicios (prestamo_id, cliente_id, abogado_nombre, abogado_telefono, abogado_email,
    fecha_asignacion_abogado, fecha_inicio, etapa_procesal,
    proxima_fecha_critica, descripcion_fecha_critica, activo)
  VALUES (pj1, cj1, 'Lic. Roberto Vega Sandoval', '5555100200', 'rvega@despachovega.mx',
    '2025-01-10', '2025-01-15', 'emplazamiento',
    '2026-06-10', 'Audiencia de desahogo de pruebas', true)
  ON CONFLICT (prestamo_id) DO UPDATE SET
    abogado_nombre = EXCLUDED.abogado_nombre,
    abogado_telefono = EXCLUDED.abogado_telefono,
    abogado_email = EXCLUDED.abogado_email,
    fecha_asignacion_abogado = EXCLUDED.fecha_asignacion_abogado,
    fecha_inicio = EXCLUDED.fecha_inicio,
    etapa_procesal = EXCLUDED.etapa_procesal,
    proxima_fecha_critica = EXCLUDED.proxima_fecha_critica,
    descripcion_fecha_critica = EXCLUDED.descripcion_fecha_critica;

  INSERT INTO juicios (prestamo_id, cliente_id, abogado_nombre, abogado_telefono, abogado_email,
    fecha_asignacion_abogado, fecha_inicio, etapa_procesal,
    proxima_fecha_critica, descripcion_fecha_critica, activo)
  VALUES (pj2, cj2, 'Lic. Roberto Vega Sandoval', '5555100200', 'rvega@despachovega.mx',
    '2025-03-15', '2025-03-20', 'demanda',
    '2026-06-25', 'Notificación formal al domicilio de la deudora', true)
  ON CONFLICT (prestamo_id) DO UPDATE SET
    abogado_nombre = EXCLUDED.abogado_nombre,
    abogado_telefono = EXCLUDED.abogado_telefono,
    abogado_email = EXCLUDED.abogado_email,
    fecha_asignacion_abogado = EXCLUDED.fecha_asignacion_abogado,
    fecha_inicio = EXCLUDED.fecha_inicio,
    etapa_procesal = EXCLUDED.etapa_procesal,
    proxima_fecha_critica = EXCLUDED.proxima_fecha_critica,
    descripcion_fecha_critica = EXCLUDED.descripcion_fecha_critica;

  INSERT INTO juicios (prestamo_id, cliente_id, abogado_nombre, abogado_telefono, abogado_email,
    fecha_asignacion_abogado, fecha_inicio, etapa_procesal,
    proxima_fecha_critica, descripcion_fecha_critica, activo)
  VALUES (pj3, cj3, 'Lic. María Lozano Ríos', '4422900300', 'mlozano@abogadospuebla.mx',
    '2025-02-28', '2025-03-05', 'emplazamiento',
    '2026-06-15', 'Respuesta formal del demandado', true)
  ON CONFLICT (prestamo_id) DO UPDATE SET
    abogado_nombre = EXCLUDED.abogado_nombre,
    abogado_telefono = EXCLUDED.abogado_telefono,
    abogado_email = EXCLUDED.abogado_email,
    fecha_asignacion_abogado = EXCLUDED.fecha_asignacion_abogado,
    fecha_inicio = EXCLUDED.fecha_inicio,
    etapa_procesal = EXCLUDED.etapa_procesal,
    proxima_fecha_critica = EXCLUDED.proxima_fecha_critica,
    descripcion_fecha_critica = EXCLUDED.descripcion_fecha_critica;

  -- ================================================================
  -- 6. PARTICIPANTES DE PRÉSTAMO
  -- ================================================================
  -- Con inversionistas
  INSERT INTO participantes_prestamo (prestamo_id, inversionista_id, es_oficina, monto_aportado, tasa_rendimiento, interes_mensual)
  VALUES (p1, inv1, false, 150000, 2.5, 3750);

  INSERT INTO participantes_prestamo (prestamo_id, inversionista_id, es_oficina, monto_aportado, tasa_rendimiento, interes_mensual)
  VALUES (p2, inv2, false, 80000, 2.0, 1600);

  INSERT INTO participantes_prestamo (prestamo_id, inversionista_id, es_oficina, monto_aportado, tasa_rendimiento, interes_mensual)
  VALUES (p3, inv3, false, 200000, 2.5, 5000);

  INSERT INTO participantes_prestamo (prestamo_id, inversionista_id, es_oficina, monto_aportado, tasa_rendimiento, interes_mensual)
  VALUES (p5, inv1, false, 120000, 2.5, 3000);

  INSERT INTO participantes_prestamo (prestamo_id, inversionista_id, es_oficina, monto_aportado, tasa_rendimiento, interes_mensual)
  VALUES (p7, inv4, false, 35000, 2.0, 700);

  -- De la oficina
  INSERT INTO participantes_prestamo (prestamo_id, inversionista_id, es_oficina, monto_aportado, tasa_rendimiento)
  VALUES (p4, NULL, true, 50000, 0);

  INSERT INTO participantes_prestamo (prestamo_id, inversionista_id, es_oficina, monto_aportado, tasa_rendimiento)
  VALUES (p6, NULL, true, 60000, 0);

  INSERT INTO participantes_prestamo (prestamo_id, inversionista_id, es_oficina, monto_aportado, tasa_rendimiento)
  VALUES (pj1, NULL, true, 180000, 0);

  INSERT INTO participantes_prestamo (prestamo_id, inversionista_id, es_oficina, monto_aportado, tasa_rendimiento)
  VALUES (pj2, NULL, true, 95000, 0);

  INSERT INTO participantes_prestamo (prestamo_id, inversionista_id, es_oficina, monto_aportado, tasa_rendimiento, interes_mensual)
  VALUES (pj3, inv2, false, 250000, 2.0, 5000);

  -- ================================================================
  -- 7. INMUEBLES (5) — 4 regulares + 1 plaza
  -- ================================================================
  INSERT INTO inmuebles (ubicacion_direccion, ciudad, estado, valor_propiedad, estatus,
    predial_cuenta, predial_mes_pago, es_renta_externa)
  VALUES ('Calle Río Nilo 45, Col. Jardines del Sol', 'Guadalajara', 'Jalisco',
    1200000, 'rentado', 'GDL-2024-0845', 4, false)
  RETURNING id INTO inm1;

  INSERT INTO inmuebles (ubicacion_direccion, ciudad, estado, valor_propiedad, estatus,
    predial_cuenta, predial_mes_pago, es_renta_externa)
  VALUES ('Av. Reforma 120 Depto 8B, Col. Juárez', 'Ciudad de México', 'Ciudad de México',
    2800000, 'rentado', 'CDMX-2024-3312', 2, false)
  RETURNING id INTO inm2;

  INSERT INTO inmuebles (ubicacion_direccion, ciudad, estado, valor_propiedad, estatus,
    predial_cuenta, predial_mes_pago, es_renta_externa)
  VALUES ('Calle 5 de Mayo 88 Local 3, Centro Histórico', 'Monterrey', 'Nuevo León',
    950000, 'rentado', 'NL-2024-1120', 3, false)
  RETURNING id INTO inm3;

  INSERT INTO inmuebles (ubicacion_direccion, ciudad, estado, valor_propiedad, estatus,
    predial_cuenta, predial_mes_pago, es_renta_externa)
  VALUES ('Blvd. Colosio 300 Nave B, Parque Industrial Las Américas', 'Hermosillo', 'Sonora',
    3500000, 'rentado', 'SON-2024-0078', 5, false)
  RETURNING id INTO inm4;

  -- Plaza Los Pinos: 5 oficinas, 3 ocupadas
  INSERT INTO inmuebles (ubicacion_direccion, ciudad, estado, valor_propiedad, estatus,
    predial_cuenta, predial_mes_pago, es_renta_externa, total_locales)
  VALUES ('Blvd. Atlixco 145, Plaza Los Pinos', 'Puebla', 'Puebla',
    8500000, 'rentado', 'PUE-2024-0552', 6, false, 5)
  RETURNING id INTO inm5;

  -- ================================================================
  -- 8. INQUILINOS (4 regulares + 3 plaza)
  -- ================================================================
  INSERT INTO inquilinos (nombres, apellidos, telefono, aval_nombre, aval_propiedad_garantia)
  VALUES ('Fernanda', 'Guzmán Ríos', '3312341001', 'Jorge Guzmán Ríos', 'Casa propia Col. Providencia GDL')
  RETURNING id INTO iq1;

  INSERT INTO inquilinos (nombres, apellidos, telefono, aval_nombre)
  VALUES ('Diego', 'Soria Vargas', '5512341002', 'Grupo Soria SA de CV')
  RETURNING id INTO iq2;

  INSERT INTO inquilinos (nombres, apellidos, telefono, aval_nombre, aval_propiedad_garantia)
  VALUES ('Comercializadora Nortex', 'SA de CV', '8112341003', 'Carlos Noriega Treviño', 'Bodega propia Parque Industrial NL')
  RETURNING id INTO iq3;

  INSERT INTO inquilinos (nombres, apellidos, telefono, aval_nombre)
  VALUES ('Logística Express del Bajío', 'SA de CV', '6622341004', 'Miguel Ángel Bernal Castro')
  RETURNING id INTO iq4;

  -- Inquilinos plaza
  INSERT INTO inquilinos (nombres, apellidos, telefono, aval_nombre)
  VALUES ('Consultorio Dr. Martín Pérez', 'Medicina General', '2221001001', 'Martín Pérez Ramos')
  RETURNING id INTO iqp1;

  INSERT INTO inquilinos (nombres, apellidos, telefono, aval_nombre)
  VALUES ('Notaría Pública No. 42', 'Lic. Ramón Vásquez', '2221001002', 'Colegio de Notarios Puebla')
  RETURNING id INTO iqp2;

  INSERT INTO inquilinos (nombres, apellidos, telefono, aval_nombre)
  VALUES ('Seguros y Fianzas Metropolitana', 'SA de CV', '2221001003', 'Grupo Financiero Metropolitano')
  RETURNING id INTO iqp3;

  -- ================================================================
  -- 9. CONTRATOS DE ARRENDAMIENTO
  -- ================================================================
  INSERT INTO contratos_arrendamiento (inmueble_id, inquilino_id, fecha_inicio, fecha_fin,
    monto_renta_mensual, dia_corte_pago, estatus, monto_deposito)
  VALUES (inm1, iq1, '2026-05-01', '2027-05-01', 8500, 5, 'activo', 17000)
  RETURNING id INTO ct1;

  INSERT INTO contratos_arrendamiento (inmueble_id, inquilino_id, fecha_inicio, fecha_fin,
    monto_renta_mensual, dia_corte_pago, estatus, monto_deposito)
  VALUES (inm2, iq2, '2026-05-01', '2027-05-01', 14000, 5, 'activo', 28000)
  RETURNING id INTO ct2;

  INSERT INTO contratos_arrendamiento (inmueble_id, inquilino_id, fecha_inicio, fecha_fin,
    monto_renta_mensual, dia_corte_pago, estatus, monto_deposito)
  VALUES (inm3, iq3, '2026-05-01', '2027-05-01', 12000, 5, 'activo', 24000)
  RETURNING id INTO ct3;

  INSERT INTO contratos_arrendamiento (inmueble_id, inquilino_id, fecha_inicio, fecha_fin,
    monto_renta_mensual, dia_corte_pago, estatus, monto_deposito)
  VALUES (inm4, iq4, '2026-05-01', '2027-05-01', 22000, 5, 'activo', 44000)
  RETURNING id INTO ct4;

  -- Plaza Los Pinos — 3 oficinas ocupadas de 5
  INSERT INTO contratos_arrendamiento (inmueble_id, inquilino_id, fecha_inicio, fecha_fin,
    monto_renta_mensual, dia_corte_pago, estatus, num_local, monto_deposito)
  VALUES (inm5, iqp1, '2026-05-01', '2027-05-01', 9500, 5, 'activo', 1, 19000)
  RETURNING id INTO ctp1;

  INSERT INTO contratos_arrendamiento (inmueble_id, inquilino_id, fecha_inicio, fecha_fin,
    monto_renta_mensual, dia_corte_pago, estatus, num_local, monto_deposito)
  VALUES (inm5, iqp2, '2026-05-01', '2027-05-01', 11000, 5, 'activo', 2, 22000)
  RETURNING id INTO ctp2;

  INSERT INTO contratos_arrendamiento (inmueble_id, inquilino_id, fecha_inicio, fecha_fin,
    monto_renta_mensual, dia_corte_pago, estatus, num_local, monto_deposito)
  VALUES (inm5, iqp3, '2026-05-01', '2027-05-01', 9000, 5, 'activo', 3, 18000)
  RETURNING id INTO ctp3;

  -- ================================================================
  -- 10. CUENTAS POR COBRAR — MAYO 2026 (una por contrato)
  -- ================================================================
  INSERT INTO cuentas_por_cobrar (inmueble_id, contrato_id, concepto, monto,
    periodo_mes, periodo_anio, fecha_limite_cobro, estatus)
  VALUES (inm1, ct1, 'Renta mayo 2026 — Fernanda Guzmán (Casa Jardines del Sol)', 8500,
    5, 2026, '2026-05-05', 'pendiente');

  INSERT INTO cuentas_por_cobrar (inmueble_id, contrato_id, concepto, monto,
    periodo_mes, periodo_anio, fecha_limite_cobro, estatus)
  VALUES (inm2, ct2, 'Renta mayo 2026 — Diego Soria (Depto Reforma)', 14000,
    5, 2026, '2026-05-05', 'pendiente');

  INSERT INTO cuentas_por_cobrar (inmueble_id, contrato_id, concepto, monto,
    periodo_mes, periodo_anio, fecha_limite_cobro, estatus)
  VALUES (inm3, ct3, 'Renta mayo 2026 — Comercializadora Nortex (Local 5 de Mayo)', 12000,
    5, 2026, '2026-05-05', 'pendiente');

  INSERT INTO cuentas_por_cobrar (inmueble_id, contrato_id, concepto, monto,
    periodo_mes, periodo_anio, fecha_limite_cobro, estatus)
  VALUES (inm4, ct4, 'Renta mayo 2026 — Logística Express (Bodega Colosio)', 22000,
    5, 2026, '2026-05-05', 'pendiente');

  INSERT INTO cuentas_por_cobrar (inmueble_id, contrato_id, concepto, monto,
    periodo_mes, periodo_anio, fecha_limite_cobro, estatus)
  VALUES (inm5, ctp1, 'Renta mayo 2026 — Dr. Pérez Consultorio (Plaza Los Pinos Ofic. 1)', 9500,
    5, 2026, '2026-05-05', 'pendiente');

  INSERT INTO cuentas_por_cobrar (inmueble_id, contrato_id, concepto, monto,
    periodo_mes, periodo_anio, fecha_limite_cobro, estatus)
  VALUES (inm5, ctp2, 'Renta mayo 2026 — Notaría 42 (Plaza Los Pinos Ofic. 2)', 11000,
    5, 2026, '2026-05-05', 'pendiente');

  INSERT INTO cuentas_por_cobrar (inmueble_id, contrato_id, concepto, monto,
    periodo_mes, periodo_anio, fecha_limite_cobro, estatus)
  VALUES (inm5, ctp3, 'Renta mayo 2026 — Seguros Metropolitana (Plaza Los Pinos Ofic. 3)', 9000,
    5, 2026, '2026-05-05', 'pendiente');

  -- ================================================================
  -- 11. CUENTAS BANCARIAS (5)
  -- ================================================================
  INSERT INTO cuentas_bancarias (alias, titular, banco, clabe, numero_cuenta, saldo_inicial, saldo_actual, notas)
  VALUES ('Operativa Principal', 'Oficina Financiera TS', 'BBVA',
    '012310004123456789', '1234567890', 150000, 150000, 'Cuenta de operación diaria');

  INSERT INTO cuentas_bancarias (alias, titular, banco, clabe, numero_cuenta, saldo_inicial, saldo_actual, notas)
  VALUES ('Nómina y Gastos', 'Oficina Financiera TS', 'Santander',
    '014310009876543210', '9876543210', 80000, 80000, 'Pago de nómina y gastos de oficina');

  INSERT INTO cuentas_bancarias (alias, titular, banco, clabe, numero_cuenta, saldo_inicial, saldo_actual, notas)
  VALUES ('Reservas e Inversiones', 'Oficina Financiera TS', 'Banamex',
    '002310001122334455', '1122334455', 500000, 500000, 'Reserva de capital e inversiones');

  INSERT INTO cuentas_bancarias (alias, titular, banco, clabe, numero_cuenta, saldo_inicial, saldo_actual, notas)
  VALUES ('Recuperación de Cartera', 'Oficina Financiera TS', 'Banorte',
    '006310005566778899', '5566778899', 200000, 200000, 'Depósito de pagos de préstamos');

  INSERT INTO cuentas_bancarias (alias, titular, banco, clabe, numero_cuenta, saldo_inicial, saldo_actual, notas)
  VALUES ('Fondo de Emergencias', 'Oficina Financiera TS', 'HSBC',
    '021310008877665544', '8877665544', 50000, 50000, 'Reserva para contingencias');

  -- ================================================================
  -- 12. CAJA CHICA — apertura $5,000
  -- ================================================================
  INSERT INTO movimientos_caja (tipo, concepto, monto, fecha, encargado, categoria_id, notas)
  SELECT 'entrada', 'Apertura de caja chica — fondo inicial de operación', 5000,
    '2026-05-01', 'Sebastian', id,
    'Capital inicial para gastos menores del mes de mayo 2026'
  FROM categorias_movimiento
  WHERE nombre = 'Reposición de caja'
  LIMIT 1;

  -- ================================================================
  -- 13. EMPLEADOS (4)
  -- ================================================================
  INSERT INTO empleados (nombre, puesto, sueldo_semanal, estatus, fecha_ingreso, notas)
  VALUES ('José Torres Ibarra', 'Gerente General', 200000, 'Activo', '2020-01-15',
    'Conocido como Pepe Torres. Responsable de operaciones generales.')
  RETURNING id INTO emp1;

  INSERT INTO empleados (nombre, puesto, sueldo_semanal, estatus, fecha_ingreso)
  VALUES ('Laura Mendoza Rivas', 'Asistente Administrativa', 8000, 'Activo', '2022-03-01')
  RETURNING id INTO emp2;

  INSERT INTO empleados (nombre, puesto, sueldo_semanal, estatus, fecha_ingreso)
  VALUES ('Carlos Ramos Ortiz', 'Auxiliar Contable', 6500, 'Activo', '2023-06-15')
  RETURNING id INTO emp3;

  INSERT INTO empleados (nombre, puesto, sueldo_semanal, estatus, fecha_ingreso)
  VALUES ('Ana Fuentes Castillo', 'Recepcionista', 5500, 'Activo', '2024-01-10')
  RETURNING id INTO emp4;

  -- ================================================================
  -- 14. NÓMINA — Pepe Torres semana 5–11 mayo 2026
  -- ================================================================
  INSERT INTO nominas_pagadas (empleado_id, semana_inicio, semana_fin, sueldo_base,
    monto_total_pagado, forma_pago, fecha_pago, notas)
  VALUES (emp1, '2026-05-05', '2026-05-11', 200000,
    200000, 'transferencia', '2026-05-12',
    'Nómina semanal gerencia — primera semana de operaciones');

  -- ================================================================
  -- 15. CRÉDITO BANCARIO — $1M al 14% anual fijo a 5 años
  -- Cuota mensual ≈ $23,268 (anualidad: P * r/12 / (1-(1+r/12)^-60))
  -- ================================================================
  INSERT INTO creditos_bancarios (banco, alias_credito, monto_original, saldo_actual,
    tipo_tasa, esquema_pago, cuota_base_mensual, dia_corte, activo)
  VALUES ('BBVA', 'Crédito Hipotecario Edificio Central',
    1000000, 1000000, 'Fija', 'Pagos Fijos', 23268, 1, true);

END $$;
