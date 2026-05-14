import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
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
router.get('/:id', obtenerCliente);

// Crear nuevo cliente
router.post('/', crearCliente);

// Editar datos del cliente
router.put('/:id', editarCliente);

// Cambiar estatus del cliente
router.patch('/:id/estatus', cambiarEstatus);

// Documentos del expediente
router.get('/:id/documentos', listarDocumentos);
router.put('/:id/documentos', actualizarDocumentos);

// Referencias personales
router.get('/:id/referencias', listarReferencias);
router.post('/:id/referencias', agregarReferencia);

// Eliminar referencia — solo administrador
router.delete(
  '/:id/referencias/:refId',
  roleMiddleware('administrador'),
  eliminarReferencia
);

export default router;
