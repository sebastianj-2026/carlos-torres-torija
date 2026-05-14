import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import {
  listarCategorias,   crearCategoria,
  listarProveedores,  crearProveedor,   editarProveedor,  eliminarProveedor,
  listarDeudas,       obtenerDeuda,     crearDeuda,       editarDeuda,
  listarCuentasPorPagar, obtenerCuentaPorPagar,
  crearCuentaPorPagar,   editarCuentaPorPagar, cambiarEstatusCuenta,
  crearSerie,
  obtenerStats, obtenerAlertas,
  generarRendimientosInversionistas,
  listarCreditos, crearCredito, editarCredito, registrarPagoCredito,
  obtenerKpisOficina, obtenerKpisAbril,
} from '../controllers/egresos.controller';

const router = Router();
router.use(authMiddleware);

// Stats y alertas (antes de rutas con :id)
router.get('/stats',        obtenerStats);
router.get('/alertas',      obtenerAlertas);
router.get('/oficina/kpis', obtenerKpisOficina);
router.get('/abril/kpis',  obtenerKpisAbril);

// Categorías
router.get( '/categorias', listarCategorias);
router.post('/categorias', crearCategoria);

// Proveedores — escritura abierta; eliminación solo administrador
router.get(   '/proveedores',     listarProveedores);
router.post(  '/proveedores',     crearProveedor);
router.put(   '/proveedores/:id', editarProveedor);
router.delete('/proveedores/:id', roleMiddleware('administrador'), eliminarProveedor);

// Deudas bancarias — ambos roles
router.get( '/deudas',     listarDeudas);
router.get( '/deudas/:id', obtenerDeuda);
router.post('/deudas',     crearDeuda);
router.put( '/deudas/:id', editarDeuda);

// Cuentas por pagar — ambos roles (cambio de estatus también)
router.get(  '/cuentas',             listarCuentasPorPagar);
router.get(  '/cuentas/:id',         obtenerCuentaPorPagar);
router.post( '/cuentas/serie',       crearSerie);
router.post( '/cuentas',             crearCuentaPorPagar);
router.put(  '/cuentas/:id',         editarCuentaPorPagar);
router.patch('/cuentas/:id/estatus', cambiarEstatusCuenta);

// Generación masiva de rendimientos — solo administrador (operación financiera crítica)
router.post('/generar-rendimientos', roleMiddleware('administrador'), generarRendimientosInversionistas);

// Créditos bancarios — ambos roles
router.get( '/creditos',        listarCreditos);
router.post('/creditos',        crearCredito);
router.put( '/creditos/:id',    editarCredito);
router.post('/creditos/pago',   registrarPagoCredito);

export default router;
