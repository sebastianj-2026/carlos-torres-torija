import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  listarIngresosDirectos, crearIngresoDirecto, editarIngresoDirecto,
  statsIngresos, dashboardCentral,
  cxcPrestamos, proyeccionCxCPrestamos, generarMesCxCPrestamos,
} from '../controllers/ingresos.controller';

const router = Router();
router.use(authMiddleware);

// Rutas estáticas primero
router.get('/stats',           statsIngresos);
router.get('/dashboard-central', dashboardCentral);
router.get( '/cxc-prestamos/proyeccion',  proyeccionCxCPrestamos);
router.post('/cxc-prestamos/generar-mes', generarMesCxCPrestamos);
router.get( '/cxc-prestamos',            cxcPrestamos);

// Ingresos directos (otros ingresos) — ambos roles
router.get( '/directos',     listarIngresosDirectos);
router.post('/directos',     crearIngresoDirecto);
router.put( '/directos/:id', editarIngresoDirecto);

export default router;
