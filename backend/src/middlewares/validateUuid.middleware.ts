import { Request, Response, NextFunction } from 'express';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const validateUuid = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const raw = req.params[paramName];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value || typeof value !== 'string' || !UUID_REGEX.test(value)) {
      res.status(400).json({ mensaje: `Parámetro ${paramName} inválido.` });
      return;
    }
    next();
  };
};
