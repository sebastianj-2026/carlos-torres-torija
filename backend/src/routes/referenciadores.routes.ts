import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { validateUuid } from '../middlewares/validateUuid.middleware';
import {
  listarReferenciadores,
  obtenerReferenciador,
  crearReferenciador,
  editarReferenciador,
} from '../controllers/referenciadores.controller';
import {
  crearReferencia,
  editarReferencia,
} from '../controllers/referencias.controller';

// ================================================================
// Router para /api/referenciadores
// ================================================================
export const referenciadoresRouter = Router();

referenciadoresRouter.use(authMiddleware);

referenciadoresRouter.get('/',      listarReferenciadores);
referenciadoresRouter.get('/:id',   validateUuid('id'), obtenerReferenciador);
referenciadoresRouter.post('/',     crearReferenciador);
referenciadoresRouter.patch('/:id', validateUuid('id'), editarReferenciador);

// ================================================================
// Router para /api/referencias
// ================================================================
export const referenciasRouter = Router();

referenciasRouter.use(authMiddleware);

// M28 (⛔4=A): ligar/editar una referencia fija dinero — solo administrador,
// igual que editar una inversión.
referenciasRouter.post('/',     roleMiddleware('administrador'), crearReferencia);
referenciasRouter.patch('/:id', roleMiddleware('administrador'), validateUuid('id'), editarReferencia);
