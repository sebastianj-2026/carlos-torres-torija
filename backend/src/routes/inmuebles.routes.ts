import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import {
  listarInmuebles, obtenerInmueble, crearInmueble, editarInmueble,
  listarInquilinos, obtenerInquilino, crearInquilino, editarInquilino,
  crearInquilinoCompleto,
  listarContratos,  obtenerContrato,  crearContrato,  editarContrato,
  listarCobros, marcarCobrado,
  generarRentas, generarServicios, obtenerROI, alertasContratos,
} from '../controllers/inmuebles.controller';

const router = Router();
router.use(authMiddleware);

// Rutas estáticas antes de las parametrizadas
router.get( '/alertas',           alertasContratos);
router.post('/generar-rentas',    roleMiddleware('administrador', 'oficinista'), generarRentas);
router.post('/generar-servicios', roleMiddleware('administrador', 'oficinista'), generarServicios);

// Inquilinos
router.get( '/inquilinos',          listarInquilinos);
router.post('/inquilinos',          roleMiddleware('administrador', 'oficinista'), crearInquilino);
router.post('/inquilino-completo',  roleMiddleware('administrador', 'oficinista'), crearInquilinoCompleto);
router.get( '/inquilinos/:id', obtenerInquilino);
router.put( '/inquilinos/:id', roleMiddleware('administrador', 'oficinista'), editarInquilino);

// Contratos
router.get( '/contratos',     listarContratos);
router.post('/contratos',     roleMiddleware('administrador', 'oficinista'), crearContrato);
router.get( '/contratos/:id', obtenerContrato);
router.put( '/contratos/:id', roleMiddleware('administrador', 'oficinista'), editarContrato);

// Cobros (cuentas_por_cobrar de rentas)
router.get(  '/cobros',            listarCobros);
router.patch('/cobros/:id/cobrar', marcarCobrado);

// Inmuebles CRUD (parametrizadas al final)
router.get( '/',        listarInmuebles);
router.post('/',        roleMiddleware('administrador', 'oficinista'), crearInmueble);
router.get( '/:id/roi', obtenerROI);
router.get( '/:id',     obtenerInmueble);
router.put( '/:id',     roleMiddleware('administrador', 'oficinista'), editarInmueble);

export default router;
