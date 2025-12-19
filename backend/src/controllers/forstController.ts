import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as ExcelJS from 'exceljs';

// ============================================================================
// CONSTANTS & UTILITIES
// ============================================================================

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const ZONE_ORDER = ['WEST', 'SOUTH', 'NORTH', 'EAST'];

const PRODUCT_TYPES = [
    'CONTRACT', 'BD_SPARE', 'SPP', 'RELOCATION', 'SOFTWARE',
    'BD_CHARGES', 'RETROFIT_KIT', 'UPGRADE_KIT', 'MIDLIFE_UPGRADE'
];

const PRODUCT_TYPE_LABELS: Record<string, string> = {
    'CONTRACT': 'Contract',
    'BD_SPARE': 'BD Spare',
    'SPP': 'SPP',
    'RELOCATION': 'Relocation',
    'SOFTWARE': 'Software',
    'BD_CHARGES': 'BD Charges',
    'RETROFIT_KIT': 'Retrofit Kit',
    'UPGRADE_KIT': 'Upgrade Kit',
    'MIDLIFE_UPGRADE': 'Midlife Upgrade'
};

const OFFER_STAGES = ['INITIAL', 'PROPOSAL_SENT', 'NEGOTIATION', 'PO_RECEIVED', 'WON', 'LOST'];

// Utility functions
const pad2 = (n: number): string => n.toString().padStart(2, '0');

const getYearDateRange = (year: number) => ({
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31, 23, 59, 59, 999)
});

const sortByZoneOrder = <T extends { name?: string; zoneName?: string }>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
        const aName = a.name || a.zoneName || '';
        const bName = b.name || b.zoneName || '';
        const aIdx = ZONE_ORDER.indexOf(aName);
        const bIdx = ZONE_ORDER.indexOf(bName);
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
};

const formatProductType = (pt: string): string => PRODUCT_TYPE_LABELS[pt] || pt;

const calculatePercentage = (value: number, total: number): number => {
    return total > 0 ? (value / total) * 100 : 0;
};

const calculateDeviation = (actual: number, target: number): number => {
    return target > 0 ? ((actual - target) / target) * 100 : 0;
};

// ============================================================================
// DATA SERVICE - Centralized data fetching
// ============================================================================

class ForstDataService {
    static async getZones() {
        return prisma.serviceZone.findMany({
            select: { id: true, name: true, shortForm: true },
            orderBy: { name: 'asc' }
        });
    }

    static async getOffersForYear(year: number, additionalFilters: any = {}) {
        const { start, end } = getYearDateRange(year);
        return prisma.offer.findMany({
            where: {
                OR: [
                    { poExpectedMonth: { startsWith: `${year}-` } },
                    { offerMonth: { startsWith: `${year}-` } },
                    { createdAt: { gte: start, lte: end } }
                ],
                status: { notIn: ['CANCELLED', 'LOST'] as any },
                ...additionalFilters
            },
            include: {
                zone: { select: { id: true, name: true, shortForm: true } },
                assignedTo: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
                customer: { select: { id: true, companyName: true } }
            }
        });
    }

    static async getWonOrdersForYear(year: number, additionalFilters: any = {}) {
        const { start, end } = getYearDateRange(year);
        return prisma.offer.findMany({
            where: {
                OR: [
                    { poReceivedMonth: { startsWith: `${year}-` } },
                    { poDate: { gte: start, lte: end } }
                ],
                stage: { in: ['WON', 'PO_RECEIVED'] as any },
                ...additionalFilters
            },
            include: {
                zone: { select: { id: true, name: true } }
            }
        });
    }

    static async getZoneTargets(year: number) {
        // Try yearly targets first, then monthly
        const yearlyTargets = await prisma.zoneTarget.findMany({
            where: { periodType: 'YEARLY' as any, targetPeriod: `${year}` },
            select: { serviceZoneId: true, targetPeriod: true, targetValue: true, productType: true }
        });

        if (yearlyTargets.length > 0) {
            return { type: 'yearly', targets: yearlyTargets };
        }

        const monthlyTargets = await prisma.zoneTarget.findMany({
            where: { periodType: 'MONTHLY' as any, targetPeriod: { startsWith: `${year}-` } },
            select: { serviceZoneId: true, targetPeriod: true, targetValue: true, productType: true }
        });

        return { type: 'monthly', targets: monthlyTargets };
    }

    static async getOffersByStage(year: number) {
        const { start, end } = getYearDateRange(year);
        return prisma.offer.groupBy({
            by: ['stage', 'zoneId'],
            where: {
                createdAt: { gte: start, lte: end }
            },
            _count: { id: true },
            _sum: { offerValue: true }
        });
    }
}

