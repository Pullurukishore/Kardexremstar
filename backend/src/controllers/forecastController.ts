import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// ============================================================================
// CONSTANTS
// ============================================================================

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const ZONE_ORDER = ['WEST', 'SOUTH', 'NORTH', 'EAST'];

const PRODUCT_TYPES = [
  'CONTRACT', 'BD_SPARE', 'SPP', 'RELOCATION', 'SOFTWARE',
  'BD_CHARGES', 'RETROFIT_KIT', 'UPGRADE_KIT', 'MIDLIFE_UPGRADE'
];

const PRODUCT_LABELS: Record<string, string> = {
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const pad2 = (n: number): string => n.toString().padStart(2, '0');

const sortByZoneOrder = <T extends { name?: string; zoneName?: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const aName = a.name || a.zoneName || '';
    const bName = b.name || b.zoneName || '';
    const aIdx = ZONE_ORDER.indexOf(aName);
    const bIdx = ZONE_ORDER.indexOf(bName);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });
};

const getYearDateRange = (year: number) => ({
  start: new Date(year, 0, 1),
  end: new Date(year, 11, 31, 23, 59, 59, 999)
});

const calcPercentage = (value: number, total: number): number => {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
};

const calcDeviation = (actual: number, target: number): number => {
  return target > 0 ? Math.round(((actual - target) / target) * 1000) / 10 : 0;
};

// ============================================================================
// FORECAST CONTROLLER
// ============================================================================

export class ForecastController {

