import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { validateUuid } from '../middlewares/validateUuid.middleware';
import { validateMagicBytes } from '../middlewares/magicBytes.middleware';
import {
  listarJuicios,
  obtenerJuicio,
  obtenerJuicioPorPrestamo,
  actualizarJuicio,
  agregarGastoLegal,
  eliminarGastoLegal,
  listarDocumentosJuicio,
  subirDocumentoJuicio,
  descargarDocumentoJuicio,
  eliminarDocumentoJuicio,
  listarBitacora,
  agregarBitacora,
} from '../controllers/juicios.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF.'));
    }
  },
});

export const juiciosRouter = Router();

juiciosRouter.use(authMiddleware);
juiciosRouter.use(roleMiddleware('administrador'));

juiciosRouter.get('/',                            listarJuicios);
juiciosRouter.get('/prestamo/:prestamoId',        validateUuid('prestamoId'), obtenerJuicioPorPrestamo);
juiciosRouter.get('/:id',                         validateUuid('id'), obtenerJuicio);
juiciosRouter.put('/:id',                         validateUuid('id'), actualizarJuicio);

// Gastos legales
juiciosRouter.post('/:id/gastos',                 validateUuid('id'), agregarGastoLegal);
juiciosRouter.delete('/:id/gastos/:gastoId',      validateUuid('id'), validateUuid('gastoId'), eliminarGastoLegal);

// Archivero judicial
juiciosRouter.get('/:id/documentos',              validateUuid('id'), listarDocumentosJuicio);
juiciosRouter.post('/:id/documentos',             validateUuid('id'), upload.single('archivo'), validateMagicBytes, subirDocumentoJuicio);
juiciosRouter.get('/:id/documentos/:docId',       validateUuid('id'), validateUuid('docId'), descargarDocumentoJuicio);
juiciosRouter.delete('/:id/documentos/:docId',    validateUuid('id'), validateUuid('docId'), eliminarDocumentoJuicio);

// Bitácora
juiciosRouter.get('/:id/bitacora',                validateUuid('id'), listarBitacora);
juiciosRouter.post('/:id/bitacora',               validateUuid('id'), agregarBitacora);
