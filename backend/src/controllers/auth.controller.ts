import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

// Mapa en memoria para rastrear intentos fallidos de login
// Estructura: { correo: { intentos: number, bloqueadoHasta: Date | null } }
// TODO: migrar a Redis para persistencia entre reinicios
const intentosFallidos: Map<string, { intentos: number; bloqueadoHasta: Date | null }> = new Map();

const MAX_INTENTOS = 5;
const TIEMPO_BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos en milisegundos

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      res.status(400).json({ mensaje: 'Correo y contraseña son requeridos.' });
      return;
    }

    // Verificar si el usuario está bloqueado por intentos fallidos
    const registroIntentos = intentosFallidos.get(correo);
    if (registroIntentos?.bloqueadoHasta) {
      const ahora = new Date();
      if (ahora < registroIntentos.bloqueadoHasta) {
        res.status(429).json({
          mensaje: 'Credenciales incorrectas o cuenta temporalmente bloqueada. Intente más tarde.',
          bloqueado: true,
        });
        return;
      } else {
        // El bloqueo ya expiró, reiniciar conteo
        intentosFallidos.delete(correo);
      }
    }

    // Buscar usuario por correo en la base de datos
    const resultado = await pool.query(
      'SELECT id, nombre_completo, correo, password_hash, rol, activo FROM usuarios WHERE correo = $1',
      [correo]
    );

    // Mensaje genérico para no revelar si el correo existe o no
    const mensajeError = 'Credenciales incorrectas, intente de nuevo.';

    if (resultado.rows.length === 0) {
      registrarIntentoFallido(correo);
      res.status(401).json({ mensaje: mensajeError });
      return;
    }

    const usuario = resultado.rows[0];

    // Verificar que el usuario esté activo
    if (!usuario.activo) {
      res.status(401).json({ mensaje: mensajeError });
      return;
    }

    // Verificar contraseña con bcrypt
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      registrarIntentoFallido(correo);
      const registro = intentosFallidos.get(correo);
      const intentosRestantes = MAX_INTENTOS - (registro?.intentos ?? 0);

      if (intentosRestantes <= 0) {
        res.status(401).json({
          mensaje: 'Credenciales incorrectas o cuenta temporalmente bloqueada. Intente más tarde.',
        });
      } else {
        res.status(401).json({ mensaje: mensajeError });
      }
      return;
    }

    // Credenciales válidas: reiniciar intentos fallidos
    intentosFallidos.delete(correo);

    // Generar JWT con los datos del usuario
    const secreto = process.env.JWT_SECRET as string;
    const expiracion = process.env.JWT_EXPIRES_IN || '8h';

    const token = jwt.sign(
      {
        userId: usuario.id,
        nombre: usuario.nombre_completo,
        correo: usuario.correo,
        rol: usuario.rol,
      },
      secreto,
      { expiresIn: expiracion } as jwt.SignOptions
    );

    // Registrar acceso en la bitácora
    const ipAddress = req.ip || req.socket.remoteAddress || 'desconocida';
    await pool.query(
      'INSERT INTO bitacora_accesos (usuario_id, accion, ip_address) VALUES ($1, $2, $3)',
      [usuario.id, 'LOGIN', ipAddress]
    );

    res.status(200).json({
      mensaje: 'Autenticación exitosa.',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre_completo,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
};

// POST /api/auth/logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;

    if (usuario) {
      // Registrar cierre de sesión en la bitácora
      const ipAddress = req.ip || req.socket.remoteAddress || 'desconocida';
      await pool.query(
        'INSERT INTO bitacora_accesos (usuario_id, accion, ip_address) VALUES ($1, $2, $3)',
        [usuario.userId, 'LOGOUT', ipAddress]
      );
    }

    res.status(200).json({ mensaje: 'Sesión cerrada correctamente.' });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
};

// GET /api/auth/me
export const obtenerUsuarioActual = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;

    if (!usuario) {
      res.status(401).json({ mensaje: 'No autorizado.' });
      return;
    }

    // Obtener datos actualizados del usuario desde la BD
    const resultado = await pool.query(
      'SELECT id, nombre_completo, correo, rol, activo FROM usuarios WHERE id = $1',
      [usuario.userId]
    );

    if (resultado.rows.length === 0 || !resultado.rows[0].activo) {
      res.status(401).json({ mensaje: 'Usuario no encontrado o inactivo.' });
      return;
    }

    const datos = resultado.rows[0];
    res.status(200).json({
      id: datos.id,
      nombre: datos.nombre_completo,
      correo: datos.correo,
      rol: datos.rol,
    });
  } catch (error) {
    console.error('Error en obtenerUsuarioActual:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
};

// GET /api/auth/usuarios
export const listarUsuarios = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.usuario?.rol !== 'administrador') {
      res.status(403).json({ mensaje: 'Acceso denegado.' });
      return;
    }
    const resultado = await pool.query(
      'SELECT id, nombre_completo FROM usuarios WHERE activo = true ORDER BY nombre_completo'
    );
    res.json(resultado.rows.map((r) => ({ id: r.id, nombre: r.nombre_completo })));
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
};

// Función auxiliar: registrar intento fallido y aplicar bloqueo si corresponde
function registrarIntentoFallido(correo: string): void {
  const registro = intentosFallidos.get(correo) ?? { intentos: 0, bloqueadoHasta: null };
  registro.intentos += 1;

  if (registro.intentos >= MAX_INTENTOS) {
    registro.bloqueadoHasta = new Date(Date.now() + TIEMPO_BLOQUEO_MS);
  }

  intentosFallidos.set(correo, registro);
}
