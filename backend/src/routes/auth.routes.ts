import { Router } from 'express';
import { login, logout, obtenerUsuarioActual, listarUsuarios } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';

const router = Router();

router.post('/login',  login);
router.post('/logout', authMiddleware, logout);
router.get( '/me',     authMiddleware, obtenerUsuarioActual);

// Gestión de usuarios — solo administrador (prohibido para oficinista)
router.get('/usuarios', authMiddleware, roleMiddleware('administrador'), listarUsuarios);

export default router;
