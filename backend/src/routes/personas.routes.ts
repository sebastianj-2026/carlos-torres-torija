import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { validateIntId } from '../middlewares/validateIntId.middleware';
import { validateMagicBytes } from '../middlewares/magicBytes.middleware';
import {
  listarPersonas,
  obtenerPersona,
  crearPersona,
  editarPersona,
  crearAportacion,
  subirComprobante,
  descargarDocumento,
} from '../controllers/personas.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ================================================================
// Router para /api/personas (slice: personas + aportaciones)
// ================================================================
export const personasRouter = Router();

personasRouter.use(authMiddleware);

personasRouter.get('/', listarPersonas);
personasRouter.get('/:id', validateIntId('id'), obtenerPersona);
personasRouter.post('/', roleMiddleware('administrador'), crearPersona);
personasRouter.patch('/:id', roleMiddleware('administrador'), validateIntId('id'), editarPersona);
personasRouter.post(
  '/:id/aportaciones',
  roleMiddleware('administrador'),
  validateIntId('id'),
  crearAportacion
);

// Comprobantes PDF (R19): subir y descargar.
personasRouter.post(
  '/:id/documentos',
  roleMiddleware('administrador'),
  validateIntId('id'),
  upload.single('archivo'),
  validateMagicBytes,
  subirComprobante
);
personasRouter.get(
  '/:id/documentos/:docId',
  roleMiddleware('administrador'),
  validateIntId('id'),
  validateIntId('docId'),
  descargarDocumento
);
