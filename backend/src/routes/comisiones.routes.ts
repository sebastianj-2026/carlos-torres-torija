import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { generarCorte, registrarPago } from '../controllers/comisiones.controller';

// ================================================================
// Router para /api/comisiones (cortes, pagos)
// Namespace propio para no chocar con /api/pagos (préstamos legacy).
// ================================================================
export const comisionesRouter = Router();

comisionesRouter.use(authMiddleware);

// T-005: genera los devengos del periodo (idempotente). Solo administrador.
comisionesRouter.post('/cortes/:periodo', roleMiddleware('administrador'), generarCorte);

// T-006: registra un pago y lo aplica FIFO sobre la línea. Solo administrador.
comisionesRouter.post('/pagos', roleMiddleware('administrador'), registrarPago);
