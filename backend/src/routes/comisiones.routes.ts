import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { generarCorte } from '../controllers/comisiones.controller';

// ================================================================
// Router para /api/cortes (módulo comisiones)
// ================================================================
export const cortesRouter = Router();

cortesRouter.use(authMiddleware);

// T-005: genera los devengos del periodo (idempotente). Solo administrador.
cortesRouter.post('/:periodo', roleMiddleware('administrador'), generarCorte);
