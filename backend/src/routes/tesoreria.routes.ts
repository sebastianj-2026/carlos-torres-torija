import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import {
  listarCuentas, crearCuenta, editarCuenta, desactivarCuenta,
  listarCategorias, crearCategoria,
  resumenCaja, listarMovimientos, crearMovimiento, editarMovimiento, eliminarMovimiento, verVoucherMovimiento,
  listarTraspasos, crearTraspaso, verVoucherTraspaso,
  listarLogs, resumenFlujoCaja,
} from '../controllers/tesoreria.controller';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.use(authMiddleware);

// ── Cuentas bancarias ──────────────────────────────────────────────
router.get('/cuentas',        listarCuentas);
router.post('/cuentas',       crearCuenta);
router.put('/cuentas/:id',    editarCuenta);
router.delete('/cuentas/:id', roleMiddleware('administrador'), desactivarCuenta);

// ── Categorías de movimientos ──────────────────────────────────────
router.get('/categorias',  listarCategorias);
router.post('/categorias', crearCategoria);

// ── Caja chica ─────────────────────────────────────────────────────
router.get('/caja/resumen',          resumenCaja);
router.get('/caja',                  listarMovimientos);
router.post('/caja', upload.single('voucher'), crearMovimiento);
router.put('/caja/:id',    upload.single('voucher'), editarMovimiento);
router.delete('/caja/:id',           eliminarMovimiento);
router.get('/caja/:id/voucher',      verVoucherMovimiento);

// ── Traspasos ──────────────────────────────────────────────────────
router.get('/traspasos',             listarTraspasos);
router.post('/traspasos', upload.single('voucher'), crearTraspaso);
router.get('/traspasos/:id/voucher', verVoucherTraspaso);

// ── Auditoría — solo administrador ────────────────────────────────
router.get('/logs', roleMiddleware('administrador'), listarLogs);

// ── Flujo de Caja ─────────────────────────────────────────────────
router.get('/flujo-caja', resumenFlujoCaja);

export default router;
