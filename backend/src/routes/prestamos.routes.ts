import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { validateUuid } from '../middlewares/validateUuid.middleware';
import { validateMagicBytes } from '../middlewares/magicBytes.middleware';
import {
  auditoriaCapital,
  estadisticasPrestamos,
  sincronizarEstatus,
  listarPrestamos,
  obtenerPrestamo,
  crearPrestamo,
  editarPrestamo,
  cambiarEstatusPrestamo,
  renovarPrestamo,
  listarPagos,
  registrarPago,
  listarMoratorios,
  calcularMoratorio,
  perdonarMoratorio,
  actualizarDocumentos,
  subirArchivo,
  descargarArchivo,
  listarArchivos,
} from '../controllers/prestamos.controller';

// ── Multer — memoria RAM, sólo PDF, máx 10 MB ────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF.'));
    }
  },
});

// ================================================================
// Router para /api/prestamos
// ================================================================
export const prestamosRouter = Router();

prestamosRouter.use(authMiddleware);

prestamosRouter.get('/auditoria', auditoriaCapital);
prestamosRouter.get('/stats', estadisticasPrestamos);
prestamosRouter.post('/sincronizar-estatus', sincronizarEstatus);
prestamosRouter.get('/', listarPrestamos);
prestamosRouter.get('/:id', validateUuid('id'), obtenerPrestamo);
prestamosRouter.post('/', crearPrestamo);
prestamosRouter.put('/:id', validateUuid('id'), editarPrestamo);

prestamosRouter.patch(
  '/:id/estatus',
  roleMiddleware('administrador'),
  validateUuid('id'),
  cambiarEstatusPrestamo
);

prestamosRouter.post(
  '/:id/renovar',
  roleMiddleware('administrador'),
  validateUuid('id'),
  renovarPrestamo
);

// ── Pagos ──────────────────────────────────────────────────────
prestamosRouter.get('/:id/pagos', validateUuid('id'), listarPagos);
prestamosRouter.post('/:id/pagos', validateUuid('id'), registrarPago);

// ── Moratorios ─────────────────────────────────────────────────
prestamosRouter.get('/:id/moratorios', validateUuid('id'), listarMoratorios);
prestamosRouter.post('/:id/moratorios/calcular', validateUuid('id'), calcularMoratorio);

// ── Documentos (checklist) ─────────────────────────────────────
prestamosRouter.put('/:id/documentos', validateUuid('id'), actualizarDocumentos);

// ── Archivos binarios PDF ──────────────────────────────────────
prestamosRouter.get('/:id/archivos', validateUuid('id'), listarArchivos);
prestamosRouter.get('/:id/archivos/:tipo', validateUuid('id'), descargarArchivo);
prestamosRouter.post(
  '/:id/archivos/:tipo',
  validateUuid('id'),
  upload.single('archivo'),
  validateMagicBytes,
  subirArchivo
);

// ================================================================
// Router para /api/moratorios (acción de perdonar)
// ================================================================
export const moratoriosRouter = Router();

moratoriosRouter.use(authMiddleware);

moratoriosRouter.patch(
  '/:id/perdonar',
  roleMiddleware('administrador'),
  validateUuid('id'),
  perdonarMoratorio
);
