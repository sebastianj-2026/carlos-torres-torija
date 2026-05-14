import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { getKpis, getBossKpis, getAnalytics } from '../controllers/dashboard.controller';

const router = Router();
router.use(authMiddleware);

router.get('/kpis',      getKpis);
router.get('/boss-kpis', getBossKpis);
router.get('/analytics', getAnalytics);

export default router;
