import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateUuid } from '../middlewares/validateUuid.middleware';
import {
  listarReferenciadores,
  obtenerReferenciador,
  crearReferenciador,
  editarReferenciador,
} from '../controllers/referenciadores.controller';

// ================================================================
// Router para /api/referenciadores
// ================================================================
export const referenciadoresRouter = Router();

referenciadoresRouter.use(authMiddleware);

referenciadoresRouter.get('/',      listarReferenciadores);
referenciadoresRouter.get('/:id',   validateUuid('id'), obtenerReferenciador);
referenciadoresRouter.post('/',     crearReferenciador);
referenciadoresRouter.patch('/:id', validateUuid('id'), editarReferenciador);
