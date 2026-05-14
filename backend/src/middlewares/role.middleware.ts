import { Request, Response, NextFunction } from 'express';

// Middleware para verificar el rol del usuario antes de ejecutar una acción
export const roleMiddleware = (...rolesPermitidos: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const usuario = req.usuario;

    if (!usuario) {
      res.status(401).json({ mensaje: 'No autorizado. Sesión no válida.' });
      return;
    }

    if (!rolesPermitidos.includes(usuario.rol)) {
      res.status(403).json({
        mensaje: 'No tienes acceso a esta sección.',
        rolRequerido: rolesPermitidos,
        rolActual: usuario.rol,
      });
      return;
    }

    next();
  };
};
