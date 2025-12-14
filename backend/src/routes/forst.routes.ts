import { Router } from 'express';
import { ForstController } from '../controllers/forstController';

const router = Router();

// FORST (Field Operations Report Summary Tracking) Routes
router.get('/offers-highlights', ForstController.getOffersHighlightsWrapper);
router.get('/zone-monthly/:zoneId?', ForstController.getZoneMonthlyBreakdownWrapper);
router.get('/forecast-quarterly', ForstController.getForecastQuarterlyWrapper);
router.get('/product-type-summary', ForstController.getProductTypeSummaryWrapper);
router.get('/person-wise', ForstController.getPersonWisePerformanceWrapper);
router.get('/product-forecast', ForstController.getProductForecastWrapper);
router.get('/complete-report', ForstController.getCompleteReportWrapper);
router.get('/export', ForstController.exportExcelWrapper);

export default router;
