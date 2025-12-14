import { Router } from 'express';
import { ForecastController } from '../controllers/forecastController';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/summary', ForecastController.getSummaryWrapper);
router.get('/zone-user-breakdown', ForecastController.getBreakdownWrapper);
router.get('/po-expected', ForecastController.getPoExpectedWrapper);
router.get('/highlights', ForecastController.getHighlightsWrapper);
router.get('/export', ForecastController.exportExcelWrapper);

export default router;