  /**
   * ZONE-WISE FORECAST
   * Monthly breakdown by zone with targets, achievement, and hit rate
   */
  static async getZoneForecast(req: AuthenticatedRequest, res: Response) {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      // Fetch all required data
      const [zones, allOffers, zoneTargets] = await Promise.all([
        prisma.serviceZone.findMany({
          select: { id: true, name: true, shortForm: true },
          orderBy: { name: 'asc' }
        }),
        prisma.offer.findMany({
          where: {
            OR: [
              { poExpectedMonth: { startsWith: `${year}-` } },
              { poReceivedMonth: { startsWith: `${year}-` } },
              { createdAt: getYearDateRange(year).start }
            ],
            status: { notIn: ['CANCELLED'] as any }
          },
          select: {
            id: true,
            zoneId: true,
            offerValue: true,
            poValue: true,
            poExpectedMonth: true,
            poReceivedMonth: true,
            probabilityPercentage: true,
            productType: true,
            stage: true,
            status: true,
            assignedToId: true,
            createdById: true
          }
        }),
        prisma.zoneTarget.findMany({
          where: {
            OR: [
              { periodType: 'YEARLY' as any, targetPeriod: `${year}` },
              { periodType: 'MONTHLY' as any, targetPeriod: { startsWith: `${year}-` } }
            ]
          },
          select: {
            serviceZoneId: true,
            targetPeriod: true,
            periodType: true,
            targetValue: true,
            productType: true
          }
        })
      ]);

      // Build target lookup
      const yearlyTargetByZone = new Map<number, number>();
      const monthlyTargetByZoneMonth = new Map<string, number>();

      zoneTargets.forEach(t => {
        const value = Number(t.targetValue || 0);
        if (t.periodType === 'YEARLY') {
          yearlyTargetByZone.set(t.serviceZoneId, (yearlyTargetByZone.get(t.serviceZoneId) || 0) + value);
        } else {
          const key = `${t.serviceZoneId}-${t.targetPeriod}`;
          monthlyTargetByZoneMonth.set(key, (monthlyTargetByZoneMonth.get(key) || 0) + value);
        }
      });

      // Process each zone
      const zoneData = sortByZoneOrder(zones).map(zone => {
        const zoneOffers = allOffers.filter(o => o.zoneId === zone.id);

        // Monthly breakdown
        const monthly: {
          month: number;
          monthName: string;
          monthKey: string;
          rawForecast: number;
          weightedForecast: number;
          actualOrders: number;
          offersCount: number;
          wonCount: number;
          avgProbability: number;
          target: number;
          achievement: number;
          hitRate: number;
        }[] = [];

        let totalRawForecast = 0;
        let totalWeightedForecast = 0;
        let totalActualOrders = 0;
        let totalOffersCount = 0;
        let totalWonCount = 0;

        for (let m = 1; m <= 12; m++) {
          const monthKey = `${year}-${pad2(m)}`;

          // Offers expected in this month
          const monthOffers = zoneOffers.filter(o => o.poExpectedMonth === monthKey);

          // Won orders in this month
          const wonOrders = zoneOffers.filter(o =>
            o.poReceivedMonth === monthKey &&
            ['WON', 'PO_RECEIVED'].includes(String(o.stage))
          );

          const rawForecast = monthOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0);
          const weightedForecast = monthOffers.reduce((sum, o) => {
            const prob = Number(o.probabilityPercentage || 50) / 100;
            return sum + (Number(o.offerValue || 0) * prob);
          }, 0);
          const actualOrders = wonOrders.reduce((sum, o) => sum + Number(o.poValue || o.offerValue || 0), 0);
          const offersCount = monthOffers.length;
          const wonCount = wonOrders.length;

          // Get target for this month
          let monthTarget = monthlyTargetByZoneMonth.get(`${zone.id}-${monthKey}`) || 0;
          if (monthTarget === 0 && yearlyTargetByZone.has(zone.id)) {
            monthTarget = (yearlyTargetByZone.get(zone.id) || 0) / 12;
          }

          const avgProbability = offersCount > 0
            ? Math.round(monthOffers.reduce((sum, o) => sum + Number(o.probabilityPercentage || 50), 0) / offersCount)
            : 0;

          monthly.push({
            month: m,
            monthName: MONTH_NAMES[m - 1],
            monthKey,
            rawForecast,
            weightedForecast: Math.round(weightedForecast),
            actualOrders,
            offersCount,
            wonCount,
            avgProbability,
            target: monthTarget,
            achievement: calcPercentage(actualOrders, monthTarget),
            hitRate: calcPercentage(wonCount, offersCount)
          });

          totalRawForecast += rawForecast;
          totalWeightedForecast += weightedForecast;
          totalActualOrders += actualOrders;
          totalOffersCount += offersCount;
          totalWonCount += wonCount;
        }

        // Quarterly breakdown
        const quarterly = [
          { name: 'Q1', months: [0, 1, 2] },
          { name: 'Q2', months: [3, 4, 5] },
          { name: 'Q3', months: [6, 7, 8] },
          { name: 'Q4', months: [9, 10, 11] }
        ].map(q => {
          const qMonths = q.months.map(i => monthly[i]);
          const rawForecast = qMonths.reduce((sum, m) => sum + m.rawForecast, 0);
          const weightedForecast = qMonths.reduce((sum, m) => sum + m.weightedForecast, 0);
          const actualOrders = qMonths.reduce((sum, m) => sum + m.actualOrders, 0);
          const target = qMonths.reduce((sum, m) => sum + m.target, 0);
          const offersCount = qMonths.reduce((sum, m) => sum + m.offersCount, 0);
          const wonCount = qMonths.reduce((sum, m) => sum + m.wonCount, 0);

          return {
            quarter: q.name,
            rawForecast,
            weightedForecast,
            actualOrders,
            target,
            achievement: calcPercentage(actualOrders, target),
            offersCount,
            wonCount,
            hitRate: calcPercentage(wonCount, offersCount)
          };
        });

        // Yearly target
        const yearlyTarget = yearlyTargetByZone.get(zone.id) ||
          monthly.reduce((sum, m) => sum + m.target, 0);

        // Product breakdown for this zone
        const productBreakdown = PRODUCT_TYPES.map(pt => {
          const ptOffers = zoneOffers.filter(o => o.productType === pt && o.poExpectedMonth?.startsWith(`${year}-`));
          const forecast = ptOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0);
          return {
            productType: pt,
            label: PRODUCT_LABELS[pt] || pt,
            forecast,
            percentage: calcPercentage(forecast, totalRawForecast),
            count: ptOffers.length
          };
        }).filter(p => p.count > 0).sort((a, b) => b.forecast - a.forecast);

        return {
          zoneId: zone.id,
          zoneName: zone.name,
          shortForm: zone.shortForm,
          monthly,
          quarterly,
          totals: {
            rawForecast: totalRawForecast,
            weightedForecast: Math.round(totalWeightedForecast),
            actualOrders: totalActualOrders,
            target: yearlyTarget,
            achievement: calcPercentage(totalActualOrders, yearlyTarget),
            deviation: calcDeviation(totalActualOrders, yearlyTarget),
            balanceToTarget: yearlyTarget - totalActualOrders,
            offersCount: totalOffersCount,
            wonCount: totalWonCount,
            hitRate: calcPercentage(totalWonCount, totalOffersCount)
          },
          productBreakdown
        };
      });

      // Grand totals
      const grandTotal = {
        rawForecast: zoneData.reduce((sum, z) => sum + z.totals.rawForecast, 0),
        weightedForecast: zoneData.reduce((sum, z) => sum + z.totals.weightedForecast, 0),
        actualOrders: zoneData.reduce((sum, z) => sum + z.totals.actualOrders, 0),
        target: zoneData.reduce((sum, z) => sum + z.totals.target, 0),
        offersCount: zoneData.reduce((sum, z) => sum + z.totals.offersCount, 0),
        wonCount: zoneData.reduce((sum, z) => sum + z.totals.wonCount, 0),
        achievement: 0,
        hitRate: 0
      };
      grandTotal.achievement = calcPercentage(grandTotal.actualOrders, grandTotal.target);
      grandTotal.hitRate = calcPercentage(grandTotal.wonCount, grandTotal.offersCount);

      res.json({
        success: true,
        data: {
          year,
          zones: zoneData,
          grandTotal,
          months: MONTH_NAMES,
          quarters: ['Q1', 'Q2', 'Q3', 'Q4']
        }
      });

    } catch (error) {
      logger.error('Zone forecast error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch zone forecast' });
    }
  }

  /**
   * USER-WISE FORECAST
   * Individual user performance with targets and ranking
   */
  static async getUserForecast(req: AuthenticatedRequest, res: Response) {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const zoneId = req.query.zoneId ? parseInt(req.query.zoneId as string) : null;

      // Fetch data
      const [allOffers, userTargets, users] = await Promise.all([
        prisma.offer.findMany({
          where: {
            OR: [
              { poExpectedMonth: { startsWith: `${year}-` } },
              { poReceivedMonth: { startsWith: `${year}-` } }
            ],
            status: { notIn: ['CANCELLED'] as any },
            ...(zoneId ? { zoneId } : {})
          },
          select: {
            id: true,
            zoneId: true,
            offerValue: true,
            poValue: true,
            poExpectedMonth: true,
            poReceivedMonth: true,
            probabilityPercentage: true,
            productType: true,
            stage: true,
            assignedToId: true,
            createdById: true,
            assignedTo: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
            zone: { select: { id: true, name: true } }
          }
        }),
        prisma.userTarget.findMany({
          where: {
            OR: [
              { periodType: 'YEARLY' as any, targetPeriod: `${year}` },
              { periodType: 'MONTHLY' as any, targetPeriod: { startsWith: `${year}-` } }
            ]
          },
          select: {
            userId: true,
            targetPeriod: true,
            periodType: true,
            targetValue: true
          }
        }),
        prisma.user.findMany({
          where: {
            role: { in: ['ADMIN', 'ZONE_MANAGER', 'ZONE_USER'] as any },
            isActive: true
          },
          select: { id: true, name: true }
        })
      ]);

      // Build user target lookup
      const yearlyUserTarget = new Map<number, number>();
      const monthlyUserTarget = new Map<string, number>();

      userTargets.forEach(t => {
        const value = Number(t.targetValue || 0);
        if (t.periodType === 'YEARLY') {
          yearlyUserTarget.set(t.userId, (yearlyUserTarget.get(t.userId) || 0) + value);
        } else {
          const key = `${t.userId}-${t.targetPeriod}`;
          monthlyUserTarget.set(key, (monthlyUserTarget.get(key) || 0) + value);
        }
      });

      // Build user map from offers
      const userMap = new Map<number, {
        id: number;
        name: string;
        zone: string;
        offers: typeof allOffers;
      }>();

      allOffers.forEach(o => {
        const userId = o.assignedToId || o.createdById;
        const userName = o.assignedTo?.name || o.createdBy?.name || 'Unknown';
        const zoneName = o.zone?.name || 'Unknown';

        if (userId) {
          if (!userMap.has(userId)) {
            userMap.set(userId, { id: userId, name: userName, zone: zoneName, offers: [] });
          }
          userMap.get(userId)!.offers.push(o);
        }
      });

      // Process each user
      const userData = Array.from(userMap.values()).map(user => {
        const monthly: {
          month: number;
          monthName: string;
          monthKey: string;
          rawForecast: number;
          weightedForecast: number;
          actualOrders: number;
          offersCount: number;
          wonCount: number;
          target: number;
          achievement: number;
          hitRate: number;
        }[] = [];

        let totalRawForecast = 0;
        let totalActualOrders = 0;
        let totalOffersCount = 0;
        let totalWonCount = 0;

        for (let m = 1; m <= 12; m++) {
          const monthKey = `${year}-${pad2(m)}`;
          const monthOffers = user.offers.filter(o => o.poExpectedMonth === monthKey);
          const wonOrders = user.offers.filter(o =>
            o.poReceivedMonth === monthKey &&
            ['WON', 'PO_RECEIVED'].includes(String(o.stage))
          );

          const rawForecast = monthOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0);
          const weightedForecast = monthOffers.reduce((sum, o) => {
            const prob = Number(o.probabilityPercentage || 50) / 100;
            return sum + (Number(o.offerValue || 0) * prob);
          }, 0);
          const actualOrders = wonOrders.reduce((sum, o) => sum + Number(o.poValue || o.offerValue || 0), 0);

          let monthTarget = monthlyUserTarget.get(`${user.id}-${monthKey}`) || 0;
          if (monthTarget === 0 && yearlyUserTarget.has(user.id)) {
            monthTarget = (yearlyUserTarget.get(user.id) || 0) / 12;
          }

          monthly.push({
            month: m,
            monthName: MONTH_NAMES[m - 1],
            monthKey,
            rawForecast,
            weightedForecast: Math.round(weightedForecast),
            actualOrders,
            offersCount: monthOffers.length,
            wonCount: wonOrders.length,
            target: monthTarget,
            achievement: calcPercentage(actualOrders, monthTarget),
            hitRate: calcPercentage(wonOrders.length, monthOffers.length)
          });

          totalRawForecast += rawForecast;
          totalActualOrders += actualOrders;
          totalOffersCount += monthOffers.length;
          totalWonCount += wonOrders.length;
        }

        const yearlyTarget = yearlyUserTarget.get(user.id) ||
          monthly.reduce((sum, m) => sum + m.target, 0);

        // Product breakdown
        const productBreakdown = PRODUCT_TYPES.map(pt => {
          const ptOffers = user.offers.filter(o => o.productType === pt);
          return {
            productType: pt,
            label: PRODUCT_LABELS[pt],
            forecast: ptOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0),
            count: ptOffers.length
          };
        }).filter(p => p.count > 0);

        return {
          userId: user.id,
          userName: user.name,
          zoneName: user.zone,
          monthly,
          totals: {
            rawForecast: totalRawForecast,
            actualOrders: totalActualOrders,
            target: yearlyTarget,
            achievement: calcPercentage(totalActualOrders, yearlyTarget),
            offersCount: totalOffersCount,
            wonCount: totalWonCount,
            hitRate: calcPercentage(totalWonCount, totalOffersCount)
          },
          productBreakdown
        };
      });

      // Sort by forecast value and add ranking
      const rankedUsers = userData
        .sort((a, b) => b.totals.rawForecast - a.totals.rawForecast)
        .map((u, idx) => ({ ...u, rank: idx + 1 }));

      // Leaderboard (top 10)
      const leaderboard = rankedUsers.slice(0, 10).map(u => ({
        rank: u.rank,
        userId: u.userId,
        userName: u.userName,
        zoneName: u.zoneName,
        forecast: u.totals.rawForecast,
        actualOrders: u.totals.actualOrders,
        achievement: u.totals.achievement,
        hitRate: u.totals.hitRate
      }));

      res.json({
        success: true,
        data: {
          year,
          users: rankedUsers,
          leaderboard,
          totalUsers: rankedUsers.length,
          months: MONTH_NAMES
        }
      });

    } catch (error) {
      logger.error('User forecast error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch user forecast' });
    }
  }

  /**
   * PRODUCT-WISE FORECAST
   * Breakdown by product type with zone distribution
   */
  static async getProductForecast(req: AuthenticatedRequest, res: Response) {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      const [zones, allOffers] = await Promise.all([
        prisma.serviceZone.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }),
        prisma.offer.findMany({
          where: {
            OR: [
              { poExpectedMonth: { startsWith: `${year}-` } },
              { poReceivedMonth: { startsWith: `${year}-` } }
            ],
            status: { notIn: ['CANCELLED'] as any }
          },
          select: {
            id: true,
            zoneId: true,
            offerValue: true,
            poValue: true,
            poExpectedMonth: true,
            poReceivedMonth: true,
            probabilityPercentage: true,
            productType: true,
            stage: true,
            zone: { select: { id: true, name: true } }
          }
        })
      ]);

      const totalForecast = allOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0);

      // Process each product type
      const productData = PRODUCT_TYPES.map(pt => {
        const ptOffers = allOffers.filter(o => o.productType === pt);

        // Monthly breakdown
        const monthly: {
          month: number;
          monthName: string;
          forecast: number;
          weightedForecast: number;
          actualOrders: number;
          offersCount: number;
          wonCount: number;
        }[] = [];

        for (let m = 1; m <= 12; m++) {
          const monthKey = `${year}-${pad2(m)}`;
          const monthOffers = ptOffers.filter(o => o.poExpectedMonth === monthKey);
          const wonOrders = ptOffers.filter(o =>
            o.poReceivedMonth === monthKey &&
            ['WON', 'PO_RECEIVED'].includes(String(o.stage))
          );

          monthly.push({
            month: m,
            monthName: MONTH_NAMES[m - 1],
            forecast: monthOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0),
            weightedForecast: Math.round(monthOffers.reduce((sum, o) => {
              const prob = Number(o.probabilityPercentage || 50) / 100;
              return sum + (Number(o.offerValue || 0) * prob);
            }, 0)),
            actualOrders: wonOrders.reduce((sum, o) => sum + Number(o.poValue || o.offerValue || 0), 0),
            offersCount: monthOffers.length,
            wonCount: wonOrders.length
          });
        }

        // Zone breakdown
        const byZone = sortByZoneOrder(zones).map(z => {
          const zoneOffers = ptOffers.filter(o => o.zoneId === z.id);
          const wonOrders = zoneOffers.filter(o => ['WON', 'PO_RECEIVED'].includes(String(o.stage)));
          return {
            zoneId: z.id,
            zoneName: z.name,
            forecast: zoneOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0),
            actualOrders: wonOrders.reduce((sum, o) => sum + Number(o.poValue || o.offerValue || 0), 0),
            offersCount: zoneOffers.length,
            wonCount: wonOrders.length
          };
        });

        const totalPtForecast = ptOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0);
        const wonOrders = ptOffers.filter(o => ['WON', 'PO_RECEIVED'].includes(String(o.stage)));
        const totalActual = wonOrders.reduce((sum, o) => sum + Number(o.poValue || o.offerValue || 0), 0);

        return {
          productType: pt,
          label: PRODUCT_LABELS[pt] || pt,
          monthly,
          byZone,
          totals: {
            forecast: totalPtForecast,
            actualOrders: totalActual,
            contribution: calcPercentage(totalPtForecast, totalForecast),
            offersCount: ptOffers.length,
            wonCount: wonOrders.length,
            hitRate: calcPercentage(wonOrders.length, ptOffers.length)
          }
        };
      }).filter(p => p.totals.offersCount > 0).sort((a, b) => b.totals.forecast - a.totals.forecast);

      // Distribution summary
      const distribution = productData.map(p => ({
        productType: p.productType,
        label: p.label,
        forecast: p.totals.forecast,
        contribution: p.totals.contribution
      }));

      res.json({
        success: true,
        data: {
          year,
          products: productData,
          distribution,
          totalForecast,
          months: MONTH_NAMES,
          zones: sortByZoneOrder(zones).map(z => z.name)
        }
      });

    } catch (error) {
      logger.error('Product forecast error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch product forecast' });
    }
  }

  /**
   * OFFER FUNNEL ANALYSIS
   * Stage-wise pipeline with conversion rates
   */
  static async getFunnelAnalysis(req: AuthenticatedRequest, res: Response) {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const zoneId = req.query.zoneId ? parseInt(req.query.zoneId as string) : null;

      const [zones, allOffers] = await Promise.all([
        prisma.serviceZone.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }),
        prisma.offer.findMany({
          where: {
            createdAt: { gte: getYearDateRange(year).start, lte: getYearDateRange(year).end },
            ...(zoneId ? { zoneId } : {})
          },
          select: {
            id: true,
            offerReferenceNumber: true,
            zoneId: true,
            offerValue: true,
            poValue: true,
            stage: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            customer: { select: { companyName: true } },
            zone: { select: { name: true } }
          }
        })
      ]);

      // Stage counts and values
      const stageData = OFFER_STAGES.map(stage => {
        const stageOffers = allOffers.filter(o => o.stage === stage);
        return {
          stage,
          count: stageOffers.length,
          value: stageOffers.reduce((sum, o) => sum + Number(o.offerValue || 0), 0),
          percentage: calcPercentage(stageOffers.length, allOffers.length)
        };
      });

      // Funnel (cumulative from won perspective)
      const totalOffers = allOffers.filter(o => o.status !== 'CANCELLED').length;
      const totalValue = allOffers.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + Number(o.offerValue || 0), 0);

      const proposalPlus = allOffers.filter(o =>
        ['PROPOSAL_SENT', 'NEGOTIATION', 'PO_RECEIVED', 'WON'].includes(String(o.stage))
      );
      const negotiationPlus = allOffers.filter(o =>
        ['NEGOTIATION', 'PO_RECEIVED', 'WON'].includes(String(o.stage))
      );
      const poReceivedPlus = allOffers.filter(o =>
        ['PO_RECEIVED', 'WON'].includes(String(o.stage))
      );
      const wonOffers = allOffers.filter(o => o.stage === 'WON');

      const funnel = [
        {
          stage: 'All Offers',
          count: totalOffers,
          value: totalValue,
          rate: 100
        },
        {
          stage: 'Proposal Sent+',
          count: proposalPlus.length,
          value: proposalPlus.reduce((s, o) => s + Number(o.offerValue || 0), 0),
          rate: calcPercentage(proposalPlus.length, totalOffers)
        },
        {
          stage: 'Negotiation+',
          count: negotiationPlus.length,
          value: negotiationPlus.reduce((s, o) => s + Number(o.offerValue || 0), 0),
          rate: calcPercentage(negotiationPlus.length, totalOffers)
        },
        {
          stage: 'PO Received+',
          count: poReceivedPlus.length,
          value: poReceivedPlus.reduce((s, o) => s + Number(o.poValue || o.offerValue || 0), 0),
          rate: calcPercentage(poReceivedPlus.length, totalOffers)
        },
        {
          stage: 'Won',
          count: wonOffers.length,
          value: wonOffers.reduce((s, o) => s + Number(o.poValue || o.offerValue || 0), 0),
          rate: calcPercentage(wonOffers.length, totalOffers)
        }
      ];

      // Conversion rates between stages
      const conversionRates = {
        initialToProposal: calcPercentage(proposalPlus.length, totalOffers),
        proposalToNegotiation: calcPercentage(negotiationPlus.length, proposalPlus.length),
        negotiationToPO: calcPercentage(poReceivedPlus.length, negotiationPlus.length),
        poToWon: calcPercentage(wonOffers.length, poReceivedPlus.length),
        overallConversion: calcPercentage(wonOffers.length, totalOffers)
      };

      // Zone-wise funnel
      const byZone = sortByZoneOrder(zones).map(z => {
        const zOffers = allOffers.filter(o => o.zoneId === z.id);
        const zTotal = zOffers.length;
        const zWon = zOffers.filter(o => o.stage === 'WON');

        return {
          zoneId: z.id,
          zoneName: z.name,
          totalOffers: zTotal,
          totalValue: zOffers.reduce((s, o) => s + Number(o.offerValue || 0), 0),
          wonCount: zWon.length,
          wonValue: zWon.reduce((s, o) => s + Number(o.poValue || o.offerValue || 0), 0),
          conversionRate: calcPercentage(zWon.length, zTotal)
        };
      });

      // At-risk deals (in negotiation for > 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const atRiskDeals = allOffers
        .filter(o =>
          o.stage === 'NEGOTIATION' &&
          new Date(o.updatedAt) < thirtyDaysAgo
        )
        .sort((a, b) => Number(b.offerValue || 0) - Number(a.offerValue || 0))
        .slice(0, 10)
        .map(o => ({
          id: o.id,
          referenceNumber: o.offerReferenceNumber,
          customer: o.customer?.companyName,
          zone: o.zone?.name,
          value: Number(o.offerValue || 0),
          daysSinceUpdate: Math.floor((Date.now() - new Date(o.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
          stage: o.stage
        }));

      res.json({
        success: true,
        data: {
          year,
          stageDistribution: stageData,
          funnel,
          conversionRates,
          byZone,
          atRiskDeals,
          summary: {
            totalOffers,
            totalValue,
            wonCount: wonOffers.length,
            wonValue: wonOffers.reduce((s, o) => s + Number(o.poValue || o.offerValue || 0), 0),
            overallConversion: conversionRates.overallConversion,
            lostCount: stageData.find(s => s.stage === 'LOST')?.count || 0
          }
        }
      });

    } catch (error) {
      logger.error('Funnel analysis error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch funnel analysis' });
    }
  }

  /**
   * HIT RATE ANALYSIS
   * Detailed hit rate by zone, user, and product
   */
  static async getHitRateAnalysis(req: AuthenticatedRequest, res: Response) {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      const [zones, allOffers] = await Promise.all([
        prisma.serviceZone.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }),
        prisma.offer.findMany({
          where: {
            createdAt: { gte: getYearDateRange(year).start, lte: getYearDateRange(year).end },
            status: { notIn: ['CANCELLED'] as any }
          },
          select: {
            id: true,
            zoneId: true,
            offerValue: true,
            poValue: true,
            productType: true,
            stage: true,
            assignedToId: true,
            createdById: true,
            assignedTo: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
            zone: { select: { name: true } }
          }
        })
      ]);

      const totalOffers = allOffers.length;
      const wonOffers = allOffers.filter(o => ['WON', 'PO_RECEIVED'].includes(String(o.stage)));
      const totalValue = allOffers.reduce((s, o) => s + Number(o.offerValue || 0), 0);
      const wonValue = wonOffers.reduce((s, o) => s + Number(o.poValue || o.offerValue || 0), 0);

      // By Zone
      const byZone = sortByZoneOrder(zones).map(z => {
        const zOffers = allOffers.filter(o => o.zoneId === z.id);
        const zWon = zOffers.filter(o => ['WON', 'PO_RECEIVED'].includes(String(o.stage)));
        return {
          zoneName: z.name,
          totalOffers: zOffers.length,
          wonOffers: zWon.length,
          totalValue: zOffers.reduce((s, o) => s + Number(o.offerValue || 0), 0),
          wonValue: zWon.reduce((s, o) => s + Number(o.poValue || o.offerValue || 0), 0),
          hitRateByCount: calcPercentage(zWon.length, zOffers.length),
          hitRateByValue: calcPercentage(
            zWon.reduce((s, o) => s + Number(o.poValue || o.offerValue || 0), 0),
            zOffers.reduce((s, o) => s + Number(o.offerValue || 0), 0)
          )
        };
      });

      // By Product
      const byProduct = PRODUCT_TYPES.map(pt => {
        const ptOffers = allOffers.filter(o => o.productType === pt);
        const ptWon = ptOffers.filter(o => ['WON', 'PO_RECEIVED'].includes(String(o.stage)));
        return {
          productType: pt,
          label: PRODUCT_LABELS[pt],
          totalOffers: ptOffers.length,
          wonOffers: ptWon.length,
          hitRateByCount: calcPercentage(ptWon.length, ptOffers.length)
        };
      }).filter(p => p.totalOffers > 0).sort((a, b) => b.hitRateByCount - a.hitRateByCount);

      // By User (top 15)
      const userMap = new Map<number, { name: string; zone: string; total: number; won: number }>();
      allOffers.forEach(o => {
        const uid = o.assignedToId || o.createdById;
        const name = o.assignedTo?.name || o.createdBy?.name || 'Unknown';
        const zone = o.zone?.name || 'Unknown';
        if (uid) {
          if (!userMap.has(uid)) {
            userMap.set(uid, { name, zone, total: 0, won: 0 });
          }
          const user = userMap.get(uid)!;
          user.total++;
          if (['WON', 'PO_RECEIVED'].includes(String(o.stage))) {
            user.won++;
          }
        }
      });

      const byUser = Array.from(userMap.entries())
        .map(([id, u]) => ({
          userId: id,
          userName: u.name,
          zoneName: u.zone,
          totalOffers: u.total,
          wonOffers: u.won,
          hitRate: calcPercentage(u.won, u.total)
        }))
        .filter(u => u.totalOffers >= 3) // At least 3 offers
        .sort((a, b) => b.hitRate - a.hitRate)
        .slice(0, 15);

      res.json({
        success: true,
        data: {
          year,
          overall: {
            totalOffers,
            wonOffers: wonOffers.length,
            totalValue,
            wonValue,
            hitRateByCount: calcPercentage(wonOffers.length, totalOffers),
            hitRateByValue: calcPercentage(wonValue, totalValue)
          },
          byZone,
          byProduct,
          byUser
        }
      });

    } catch (error) {
      logger.error('Hit rate analysis error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch hit rate analysis' });
    }
  }

  /**
   * COMPLETE FORECAST SUMMARY
   * Executive summary combining all metrics
   */
  static async getForecastSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      const [zones, allOffers, zoneTargets] = await Promise.all([
        prisma.serviceZone.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }),
        prisma.offer.findMany({
          where: {
            OR: [
              { poExpectedMonth: { startsWith: `${year}-` } },
              { poReceivedMonth: { startsWith: `${year}-` } },
              { createdAt: { gte: getYearDateRange(year).start, lte: getYearDateRange(year).end } }
            ],
            status: { notIn: ['CANCELLED'] as any }
          },
          select: {
            id: true,
            zoneId: true,
            offerValue: true,
            poValue: true,
            poExpectedMonth: true,
            poReceivedMonth: true,
            probabilityPercentage: true,
            productType: true,
            stage: true
          }
        }),
        prisma.zoneTarget.findMany({
          where: {
            OR: [
              { periodType: 'YEARLY' as any, targetPeriod: `${year}` },
              { periodType: 'MONTHLY' as any, targetPeriod: { startsWith: `${year}-` } }
            ]
          },
          select: { targetValue: true }
        })
      ]);

      // Calculate metrics
      const forecastOffers = allOffers.filter(o => o.poExpectedMonth?.startsWith(`${year}-`));
      const wonOffers = allOffers.filter(o => ['WON', 'PO_RECEIVED'].includes(String(o.stage)));

      const rawForecast = forecastOffers.reduce((s, o) => s + Number(o.offerValue || 0), 0);
      const weightedForecast = forecastOffers.reduce((s, o) => {
        const prob = Number(o.probabilityPercentage || 50) / 100;
        return s + (Number(o.offerValue || 0) * prob);
      }, 0);
      const actualOrders = wonOffers.reduce((s, o) => s + Number(o.poValue || o.offerValue || 0), 0);
      const totalTarget = zoneTargets.reduce((s, t) => s + Number(t.targetValue || 0), 0);
      const openPipeline = rawForecast - actualOrders;

      // Current quarter
      const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
      const currentQuarterMonths = [
        (currentQuarter - 1) * 3 + 1,
        (currentQuarter - 1) * 3 + 2,
        (currentQuarter - 1) * 3 + 3
      ];
      const currentQForecast = forecastOffers
        .filter(o => {
          const month = parseInt((o.poExpectedMonth || '').split('-')[1] || '0');
          return currentQuarterMonths.includes(month);
        })
        .reduce((s, o) => s + Number(o.offerValue || 0), 0);

      // Zone summary
      const zoneSummary = sortByZoneOrder(zones).map(z => {
        const zOffers = forecastOffers.filter(o => o.zoneId === z.id);
        const zWon = allOffers.filter(o => o.zoneId === z.id && ['WON', 'PO_RECEIVED'].includes(String(o.stage)));
        return {
          zoneName: z.name,
          forecast: zOffers.reduce((s, o) => s + Number(o.offerValue || 0), 0),
          orders: zWon.reduce((s, o) => s + Number(o.poValue || o.offerValue || 0), 0),
          offersCount: zOffers.length,
          wonCount: zWon.length
        };
      });

      // Top product
      const productCounts = new Map<string, number>();
      forecastOffers.forEach(o => {
        const pt = String(o.productType || 'UNKNOWN');
        productCounts.set(pt, (productCounts.get(pt) || 0) + Number(o.offerValue || 0));
      });
      const topProduct = Array.from(productCounts.entries())
        .sort((a, b) => b[1] - a[1])[0];

      res.json({
        success: true,
        data: {
          year,
          kpis: {
            rawForecast,
            weightedForecast: Math.round(weightedForecast),
            actualOrders,
            totalTarget,
            openPipeline: Math.max(0, openPipeline),
            achievement: calcPercentage(actualOrders, totalTarget),
            hitRate: calcPercentage(wonOffers.length, allOffers.length),
            totalOffers: allOffers.length,
            wonOffers: wonOffers.length
          },
          currentQuarter: {
            quarter: `Q${currentQuarter}`,
            forecast: currentQForecast,
            target: totalTarget / 4
          },
          zoneSummary,
          topProduct: topProduct ? {
            productType: topProduct[0],
            label: PRODUCT_LABELS[topProduct[0]] || topProduct[0],
            value: topProduct[1]
          } : null
        }
      });

    } catch (error) {
      logger.error('Forecast summary error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch forecast summary' });
    }
  }
}

export default ForecastController;
