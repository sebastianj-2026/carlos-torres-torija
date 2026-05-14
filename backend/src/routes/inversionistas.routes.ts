import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
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
inversionistasRouter.get('/:id', obtenerInversionista);
inversionistasRouter.post('/',   crearInversionista);
inversionistasRouter.put('/:id', editarInversionista);

// Wallet: movimientos y uso de oficina
inversionistasRouter.get('/:id/movimientos', listarMovimientosInversionista);
inversionistasRouter.post(
  '/:id/uso-oficina',
  roleMiddleware('administrador'),
  transferirAOficina
);

// Inversiones
inversionistasRouter.get('/:id/inversiones', listarInversiones);
inversionistasRouter.post(
  '/:id/inversiones',
  roleMiddleware('administrador'),
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
  editarInversion
);

inversionesRouter.patch(
  '/:id/estatus',
  roleMiddleware('administrador'),
  cambiarEstatusInversion
);

inversionesRouter.get('/:id/historial', listarHistorial);
inversionesRouter.post('/:id/historial', registrarMovimiento);
