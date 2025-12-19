import { Router, Request, Response } from 'express';
import { ForecastController } from '../controllers/forecastController';

const router = Router();

// Type-safe wrapper for controller methods
const wrap = (fn: (req: any, res: Response) => Promise<void>) => {
    return (req: Request, res: Response) => fn(req as any, res);
};

// Forecast Routes
router.get('/summary', wrap(ForecastController.getForecastSummary));
router.get('/zone-user-breakdown', wrap(ForecastController.getZoneForecast));
router.get('/po-expected', wrap(ForecastController.getZoneForecast));
router.get('/highlights', wrap(ForecastController.getForecastSummary));
router.get('/export', wrap(ForecastController.getZoneForecast)); // TODO: Add export method

export default router;
