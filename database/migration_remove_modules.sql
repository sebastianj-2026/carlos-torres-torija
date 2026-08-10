-- ============================================================================
-- migration_remove_modules.sql
-- Elimina de la base los módulos: Inmobiliaria (inmuebles/inquilinos/contratos/
-- CxC inmuebles), Cancha de fútbol, Estacionamiento/Pensiones, Deudas bancarias
-- y Créditos bancarios.
--
-- Idempotente (IF EXISTS). CASCADE para soltar las FKs entrantes desde tablas
-- que se conservan (cuentas_por_pagar.inmueble_id / .deuda_id — las columnas
-- quedan huérfadas pero se conservan; ya no tienen constraint).
-- Las tablas de ingresos_hub (pensiones_estacionamiento, metricas_cancha,
-- movimientos_extras_pension, ingresos_directos) y historial_ingresos (legacy)
-- no existen en Neon: los DROP IF EXISTS son no-op.
-- ============================================================================

BEGIN;

-- 1. Vista CxC inmuebles (depende de contratos/inquilinos/inmuebles)
DROP VIEW IF EXISTS cxc_inmuebles;

-- 2. Inmobiliaria + CxC inmuebles (hijos → padres)
DROP TABLE IF EXISTS cuentas_por_cobrar      CASCADE;
DROP TABLE IF EXISTS contratos_arrendamiento CASCADE;
DROP TABLE IF EXISTS inquilinos              CASCADE;
DROP TABLE IF EXISTS inmuebles               CASCADE;

-- 3. Cancha de fútbol
DROP TABLE IF EXISTS metricas_cancha CASCADE;
DROP TABLE IF EXISTS cortes_cancha   CASCADE;

-- 4. Estacionamiento / pensiones
DROP TABLE IF EXISTS movimientos_extras_pension CASCADE;
DROP TABLE IF EXISTS pensiones_estacionamiento  CASCADE;
DROP TABLE IF EXISTS cortes_estacionamiento     CASCADE;

-- 5. Deudas y créditos bancarios (CASCADE suelta cuentas_por_pagar.deuda_id FK)
DROP TABLE IF EXISTS deudas_bancarias   CASCADE;
DROP TABLE IF EXISTS creditos_bancarios CASCADE;

-- 6. Funciones de mantenimiento de esos módulos
DROP FUNCTION IF EXISTS marcar_cobros_vencidos()    CASCADE;
DROP FUNCTION IF EXISTS marcar_contratos_vencidos() CASCADE;
DROP FUNCTION IF EXISTS marcar_pensiones_vencidas() CASCADE;

-- 7. Limpieza de ledgers compartidos (se conservan; solo se borran filas de módulos eliminados)
DELETE FROM historial_ingresos_central WHERE origen IN ('Inmueble', 'Cancha', 'Estacionamiento');
DELETE FROM historial_pagos_global      WHERE modulo_origen = 'renta';

COMMIT;
