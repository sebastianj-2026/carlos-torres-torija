import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
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
juiciosRouter.get('/prestamo/:prestamoId',        obtenerJuicioPorPrestamo);
juiciosRouter.get('/:id',                         obtenerJuicio);
juiciosRouter.put('/:id',                         actualizarJuicio);

// Gastos legales
juiciosRouter.post('/:id/gastos',                 agregarGastoLegal);
juiciosRouter.delete('/:id/gastos/:gastoId',      eliminarGastoLegal);

// Archivero judicial
juiciosRouter.get('/:id/documentos',              listarDocumentosJuicio);
juiciosRouter.post('/:id/documentos',             upload.single('archivo'), subirDocumentoJuicio);
juiciosRouter.get('/:id/documentos/:docId',       descargarDocumentoJuicio);
juiciosRouter.delete('/:id/documentos/:docId',    eliminarDocumentoJuicio);

// Bitácora
juiciosRouter.get('/:id/bitacora',                listarBitacora);
juiciosRouter.post('/:id/bitacora',               agregarBitacora);
