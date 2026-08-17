import { Request, Response, NextFunction } from 'express';

// Personas/aportaciones usan BIGSERIAL (BIGINT), no UUID. Valida que el
// parámetro sea un entero positivo (dígitos, sin signo ni decimales).
const INT_ID_REGEX = /^[1-9][0-9]*$/;

export const validateIntId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const raw = req.params[paramName];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value || typeof value !== 'string' || !INT_ID_REGEX.test(value)) {
      res.status(400).json({ mensaje: `Parámetro ${paramName} inválido.` });
      return;
    }
    next();
  };
};
