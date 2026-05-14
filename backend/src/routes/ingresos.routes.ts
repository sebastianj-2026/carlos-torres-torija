import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import {
  pendientesCxC,
  listarPensiones, crearPension, editarPension, alertasPensiones,
  listarMovimientosExtra, crearMovimientoExtra,
  listarIngresosDirectos, crearIngresoDirecto, editarIngresoDirecto,
  statsIngresos, dashboardCentral,
  cxcPrestamos, proyeccionCxCPrestamos, generarMesCxCPrestamos,
  crearCorteCancha, listarCortesCancha,
  crearCorteEstacionamiento, listarCortesEstacionamiento,
  cxcInmuebles, cobrarInmueble,
  rentasMensual, registrarPago,
} from '../controllers/ingresos.controller';

const router = Router();
router.use(authMiddleware);

// Rutas estáticas primero
router.get('/pendientes',      pendientesCxC);
router.get('/alertas',         alertasPensiones);
router.get('/stats',           statsIngresos);
router.get('/dashboard-central', dashboardCentral);
router.get( '/cxc-prestamos/proyeccion',  proyeccionCxCPrestamos);
router.post('/cxc-prestamos/generar-mes', generarMesCxCPrestamos);
router.get( '/cxc-prestamos',            cxcPrestamos);
router.get( '/cancha',                 listarCortesCancha);
router.post('/cancha/corte',           crearCorteCancha);
router.get( '/estacionamiento',        listarCortesEstacionamiento);
router.post('/estacionamiento/corte',  crearCorteEstacionamiento);
router.get( '/cxc-inmuebles',            cxcInmuebles);
router.post('/cxc-inmuebles/:id/cobrar', cobrarInmueble);
router.get( '/rentas/mensual',           rentasMensual);
router.post('/rentas/registrar-pago',    registrarPago);

// Pensiones — ambos roles
router.get( '/pensiones',             listarPensiones);
router.post('/pensiones',             crearPension);
router.put( '/pensiones/:id',         editarPension);
router.get( '/pensiones/:id/extras',  listarMovimientosExtra);
router.post('/pensiones/:id/extras',  crearMovimientoExtra);

// Ingresos directos — ambos roles
router.get( '/directos',     listarIngresosDirectos);
router.post('/directos',     crearIngresoDirecto);
router.put( '/directos/:id', editarIngresoDirecto);

export default router;
