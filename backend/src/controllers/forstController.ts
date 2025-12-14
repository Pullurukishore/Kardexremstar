import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as ExcelJS from 'exceljs';

const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const ZONE_ORDER = ['WEST', 'SOUTH', 'NORTH', 'EAST'];

function pad2(n: number) { return n.toString().padStart(2, '0'); }

function sortZones<T extends { name?: string; zoneName?: string }>(zones: T[]): T[] {
    return [...zones].sort((a, b) => {
        const aName = a.name || a.zoneName || '';
        const bName = b.name || b.zoneName || '';
        const aIdx = ZONE_ORDER.indexOf(aName);
        const bIdx = ZONE_ORDER.indexOf(bName);
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
}

// Product types as per the Excel sheets
const PRODUCT_TYPES = [
    'CONTRACT', 'BD_SPARE', 'SPP', 'RELOCATION', 'SOFTWARE',
    'BD_CHARGES', 'RETROFIT_KIT', 'UPGRADE_KIT', 'TRAINING', 'MIDLIFE_UPGRADE'
];

const formatProductType = (pt: string): string => {
    const mapping: Record<string, string> = {
        'CONTRACT': 'Contract',
        'BD_SPARE': 'BD Spare',
        'SPP': 'SPP',
        'RELOCATION': 'Relocation',
        'SOFTWARE': 'Software',
        'BD_CHARGES': 'BD Charges',
        'RETROFIT_KIT': 'Retrofit kit',
        'UPGRADE_KIT': 'Upgrade kit',
        'TRAINING': 'Training',
        'MIDLIFE_UPGRADE': 'Midlife Upgrade'
    };
    return mapping[pt] || pt;
};

export class ForstController {
    // Wrapper methods for routes without authentication
    static async getOffersHighlightsWrapper(req: any, res: Response) {
        return ForstController.getOffersHighlights(req as AuthenticatedRequest, res);
    }

    static async getZoneMonthlyBreakdownWrapper(req: any, res: Response) {
        return ForstController.getZoneMonthlyBreakdown(req as AuthenticatedRequest, res);
    }

    static async getForecastQuarterlyWrapper(req: any, res: Response) {
        return ForstController.getForecastQuarterly(req as AuthenticatedRequest, res);
    }

    static async getProductTypeSummaryWrapper(req: any, res: Response) {
        return ForstController.getProductTypeSummary(req as AuthenticatedRequest, res);
    }

    static async getPersonWisePerformanceWrapper(req: any, res: Response) {
        return ForstController.getPersonWisePerformance(req as AuthenticatedRequest, res);
    }

    static async getProductForecastWrapper(req: any, res: Response) {
        return ForstController.getProductForecast(req as AuthenticatedRequest, res);
    }

    static async getCompleteReportWrapper(req: any, res: Response) {
        return ForstController.getCompleteReport(req as AuthenticatedRequest, res);
    }

    static async exportExcelWrapper(req: any, res: Response) {
        return ForstController.exportExcel(req as AuthenticatedRequest, res);
    }

    /**
     * Get Offers Highlights - Zone-wise summary (Image 1 - Top section)
     * Returns: Zone, No. of Offers, Offers Value, Orders Received, Open Funnel, Order Booking, BU, %, Balance BU
     */
    static async getOffersHighlights(req: AuthenticatedRequest, res: Response) {
        try {
            const { year: yearParam } = req.query as any;
            const now = new Date();
            const year = yearParam ? parseInt(yearParam as string) : now.getFullYear();

            const zones = await prisma.serviceZone.findMany({
                select: { id: true, name: true, shortForm: true },
                orderBy: { name: 'asc' }
            });

            // All offers in the year (by expected month, offer month, or createdAt) excluding cancelled/lost
            const offers = await prisma.offer.findMany({
                where: {
                    OR: [
                        { poExpectedMonth: { startsWith: `${year}-` } },
                        { offerMonth: { startsWith: `${year}-` } },
                        { createdAt: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59, 999) } },
                    ],
                    status: { notIn: ['CANCELLED', 'LOST'] as any },
                },
                select: { zoneId: true, offerValue: true, openFunnel: true, productType: true, createdAt: true },
            });


            // Orders received/booked in the year
            const orders = await prisma.offer.findMany({
                where: {
                    OR: [
                        { poReceivedMonth: { startsWith: `${year}-` } },
                        { poDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59, 999) } },
                    ],
                    stage: { in: ['WON', 'PO_RECEIVED', 'ORDER_BOOKED'] as any },
                },
                select: { zoneId: true, poValue: true, stage: true },
            });

            // Get BU targets for the year
            const buByZone: Record<number, number> = {};
            for (const z of zones) buByZone[z.id] = 0;

            // Prefer yearly target; fallback to monthly sum
            const yearlyTargets = await prisma.zoneTarget.findMany({
                where: { periodType: 'YEARLY' as any, targetPeriod: `${year}` },
                select: { serviceZoneId: true, targetValue: true },
            });

            if (yearlyTargets.length > 0) {
                for (const t of yearlyTargets) {
                    buByZone[t.serviceZoneId] = (buByZone[t.serviceZoneId] || 0) + Number(t.targetValue || 0);
                }
            } else {
                const monthlyTargets = await prisma.zoneTarget.findMany({
                    where: { periodType: 'MONTHLY' as any, targetPeriod: { startsWith: `${year}-` } },
                    select: { serviceZoneId: true, targetValue: true },
                });
                for (const t of monthlyTargets) {
                    buByZone[t.serviceZoneId] = (buByZone[t.serviceZoneId] || 0) + Number(t.targetValue || 0);
                }
            }

            // Aggregate by zone
            const offersByZone: Record<number, { count: number; value: number; openFunnel: number }> = {};
            const ordersByZone: Record<number, { received: number; booked: number }> = {};

            for (const z of zones) {
                offersByZone[z.id] = { count: 0, value: 0, openFunnel: 0 };
                ordersByZone[z.id] = { received: 0, booked: 0 };
            }

            for (const o of offers) {
                const z = o.zoneId || 0;
                if (!offersByZone[z]) offersByZone[z] = { count: 0, value: 0, openFunnel: 0 };
                offersByZone[z].count += 1;
                offersByZone[z].value += Number(o.offerValue || 0);
                if (o.openFunnel) offersByZone[z].openFunnel += Number(o.offerValue || 0);
            }

            for (const o of orders) {
                const z = o.zoneId || 0;
                if (!ordersByZone[z]) ordersByZone[z] = { received: 0, booked: 0 };
                ordersByZone[z].received += Number(o.poValue || 0);
                if ((o as any).stage === 'ORDER_BOOKED') {
                    ordersByZone[z].booked += Number(o.poValue || 0);
                }
            }

            const rows = sortZones(zones).map(z => {
                const o = offersByZone[z.id] || { count: 0, value: 0, openFunnel: 0 };
                const ord = ordersByZone[z.id] || { received: 0, booked: 0 };
                const bu = buByZone[z.id] || 0;
                const devPercent = bu > 0 ? ((ord.received - bu) / bu) * 100 : 0;
                const balanceBu = bu - ord.received;
                const openFunnel = o.value - ord.received;

                return {
                    zoneId: z.id,
                    zoneName: z.name,
                    shortForm: z.shortForm,
                    numOffers: o.count,
                    offersValue: o.value,
                    ordersReceived: ord.received,
                    openFunnel: Math.max(0, openFunnel),
                    orderBooking: ord.booked,
                    utForBooking: bu,
                    devPercent,
                    balanceBu,
                };
            });

            // Calculate hit rate (total offers won / total offers)
            const totalOffers = offers.length;
            const totalWon = orders.length;
            const hitRate = totalOffers > 0 ? (totalWon / totalOffers) * 100 : 0;

            // Calculate totals
            const total = rows.reduce((acc, r) => ({
                numOffers: acc.numOffers + r.numOffers,
                offersValue: acc.offersValue + r.offersValue,
                ordersReceived: acc.ordersReceived + r.ordersReceived,
                openFunnel: acc.openFunnel + r.openFunnel,
                orderBooking: acc.orderBooking + r.orderBooking,
                utForBooking: acc.utForBooking + r.utForBooking,
                balanceBu: acc.balanceBu + r.balanceBu,
            }), { numOffers: 0, offersValue: 0, ordersReceived: 0, openFunnel: 0, orderBooking: 0, utForBooking: 0, balanceBu: 0 });

            const totalDevPercent = total.utForBooking > 0
                ? ((total.ordersReceived - total.utForBooking) / total.utForBooking) * 100
                : 0;

            res.json({
                success: true,
                data: {
                    year,
                    rows,
                    total: { ...total, devPercent: totalDevPercent },
                    hitRate: Math.round(hitRate),
                },
            });
        } catch (error) {
            logger.error('FORST offers highlights error:', error);
            res.status(500).json({ error: 'Failed to compute offers highlights' });
        }
    }

    /**
     * Get Zone Monthly Breakdown (Image 1 - Zone-wise monthly tables)
     * Returns monthly data for each zone with offers, orders, BU, deviations
     */
    static async getZoneMonthlyBreakdown(req: AuthenticatedRequest, res: Response) {
        try {
            const { year: yearParam, zoneId: zoneIdParam } = req.query as any;
            const now = new Date();
            const year = yearParam ? parseInt(yearParam as string) : now.getFullYear();
            const zoneId = zoneIdParam ? parseInt(zoneIdParam as string) : null;

            const zones = await prisma.serviceZone.findMany({
                where: zoneId ? { id: zoneId } : {},
                select: { id: true, name: true, shortForm: true },
                orderBy: { name: 'asc' }
            });

            // Get all offers for the year
            const offers = await prisma.offer.findMany({
                where: {
                    OR: [
                        { poExpectedMonth: { startsWith: `${year}-` } },
                        { offerMonth: { startsWith: `${year}-` } },
                        { createdAt: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59, 999) } },
                    ],
                    status: { notIn: ['CANCELLED', 'LOST'] as any },
                    ...(zoneId ? { zoneId } : {}),
                },
                select: { zoneId: true, poExpectedMonth: true, offerMonth: true, offerValue: true, createdAt: true },
            });


            // Get all orders for the year
            const orders = await prisma.offer.findMany({
                where: {
                    OR: [
                        { poReceivedMonth: { startsWith: `${year}-` } },
                        { poDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59, 999) } },
                    ],
                    stage: { in: ['WON', 'PO_RECEIVED', 'ORDER_BOOKED'] as any },
                    ...(zoneId ? { zoneId } : {}),
                },
                select: { zoneId: true, poReceivedMonth: true, poDate: true, poValue: true, stage: true },
            });

            // Get monthly targets
            const monthlyTargets = await prisma.zoneTarget.findMany({
                where: {
                    periodType: 'MONTHLY' as any,
                    targetPeriod: { startsWith: `${year}-` },
                    ...(zoneId ? { serviceZoneId: zoneId } : {}),
                },
                select: { serviceZoneId: true, targetPeriod: true, targetValue: true },
            });

            // Build monthly breakdown per zone
            const zoneData = sortZones(zones).map(zone => {
                const monthly = [];
                let runningOpenFunnel = 0;

                for (let m = 1; m <= 12; m++) {
                    const mm = pad2(m);
                    const monthKey = `${year}-${mm}`;

                    // Offers for this zone and month (use poExpectedMonth, offerMonth, or createdAt)
                    const monthOffers = offers.filter(o => {
                        if (o.zoneId !== zone.id) return false;
                        const offerMonth = o.poExpectedMonth || o.offerMonth ||
                            (o.createdAt ? `${new Date(o.createdAt).getFullYear()}-${pad2(new Date(o.createdAt).getMonth() + 1)}` : null);
                        return offerMonth && offerMonth.endsWith(`-${mm}`);
                    });
                    const offersValue = monthOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0);


                    // Orders received in this month
                    const monthOrders = orders.filter(o => {
                        if (o.zoneId !== zone.id) return false;
                        const month = o.poReceivedMonth ||
                            (o.poDate ? `${o.poDate.getFullYear()}-${pad2(o.poDate.getMonth() + 1)}` : null);
                        return month === monthKey;
                    });
                    const ordersReceived = monthOrders.reduce((sum, o) => sum + Number(o.poValue || 0), 0);

                    // Orders booked
                    const ordersBooked = monthOrders
                        .filter(o => (o as any).stage === 'ORDER_BOOKED')
                        .reduce((sum, o) => sum + Number(o.poValue || 0), 0);

                    // BU for this month
                    const monthTarget = monthlyTargets.find(
                        t => t.serviceZoneId === zone.id && t.targetPeriod === monthKey
                    );
                    const buMonthly = Number(monthTarget?.targetValue || 0);

                    // Calculate deviations
                    const devOrVsBooked = ordersReceived - ordersBooked;
                    const ordersInHand = offersValue - ordersReceived;
                    const bookedVsBu = ordersBooked - buMonthly;
                    const bookedVsBuPercent = buMonthly > 0 ? ((ordersBooked - buMonthly) / buMonthly) * 100 : 0;
                    const offerBuMonthly = offersValue;
                    const offerVsBuPercent = buMonthly > 0 ? ((offersValue - buMonthly) / buMonthly) * 100 : 0;

                    monthly.push({
                        month: m,
                        monthName: monthNames[m - 1],
                        offersValue,
                        ordersReceived,
                        ordersBooked,
                        devOrVsBooked,
                        ordersInHand: Math.max(0, ordersInHand),
                        buMonthly,
                        bookedVsBu,
                        bookedVsBuPercent,
                        offerBuMonthly,
                        offerVsBuPercent,
                    });
                }

                // Calculate totals
                const totals = monthly.reduce((acc, m) => ({
                    offersValue: acc.offersValue + m.offersValue,
                    ordersReceived: acc.ordersReceived + m.ordersReceived,
                    ordersBooked: acc.ordersBooked + m.ordersBooked,
                    buMonthly: acc.buMonthly + m.buMonthly,
                }), { offersValue: 0, ordersReceived: 0, ordersBooked: 0, buMonthly: 0 });

                // Calculate hit rate for zone
                const zoneOfferCount = offers.filter(o => o.zoneId === zone.id).length;
                const zoneOrderCount = orders.filter(o => o.zoneId === zone.id).length;
                const hitRate = zoneOfferCount > 0 ? (zoneOrderCount / zoneOfferCount) * 100 : 0;

                return {
                    zoneId: zone.id,
                    zoneName: zone.name,
                    monthly,
                    totals,
                    hitRate: Math.round(hitRate),
                };
            });

            res.json({
                success: true,
                data: {
                    year,
                    zones: zoneData,
                },
            });
        } catch (error) {
            logger.error('FORST zone monthly breakdown error:', error);
            res.status(500).json({ error: 'Failed to compute zone monthly breakdown' });
        }
    }

    /**
     * Get Forecast Quarterly (Image 2 - Top section)
     * Returns quarterly forecast vs BU with zone breakdown
     */
    static async getForecastQuarterly(req: AuthenticatedRequest, res: Response) {
        try {
            const { year: yearParam } = req.query as any;
            const now = new Date();
            const year = yearParam ? parseInt(yearParam as string) : now.getFullYear();

            const zones = await prisma.serviceZone.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            });

            // Get offers forecast
            const offers = await prisma.offer.findMany({
                where: {
                    poExpectedMonth: { startsWith: `${year}-` },
                    status: { notIn: ['CANCELLED', 'LOST'] as any },
                },
                select: { zoneId: true, poExpectedMonth: true, offerValue: true },
            });

            // Get quarterly BU targets
            const yearlyTargets = await prisma.zoneTarget.findMany({
                where: { periodType: 'YEARLY' as any, targetPeriod: `${year}` },
                select: { serviceZoneId: true, targetValue: true },
            });

            // Calculate total yearly BU
            let totalYearlyBu = yearlyTargets.reduce((sum, t) => sum + Number(t.targetValue || 0), 0);

            // If no yearly targets, use monthly
            if (totalYearlyBu === 0) {
                const monthlyTargets = await prisma.zoneTarget.findMany({
                    where: { periodType: 'MONTHLY' as any, targetPeriod: { startsWith: `${year}-` } },
                    select: { targetValue: true },
                });
                totalYearlyBu = monthlyTargets.reduce((sum, t) => sum + Number(t.targetValue || 0), 0);
            }

            const quarterlyBu = totalYearlyBu / 4;

            // Build monthly data with zone breakdown
            const monthly: { month: number; monthName: string; forecast: number; byZone: Record<string, number> }[] = [];
            for (let m = 1; m <= 12; m++) {
                const mm = pad2(m);
                const byZone: Record<string, number> = {};
                let total = 0;

                for (const zone of sortZones(zones)) {
                    const zoneValue = offers
                        .filter(o => o.zoneId === zone.id && (o.poExpectedMonth || '').endsWith(`-${mm}`))
                        .reduce((sum, o) => sum + Number(o.offerValue || 0), 0);
                    byZone[zone.name] = zoneValue;
                    total += zoneValue;
                }

                monthly.push({
                    month: m,
                    monthName: monthNames[m - 1],
                    forecast: total,
                    byZone,
                });
            }

            // Build quarterly data
            const quarters = [
                { q: 'Q1', months: [1, 2, 3] },
                { q: 'Q2', months: [4, 5, 6] },
                { q: 'Q3', months: [7, 8, 9] },
                { q: 'Q4', months: [10, 11, 12] },
            ].map(q => {
                const quarterMonths = monthly.filter(m => q.months.includes(m.month));
                const forecast = quarterMonths.reduce((sum, m) => sum + m.forecast, 0);
                const bu = quarterlyBu;
                const devPercent = bu > 0 ? ((forecast - bu) / bu) * 100 : 0;

                return {
                    quarter: q.q,
                    forecast,
                    bu,
                    devPercent,
                };
            });

            res.json({
                success: true,
                data: {
                    year,
                    monthly,
                    quarters,
                    zones: sortZones(zones).map(z => z.name),
                },
            });
        } catch (error) {
            logger.error('FORST forecast quarterly error:', error);
            res.status(500).json({ error: 'Failed to compute forecast quarterly' });
        }
    }

    /**
     * Get Product Type Summary (Image 2 - Product type by person)
     * Returns product type breakdown by zone and person
     */
    static async getProductTypeSummary(req: AuthenticatedRequest, res: Response) {
        try {
            const { year: yearParam, zoneId: zoneIdParam } = req.query as any;
            const now = new Date();
            const year = yearParam ? parseInt(yearParam as string) : now.getFullYear();
            const zoneId = zoneIdParam ? parseInt(zoneIdParam as string) : null;

            const zones = await prisma.serviceZone.findMany({
                where: zoneId ? { id: zoneId } : {},
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            });

            // Get offers with user info
            const offers = await prisma.offer.findMany({
                where: {
                    poExpectedMonth: { startsWith: `${year}-` },
                    status: { notIn: ['CANCELLED', 'LOST'] as any },
                    ...(zoneId ? { zoneId } : {}),
                },
                select: {
                    zoneId: true,
                    productType: true,
                    offerValue: true,
                    assignedToId: true,
                    createdById: true,
                    assignedTo: { select: { id: true, name: true } },
                    createdBy: { select: { id: true, name: true } },
                },
            });

            // Get zone users
            const zoneUsers = await prisma.servicePersonZone.findMany({
                where: zoneId ? { serviceZoneId: zoneId } : {},
                include: {
                    user: { select: { id: true, name: true } },
                    serviceZone: { select: { id: true, name: true } },
                },
            });

            // Build zone data
            const zoneData = sortZones(zones).map(zone => {
                const zoneOffers = offers.filter(o => o.zoneId === zone.id);

                // Get users in this zone
                const usersInZone = zoneUsers
                    .filter(zu => zu.serviceZoneId === zone.id)
                    .map(zu => ({ id: zu.user.id, name: zu.user.name || 'Unknown' }));

                // Add users from offers if not in zone users
                zoneOffers.forEach(o => {
                    const userId = o.assignedToId || o.createdById;
                    const userName = o.assignedTo?.name || o.createdBy?.name;
                    if (userId && userName && !usersInZone.find(u => u.id === userId)) {
                        usersInZone.push({ id: userId, name: userName });
                    }
                });

                // Build matrix: productType -> userId -> value
                const matrix: Record<string, Record<number, number>> = {};
                const totalsByUser: Record<number, number> = {};
                const totalsByProduct: Record<string, number> = {};
                let zoneTotal = 0;

                // Initialize all product types
                PRODUCT_TYPES.forEach(pt => {
                    matrix[pt] = {};
                    usersInZone.forEach(u => {
                        matrix[pt][u.id] = 0;
                    });
                    totalsByProduct[pt] = 0;
                });

                usersInZone.forEach(u => {
                    totalsByUser[u.id] = 0;
                });

                // Fill in values
                zoneOffers.forEach(o => {
                    const pt = o.productType || 'UNKNOWN';
                    const userId = o.assignedToId || o.createdById || 0;
                    const value = Number(o.offerValue || 0);

                    if (!matrix[pt]) matrix[pt] = {};
                    matrix[pt][userId] = (matrix[pt][userId] || 0) + value;
                    totalsByUser[userId] = (totalsByUser[userId] || 0) + value;
                    totalsByProduct[pt] = (totalsByProduct[pt] || 0) + value;
                    zoneTotal += value;
                });

                return {
                    zoneId: zone.id,
                    zoneName: zone.name,
                    users: usersInZone,
                    productTypes: PRODUCT_TYPES.map(pt => ({ code: pt, name: formatProductType(pt) })),
                    matrix,
                    totals: {
                        byUser: totalsByUser,
                        byProductType: totalsByProduct,
                        zoneTotal,
                    },
                };
            });

            // Calculate grand totals by product type
            const grandTotalsByProduct: Record<string, number> = {};
            PRODUCT_TYPES.forEach(pt => {
                grandTotalsByProduct[pt] = zoneData.reduce((sum, z) => sum + (z.totals.byProductType[pt] || 0), 0);
            });

            res.json({
                success: true,
                data: {
                    year,
                    zones: zoneData,
                    grandTotals: grandTotalsByProduct,
                },
            });
        } catch (error) {
            logger.error('FORST product type summary error:', error);
            res.status(500).json({ error: 'Failed to compute product type summary' });
        }
    }

    /**
     * Get Person-wise Performance (Image 4)
     * Returns monthly breakdown by person and product type
     */
    static async getPersonWisePerformance(req: AuthenticatedRequest, res: Response) {
        try {
            const { year: yearParam, zoneId: zoneIdParam, userId: userIdParam } = req.query as any;
            const now = new Date();
            const year = yearParam ? parseInt(yearParam as string) : now.getFullYear();
            const zoneId = zoneIdParam ? parseInt(zoneIdParam as string) : null;
            const userId = userIdParam ? parseInt(userIdParam as string) : null;

            // Get offers with user info
            const offers = await prisma.offer.findMany({
                where: {
                    poExpectedMonth: { startsWith: `${year}-` },
                    status: { notIn: ['CANCELLED', 'LOST'] as any },
                    ...(zoneId ? { zoneId } : {}),
                },
                select: {
                    zoneId: true,
                    productType: true,
                    offerValue: true,
                    poExpectedMonth: true,
                    assignedToId: true,
                    createdById: true,
                    assignedTo: { select: { id: true, name: true } },
                    createdBy: { select: { id: true, name: true } },
                    zone: { select: { id: true, name: true } },
                },
            });

            // Get unique users from offers
            const userMap = new Map<number, { id: number; name: string; zoneName: string }>();
            offers.forEach(o => {
                const uid = o.assignedToId || o.createdById;
                const name = o.assignedTo?.name || o.createdBy?.name;
                const zoneName = o.zone?.name || 'Unknown';
                if (uid && name && (!userId || uid === userId)) {
                    if (!userMap.has(uid)) {
                        userMap.set(uid, { id: uid, name, zoneName });
                    }
                }
            });

            const users = Array.from(userMap.values());

            // Build person-wise data
            const personData = users.map(user => {
                const userOffers = offers.filter(o =>
                    (o.assignedToId === user.id || o.createdById === user.id)
                );

                // Build monthly breakdown
                const monthly: Record<number, Record<string, number>> = {};
                for (let m = 1; m <= 12; m++) {
                    monthly[m] = {};
                    PRODUCT_TYPES.forEach(pt => {
                        monthly[m][pt] = 0;
                    });
                }

                userOffers.forEach(o => {
                    const mm = (o.poExpectedMonth || '').split('-')[1];
                    if (!mm) return;
                    const month = parseInt(mm, 10);
                    const pt = o.productType || 'UNKNOWN';
                    const value = Number(o.offerValue || 0);
                    if (!monthly[month]) monthly[month] = {};
                    monthly[month][pt] = (monthly[month][pt] || 0) + value;
                });

                // Calculate totals
                const totals: Record<string, number> = {};
                PRODUCT_TYPES.forEach(pt => {
                    totals[pt] = 0;
                    for (let m = 1; m <= 12; m++) {
                        totals[pt] += monthly[m][pt] || 0;
                    }
                });

                const grandTotal = Object.values(totals).reduce((sum, v) => sum + v, 0);

                return {
                    userId: user.id,
                    userName: user.name,
                    zoneName: user.zoneName,
                    monthly,
                    totals,
                    grandTotal,
                };
            });

            res.json({
                success: true,
                data: {
                    year,
                    months: monthNames,
                    productTypes: PRODUCT_TYPES.map(pt => ({ code: pt, name: formatProductType(pt) })),
                    persons: personData,
                },
            });
        } catch (error) {
            logger.error('FORST person-wise performance error:', error);
            res.status(500).json({ error: 'Failed to compute person-wise performance' });
        }
    }

    /**
     * Get Product Forecast (Image 3)
     * Returns product-wise monthly forecast by zone
     */
    static async getProductForecast(req: AuthenticatedRequest, res: Response) {
        try {
            const { year: yearParam } = req.query as any;
            const now = new Date();
            const year = yearParam ? parseInt(yearParam as string) : now.getFullYear();

            const zones = await prisma.serviceZone.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            });

            // Get all offers
            const offers = await prisma.offer.findMany({
                where: {
                    poExpectedMonth: { startsWith: `${year}-` },
                    status: { notIn: ['CANCELLED', 'LOST'] as any },
                },
                select: {
                    zoneId: true,
                    productType: true,
                    offerValue: true,
                    poExpectedMonth: true,
                },
            });

            // Build zone-wise product-wise monthly data
            const zoneData = sortZones(zones).map(zone => {
                const zoneOffers = offers.filter(o => o.zoneId === zone.id);

                // Initialize matrix: productType -> month -> value
                const matrix: Record<string, Record<number, number>> = {};
                const monthTotals: Record<number, number> = {};
                const productTotals: Record<string, number> = {};

                PRODUCT_TYPES.forEach(pt => {
                    matrix[pt] = {};
                    for (let m = 1; m <= 12; m++) {
                        matrix[pt][m] = 0;
                    }
                    productTotals[pt] = 0;
                });

                for (let m = 1; m <= 12; m++) {
                    monthTotals[m] = 0;
                }

                // Fill in values
                zoneOffers.forEach(o => {
                    const mm = (o.poExpectedMonth || '').split('-')[1];
                    if (!mm) return;
                    const month = parseInt(mm, 10);
                    const pt = o.productType || 'UNKNOWN';
                    const value = Number(o.offerValue || 0);

                    if (!matrix[pt]) matrix[pt] = {};
                    matrix[pt][month] = (matrix[pt][month] || 0) + value;
                    monthTotals[month] = (monthTotals[month] || 0) + value;
                    productTotals[pt] = (productTotals[pt] || 0) + value;
                });

                const zoneTotal = Object.values(productTotals).reduce((sum, v) => sum + v, 0);

                return {
                    zoneId: zone.id,
                    zoneName: zone.name,
                    matrix,
                    monthTotals,
                    productTotals,
                    zoneTotal,
                };
            });

            // Calculate grand totals
            const grandTotals: Record<string, Record<number, number>> = {};
            const grandMonthTotals: Record<number, number> = {};
            const grandProductTotals: Record<string, number> = {};

            PRODUCT_TYPES.forEach(pt => {
                grandTotals[pt] = {};
                for (let m = 1; m <= 12; m++) {
                    grandTotals[pt][m] = zoneData.reduce((sum, z) => sum + (z.matrix[pt]?.[m] || 0), 0);
                }
                grandProductTotals[pt] = zoneData.reduce((sum, z) => sum + (z.productTotals[pt] || 0), 0);
            });

            for (let m = 1; m <= 12; m++) {
                grandMonthTotals[m] = zoneData.reduce((sum, z) => sum + (z.monthTotals[m] || 0), 0);
            }

            res.json({
                success: true,
                data: {
                    year,
                    months: monthNames,
                    productTypes: PRODUCT_TYPES.map(pt => ({ code: pt, name: formatProductType(pt) })),
                    zones: zoneData,
                    grandTotals: {
                        matrix: grandTotals,
                        monthTotals: grandMonthTotals,
                        productTotals: grandProductTotals,
                        total: Object.values(grandProductTotals).reduce((sum, v) => sum + v, 0),
                    },
                },
            });
        } catch (error) {
            logger.error('FORST product forecast error:', error);
            res.status(500).json({ error: 'Failed to compute product forecast' });
        }
    }

    /**
     * Get Complete Report - All data in one call
     */
    static async getCompleteReport(req: AuthenticatedRequest, res: Response) {
        try {
            const { year: yearParam } = req.query as any;
            const now = new Date();
            const year = yearParam ? parseInt(yearParam as string) : now.getFullYear();

            // Create mock request/response to call other methods
            const mockReq = { query: { year: year.toString() } } as any;

            const highlights = await new Promise<any>((resolve) => {
                ForstController.getOffersHighlights(mockReq, {
                    json: (data: any) => resolve(data),
                    status: () => ({ json: (data: any) => resolve(data) }),
                } as any);
            });

            const zoneMonthly = await new Promise<any>((resolve) => {
                ForstController.getZoneMonthlyBreakdown(mockReq, {
                    json: (data: any) => resolve(data),
                    status: () => ({ json: (data: any) => resolve(data) }),
                } as any);
            });

            const quarterly = await new Promise<any>((resolve) => {
                ForstController.getForecastQuarterly(mockReq, {
                    json: (data: any) => resolve(data),
                    status: () => ({ json: (data: any) => resolve(data) }),
                } as any);
            });

            const productTypeSummary = await new Promise<any>((resolve) => {
                ForstController.getProductTypeSummary(mockReq, {
                    json: (data: any) => resolve(data),
                    status: () => ({ json: (data: any) => resolve(data) }),
                } as any);
            });

            const personWise = await new Promise<any>((resolve) => {
                ForstController.getPersonWisePerformance(mockReq, {
                    json: (data: any) => resolve(data),
                    status: () => ({ json: (data: any) => resolve(data) }),
                } as any);
            });

            const productForecast = await new Promise<any>((resolve) => {
                ForstController.getProductForecast(mockReq, {
                    json: (data: any) => resolve(data),
                    status: () => ({ json: (data: any) => resolve(data) }),
                } as any);
            });

            res.json({
                success: true,
                data: {
                    year,
                    highlights: highlights.data,
                    zoneMonthly: zoneMonthly.data,
                    quarterly: quarterly.data,
                    productTypeSummary: productTypeSummary.data,
                    personWise: personWise.data,
                    productForecast: productForecast.data,
                },
            });
        } catch (error) {
            logger.error('FORST complete report error:', error);
            res.status(500).json({ error: 'Failed to compute complete report' });
        }
    }

    /**
     * Export to Excel - Single comprehensive sheet matching the Excel screenshots
     */
    static async exportExcel(req: AuthenticatedRequest, res: Response) {
        try {
            const { year: yearParam } = req.query as any;
            const now = new Date();
            const year = yearParam ? parseInt(yearParam as string) : now.getFullYear();

            // Get complete data
            const mockReq = { query: { year: year.toString() } } as any;
            const report = await new Promise<any>((resolve) => {
                ForstController.getCompleteReport(mockReq, {
                    json: (data: any) => resolve(data),
                    status: () => ({ json: (data: any) => resolve(data) }),
                } as any);
            });

            if (!report.success) {
                return res.status(500).json({ error: 'Failed to generate report data' });
            }

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'KardexCare FORST';
            workbook.created = new Date();

            // Single comprehensive sheet
            const ws = workbook.addWorksheet('FORST Report');

            // Colors
            const c = {
                hBlue: 'FF4472C4', hDark: 'FF2F5496', lBlue: 'FFD9E2F3',
                lGreen: 'FFE2EFDA', lYellow: 'FFFFF2CC', lPurple: 'FFE4DFEC',
                white: 'FFFFFFFF', red: 'FFFF0000', green: 'FF00B050',
            };

            // Set column widths
            ws.columns = [
                { width: 16 }, { width: 12 }, { width: 12 }, { width: 12 },
                { width: 12 }, { width: 12 }, { width: 12 }, { width: 10 },
                { width: 12 }, { width: 12 }, { width: 10 }, { width: 10 },
                { width: 10 }, { width: 12 }
            ];

            let row = 1;
            const fmtL = (v: number) => Math.round((v || 0) / 100000 * 100) / 100;

            // === TITLE ===
            ws.mergeCells(`A${row}:I${row}`);
            const title = ws.getCell(`A${row}`);
            title.value = `KARDEX LCS: Live Offer Funnel, Actuals, Deviations - ${year}`;
            title.font = { bold: true, size: 16, color: { argb: c.hDark } };
            title.alignment = { horizontal: 'center' };
            ws.getRow(row).height = 30;
            row += 2;

            // === OFFERS HIGHLIGHTS TABLE ===
            const hl = report.data.highlights;
            if (hl?.rows) {
                const hdrs = ['Zone', 'Offers', 'Value(L)', 'Orders(L)', 'Open(L)', 'Booking(L)', 'BU(L)', '%', 'Balance(L)'];
                const hr = ws.getRow(row);
                hdrs.forEach((h, i) => {
                    const cell = hr.getCell(i + 1);
                    cell.value = h;
                    cell.font = { bold: true, color: { argb: c.white }, size: 9 };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.hBlue } };
                    cell.alignment = { horizontal: 'center' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
                row++;

                hl.rows.forEach((r: any, idx: number) => {
                    const dr = ws.getRow(row);
                    const vals = [r.zoneName, r.numOffers || 0, fmtL(r.offersValue), fmtL(r.ordersReceived),
                    fmtL(r.openFunnel), fmtL(r.orderBooking), fmtL(r.utForBooking),
                    `${(r.devPercent || 0).toFixed(0)}%`, fmtL(r.balanceBu)];
                    vals.forEach((v, i) => {
                        const cell = dr.getCell(i + 1);
                        cell.value = v;
                        cell.alignment = { horizontal: i === 0 ? 'left' : 'center' };
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        if (idx % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.lBlue } };
                        if (i === 7 && (r.devPercent || 0) < 0) cell.font = { color: { argb: c.red }, bold: true };
                        if (i === 7 && (r.devPercent || 0) > 0) cell.font = { color: { argb: c.green }, bold: true };
                    });
                    row++;
                });

                // Total
                if (hl.total) {
                    const tr = ws.getRow(row);
                    const tvals = ['TOTAL', hl.total.numOffers || 0, fmtL(hl.total.offersValue), fmtL(hl.total.ordersReceived),
                        fmtL(hl.total.openFunnel), fmtL(hl.total.orderBooking), fmtL(hl.total.utForBooking),
                        `${(hl.total.devPercent || 0).toFixed(0)}%`, fmtL(hl.total.balanceBu)];
                    tvals.forEach((v, i) => {
                        const cell = tr.getCell(i + 1);
                        cell.value = v;
                        cell.font = { bold: true };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.lYellow } };
                        cell.alignment = { horizontal: i === 0 ? 'left' : 'center' };
                        cell.border = { top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
                    });
                    row++;
                }

                row++;
                ws.getCell(`A${row}`).value = `Hit Rate: ${hl.hitRate || 0}%`;
                ws.getCell(`A${row}`).font = { bold: true, size: 12, color: { argb: c.hDark } };
                row += 3;
            }

            // === ZONE MONTHLY BREAKDOWN ===
            const zm = report.data.zoneMonthly;
            if (zm?.zones) {
                for (const zone of zm.zones) {
                    ws.mergeCells(`A${row}:I${row}`);
                    const zt = ws.getCell(`A${row}`);
                    zt.value = `${zone.zoneName} - Monthly (Hit: ${zone.hitRate || 0}%)`;
                    zt.font = { bold: true, size: 11, color: { argb: c.white } };
                    zt.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.hDark } };
                    zt.alignment = { horizontal: 'center' };
                    row++;

                    const mhdrs = ['Month', 'Offer(L)', 'Recv(L)', 'Book(L)', 'Dev(L)', 'InHand(L)', 'BU(L)', 'vs BU(L)', '%'];
                    const mhr = ws.getRow(row);
                    mhdrs.forEach((h, i) => {
                        const cell = mhr.getCell(i + 1);
                        cell.value = h;
                        cell.font = { bold: true, color: { argb: c.white }, size: 8 };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.hBlue } };
                        cell.alignment = { horizontal: 'center' };
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    });
                    row++;

                    if (zone.monthly) {
                        zone.monthly.forEach((m: any, idx: number) => {
                            const mr = ws.getRow(row);
                            const mvals = [m.monthName, fmtL(m.offersValue), fmtL(m.ordersReceived), fmtL(m.ordersBooked),
                            fmtL(m.devOrVsBooked), fmtL(m.ordersInHand), fmtL(m.buMonthly), fmtL(m.bookedVsBu),
                            `${(m.bookedVsBuPercent || 0).toFixed(0)}%`];
                            mvals.forEach((v, i) => {
                                const cell = mr.getCell(i + 1);
                                cell.value = v;
                                cell.alignment = { horizontal: i === 0 ? 'left' : 'center' };
                                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                                if (idx % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.lBlue } };
                                if (i === 8 && (m.bookedVsBuPercent || 0) < 0) cell.font = { color: { argb: c.red }, bold: true };
                                if (i === 8 && (m.bookedVsBuPercent || 0) > 0) cell.font = { color: { argb: c.green }, bold: true };
                            });
                            row++;
                        });
                    }

                    if (zone.totals) {
                        const ztr = ws.getRow(row);
                        const ztvals = ['Total', fmtL(zone.totals.offersValue), fmtL(zone.totals.ordersReceived),
                            fmtL(zone.totals.ordersBooked), '', '', fmtL(zone.totals.buMonthly), '', ''];
                        ztvals.forEach((v, i) => {
                            const cell = ztr.getCell(i + 1);
                            cell.value = v;
                            cell.font = { bold: true };
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.lYellow } };
                            cell.border = { top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
                        });
                        row++;
                    }
                    row += 2;
                }
            }

            // === QUARTERLY FORECAST ===
            const q = report.data.quarterly;
            if (q?.quarters) {
                ws.mergeCells(`A${row}:E${row}`);
                ws.getCell(`A${row}`).value = `Quarterly Forecast vs BU`;
                ws.getCell(`A${row}`).font = { bold: true, size: 12, color: { argb: c.hDark } };
                row += 2;

                const qh = ws.getRow(row);
                ['Quarter', 'Forecast(L)', 'BU(L)', 'Var(L)', '%'].forEach((h, i) => {
                    const cell = qh.getCell(i + 1);
                    cell.value = h;
                    cell.font = { bold: true, color: { argb: c.white } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.hBlue } };
                    cell.alignment = { horizontal: 'center' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
                row++;

                q.quarters.forEach((qtr: any, idx: number) => {
                    const qr = ws.getRow(row);
                    const variance = (qtr.forecast || 0) - (qtr.bu || 0);
                    [qtr.quarter, fmtL(qtr.forecast), fmtL(qtr.bu), fmtL(variance), `${(qtr.devPercent || 0).toFixed(0)}%`].forEach((v, i) => {
                        const cell = qr.getCell(i + 1);
                        cell.value = v;
                        cell.alignment = { horizontal: 'center' };
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        if (idx % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.lPurple } };
                        if (i === 4 && (qtr.devPercent || 0) < 0) cell.font = { color: { argb: c.red }, bold: true };
                        if (i === 4 && (qtr.devPercent || 0) > 0) cell.font = { color: { argb: c.green }, bold: true };
                    });
                    row++;
                });
                row += 3;
            }

            // === PRODUCT TYPE BY ZONE ===
            const ps = report.data.productTypeSummary;
            if (ps?.zones) {
                ws.mergeCells(`A${row}:H${row}`);
                ws.getCell(`A${row}`).value = `Product Type by Zone & Person`;
                ws.getCell(`A${row}`).font = { bold: true, size: 12, color: { argb: c.hDark } };
                row += 2;

                for (const zone of ps.zones) {
                    if (!zone.users || zone.users.length === 0) continue;
                    const nc = (zone.users.length || 0) + 2;

                    ws.mergeCells(row, 1, row, nc);
                    const zh = ws.getCell(row, 1);
                    zh.value = `${zone.zoneName} - ₹${fmtL(zone.totals?.zoneTotal || 0)}L`;
                    zh.font = { bold: true, color: { argb: c.white } };
                    zh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.hDark } };
                    zh.alignment = { horizontal: 'center' };
                    row++;

                    const phr = ws.getRow(row);
                    phr.getCell(1).value = 'Product';
                    zone.users.forEach((u: any, i: number) => { phr.getCell(i + 2).value = u.name; });
                    phr.getCell(nc).value = 'Total';
                    for (let i = 1; i <= nc; i++) {
                        const cell = phr.getCell(i);
                        cell.font = { bold: true, size: 8 };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.lGreen } };
                        cell.alignment = { horizontal: 'center' };
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    }
                    row++;

                    zone.productTypes?.forEach((pt: any, idx: number) => {
                        const pr = ws.getRow(row);
                        pr.getCell(1).value = pt.name;
                        zone.users.forEach((u: any, i: number) => {
                            pr.getCell(i + 2).value = fmtL(zone.matrix?.[pt.code]?.[u.id] || 0);
                        });
                        pr.getCell(nc).value = fmtL(zone.totals?.byProductType?.[pt.code] || 0);
                        pr.getCell(nc).font = { bold: true };
                        for (let i = 1; i <= nc; i++) {
                            const cell = pr.getCell(i);
                            cell.alignment = { horizontal: i === 1 ? 'left' : 'center' };
                            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                            if (idx % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.lBlue } };
                        }
                        row++;
                    });

                    const ttr = ws.getRow(row);
                    ttr.getCell(1).value = 'Total';
                    zone.users.forEach((u: any, i: number) => {
                        ttr.getCell(i + 2).value = fmtL(zone.totals?.byUser?.[u.id] || 0);
                    });
                    ttr.getCell(nc).value = fmtL(zone.totals?.zoneTotal || 0);
                    for (let i = 1; i <= nc; i++) {
                        const cell = ttr.getCell(i);
                        cell.font = { bold: true };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.lYellow } };
                        cell.border = { top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
                    }
                    row += 3;
                }
            }

            // === PERSON-WISE FORECAST ===
            const pw = report.data.personWise;
            if (pw?.persons && pw.persons.length > 0) {
                ws.mergeCells(`A${row}:N${row}`);
                ws.getCell(`A${row}`).value = `Person-wise Monthly Forecast`;
                ws.getCell(`A${row}`).font = { bold: true, size: 12, color: { argb: c.hDark } };
                row += 2;

                for (const p of pw.persons.slice(0, 10)) {
                    ws.mergeCells(row, 1, row, 14);
                    const ph = ws.getCell(row, 1);
                    ph.value = `${p.userName} (${p.zoneName}) - ₹${fmtL(p.grandTotal || 0)}L`;
                    ph.font = { bold: true, color: { argb: c.white }, size: 9 };
                    ph.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.hDark } };
                    ph.alignment = { horizontal: 'center' };
                    row++;

                    const pmh = ws.getRow(row);
                    pmh.getCell(1).value = 'Product';
                    (pw.months || monthNames).forEach((m: string, i: number) => { pmh.getCell(i + 2).value = m; });
                    pmh.getCell(14).value = 'Total';
                    for (let i = 1; i <= 14; i++) {
                        const cell = pmh.getCell(i);
                        cell.font = { bold: true, size: 7 };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.lGreen } };
                        cell.alignment = { horizontal: 'center' };
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    }
                    row++;

                    pw.productTypes?.forEach((pt: any, idx: number) => {
                        const pmr = ws.getRow(row);
                        pmr.getCell(1).value = pt.name;
                        for (let m = 1; m <= 12; m++) {
                            const val = p.monthly?.[m]?.[pt.code] || 0;
                            pmr.getCell(m + 1).value = val > 0 ? fmtL(val) : 0;
                        }
                        pmr.getCell(14).value = fmtL(p.totals?.[pt.code] || 0);
                        pmr.getCell(14).font = { bold: true };
                        for (let i = 1; i <= 14; i++) {
                            const cell = pmr.getCell(i);
                            cell.font = { size: 7, ...(i === 14 ? { bold: true } : {}) };
                            cell.alignment = { horizontal: i === 1 ? 'left' : 'center' };
                            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                            if (idx % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.lBlue } };
                        }
                        row++;
                    });
                    row += 2;
                }
            }

            // Footer
            row += 2;
            ws.getCell(`A${row}`).value = `Generated: ${new Date().toLocaleString()} | KardexCare FORST`;
            ws.getCell(`A${row}`).font = { italic: true, size: 8, color: { argb: 'FF666666' } };

            // Response
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=FORST_Report_${year}.xlsx`);
            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            logger.error('FORST export Excel error:', error);
            res.status(500).json({ error: 'Failed to export Excel' });
        }
    }
}
