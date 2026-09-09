import { Request, Response } from 'express';
import pool from '../config/database';
import {
  CrearReferenciadorDto,
  EditarReferenciadorDto,
} from '../models/referenciador.model';

// Escapa los wildcards de LIKE/ILIKE (% _ \) en entradas de búsqueda.
const escapeLikeWildcards = (s: string): string => s.replace(/[\\%_]/g, '\\$&');

// ================================================================
// REFERENCIADORES
// La persona que trae inversiones o préstamos. Registro y consulta.
// No paga ni calcula comisiones (eso es motor / cuentas por pagar).
// ================================================================

// ----------------------------------------------------------------
// Listar referenciadores con búsqueda, filtro de forma y paginación
// GET /api/referenciadores?buscar=&forma=2|3&pagina=&limite=
//   forma 2 = inversionista y referenciador (inversionista_id lleno)
//   forma 3 = solo referenciador            (inversionista_id NULL)
//   La forma 1 (solo inversionista) no es referenciador; vive en
//   /api/inversionistas. La lista combinada de las tres es de M5 (ui).
// ----------------------------------------------------------------
export const listarReferenciadores = async (req: Request, res: Response): Promise<void> => {
  try {
    const buscar = (req.query.buscar as string) || '';
    const forma  = (req.query.forma  as string) || '';
    const pagina = Math.max(1, parseInt(req.query.pagina as string) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(req.query.limite as string) || 20));
    const offset = (pagina - 1) * limite;

    const condiciones: string[] = [];
    const valores: (string | number)[] = [];
    let indice = 1;

    if (buscar) {
      condiciones.push(`(
        r.nombres           ILIKE $${indice} ESCAPE '\\'
        OR r.apellido_paterno ILIKE $${indice} ESCAPE '\\'
        OR r.apellido_materno ILIKE $${indice} ESCAPE '\\'
        OR r.telefono         ILIKE $${indice} ESCAPE '\\'
        OR r.correo           ILIKE $${indice} ESCAPE '\\'
      )`);
      valores.push(`%${escapeLikeWildcards(String(buscar))}%`);
      indice++;
    }

    if (forma === '2') {
      condiciones.push('r.inversionista_id IS NOT NULL');
    } else if (forma === '3') {
      condiciones.push('r.inversionista_id IS NULL');
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM referenciadores r ${where}`,
      valores
    );
    const total = parseInt(totalResult.rows[0].count, 10);

    const resultado = await pool.query(
      `SELECT
          r.id,
          r.nombres,
          r.apellido_paterno,
          r.apellido_materno,
          r.telefono,
          r.correo,
          r.numero_cuenta,
          r.banco,
          r.inversionista_id,
          r.activo,
          CASE WHEN r.inversionista_id IS NULL THEN 3 ELSE 2 END AS forma
        FROM referenciadores r
        ${where}
        ORDER BY r.apellido_paterno ASC, r.nombres ASC
        LIMIT $${indice} OFFSET $${indice + 1}`,
      [...valores, limite, offset]
    );

    res.json({
      success: true,
      data: {
        referenciadores: resultado.rows,
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      },
      error: null,
    });
  } catch (error) {
    console.error('Error al listar referenciadores:', error);
    res.status(500).json({ success: false, data: null, error: 'Error interno al obtener referenciadores.' });
  }
};

// ----------------------------------------------------------------
// Obtener un referenciador por id, con sus referencias (M23)
// GET /api/referenciadores/:id
//   Contrato de MODULO.md: detalle + sus referencias. Una fila por
//   origen, nunca agregado por persona (R16). origen_nombre viene del
//   inversionista de la inversión o del cliente del préstamo.
// ----------------------------------------------------------------
export const obtenerReferenciador = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      'SELECT * FROM referenciadores WHERE id = $1',
      [id]
    );

    if (resultado.rowCount === 0) {
      res.status(404).json({ success: false, data: null, error: 'Referenciador no encontrado.' });
      return;
    }

    const referencias = await pool.query(
      `SELECT
          ref.id,
          ref.referenciador_id,
          ref.tipo_referido,
          ref.inversion_id,
          ref.prestamo_id,
          ref.tasa,
          ref.estado,
          ref.fecha_inicio,
          ref.fecha_fin,
          ref.notas,
          ref.registrado_por,
          ref.fecha_registro,
          CASE WHEN ref.tipo_referido = 'inversion' THEN
            CONCAT(pi.nombres, ' ', pi.apellido_paterno,
              CASE WHEN pi.apellido_materno IS NOT NULL THEN ' ' || pi.apellido_materno ELSE '' END)
          ELSE
            CONCAT(c.nombres, ' ', c.apellido_paterno,
              CASE WHEN c.apellido_materno IS NOT NULL THEN ' ' || c.apellido_materno ELSE '' END)
          END AS origen_nombre
        FROM referencias ref
        LEFT JOIN inversiones inv     ON inv.id = ref.inversion_id
        LEFT JOIN inversionistas pi   ON pi.id  = inv.inversionista_id
        LEFT JOIN prestamos pr        ON pr.id  = ref.prestamo_id
        LEFT JOIN clientes c          ON c.id   = pr.cliente_id
        WHERE ref.referenciador_id = $1
        ORDER BY ref.fecha_inicio DESC, ref.fecha_registro DESC`,
      [id]
    );

    res.json({
      success: true,
      data: { ...resultado.rows[0], referencias: referencias.rows },
      error: null,
    });
  } catch (error) {
    console.error('Error al obtener referenciador:', error);
    res.status(500).json({ success: false, data: null, error: 'Error interno al obtener el referenciador.' });
  }
};

// ----------------------------------------------------------------
// Crear referenciador (alta)
// POST /api/referenciadores
//   inversionista_id opcional: si viene, liga a la fila de la misma
//   persona en inversionistas (forma 2). Sin él, forma 3 (sin capital).
// ----------------------------------------------------------------
export const crearReferenciador = async (req: Request, res: Response): Promise<void> => {
  try {
    const registrado_por = req.usuario?.userId;
    const datos: CrearReferenciadorDto = req.body;

    if (!datos.nombres?.trim() || !datos.apellido_paterno?.trim()) {
      res.status(400).json({ success: false, data: null, error: 'Los campos nombres y apellido_paterno son obligatorios.' });
      return;
    }

    const inversionistaId = datos.inversionista_id?.trim() || null;
    if (inversionistaId) {
      const existe = await pool.query('SELECT id FROM inversionistas WHERE id = $1', [inversionistaId]);
      if (existe.rowCount === 0) {
        res.status(400).json({ success: false, data: null, error: 'El inversionista ligado no existe.' });
        return;
      }
    }

    const resultado = await pool.query(
      `INSERT INTO referenciadores
         (nombres, apellido_paterno, apellido_materno, telefono, correo,
          direccion, url_ine, numero_cuenta, banco, inversionista_id, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        datos.nombres.trim(),
        datos.apellido_paterno.trim(),
        datos.apellido_materno?.trim()     || null,
        datos.telefono?.trim()             || null,
        datos.correo?.toLowerCase().trim() || null,
        datos.direccion?.trim()            || null,
        datos.url_ine?.trim()              || null,
        datos.numero_cuenta?.trim()        || null,
        datos.banco?.trim()                || null,
        inversionistaId,
        registrado_por                     || null,
      ]
    );

    res.status(201).json({ success: true, data: resultado.rows[0], error: null });
  } catch (error) {
    console.error('Error al crear referenciador:', error);
    res.status(500).json({ success: false, data: null, error: 'Error interno al registrar el referenciador.' });
  }
};

