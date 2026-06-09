import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extender el tipo Request para incluir el usuario autenticado
export interface UsuarioAutenticado {
  userId: string;
  nombre: string;
  correo: string;
  rol: 'administrador' | 'oficinista';
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

// Middleware que verifica el JWT en cada petición protegida
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ mensaje: 'No autorizado. Token no proporcionado.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secreto = process.env.JWT_SECRET as string;

    const payload = jwt.verify(token, secreto, { algorithms: ['HS256'] }) as UsuarioAutenticado;
    req.usuario = payload;

    next();
  } catch (error) {
    res.status(401).json({ mensaje: 'No autorizado. Token inválido o expirado.' });
  }
};
