import { Router } from 'express';
import multer from 'multer';
import {
  registrarPago,
  descargarRecibo,
  historialPorReferencia,
  historialPorCliente,
  deudaActivaCliente,
} from '../controllers/pagos.controller';

const router = Router();

// Almacenamiento en memoria — el buffer se guarda en BYTEA (recibos_pago)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.post('/registrar',               upload.single('recibo'), registrarPago);
router.get('/recibo/:pagoId',           descargarRecibo);
router.get('/historial/:referenciaId',  historialPorReferencia);
router.get('/cliente/:clienteId',       historialPorCliente);
router.get('/deuda-activa/:clienteId',  deudaActivaCliente);

export default router;