// ============================================================================
// FORST CONTROLLER
// ============================================================================

export class ForstController {

    // -------------------------------------------------------------------------
    // DASHBOARD SUMMARY - Main KPI overview
    // -------------------------------------------------------------------------

    static async getDashboardSummary(req: AuthenticatedRequest, res: Response) {
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();

            const [zones, offers, orders, targetData] = await Promise.all([
                ForstDataService.getZones(),
                ForstDataService.getOffersForYear(year),
                ForstDataService.getWonOrdersForYear(year),
                ForstDataService.getZoneTargets(year)
            ]);

            // Calculate totals
            const totalOffers = offers.length;
            const totalOffersValue = offers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0);
            const totalOrdersValue = orders.reduce((sum, o) => sum + Number(o.poValue || 0), 0);
            const openFunnelValue = totalOffersValue - totalOrdersValue;

            // Calculate target
            let totalTarget = 0;
            if (targetData.type === 'yearly') {
                totalTarget = targetData.targets.reduce((sum, t) => sum + Number(t.targetValue || 0), 0);
            } else {
                totalTarget = targetData.targets.reduce((sum, t) => sum + Number(t.targetValue || 0), 0);
            }

            // Hit rate
            const hitRate = calculatePercentage(orders.length, totalOffers);

            // Deviation from target
            const targetDeviation = calculateDeviation(totalOrdersValue, totalTarget);
            const balanceToTarget = totalTarget - totalOrdersValue;

            // Pipeline stages
            const pipeline = {
                open: { count: 0, value: 0 },
                negotiation: { count: 0, value: 0 },
                poReceived: { count: 0, value: 0 },
                won: { count: 0, value: 0 },
                lost: { count: 0, value: 0 }
            };

            offers.forEach(o => {
                const value = Number(o.offerValue || 0);
                const stage = (o as any).stage || 'INITIAL';

                if (stage === 'INITIAL' || stage === 'PROPOSAL_SENT') {
                    pipeline.open.count++;
                    pipeline.open.value += value;
                } else if (stage === 'NEGOTIATION') {
                    pipeline.negotiation.count++;
                    pipeline.negotiation.value += value;
                } else if (stage === 'PO_RECEIVED') {
                    pipeline.poReceived.count++;
                    pipeline.poReceived.value += value;
                } else if (stage === 'WON') {
                    pipeline.won.count++;
                    pipeline.won.value += value;
                } else if (stage === 'LOST') {
                    pipeline.lost.count++;
                    pipeline.lost.value += value;
                }
            });

            // Zone-wise summary
            const zoneMap = new Map(zones.map(z => [z.id, { ...z, offers: 0, value: 0, orders: 0, target: 0 }]));

            offers.forEach(o => {
                const zone = zoneMap.get(o.zoneId);
                if (zone) {
                    zone.offers++;
                    zone.value += Number(o.offerValue || 0);
                }
            });

            orders.forEach(o => {
                const zone = zoneMap.get(o.zoneId);
                if (zone) {
                    zone.orders += Number(o.poValue || 0);
                }
            });

            targetData.targets.forEach(t => {
                const zone = zoneMap.get(t.serviceZoneId);
                if (zone) {
                    zone.target += Number(t.targetValue || 0);
                }
            });

            const zoneSummary = sortByZoneOrder(Array.from(zoneMap.values())).map(z => ({
                zoneId: z.id,
                zoneName: z.name,
                shortForm: z.shortForm,
                numOffers: z.offers,
                offersValue: z.value,
                ordersReceived: z.orders,
                openFunnel: Math.max(0, z.value - z.orders),
                target: z.target,
                achievement: calculatePercentage(z.orders, z.target),
                deviation: calculateDeviation(z.orders, z.target),
                balanceToTarget: z.target - z.orders
            }));

