import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  listarEmpleados, crearEmpleado, editarEmpleado,
  preCalculo, pagarNomina, pagarBase, historialNominas, costoReal, logIncidencias,
} from '../controllers/nominas.controller';

const router = Router();
router.use(authMiddleware);

router.get('/empleados',     listarEmpleados);
router.post('/empleados',    crearEmpleado);
router.put('/empleados/:id', editarEmpleado);
router.get('/pre-calculo',        preCalculo);
router.post('/pagar',             pagarNomina);
router.post('/pagar-base',        pagarBase);
router.get('/historial',          historialNominas);
router.get('/empleado/:id/log',   logIncidencias);
router.get('/costo-real',    costoReal);

export default router;
