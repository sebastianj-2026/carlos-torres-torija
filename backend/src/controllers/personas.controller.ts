import { Request, Response } from 'express';
import pool from '../config/database';

// ============================================================================
// Módulo personas (slice) — CRUD de personas y alta de aportaciones.
// P-003. Ver docs/modulos/personas/MODULO.md + REGLAS.md.
// Dinero (monto/tasas) se valida por regex y se pasa como string a NUMERIC:
// nunca se hace aritmética de dinero en JS (regla dinero-sin-float).
// ============================================================================

// Escapa wildcards de LIKE/ILIKE en entradas de búsqueda.
const escapeLikeWildcards = (s: string): string => s.replace(/[\\%_]/g, '\\$&');

// $ > 0 con hasta 2 decimales, como texto. No parsea a float.
const MONEY_REGEX = /^(?:0*[1-9][0-9]*|0*[1-9][0-9]*\.[0-9]{1,2}|0*0?\.(?:0[1-9]|[1-9][0-9]?))$/;
// Tasa mensual decimal, 0..9.9999 con hasta 4 decimales (ej. 0.0200).
const RATE_REGEX = /^[0-9](?:\.[0-9]{1,4})?$/;

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;

// ----------------------------------------------------------------
// GET /api/personas?buscar=
// ----------------------------------------------------------------
export const listarPersonas = async (req: Request, res: Response): Promise<void> => {
  try {
    const buscarRaw = req.query.buscar;
    const buscar = typeof buscarRaw === 'string' ? buscarRaw.trim() : '';

    const params: string[] = [];
    let where = 'WHERE activo';
    if (buscar) {
      params.push(`%${escapeLikeWildcards(buscar)}%`);
      where += ` AND (nombre ILIKE $1 OR apellido_paterno ILIKE $1 OR apellido_materno ILIKE $1)`;
    }

    const result = await pool.query(
      `SELECT id, nombre, apellido_paterno, apellido_materno, telefono, correo,
              direccion, creado_en
         FROM personas
         ${where}
         ORDER BY apellido_paterno, nombre`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar personas:', error);
    res.status(500).json({ mensaje: 'Error interno al listar personas.' });
  }
};

// ----------------------------------------------------------------
// GET /api/personas/:id — detalle + aportaciones como inversionista
// ----------------------------------------------------------------
export const obtenerPersona = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const personaRes = await pool.query(
      `SELECT id, nombre, apellido_paterno, apellido_materno, telefono, correo,
              direccion, activo, creado_en, actualizado_en
         FROM personas WHERE id = $1`,
      [id]
    );
    if (personaRes.rowCount === 0) {
      res.status(404).json({ mensaje: 'Persona no encontrada.' });
      return;
    }

    const aportacionesRes = await pool.query(
      `SELECT id, monto, fecha, tasa_inversionista, referenciador_id,
              tasa_referenciador, contrato_id, estado, creado_en
         FROM aportaciones
        WHERE inversionista_id = $1
        ORDER BY fecha DESC`,
      [id]
    );

    res.json({ ...personaRes.rows[0], aportaciones: aportacionesRes.rows });
  } catch (error) {
    console.error('Error al obtener persona:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener la persona.' });
  }
};