            // Monthly trends (last 6 months)
            const monthlyTrends = [];
            const currentMonth = new Date().getMonth();
            for (let i = 5; i >= 0; i--) {
                const month = ((currentMonth - i + 12) % 12) + 1;
                const monthStr = `${year}-${pad2(month)}`;

                const monthOffers = offers.filter(o =>
                    (o.poExpectedMonth || '').startsWith(monthStr) ||
                    (o.offerMonth || '').startsWith(monthStr)
                );
                const monthOrders = orders.filter(o =>
                    (o.poReceivedMonth || '').startsWith(monthStr)
                );

                monthlyTrends.push({
                    month,
                    monthName: MONTH_NAMES[month - 1],
                    offers: monthOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0),
                    orders: monthOrders.reduce((sum, o) => sum + Number(o.poValue || 0), 0)
                });
            }

            res.json({
                success: true,
                data: {
                    year,
                    summary: {
                        totalOffers,
                        totalOffersValue,
                        totalOrdersValue,
                        openFunnelValue,
                        totalTarget,
                        hitRate: Math.round(hitRate * 10) / 10,
                        targetDeviation: Math.round(targetDeviation * 10) / 10,
                        balanceToTarget
                    },
                    pipeline,
                    zones: zoneSummary,
                    monthlyTrends,
                    productTypes: PRODUCT_TYPES.map(pt => ({ code: pt, name: formatProductType(pt) }))
                }
            });

        } catch (error) {
            logger.error('FORST dashboard summary error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch dashboard summary' });
        }
    }

    // -------------------------------------------------------------------------
    // ZONE PERFORMANCE - Detailed zone analytics
    // -------------------------------------------------------------------------

    static async getZonePerformance(req: AuthenticatedRequest, res: Response) {
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            const zoneId = req.query.zoneId ? parseInt(req.query.zoneId as string) : null;

            const [zones, offers, orders, targetData] = await Promise.all([
                ForstDataService.getZones(),
                ForstDataService.getOffersForYear(year, zoneId ? { zoneId } : {}),
                ForstDataService.getWonOrdersForYear(year, zoneId ? { zoneId } : {}),
                ForstDataService.getZoneTargets(year)
            ]);

            // Build monthly targets lookup
            const monthlyTargets = new Map<string, number>();
            if (targetData.type === 'monthly') {
                targetData.targets.forEach(t => {
                    const key = `${t.serviceZoneId}-${t.targetPeriod}`;
                    monthlyTargets.set(key, (monthlyTargets.get(key) || 0) + Number(t.targetValue || 0));
                });
            }

            const zonePerformance = sortByZoneOrder(zones)
                .filter(z => !zoneId || z.id === zoneId)
                .map(zone => {
                    const zoneOffers = offers.filter(o => o.zoneId === zone.id);
                    const zoneOrders = orders.filter(o => o.zoneId === zone.id);

                    // Monthly breakdown
                    const monthly = [];
                    for (let m = 1; m <= 12; m++) {
                        const monthStr = `${year}-${pad2(m)}`;

                        const monthOffers = zoneOffers.filter(o => {
                            const offerMonth = o.poExpectedMonth || o.offerMonth ||
                                (o.createdAt ? `${new Date(o.createdAt).getFullYear()}-${pad2(new Date(o.createdAt).getMonth() + 1)}` : null);
                            return offerMonth === monthStr;
                        });

                        const monthOrders = zoneOrders.filter(o => {
                            const orderMonth = o.poReceivedMonth ||
                                (o.poDate ? `${new Date(o.poDate).getFullYear()}-${pad2(new Date(o.poDate).getMonth() + 1)}` : null);
                            return orderMonth === monthStr;
                        });

                        const offersValue = monthOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0);
                        const ordersReceived = monthOrders.reduce((sum, o) => sum + Number(o.poValue || 0), 0);

                        // Get target for this month
                        let monthTarget = 0;
                        if (targetData.type === 'yearly') {
                            const yearlyZoneTarget = targetData.targets
                                .filter(t => t.serviceZoneId === zone.id)
                                .reduce((sum, t) => sum + Number(t.targetValue || 0), 0);
                            monthTarget = yearlyZoneTarget / 12;
                        } else {
                            monthTarget = monthlyTargets.get(`${zone.id}-${monthStr}`) || 0;
                        }

                        monthly.push({
                            month: m,
                            monthName: MONTH_NAMES[m - 1],
                            offersValue,
                            ordersReceived,
                            target: monthTarget,
                            achievement: calculatePercentage(ordersReceived, monthTarget),
                            deviation: calculateDeviation(ordersReceived, monthTarget),
                            openPipeline: Math.max(0, offersValue - ordersReceived)
                        });
                    }

                    // Totals
                    const totalOffers = zoneOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0);
                    const totalOrders = zoneOrders.reduce((sum, o) => sum + Number(o.poValue || 0), 0);
                    const totalTarget = targetData.targets
                        .filter(t => t.serviceZoneId === zone.id)
                        .reduce((sum, t) => sum + Number(t.targetValue || 0), 0);

                    // Product type breakdown
                    const productBreakdown = PRODUCT_TYPES.map(pt => {
                        const ptOffers = zoneOffers.filter(o => o.productType === pt);
                        return {
                            productType: pt,
                            label: formatProductType(pt),
                            count: ptOffers.length,
                            value: ptOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0)
                        };
                    }).filter(p => p.count > 0);

                    return {
                        zoneId: zone.id,
                        zoneName: zone.name,
                        shortForm: zone.shortForm,
                        summary: {
                            totalOffers: zoneOffers.length,
                            totalOffersValue: totalOffers,
                            totalOrdersValue: totalOrders,
                            totalTarget,
                            hitRate: calculatePercentage(zoneOrders.length, zoneOffers.length),
                            achievement: calculatePercentage(totalOrders, totalTarget),
                            deviation: calculateDeviation(totalOrders, totalTarget),
                            balanceToTarget: totalTarget - totalOrders
                        },
                        monthly,
                        productBreakdown
                    };
                });

            res.json({
                success: true,
                data: {
                    year,
                    zones: zonePerformance
                }
            });

        } catch (error) {
            logger.error('FORST zone performance error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch zone performance' });
        }
    }

    // -------------------------------------------------------------------------
    // QUARTERLY ANALYSIS
    // -------------------------------------------------------------------------

    static async getQuarterlyAnalysis(req: AuthenticatedRequest, res: Response) {
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();

            const [zones, offers, orders, targetData] = await Promise.all([
                ForstDataService.getZones(),
                ForstDataService.getOffersForYear(year),
                ForstDataService.getWonOrdersForYear(year),
                ForstDataService.getZoneTargets(year)
            ]);

            // Calculate total yearly target
            const totalYearlyTarget = targetData.targets.reduce((sum, t) => sum + Number(t.targetValue || 0), 0);
            const quarterlyTarget = totalYearlyTarget / 4;

            // Monthly data
            const monthlyData: { month: number; monthName: string; forecast: number; actual: number; byZone: Record<string, number> }[] = [];
            for (let m = 1; m <= 12; m++) {
                const monthStr = `${year}-${pad2(m)}`;

                const monthOffers = offers.filter(o =>
                    (o.poExpectedMonth || '').startsWith(monthStr)
                );
                const monthOrders = orders.filter(o =>
                    (o.poReceivedMonth || '').startsWith(monthStr) ||
                    (o.poDate && new Date(o.poDate).getMonth() + 1 === m && new Date(o.poDate).getFullYear() === year)
                );

                // Zone breakdown
                const byZone: Record<string, number> = {};
                sortByZoneOrder(zones).forEach(z => {
                    byZone[z.name] = monthOffers
                        .filter(o => o.zoneId === z.id)
                        .reduce((sum, o) => sum + Number(o.offerValue || 0), 0);
                });

                monthlyData.push({
                    month: m,
                    monthName: MONTH_NAMES[m - 1],
                    forecast: monthOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0),
                    actual: monthOrders.reduce((sum, o) => sum + Number(o.poValue || 0), 0),
                    byZone
                });
            }

            // Quarterly aggregation
            const quarters = [
                { name: 'Q1', months: [1, 2, 3] },
                { name: 'Q2', months: [4, 5, 6] },
                { name: 'Q3', months: [7, 8, 9] },
                { name: 'Q4', months: [10, 11, 12] }
            ].map((q, idx) => {
                const qMonths = monthlyData.filter(m => q.months.includes(m.month));
                const forecast = qMonths.reduce((sum, m) => sum + m.forecast, 0);
                const actual = qMonths.reduce((sum, m) => sum + m.actual, 0);
                const target = quarterlyTarget;

                return {
                    quarter: q.name,
                    quarterIndex: idx + 1,
                    forecast,
                    actual,
                    target,
                    forecastAchievement: calculatePercentage(forecast, target),
                    actualAchievement: calculatePercentage(actual, target),
                    deviation: calculateDeviation(actual, target),
                    gap: target - actual
                };
            });

            // Current quarter status
            const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
            const currentQuarterData = quarters[currentQuarter - 1];

            res.json({
                success: true,
                data: {
                    year,
                    quarterly: {
                        target: quarterlyTarget,
                        currentQuarter,
                        currentQuarterData,
                        quarters
                    },
                    monthly: monthlyData,
                    zones: sortByZoneOrder(zones).map(z => z.name)
                }
            });

        } catch (error) {
            logger.error('FORST quarterly analysis error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch quarterly analysis' });
        }
    }

    // -------------------------------------------------------------------------
    // PRODUCT TYPE ANALYSIS
    // -------------------------------------------------------------------------

    static async getProductTypeAnalysis(req: AuthenticatedRequest, res: Response) {
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();

            const [zones, offers] = await Promise.all([
                ForstDataService.getZones(),
                ForstDataService.getOffersForYear(year)
            ]);

            // Overall product type distribution
            const productDistribution = PRODUCT_TYPES.map(pt => {
                const ptOffers = offers.filter(o => o.productType === pt);
                const totalValue = ptOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0);

                return {
                    productType: pt,
                    label: formatProductType(pt),
                    count: ptOffers.length,
                    value: totalValue,
                    percentage: calculatePercentage(totalValue, offers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0))
                };
            }).filter(p => p.count > 0).sort((a, b) => b.value - a.value);

            // Zone-wise product breakdown
            const zoneProductMatrix = sortByZoneOrder(zones).map(zone => {
                const zoneOffers = offers.filter(o => o.zoneId === zone.id);

                const products: Record<string, { count: number; value: number }> = {};
                PRODUCT_TYPES.forEach(pt => {
                    const ptOffers = zoneOffers.filter(o => o.productType === pt);
                    products[pt] = {
                        count: ptOffers.length,
                        value: ptOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0)
                    };
                });

                return {
                    zoneId: zone.id,
                    zoneName: zone.name,
                    totalValue: zoneOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0),
                    products
                };
            });

            // User-wise product breakdown
            const userMap = new Map<number, { id: number; name: string; zone: string; products: Record<string, number> }>();

            offers.forEach(o => {
                const userId = o.assignedToId || o.createdById;
                const userName = o.assignedTo?.name || o.createdBy?.name || 'Unknown';
                const zoneName = o.zone?.name || 'Unknown';

                if (userId) {
                    if (!userMap.has(userId)) {
                        const products: Record<string, number> = {};
                        PRODUCT_TYPES.forEach(pt => products[pt] = 0);
                        userMap.set(userId, { id: userId, name: userName, zone: zoneName, products });
                    }

                    const user = userMap.get(userId)!;
                    const pt = o.productType || 'OTHER';
                    if (user.products[pt] !== undefined) {
                        user.products[pt] += Number(o.offerValue || 0);
                    }
                }
            });

            const userBreakdown = Array.from(userMap.values())
                .map(u => ({
                    ...u,
                    total: Object.values(u.products).reduce((sum, v) => sum + v, 0)
                }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 20); // Top 20 users

            res.json({
                success: true,
                data: {
                    year,
                    distribution: productDistribution,
                    zoneMatrix: zoneProductMatrix,
                    userBreakdown,
                    productTypes: PRODUCT_TYPES.map(pt => ({ code: pt, name: formatProductType(pt) }))
                }
            });

        } catch (error) {
            logger.error('FORST product type analysis error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch product type analysis' });
        }
    }

    // -------------------------------------------------------------------------
    // TEAM PERFORMANCE - Leaderboard & individual stats
    // -------------------------------------------------------------------------

    static async getTeamPerformance(req: AuthenticatedRequest, res: Response) {
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            const limit = parseInt(req.query.limit as string) || 20;

            const [offers, orders] = await Promise.all([
                ForstDataService.getOffersForYear(year),
                ForstDataService.getWonOrdersForYear(year)
            ]);

            // Build user performance map
            const userMap = new Map<number, {
                id: number;
                name: string;
                zone: string;
                offers: number;
                offersValue: number;
                ordersValue: number;
                hitRate: number;
                monthlyData: Record<number, { offers: number; orders: number }>;
            }>();

            offers.forEach(o => {
                const userId = o.assignedToId || o.createdById;
                const userName = o.assignedTo?.name || o.createdBy?.name || 'Unknown';
                const zoneName = o.zone?.name || 'Unknown';

                if (userId) {
                    if (!userMap.has(userId)) {
                        const monthlyData: Record<number, { offers: number; orders: number }> = {};
                        for (let m = 1; m <= 12; m++) monthlyData[m] = { offers: 0, orders: 0 };
                        userMap.set(userId, {
                            id: userId,
                            name: userName,
                            zone: zoneName,
                            offers: 0,
                            offersValue: 0,
                            ordersValue: 0,
                            hitRate: 0,
                            monthlyData
                        });
                    }

                    const user = userMap.get(userId)!;
                    user.offers++;
                    user.offersValue += Number(o.offerValue || 0);

                    // Monthly tracking
                    const month = o.poExpectedMonth ? parseInt(o.poExpectedMonth.split('-')[1]) :
                        o.createdAt ? new Date(o.createdAt).getMonth() + 1 : 1;
                    if (user.monthlyData[month]) {
                        user.monthlyData[month].offers += Number(o.offerValue || 0);
                    }
                }
            });

            orders.forEach(o => {
                const userId = (o as any).assignedToId || (o as any).createdById;
                if (userId && userMap.has(userId)) {
                    const user = userMap.get(userId)!;
                    user.ordersValue += Number(o.poValue || 0);

                    // Monthly tracking
                    const month = o.poReceivedMonth ? parseInt(o.poReceivedMonth.split('-')[1]) :
                        o.poDate ? new Date(o.poDate).getMonth() + 1 : 1;
                    if (user.monthlyData[month]) {
                        user.monthlyData[month].orders += Number(o.poValue || 0);
                    }
                }
            });

            // Calculate hit rates and create leaderboard
            const leaderboard = Array.from(userMap.values())
                .map(u => ({
                    ...u,
                    hitRate: u.offersValue > 0 ? (u.ordersValue / u.offersValue) * 100 : 0,
                    conversionRate: u.offers > 0 ? (orders.filter((o: any) =>
                        o.assignedToId === u.id || o.createdById === u.id
                    ).length / u.offers) * 100 : 0
                }))
                .sort((a, b) => b.offersValue - a.offersValue)
                .slice(0, limit)
                .map((u, idx) => ({
                    rank: idx + 1,
                    ...u
                }));

            // Zone leaderboard
            const zoneLeaderboard = sortByZoneOrder(
                Array.from(
                    offers.reduce((acc, o) => {
                        const zoneName = o.zone?.name || 'Unknown';
                        if (!acc.has(zoneName)) {
                            acc.set(zoneName, { name: zoneName, offers: 0, value: 0, orders: 0 });
                        }
                        const zone = acc.get(zoneName)!;
                        zone.offers++;
                        zone.value += Number(o.offerValue || 0);
                        return acc;
                    }, new Map<string, { name: string; offers: number; value: number; orders: number }>())
                        .values()
                ).map(z => {
                    z.orders = orders
                        .filter(o => o.zone?.name === z.name)
                        .reduce((sum, o) => sum + Number(o.poValue || 0), 0);
                    return z;
                })
            );

            res.json({
                success: true,
                data: {
                    year,
                    userLeaderboard: leaderboard,
                    zoneLeaderboard,
                    totalUsers: userMap.size
                }
            });

        } catch (error) {
            logger.error('FORST team performance error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch team performance' });
        }
    }

    // -------------------------------------------------------------------------
    // PIPELINE ANALYSIS - Offer stage tracking
    // -------------------------------------------------------------------------

    static async getPipelineAnalysis(req: AuthenticatedRequest, res: Response) {
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            const { start, end } = getYearDateRange(year);

            const offers = await prisma.offer.findMany({
                where: {
                    createdAt: { gte: start, lte: end }
                },
                include: {
                    zone: { select: { id: true, name: true } },
                    customer: { select: { id: true, companyName: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Stage distribution
            const stageDistribution = OFFER_STAGES.map(stage => {
                const stageOffers = offers.filter(o => (o as any).stage === stage);
                return {
                    stage,
                    count: stageOffers.length,
                    value: stageOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0),
                    percentage: calculatePercentage(stageOffers.length, offers.length)
                };
            });

            // Funnel conversion rates
            const totalOffers = offers.length;
            const negotiation = offers.filter(o => ['NEGOTIATION', 'PO_RECEIVED', 'WON'].includes((o as any).stage)).length;
            const poReceived = offers.filter(o => ['PO_RECEIVED', 'WON'].includes((o as any).stage)).length;
            const won = offers.filter(o => (o as any).stage === 'WON').length;

            const funnel = [
                { stage: 'All Offers', count: totalOffers, value: offers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0), rate: 100 },
                { stage: 'In Negotiation+', count: negotiation, value: offers.filter(o => ['NEGOTIATION', 'PO_RECEIVED', 'WON'].includes((o as any).stage)).reduce((sum, o) => sum + Number(o.offerValue || 0), 0), rate: calculatePercentage(negotiation, totalOffers) },
                { stage: 'PO Received+', count: poReceived, value: offers.filter(o => ['PO_RECEIVED', 'WON'].includes((o as any).stage)).reduce((sum, o) => sum + Number(o.offerValue || 0), 0), rate: calculatePercentage(poReceived, totalOffers) },
                { stage: 'Won', count: won, value: offers.filter(o => (o as any).stage === 'WON').reduce((sum, o) => sum + Number(o.offerValue || 0), 0), rate: calculatePercentage(won, totalOffers) }
            ];

            // At risk offers (in negotiation > 60 days)
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

            const atRiskOffers = offers
                .filter(o =>
                    (o as any).stage === 'NEGOTIATION' &&
                    new Date(o.createdAt) < sixtyDaysAgo
                )
                .slice(0, 10)
                .map(o => ({
                    id: o.id,
                    referenceNumber: o.offerReferenceNumber,
                    customer: o.customer?.companyName,
                    value: Number(o.offerValue || 0),
                    daysSinceCreation: Math.floor((Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
                    zone: o.zone?.name
                }));

            // Recent wins
            const recentWins = offers
                .filter(o => (o as any).stage === 'WON')
                .sort((a, b) => new Date((b as any).poDate || b.updatedAt).getTime() - new Date((a as any).poDate || a.updatedAt).getTime())
                .slice(0, 5)
                .map(o => ({
                    id: o.id,
                    referenceNumber: o.offerReferenceNumber,
                    customer: o.customer?.companyName,
                    value: Number(o.poValue || o.offerValue || 0),
                    zone: o.zone?.name
                }));

            res.json({
                success: true,
                data: {
                    year,
                    stageDistribution,
                    funnel,
                    atRiskOffers,
                    recentWins,
                    summary: {
                        totalOffers,
                        openPipeline: offers.filter(o => !['WON', 'LOST', 'CANCELLED'].includes((o as any).stage)).length,
                        openValue: offers.filter(o => !['WON', 'LOST', 'CANCELLED'].includes((o as any).stage)).reduce((sum, o) => sum + Number(o.offerValue || 0), 0),
                        wonCount: won,
                        wonValue: offers.filter(o => (o as any).stage === 'WON').reduce((sum, o) => sum + Number(o.poValue || o.offerValue || 0), 0),
                        conversionRate: calculatePercentage(won, totalOffers)
                    }
                }
            });

        } catch (error) {
            logger.error('FORST pipeline analysis error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch pipeline analysis' });
        }
    }

    // -------------------------------------------------------------------------
    // EXPORT TO EXCEL
    // -------------------------------------------------------------------------

    static async exportToExcel(req: AuthenticatedRequest, res: Response) {
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();

            const [zones, offers, orders, targetData] = await Promise.all([
                ForstDataService.getZones(),
                ForstDataService.getOffersForYear(year),
                ForstDataService.getWonOrdersForYear(year),
                ForstDataService.getZoneTargets(year)
            ]);

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'KARDEX LCS';
            workbook.created = new Date();

            // Summary Sheet
            const summarySheet = workbook.addWorksheet('Summary');
            summarySheet.columns = [
                { header: 'Zone', key: 'zone', width: 15 },
                { header: 'Offers Count', key: 'offersCount', width: 15 },
                { header: 'Offers Value', key: 'offersValue', width: 18 },
                { header: 'Orders Value', key: 'ordersValue', width: 18 },
                { header: 'Target', key: 'target', width: 18 },
                { header: 'Achievement %', key: 'achievement', width: 15 },
                { header: 'Balance', key: 'balance', width: 18 }
            ];

            sortByZoneOrder(zones).forEach(zone => {
                const zoneOffers = offers.filter(o => o.zoneId === zone.id);
                const zoneOrders = orders.filter(o => o.zoneId === zone.id);
                const zoneTarget = targetData.targets
                    .filter(t => t.serviceZoneId === zone.id)
                    .reduce((sum, t) => sum + Number(t.targetValue || 0), 0);

                const offersValue = zoneOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0);
                const ordersValue = zoneOrders.reduce((sum, o) => sum + Number(o.poValue || 0), 0);

                summarySheet.addRow({
                    zone: zone.name,
                    offersCount: zoneOffers.length,
                    offersValue,
                    ordersValue,
                    target: zoneTarget,
                    achievement: zoneTarget > 0 ? ((ordersValue / zoneTarget) * 100).toFixed(1) + '%' : 'N/A',
                    balance: zoneTarget - ordersValue
                });
            });

            // Style header
            summarySheet.getRow(1).font = { bold: true };
            summarySheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

            // Monthly Sheet
            const monthlySheet = workbook.addWorksheet('Monthly Breakdown');
            const monthlyColumns = [
                { header: 'Zone', key: 'zone', width: 12 },
                ...MONTH_NAMES.map(m => ({ header: m, key: m.toLowerCase(), width: 12 })),
                { header: 'Total', key: 'total', width: 15 }
            ];
            monthlySheet.columns = monthlyColumns;

            sortByZoneOrder(zones).forEach(zone => {
                const row: any = { zone: zone.name, total: 0 };
                MONTH_NAMES.forEach((m, idx) => {
                    const monthStr = `${year}-${pad2(idx + 1)}`;
                    const monthValue = offers
                        .filter(o => o.zoneId === zone.id && (o.poExpectedMonth || '').startsWith(monthStr))
                        .reduce((sum, o) => sum + Number(o.offerValue || 0), 0);
                    row[m.toLowerCase()] = monthValue;
                    row.total += monthValue;
                });
                monthlySheet.addRow(row);
            });

            monthlySheet.getRow(1).font = { bold: true };
            monthlySheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            monthlySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

            // Generate buffer
            const buffer = await workbook.xlsx.writeBuffer();

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=FORST_Report_${year}.xlsx`);
            res.send(buffer);

        } catch (error) {
            logger.error('FORST export error:', error);
            res.status(500).json({ success: false, error: 'Failed to export data' });
        }
    }

    // -------------------------------------------------------------------------
    // LEGACY WRAPPERS - For backward compatibility
    // -------------------------------------------------------------------------

    static async getOffersHighlights(req: AuthenticatedRequest, res: Response) {
        return ForstController.getDashboardSummary(req, res);
    }

    static async getZoneMonthlyBreakdown(req: AuthenticatedRequest, res: Response) {
        return ForstController.getZonePerformance(req, res);
    }

    static async getForecastQuarterly(req: AuthenticatedRequest, res: Response) {
        return ForstController.getQuarterlyAnalysis(req, res);
    }

    static async getProductTypeSummary(req: AuthenticatedRequest, res: Response) {
        return ForstController.getProductTypeAnalysis(req, res);
    }

    static async getPersonWisePerformance(req: AuthenticatedRequest, res: Response) {
        return ForstController.getTeamPerformance(req, res);
    }

    static async getProductForecast(req: AuthenticatedRequest, res: Response) {
        return ForstController.getProductTypeAnalysis(req, res);
    }

    static async getCompleteReport(req: AuthenticatedRequest, res: Response) {
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();

            // Aggregate all data
            const [dashboardRes, zoneRes, quarterlyRes, productRes, teamRes, pipelineRes] = await Promise.allSettled([
                ForstController.getDashboardSummaryData(year),
                ForstController.getZonePerformanceData(year),
                ForstController.getQuarterlyAnalysisData(year),
                ForstController.getProductTypeAnalysisData(year),
                ForstController.getTeamPerformanceData(year),
                ForstController.getPipelineAnalysisData(year)
            ]);

            res.json({
                success: true,
                data: {
                    year,
                    dashboard: dashboardRes.status === 'fulfilled' ? dashboardRes.value : null,
                    zones: zoneRes.status === 'fulfilled' ? zoneRes.value : null,
                    quarterly: quarterlyRes.status === 'fulfilled' ? quarterlyRes.value : null,
                    productTypes: productRes.status === 'fulfilled' ? productRes.value : null,
                    team: teamRes.status === 'fulfilled' ? teamRes.value : null,
                    pipeline: pipelineRes.status === 'fulfilled' ? pipelineRes.value : null
                }
            });
        } catch (error) {
            logger.error('FORST complete report error:', error);
            res.status(500).json({ success: false, error: 'Failed to generate complete report' });
        }
    }

    static async exportExcel(req: AuthenticatedRequest, res: Response) {
        return ForstController.exportToExcel(req, res);
    }

    // Data-only methods for complete report
    private static async getDashboardSummaryData(year: number) {
        const [zones, offers, orders, targetData] = await Promise.all([
            ForstDataService.getZones(),
            ForstDataService.getOffersForYear(year),
            ForstDataService.getWonOrdersForYear(year),
            ForstDataService.getZoneTargets(year)
        ]);

        const totalOffers = offers.length;
        const totalOffersValue = offers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0);
        const totalOrdersValue = orders.reduce((sum, o) => sum + Number(o.poValue || 0), 0);
        const totalTarget = targetData.targets.reduce((sum, t) => sum + Number(t.targetValue || 0), 0);

        return {
            totalOffers,
            totalOffersValue,
            totalOrdersValue,
            totalTarget,
            hitRate: calculatePercentage(orders.length, totalOffers),
            achievement: calculatePercentage(totalOrdersValue, totalTarget)
        };
    }

    private static async getZonePerformanceData(year: number) {
        const zones = await ForstDataService.getZones();
        return zones.map(z => ({ id: z.id, name: z.name }));
    }

    private static async getQuarterlyAnalysisData(year: number) {
        return { year };
    }

    private static async getProductTypeAnalysisData(year: number) {
        return PRODUCT_TYPES.map(pt => ({ code: pt, name: formatProductType(pt) }));
    }

    private static async getTeamPerformanceData(year: number) {
        return { year };
    }

    private static async getPipelineAnalysisData(year: number) {
        return { year };
    }
}

export default ForstController;
