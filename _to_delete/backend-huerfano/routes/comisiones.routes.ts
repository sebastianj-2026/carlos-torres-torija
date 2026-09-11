import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { generarCorte, previewCorte, registrarPago, estadoCuenta, pendientes } from '../controllers/comisiones.controller';

// ================================================================
// Router para /api/comisiones (cortes, pagos)
// Namespace propio para no chocar con /api/pagos (préstamos legacy).
// ================================================================
export const comisionesRouter = Router();

comisionesRouter.use(authMiddleware);

// T-005/T-008: previsualiza y genera los devengos del periodo. Solo administrador.
comisionesRouter.get('/cortes/:periodo/preview', roleMiddleware('administrador'), previewCorte);
comisionesRouter.post('/cortes/:periodo', roleMiddleware('administrador'), generarCorte);

// T-006: registra un pago y lo aplica FIFO sobre la línea. Solo administrador.
comisionesRouter.post('/pagos', roleMiddleware('administrador'), registrarPago);

// T-007: lecturas (solo administrador — datos financieros sensibles).
comisionesRouter.get('/devengos', roleMiddleware('administrador'), estadoCuenta);
comisionesRouter.get('/pendientes', roleMiddleware('administrador'), pendientes);