// ----------------------------------------------------------------
// POST /api/personas
// ----------------------------------------------------------------
export const crearPersona = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, apellido_paterno, apellido_materno, telefono, correo, direccion } = req.body;

    if (!isNonEmptyString(nombre) || !isNonEmptyString(apellido_paterno) || !isNonEmptyString(telefono)) {
      res.status(400).json({ mensaje: 'nombre, apellido_paterno y telefono son obligatorios.' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO personas (nombre, apellido_paterno, apellido_materno, telefono, correo, direccion)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, apellido_paterno, apellido_materno, telefono, correo, direccion, creado_en`,
      [
        nombre.trim(),
        apellido_paterno.trim(),
        apellido_materno ?? null,
        telefono.trim(),
        correo ?? null,
        direccion ?? null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    // P1: índice único de identidad (nombre+apellido+telefono).
    if (error?.code === '23505') {
      res.status(409).json({ mensaje: 'Ya existe una persona con ese nombre y teléfono.' });
      return;
    }
    console.error('Error al crear persona:', error);
    res.status(500).json({ mensaje: 'Error interno al crear la persona.' });
  }
};

// ----------------------------------------------------------------
// PATCH /api/personas/:id
// ----------------------------------------------------------------
export const editarPersona = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const campos: Record<string, unknown> = {};
    for (const k of ['nombre', 'apellido_paterno', 'apellido_materno', 'telefono', 'correo', 'direccion', 'activo']) {
      if (k in req.body) campos[k] = req.body[k];
    }
    const keys = Object.keys(campos);
    if (keys.length === 0) {
      res.status(400).json({ mensaje: 'Nada que actualizar.' });
      return;
    }

    const set = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const result = await pool.query(
      `UPDATE personas SET ${set}, actualizado_en = now()
        WHERE id = $1
        RETURNING id, nombre, apellido_paterno, apellido_materno, telefono, correo, direccion, activo, actualizado_en`,
      [id, ...keys.map((k) => campos[k])]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ mensaje: 'Persona no encontrada.' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    if (error?.code === '23505') {
      res.status(409).json({ mensaje: 'Ya existe una persona con ese nombre y teléfono.' });
      return;
    }
    console.error('Error al editar persona:', error);
    res.status(500).json({ mensaje: 'Error interno al editar la persona.' });
  }
};

// ----------------------------------------------------------------
// POST /api/personas/:id/aportaciones
// :id es el inversionista. referenciador_id + tasa opcionales (P6/P7).
// ----------------------------------------------------------------
export const crearAportacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // inversionista_id
    const { monto, fecha, tasa_inversionista, referenciador_id, tasa_referenciador, contrato_id } = req.body;

    // Dinero/tasa validados como texto — sin aritmética de float.
    if (!isNonEmptyString(monto) || !MONEY_REGEX.test(monto.trim())) {
      res.status(400).json({ mensaje: 'monto debe ser un importe positivo con hasta 2 decimales (texto).' });
      return;
    }
    if (!isNonEmptyString(fecha)) {
      res.status(400).json({ mensaje: 'fecha es obligatoria (YYYY-MM-DD).' });
      return;
    }
    if (!isNonEmptyString(tasa_inversionista) || !RATE_REGEX.test(tasa_inversionista.trim())) {
      res.status(400).json({ mensaje: 'tasa_inversionista inválida (ej. 0.0200).' });
      return;
    }

    // P6/P7: referenciador y su tasa van juntos o ninguno.
    const tieneRef = referenciador_id !== undefined && referenciador_id !== null && `${referenciador_id}` !== '';
    const tieneTasaRef = isNonEmptyString(tasa_referenciador);
    if (tieneRef !== tieneTasaRef) {
      res.status(400).json({ mensaje: 'referenciador_id y tasa_referenciador van juntos o ninguno.' });
      return;
    }
    if (tieneRef) {
      if (!/^[1-9][0-9]*$/.test(`${referenciador_id}`)) {
        res.status(400).json({ mensaje: 'referenciador_id inválido.' });
        return;
      }
      if (`${referenciador_id}` === `${id}`) {
        res.status(400).json({ mensaje: 'Una persona no puede referirse a sí misma (P7).' });
        return;
      }
      if (!RATE_REGEX.test(tasa_referenciador.trim())) {
        res.status(400).json({ mensaje: 'tasa_referenciador inválida (ej. 0.0050).' });
        return;
      }
    }

    const result = await pool.query(
      `INSERT INTO aportaciones
         (inversionista_id, monto, fecha, tasa_inversionista, referenciador_id, tasa_referenciador, contrato_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, inversionista_id, monto, fecha, tasa_inversionista,
                 referenciador_id, tasa_referenciador, contrato_id, estado, creado_en`,
      [
        id,
        monto.trim(),
        fecha.trim(),
        tasa_inversionista.trim(),
        tieneRef ? `${referenciador_id}` : null,
        tieneRef ? tasa_referenciador.trim() : null,
        contrato_id ?? null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    // FK de inversionista/referenciador inexistente.
    if (error?.code === '23503') {
      res.status(400).json({ mensaje: 'inversionista_id o referenciador_id no existe.' });
      return;
    }
    // CHECK constraints (monto>0, no_auto_referencia, tasa_ref_coherente).
    if (error?.code === '23514') {
      res.status(400).json({ mensaje: 'La aportación viola una restricción de negocio.' });
      return;
    }
    console.error('Error al crear aportación:', error);
    res.status(500).json({ mensaje: 'Error interno al crear la aportación.' });
  }
};
