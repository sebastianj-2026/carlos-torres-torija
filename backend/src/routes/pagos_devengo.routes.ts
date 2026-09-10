import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { listarPendientes } from '../controllers/pagos_devengo.controller';

// ================================================================
// Router para /api/pagos-devengo (cuentas por pagar inv/referenciadores)
// ================================================================
export const pagosDevengoRouter = Router();

pagosDevengoRouter.use(authMiddleware);

pagosDevengoRouter.get('/pendientes', listarPendientes);
