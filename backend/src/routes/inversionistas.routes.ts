import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { validateUuid } from '../middlewares/validateUuid.middleware';
import {
  obtenerStatsInversionistas,
  listarInversionistas,
  obtenerInversionista,
  crearInversionista,
  editarInversionista,
  importarInversionistas,
  listarMovimientosInversionista,
  transferirAOficina,
  listarInversiones,
  crearInversion,
  editarInversion,
  cambiarEstatusInversion,
  listarHistorial,
  registrarMovimiento,
} from '../controllers/inversionistas.controller';

// ================================================================
// Router para /api/inversionistas
// ================================================================
export const inversionistasRouter = Router();

inversionistasRouter.use(authMiddleware);

inversionistasRouter.get('/stats', obtenerStatsInversionistas);
inversionistasRouter.post('/importar', roleMiddleware('administrador'), importarInversionistas);
inversionistasRouter.get('/',    listarInversionistas);
inversionistasRouter.get('/:id', validateUuid('id'), obtenerInversionista);
inversionistasRouter.post('/',   crearInversionista);
inversionistasRouter.put('/:id', validateUuid('id'), editarInversionista);

// Wallet: movimientos y uso de oficina
inversionistasRouter.get('/:id/movimientos', validateUuid('id'), listarMovimientosInversionista);
inversionistasRouter.post(
  '/:id/uso-oficina',
  roleMiddleware('administrador'),
  validateUuid('id'),
  transferirAOficina
);

// Inversiones
inversionistasRouter.get('/:id/inversiones', validateUuid('id'), listarInversiones);
inversionistasRouter.post(
  '/:id/inversiones',
  roleMiddleware('administrador'),
  validateUuid('id'),
  crearInversion
);

// ================================================================
// Router para /api/inversiones
// ================================================================
export const inversionesRouter = Router();

inversionesRouter.use(authMiddleware);

inversionesRouter.put(
  '/:id',
  roleMiddleware('administrador'),
  validateUuid('id'),
  editarInversion
);

inversionesRouter.patch(
  '/:id/estatus',
  roleMiddleware('administrador'),
  validateUuid('id'),
  cambiarEstatusInversion
);

inversionesRouter.get('/:id/historial', validateUuid('id'), listarHistorial);
inversionesRouter.post('/:id/historial', validateUuid('id'), registrarMovimiento);
