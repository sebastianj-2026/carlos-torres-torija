import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { obtenerCalendario, registrarCobro } from '../controllers/cobros.controller';

export const cobrosRouter = Router();

cobrosRouter.use(authMiddleware);

cobrosRouter.get('/calendario', obtenerCalendario);
cobrosRouter.post('/:id/registrar', registrarCobro);
