import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { validateIntId } from '../middlewares/validateIntId.middleware';
import {
  listarPersonas,
  obtenerPersona,
  crearPersona,
  editarPersona,
  crearAportacion,
} from '../controllers/personas.controller';

// ================================================================
// Router para /api/personas (slice: personas + aportaciones)
// ================================================================
export const personasRouter = Router();

personasRouter.use(authMiddleware);

personasRouter.get('/', listarPersonas);
personasRouter.get('/:id', validateIntId('id'), obtenerPersona);
personasRouter.post('/', roleMiddleware('administrador'), crearPersona);
personasRouter.patch('/:id', roleMiddleware('administrador'), validateIntId('id'), editarPersona);
personasRouter.post(
  '/:id/aportaciones',
  roleMiddleware('administrador'),
  validateIntId('id'),
  crearAportacion
);
