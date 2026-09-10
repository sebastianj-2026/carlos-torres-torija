import { Request, Response } from 'express';
import pool from '../config/database';
import {
  CrearReferenciaDto,
  EditarReferenciaDto,
  EstadoReferencia,
} from '../models/referencia.model';

// Valida que un valor (string o número) sea un decimal > 0 dentro del rango de
// NUMERIC(5,2) — hasta 999.99 con 2 decimales. Devuelve el string normalizado
// para insertarlo tal cual (el motor lo opera con Decimal, no float).
const tasaValida = (valor: unknown): string | null => {
  if (valor === null || valor === undefined || valor === '') return null;
  const s = String(valor).trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || n > 999.99) return null;
  return s;
};

// UUID v4-agnóstico: rechaza antes de la DB para responder 400, no 500 (22P02)
const esUuid = (s: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// Fecha calendario real en formato YYYY-MM-DD
const esFecha = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// ================================================================
// REFERENCIAS
// El vínculo referenciador ↔ inversión|préstamo. Un solo referenciador
// por origen (P3). Opcional en cada origen y no se hereda (P4).
// ================================================================

// ----------------------------------------------------------------
// Crear referencia (ligar referenciador a inversión o préstamo)
// POST /api/referencias
// ----------------------------------------------------------------
export const crearReferencia = async (req: Request, res: Response): Promise<void> => {
  try {
    const registrado_por = req.usuario?.userId;
    const datos: CrearReferenciaDto = req.body;

    // Referenciador
    const referenciadorId = datos.referenciador_id?.trim();
    if (!referenciadorId) {
      res.status(400).json({ success: false, data: null, error: 'Falta el referenciador.' });
      return;
    }
    if (!esUuid(referenciadorId)) {
      res.status(400).json({ success: false, data: null, error: 'El id del referenciador no es un UUID válido.' });
      return;
    }
    const refExiste = await pool.query('SELECT id FROM referenciadores WHERE id = $1', [referenciadorId]);
    if (refExiste.rowCount === 0) {
      res.status(400).json({ success: false, data: null, error: 'El referenciador no existe.' });
      return;
    }

    // Tipo de referido y coherencia de origen (espeja ref_origen_coherente)
    const tipo = datos.tipo_referido;
    if (tipo !== 'inversion' && tipo !== 'prestamo') {
      res.status(400).json({ success: false, data: null, error: 'El tipo de referido debe ser inversion o prestamo.' });
      return;
    }

    const inversionId = datos.inversion_id?.trim() || null;
    const prestamoId  = datos.prestamo_id?.trim()  || null;

    if (tipo === 'inversion' && (!inversionId || prestamoId)) {
      res.status(400).json({ success: false, data: null, error: 'Una referencia de inversión requiere inversion_id y ningún prestamo_id.' });
      return;
    }
    if (tipo === 'prestamo' && (!prestamoId || inversionId)) {
      res.status(400).json({ success: false, data: null, error: 'Una referencia de préstamo requiere prestamo_id y ningún inversion_id.' });
      return;
    }
    if ((inversionId && !esUuid(inversionId)) || (prestamoId && !esUuid(prestamoId))) {
      res.status(400).json({ success: false, data: null, error: 'El id del origen no es un UUID válido.' });
      return;
    }

    // El origen debe existir
    if (tipo === 'inversion') {
      const existe = await pool.query('SELECT id FROM inversiones WHERE id = $1', [inversionId]);
      if (existe.rowCount === 0) {
        res.status(400).json({ success: false, data: null, error: 'La inversión ligada no existe.' });
        return;
      }
    } else {
      const existe = await pool.query('SELECT id FROM prestamos WHERE id = $1', [prestamoId]);
      if (existe.rowCount === 0) {
        res.status(400).json({ success: false, data: null, error: 'El préstamo ligado no existe.' });
        return;
      }
    }

    // Tasa: porcentaje > 0, como string
    const tasa = tasaValida(datos.tasa);
    if (!tasa) {
      res.status(400).json({ success: false, data: null, error: 'La tasa debe ser un porcentaje mayor a cero, hasta 999.99, con máximo 2 decimales.' });
      return;
    }

    // fecha_inicio la genera el servidor (convención): CURRENT_DATE.
    const resultado = await pool.query(
      `INSERT INTO referencias
         (referenciador_id, tipo_referido, inversion_id, prestamo_id,
          tasa, fecha_inicio, notas, registrado_por)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7)
       RETURNING *`,
      [
        referenciadorId,
        tipo,
        inversionId,
        prestamoId,
        tasa,
        datos.notas?.trim() || null,
        registrado_por      || null,
      ]
    );

    res.status(201).json({ success: true, data: resultado.rows[0], error: null });
  } catch (error) {
    // P3: un solo referenciador por origen (UNIQUE ref_unica_inversion/prestamo)
    const pgError = error as { code?: string; constraint?: string };
    if (pgError.code === '23505') {
      const origen = pgError.constraint === 'ref_unica_prestamo' ? 'préstamo' : 'inversión';
      res.status(409).json({
        success: false,
        data: null,
        error: `Esta ${origen} ya tiene un referenciador ligado. Sólo se permite uno (un solo nivel).`,
      });
      return;
    }
    console.error('Error al crear referencia:', error);
    res.status(500).json({ success: false, data: null, error: 'Error interno al registrar la referencia.' });
  }
};

// ----------------------------------------------------------------
// Editar referencia (estado, tasa, fecha_fin, notas — R9)
// PATCH /api/referencias/:id
//   No mueve el origen ni el referenciador. La baja es cambio de estado.
// ----------------------------------------------------------------
export const editarReferencia = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const datos: EditarReferenciaDto = req.body;

    if (!esUuid(id)) {
      res.status(400).json({ success: false, data: null, error: 'El id de la referencia no es un UUID válido.' });
      return;
    }

    const existe = await pool.query('SELECT id, estado FROM referencias WHERE id = $1', [id]);
    if (existe.rowCount === 0) {
      res.status(404).json({ success: false, data: null, error: 'Referencia no encontrada.' });
      return;
    }
    const estadoActual: EstadoReferencia = existe.rows[0].estado;

    // M29 (⛔5=A): estados solo hacia adelante — activa → terminada|cancelada.
    // Una referencia terminada o cancelada no se revive.
    let estado: EstadoReferencia | null = null;
    if (datos.estado !== undefined) {
      const validos: EstadoReferencia[] = ['activa', 'terminada', 'cancelada'];
      if (!validos.includes(datos.estado)) {
        res.status(400).json({ success: false, data: null, error: 'Estado no válido.' });
        return;
      }
      if (datos.estado !== estadoActual && estadoActual !== 'activa') {
        res.status(400).json({
          success: false, data: null,
          error: `Una referencia ${estadoActual} no puede cambiar de estado. Las transiciones solo van hacia adelante.`,
        });
        return;
      }
      estado = datos.estado;
    }

    // M29 (⛔5=A): la tasa solo se edita mientras la referencia está activa
    let tasa: string | null = null;
    if (datos.tasa !== undefined) {
      if (estadoActual !== 'activa') {
        res.status(400).json({
          success: false, data: null,
          error: `La tasa no se edita en una referencia ${estadoActual}.`,
        });
        return;
      }
      tasa = tasaValida(datos.tasa);
      if (!tasa) {
        res.status(400).json({ success: false, data: null, error: 'La tasa debe ser un porcentaje mayor a cero, hasta 999.99, con máximo 2 decimales.' });
        return;
      }
    }

    // fecha_fin, si viene, debe ser fecha real YYYY-MM-DD
    const fechaFin = datos.fecha_fin?.trim() || null;
    if (fechaFin && !esFecha(fechaFin)) {
      res.status(400).json({ success: false, data: null, error: 'La fecha de fin debe tener formato AAAA-MM-DD y ser una fecha válida.' });
      return;
    }

    const resultado = await pool.query(
      `UPDATE referencias SET
          estado    = COALESCE($1, estado),
          tasa      = COALESCE($2, tasa),
          fecha_fin = COALESCE($3, fecha_fin),
          notas     = COALESCE($4, notas)
       WHERE id = $5
       RETURNING *`,
      [
        estado,
        tasa,
        fechaFin,
        datos.notas?.trim() || null,
        id,
      ]
    );

    res.json({ success: true, data: resultado.rows[0], error: null });
  } catch (error) {
    console.error('Error al editar referencia:', error);
    res.status(500).json({ success: false, data: null, error: 'Error interno al actualizar la referencia.' });
  }
};
