import { Router, Request, Response } from 'express';
import { ForstController } from '../controllers/forstController';
import { ForecastController } from '../controllers/forecastController';

const router = Router();

// ============================================================================
// FORST (Field Operations Report Summary Tracking) Routes
// Premium Sales Forecast & Analytics Dashboard API
// ============================================================================

// Type-safe wrapper for controller methods
const wrap = (fn: (req: any, res: Response) => Promise<void>) => {
    return (req: Request, res: Response) => fn(req as any, res);
};

// ============================================================================
// NEW COMPREHENSIVE FORECAST API
// Zone-wise, User-wise, Product-wise with Hit Rate & Funnel
// ============================================================================

// Forecast Summary - Executive overview with KPIs
router.get('/forecast/summary', wrap(ForecastController.getForecastSummary));

// Zone-wise Forecast - Monthly breakdown with targets & achievement
router.get('/forecast/zones', wrap(ForecastController.getZoneForecast));

// User-wise Forecast - Individual performance with ranking
router.get('/forecast/users', wrap(ForecastController.getUserForecast));

// Product-wise Forecast - By product type with zone distribution
router.get('/forecast/products', wrap(ForecastController.getProductForecast));

// Funnel Analysis - Pipeline stages with conversion rates
router.get('/forecast/funnel', wrap(ForecastController.getFunnelAnalysis));

// Hit Rate Analysis - By zone, user, and product
router.get('/forecast/hitrate', wrap(ForecastController.getHitRateAnalysis));

// ============================================================================
// EXISTING DASHBOARD ENDPOINTS
// ============================================================================

// Dashboard Summary - Main KPI overview with pipeline, zones, trends
router.get('/dashboard', wrap(ForstController.getDashboardSummary));

// Zone Performance - Detailed zone-wise analytics with monthly breakdown
router.get('/zones', wrap(ForstController.getZonePerformance));
router.get('/zones/:zoneId', wrap(ForstController.getZonePerformance));

// Quarterly Analysis - Q1-Q4 forecast vs actual with monthly data
router.get('/quarterly', wrap(ForstController.getQuarterlyAnalysis));

// Product Type Analysis - Product distribution, zone matrix, user breakdown
router.get('/products', wrap(ForstController.getProductTypeAnalysis));

// Team Performance - Leaderboard & individual stats
router.get('/team', wrap(ForstController.getTeamPerformance));

// Pipeline Analysis - Stage distribution, funnel, at-risk offers
router.get('/pipeline', wrap(ForstController.getPipelineAnalysis));

// Export - Excel download
router.get('/export', wrap(ForstController.exportToExcel));

// Complete Report - All data combined
router.get('/report', wrap(ForstController.getCompleteReport));

// ============================================================================
// LEGACY ENDPOINTS (Backward Compatibility)
// ============================================================================

router.get('/offers-highlights', wrap(ForstController.getOffersHighlights));
router.get('/zone-monthly', wrap(ForstController.getZoneMonthlyBreakdown));
router.get('/zone-monthly/:zoneId', wrap(ForstController.getZoneMonthlyBreakdown));
router.get('/forecast-quarterly', wrap(ForstController.getForecastQuarterly));
router.get('/product-type-summary', wrap(ForstController.getProductTypeSummary));
router.get('/person-wise', wrap(ForstController.getPersonWisePerformance));
router.get('/product-forecast', wrap(ForstController.getProductForecast));
router.get('/complete-report', wrap(ForstController.getCompleteReport));

export default router;
