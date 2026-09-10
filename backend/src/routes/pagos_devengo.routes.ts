import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { listarPendientes, registrarPago } from '../controllers/pagos_devengo.controller';

// ================================================================
// Router para /api/pagos-devengo (cuentas por pagar inv/referenciadores)
// ================================================================
export const pagosDevengoRouter = Router();

pagosDevengoRouter.use(authMiddleware);

pagosDevengoRouter.get('/pendientes', listarPendientes);
// R19/R21: pagar mueve dinero real — solo administrador (coherente con ⛔4=A)
pagosDevengoRouter.post('/', roleMiddleware('administrador'), registrarPago);