// ----------------------------------------------------------------
// Editar referenciador (datos personales, bancarios y baja por estado)
// PATCH /api/referenciadores/:id
//   `activo=false` es la baja (P6): nunca se borra la fila.
// ----------------------------------------------------------------
export const editarReferenciador = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const datos: EditarReferenciadorDto = req.body;

    const existe = await pool.query('SELECT id FROM referenciadores WHERE id = $1', [id]);
    if (existe.rowCount === 0) {
      res.status(404).json({ success: false, data: null, error: 'Referenciador no encontrado.' });
      return;
    }

    const inversionistaId = datos.inversionista_id?.trim() || null;
    if (inversionistaId) {
      const invExiste = await pool.query('SELECT id FROM inversionistas WHERE id = $1', [inversionistaId]);
      if (invExiste.rowCount === 0) {
        res.status(400).json({ success: false, data: null, error: 'El inversionista ligado no existe.' });
        return;
      }
    }

    const resultado = await pool.query(
      `UPDATE referenciadores SET
          nombres             = COALESCE($1, nombres),
          apellido_paterno    = COALESCE($2, apellido_paterno),
          apellido_materno    = COALESCE($3, apellido_materno),
          telefono            = COALESCE($4, telefono),
          correo              = COALESCE($5, correo),
          direccion           = COALESCE($6, direccion),
          url_ine             = COALESCE($7, url_ine),
          numero_cuenta       = COALESCE($8, numero_cuenta),
          banco               = COALESCE($9, banco),
          inversionista_id    = COALESCE($10, inversionista_id),
          activo              = COALESCE($11, activo),
          fecha_actualizacion = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        datos.nombres?.trim()              || null,
        datos.apellido_paterno?.trim()     || null,
        datos.apellido_materno?.trim()     || null,
        datos.telefono?.trim()             || null,
        datos.correo?.toLowerCase().trim() || null,
        datos.direccion?.trim()            || null,
        datos.url_ine?.trim()              || null,
        datos.numero_cuenta?.trim()        || null,
        datos.banco?.trim()                || null,
        inversionistaId,
        typeof datos.activo === 'boolean' ? datos.activo : null,
        id,
      ]
    );

    res.json({ success: true, data: resultado.rows[0], error: null });
  } catch (error) {
    console.error('Error al editar referenciador:', error);
    res.status(500).json({ success: false, data: null, error: 'Error interno al actualizar el referenciador.' });
  }
};
