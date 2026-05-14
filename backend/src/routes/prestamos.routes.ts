import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
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
prestamosRouter.get('/:id', obtenerPrestamo);
prestamosRouter.post('/', crearPrestamo);
prestamosRouter.put('/:id', editarPrestamo);

prestamosRouter.patch(
  '/:id/estatus',
  roleMiddleware('administrador'),
  cambiarEstatusPrestamo
);

prestamosRouter.post(
  '/:id/renovar',
  roleMiddleware('administrador'),
  renovarPrestamo
);

// ── Pagos ──────────────────────────────────────────────────────
prestamosRouter.get('/:id/pagos', listarPagos);
prestamosRouter.post('/:id/pagos', registrarPago);

// ── Moratorios ─────────────────────────────────────────────────
prestamosRouter.get('/:id/moratorios', listarMoratorios);
prestamosRouter.post('/:id/moratorios/calcular', calcularMoratorio);

// ── Documentos (checklist) ─────────────────────────────────────
prestamosRouter.put('/:id/documentos', actualizarDocumentos);

// ── Archivos binarios PDF ──────────────────────────────────────
prestamosRouter.get('/:id/archivos', listarArchivos);
prestamosRouter.get('/:id/archivos/:tipo', descargarArchivo);
prestamosRouter.post(
  '/:id/archivos/:tipo',
  upload.single('archivo'),
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
  perdonarMoratorio
);
