import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import {
  listarCategorias,   crearCategoria,
  listarProveedores,  crearProveedor,   editarProveedor,  eliminarProveedor,
  listarCuentasPorPagar, obtenerCuentaPorPagar,
  crearCuentaPorPagar,   editarCuentaPorPagar, cambiarEstatusCuenta,
  crearSerie,
  obtenerStats, obtenerAlertas,
  generarRendimientosInversionistas,
  obtenerKpisOficina,
} from '../controllers/egresos.controller';

const router = Router();
router.use(authMiddleware);

// Stats y alertas (antes de rutas con :id)
router.get('/stats',        obtenerStats);
router.get('/alertas',      obtenerAlertas);
router.get('/oficina/kpis', obtenerKpisOficina);

// Categorías
router.get( '/categorias', listarCategorias);
router.post('/categorias', crearCategoria);

// Proveedores — escritura abierta; eliminación solo administrador
router.get(   '/proveedores',     listarProveedores);
router.post(  '/proveedores',     crearProveedor);
router.put(   '/proveedores/:id', editarProveedor);
router.delete('/proveedores/:id', roleMiddleware('administrador'), eliminarProveedor);

// Cuentas por pagar — ambos roles (cambio de estatus también)
router.get(  '/cuentas',             listarCuentasPorPagar);
router.get(  '/cuentas/:id',         obtenerCuentaPorPagar);
router.post( '/cuentas/serie',       crearSerie);
router.post( '/cuentas',             crearCuentaPorPagar);
router.put(  '/cuentas/:id',         editarCuentaPorPagar);
router.patch('/cuentas/:id/estatus', cambiarEstatusCuenta);

// Generación masiva de rendimientos — solo administrador (operación financiera crítica)
router.post('/generar-rendimientos', roleMiddleware('administrador'), generarRendimientosInversionistas);

export default router;
