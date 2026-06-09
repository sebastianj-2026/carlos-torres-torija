import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { validateUuid } from '../middlewares/validateUuid.middleware';
import {
  estadisticasClientes,
  listarClientes,
  obtenerCliente,
  crearCliente,
  editarCliente,
  cambiarEstatus,
  listarDocumentos,
  actualizarDocumentos,
  listarReferencias,
  agregarReferencia,
  eliminarReferencia,
} from '../controllers/clientes.controller';

const router = Router();

// Todas las rutas de clientes requieren autenticación
router.use(authMiddleware);

// ----------------------------------------------------------------
// Clientes — accesibles por administrador y oficinista
// ----------------------------------------------------------------

// Dashboard stats — must be before /:id to avoid route conflict
router.get('/stats', estadisticasClientes);

// Listar clientes (búsqueda y paginación)
router.get('/', listarClientes);

// Obtener expediente completo
router.get('/:id', validateUuid('id'), obtenerCliente);

// Crear nuevo cliente
router.post('/', crearCliente);

// Editar datos del cliente
router.put('/:id', validateUuid('id'), editarCliente);

// Cambiar estatus del cliente
router.patch('/:id/estatus', validateUuid('id'), cambiarEstatus);

// Documentos del expediente
router.get('/:id/documentos', validateUuid('id'), listarDocumentos);
router.put('/:id/documentos', validateUuid('id'), actualizarDocumentos);

// Referencias personales
router.get('/:id/referencias', validateUuid('id'), listarReferencias);
router.post('/:id/referencias', validateUuid('id'), agregarReferencia);

// Eliminar referencia — solo administrador
router.delete(
  '/:id/referencias/:refId',
  roleMiddleware('administrador'),
  validateUuid('id'),
  validateUuid('refId'),
  eliminarReferencia
);

export default router;
