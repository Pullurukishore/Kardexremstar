import { Request, Response } from 'express';
import { PrismaClient, Prisma, OnsiteVisitEvent } from '@prisma/client';
import { subDays, startOfDay, endOfDay, differenceInMinutes, format, getDay, setHours, setMinutes, setSeconds, setMilliseconds, addDays, isBefore, isAfter } from 'date-fns';

import prisma from '../config/db';

interface DashboardStats {
  openTickets: { count: number; change: number };
  unassignedTickets: { count: number; critical: boolean };
  inProgressTickets: { count: number; change: number };
  avgResponseTime: { hours: number; minutes: number; change: number; isPositive: boolean };
  avgResolutionTime: { days: number; hours: number; change: number; isPositive: boolean };
  avgDowntime: { hours: number; minutes: number; change: number; isPositive: boolean };
  avgTravelTime: { hours: number; minutes: number; change: number; isPositive: boolean };
  avgOnsiteResolutionTime: { hours: number; minutes: number; change: number; isPositive: boolean };
  monthlyTickets: { count: number; change: number };
  activeMachines: { count: number; change: number };
  ticketDistribution: {
    byStatus: Array<{ name: string; value: number }>;
    byPriority: Array<{ name: string; value: number }>;
  };
  kpis: {
    totalTickets: { value: number; change: string; isPositive: boolean };
    slaCompliance: { value: number; change: number; isPositive: boolean };
    avgResponseTime: { value: string; unit: string; change: number; isPositive: boolean };
    avgResolutionTime: { value: string; unit: string; change: number; isPositive: boolean };
    unassignedTickets: { value: number; critical: boolean };
    activeCustomers: { value: number; change: number };
    activeServicePersons: { value: number; change: number };
  };
}

interface DashboardData {
  stats: DashboardStats;
  adminStats: {
    totalCustomers: number;
    totalServicePersons: number;
    totalServiceZones: number;
    ticketStatusDistribution: Record<string, number>;
    ticketTrends: Array<{ date: string; count: number; status: string }>;
    zoneWiseTickets: Array<{
      id: number;
      name: string;
      totalTickets: number;
      servicePersonCount: number;
      customerCount: number;
      avgResolutionTimeHours: number;
    }>;
  };
  recentTickets: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    customer: { id: number; companyName: string };
    asset?: { id: number; model: string };
  }>;
}

// Helper function to calculate business hours between two dates (9 AM to 5 PM, excluding Sundays)
function calculateBusinessHoursInMinutes(startDate: Date, endDate: Date): number {
  if (startDate >= endDate) return 0;

  let totalMinutes = 0;
  let currentDate = new Date(startDate);
  const finalDate = new Date(endDate);

  // Business hours: 9 AM to 5:30 PM (8.5 hours per day)
  const BUSINESS_START_HOUR = 9;
  const BUSINESS_END_HOUR = 17;
  const BUSINESS_END_MINUTE = 30;
  const BUSINESS_MINUTES_PER_DAY = (BUSINESS_END_HOUR - BUSINESS_START_HOUR) * 60 + BUSINESS_END_MINUTE; // 510 minutes (8.5 hours)

  while (currentDate < finalDate) {
    const dayOfWeek = getDay(currentDate); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Skip Sundays (dayOfWeek === 0)
    if (dayOfWeek !== 0) {
      // Create business hours for this day
      const businessStart = setMilliseconds(setSeconds(setMinutes(setHours(currentDate, BUSINESS_START_HOUR), 0), 0), 0);
      const businessEnd = setMilliseconds(setSeconds(setMinutes(setHours(currentDate, BUSINESS_END_HOUR), BUSINESS_END_MINUTE), 0), 0);

      // Determine the actual start and end times for this day
      let dayStart = businessStart;
      let dayEnd = businessEnd;

      // If this is the first day, use the actual start time if it's after business start
      if (currentDate.toDateString() === startDate.toDateString()) {
        if (startDate > businessStart) {
          dayStart = startDate;
        }
      }

      // If this is the last day, use the actual end time if it's before business end
      if (currentDate.toDateString() === finalDate.toDateString()) {
        if (finalDate < businessEnd) {
          dayEnd = finalDate;
        }
      }

      // Only count time if it falls within business hours
      if (dayStart < businessEnd && dayEnd > businessStart) {
        // Ensure we don't go outside business hours
        if (dayStart < businessStart) dayStart = businessStart;
        if (dayEnd > businessEnd) dayEnd = businessEnd;

        if (dayStart < dayEnd) {
          totalMinutes += differenceInMinutes(dayEnd, dayStart);
        }
      }
    }

    // Move to next day
    currentDate = addDays(startOfDay(currentDate), 1);
  }

  return totalMinutes;
}

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    // Get date ranges (support "all"/"total" = all-time)
    const today = new Date();
    const rangeParam = (req.query.range as string) || '';
    const isAllRange = ['all', 'total'].includes(rangeParam.toLowerCase());
    const thirtyDaysAgo = subDays(today, 30);
    const sixtyDaysAgo = subDays(today, 60);

    // Current period
    const currentPeriodStart = isAllRange ? new Date(0) : thirtyDaysAgo;
    const currentPeriodEnd = today;

    // Previous period (not meaningful for all-time; use zeros later for change)
    const previousPeriodStart = isAllRange ? new Date(0) : sixtyDaysAgo;
    const previousPeriodEnd = isAllRange ? new Date(0) : thirtyDaysAgo;

    // Execute all queries in parallel for better performance
    const [
      // Current period counts
      openTicketsCurrent,
      unassignedTicketsCurrent,
      inProgressTicketsCurrent,
      monthlyTicketsCurrent,
      activeMachinesCurrent,

      // Previous period counts for comparison
      openTicketsPrevious,
      unassignedTicketsPrevious,
      inProgressTicketsPrevious,
      monthlyTicketsPrevious,
      activeMachinesPrevious,

      // Time-based metrics
      responseTimeData,
      resolutionTimeData,
      downtimeData,
      travelTimeData,
      onsiteResolutionTimeData,

      // Distribution data
      statusDistribution,
      priorityDistribution,

      // Admin stats
      totalCustomers,
      totalServicePersons,
      totalServiceZones,
      zoneWiseData,

      // Recent tickets
      recentTickets,

      // Additional metrics for KPIs
      totalTicketsCount,
      slaCompliantTickets,
      activeCustomersCount,
      activeServicePersonsCount
    ] = await Promise.all([
      // Current period counts
      prisma.ticket.count({
        where: {
          status: {
            in: [
              'OPEN',
              'ASSIGNED',
              'IN_PROGRESS',
              'WAITING_CUSTOMER',
              'ONSITE_VISIT',
              'ONSITE_VISIT_PLANNED',
              'PO_NEEDED',
              'PO_RECEIVED',
              'SPARE_PARTS_NEEDED',
              'SPARE_PARTS_BOOKED',
              'SPARE_PARTS_DELIVERED',
              'REOPENED',
              'ON_HOLD',
              'ESCALATED',
              'PENDING'
            ]
          },
          createdAt: {
            gte: currentPeriodStart,
            lte: currentPeriodEnd
          }
        }
      }),

      prisma.ticket.count({
        where: {
          assignedToId: null,
          status: {
            in: [
              'OPEN',
              'ASSIGNED',
              'IN_PROGRESS',
              'WAITING_CUSTOMER',
              'ONSITE_VISIT_PLANNED',
              'PO_NEEDED',
              'SPARE_PARTS_NEEDED',
              'REOPENED',
              'ON_HOLD',
              'PENDING'
            ]
          },
          createdAt: {
            gte: currentPeriodStart,
            lte: currentPeriodEnd
          }
        }
      }),

      prisma.ticket.count({
        where: {
          status: {
            in: [
              'IN_PROGRESS',
              'ONSITE_VISIT',
              'SPARE_PARTS_BOOKED',
              'SPARE_PARTS_DELIVERED'
            ]
          },
          createdAt: {
            gte: currentPeriodStart,
            lte: currentPeriodEnd
          }
        }
      }),

      prisma.ticket.count({
        where: {
          createdAt: {
            gte: startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
            lte: endOfDay(today)
          }
        }
      }),

      // Get active machines count
      prisma.asset.count({
        where: {
          status: { in: ["ACTIVE", "active", "Active"] }
        }
      }),

      // Previous period counts for comparison
      prisma.ticket.count({
        where: {
          status: {
            in: [
              'OPEN',
              'ASSIGNED',
              'IN_PROGRESS',
              'WAITING_CUSTOMER',
              'ONSITE_VISIT',
              'ONSITE_VISIT_PLANNED',
              'PO_NEEDED',
              'PO_RECEIVED',
              'SPARE_PARTS_NEEDED',
              'SPARE_PARTS_BOOKED',
              'SPARE_PARTS_DELIVERED',
              'REOPENED',
              'ON_HOLD',
              'ESCALATED',
              'PENDING'
            ]
          },
          createdAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd
          }
        }
      }),

      prisma.ticket.count({
        where: {
          assignedToId: null,
          status: {
            in: [
              'OPEN',
              'ASSIGNED',
              'IN_PROGRESS',
              'WAITING_CUSTOMER',
              'ONSITE_VISIT_PLANNED',
              'PO_NEEDED',
              'SPARE_PARTS_NEEDED',
              'REOPENED',
              'ON_HOLD',
              'PENDING'
            ]
          },
          createdAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd
          }
        }
      }),

      prisma.ticket.count({
        where: {
          status: {
            in: [
              'IN_PROGRESS',
              'ONSITE_VISIT',
              'SPARE_PARTS_BOOKED',
              'SPARE_PARTS_DELIVERED'
            ]
          },
          createdAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd
          }
        }
      }),

      prisma.ticket.count({
        where: {
          createdAt: {
            gte: startOfDay(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)),
            lte: endOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 0))
          }
        }
      }),

      // Get active machines count (previous period)
      prisma.asset.count({
        where: {
          status: { in: ["ACTIVE", "active", "Active"] }
        }
      }),

      // Calculate average response time (ticket open to in progress)
      calculateAverageResponseTime(currentPeriodStart, currentPeriodEnd),

      // Calculate average resolution time (ticket open to closed)
      calculateAverageResolutionTime(currentPeriodStart, currentPeriodEnd),

      // Calculate average downtime
      calculateAverageDowntime(currentPeriodStart, currentPeriodEnd),

      // Calculate average travel time
      calculateAverageTravelTime(currentPeriodStart, currentPeriodEnd),

      // Calculate average onsite resolution time
      calculateAverageOnsiteResolutionTime(currentPeriodStart, currentPeriodEnd),

      // Get status distribution
      prisma.ticket.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: currentPeriodStart,
            lte: currentPeriodEnd
          }
        },
        _count: {
          status: true
        }
      }),

      // Get priority distribution
      prisma.ticket.groupBy({
        by: ['priority'],
        where: {
          createdAt: {
            gte: currentPeriodStart,
            lte: currentPeriodEnd
          }
        },
        _count: {
          priority: true
        }
      }),

      // Admin stats
      prisma.customer.count({
        where: { isActive: true }
      }),

      prisma.user.count({
        where: {
          role: 'SERVICE_PERSON',
          isActive: true
        }
      }),

      prisma.serviceZone.count({
        where: { isActive: true }
      }),

      // Zone-wise data
      getZoneWiseTicketData(),

      // Recent tickets
      prisma.ticket.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, companyName: true }
          },
          asset: {
            select: { id: true, model: true }
          }
        }
      }),

      // Total tickets count
      prisma.ticket.count({
        where: {
          createdAt: {
            gte: currentPeriodStart,
            lte: currentPeriodEnd
          }
        }
      }),

      // SLA compliant tickets
      calculateSLACompliance(currentPeriodStart, currentPeriodEnd),

      // Active customers
      prisma.customer.count({
        where: {
          isActive: true,
          tickets: {
            some: {
              status: {
                in: [
                  'OPEN',
                  'ASSIGNED',
                  'IN_PROGRESS',
                  'WAITING_CUSTOMER',
                  'ONSITE_VISIT',
                  'ONSITE_VISIT_PLANNED',
                  'ONSITE_VISIT_STARTED',
                  'ONSITE_VISIT_REACHED',
                  'ONSITE_VISIT_IN_PROGRESS',
                  'ONSITE_VISIT_RESOLVED',
                  'ONSITE_VISIT_PENDING',
                  'ONSITE_VISIT_COMPLETED',
                  'PO_NEEDED',
                  'PO_RECEIVED',
                  'SPARE_PARTS_NEEDED',
                  'SPARE_PARTS_BOOKED',
                  'SPARE_PARTS_DELIVERED',
                  'REOPENED',
                  'ON_HOLD',
                  'ESCALATED',
                  'PENDING'
                ]
              }
            }
          }
        }
      }),

      // Active service persons
      prisma.user.count({
        where: {
          role: 'SERVICE_PERSON',
          isActive: true,
          assignedTickets: {
            some: {
              status: {
                in: [
                  'ASSIGNED',
                  'IN_PROGRESS',
                  'ONSITE_VISIT',
                  'ONSITE_VISIT_PLANNED',
                  'ONSITE_VISIT_STARTED',
                  'ONSITE_VISIT_REACHED',
                  'ONSITE_VISIT_IN_PROGRESS',
                  'ONSITE_VISIT_RESOLVED',
                  'ONSITE_VISIT_PENDING',
                  'ONSITE_VISIT_COMPLETED',
                  'SPARE_PARTS_BOOKED',
                  'SPARE_PARTS_DELIVERED',
                  'WAITING_CUSTOMER',
                  'ON_HOLD',
                  'PENDING'
                ]
              }
            }
          }
        }
      })
    ]);

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const openTicketsChange = isAllRange ? 0 : calculateChange(openTicketsCurrent, openTicketsPrevious);
    const inProgressTicketsChange = isAllRange ? 0 : calculateChange(inProgressTicketsCurrent, inProgressTicketsPrevious);
    const monthlyTicketsChange = isAllRange ? 0 : calculateChange(monthlyTicketsCurrent, monthlyTicketsPrevious);
    const activeMachinesChange = isAllRange ? 0 : calculateChange(activeMachinesCurrent, activeMachinesPrevious);

    // Prepare status distribution
    const statusDistributionFormatted = statusDistribution.map((item: any) => ({
      name: item.status,
      value: item._count.status
    }));

    // Prepare priority distribution
    const priorityDistributionFormatted = priorityDistribution.map((item: any) => ({
      name: item.priority,
      value: item._count.priority
    }));

    // Prepare dashboard data
    const dashboardData: DashboardData = {
      stats: {
        openTickets: {
          count: openTicketsCurrent,
          change: openTicketsChange
        },
        unassignedTickets: {
          count: unassignedTicketsCurrent,
          critical: unassignedTicketsCurrent > 5 // Critical if more than 5 unassigned tickets
        },
        inProgressTickets: {
          count: inProgressTicketsCurrent,
          change: inProgressTicketsChange
        },
        avgResponseTime: responseTimeData,
        avgResolutionTime: resolutionTimeData,
        avgDowntime: downtimeData,
        avgTravelTime: travelTimeData,
        avgOnsiteResolutionTime: onsiteResolutionTimeData,
        monthlyTickets: {
          count: monthlyTicketsCurrent,
          change: monthlyTicketsChange
        },
        activeMachines: {
          count: activeMachinesCurrent,
          change: activeMachinesChange
        },
        ticketDistribution: {
          byStatus: statusDistributionFormatted,
          byPriority: priorityDistributionFormatted
        },
        kpis: {
          totalTickets: {
            value: totalTicketsCount,
            change: (isAllRange ? 0 : calculateChange(totalTicketsCount, 0)).toString(),
            isPositive: false // More tickets is generally not positive
          },
          slaCompliance: {
            value: slaCompliantTickets.percentage,
            change: 0, // You might want to calculate this compared to previous period
            isPositive: slaCompliantTickets.percentage >= 90
          },
          avgResponseTime: {
            value: `${responseTimeData.hours}h ${responseTimeData.minutes}m`,
            unit: 'hours',
            change: 0, // You might want to calculate this compared to previous period
            isPositive: responseTimeData.isPositive
          },
          avgResolutionTime: {
            value: `${resolutionTimeData.days}d ${resolutionTimeData.hours}h`,
            unit: 'days',
            change: 0, // You might want to calculate this compared to previous period
            isPositive: resolutionTimeData.isPositive
          },
          unassignedTickets: {
            value: unassignedTicketsCurrent,
            critical: unassignedTicketsCurrent > 5
          },
          activeCustomers: {
            value: activeCustomersCount,
            change: 0 // You might want to calculate this compared to previous period
          },
          activeServicePersons: {
            value: activeServicePersonsCount,
            change: 0 // You might want to calculate this compared to previous period
          }
        }
      },
      adminStats: {
        totalCustomers,
        totalServicePersons,
        totalServiceZones,
        ticketStatusDistribution: statusDistributionFormatted.reduce((acc: any, item: any) => {
          acc[item.name] = item.value;
          return acc;
        }, {} as Record<string, number>),
        ticketTrends: await getTicketTrends(30),
        zoneWiseTickets: zoneWiseData
      },
      recentTickets: recentTickets.map((ticket: any) => ({
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt.toISOString(),
        customer: {
          id: ticket.customer.id,
          companyName: ticket.customer.companyName
        },
        asset: ticket.asset ? {
          id: ticket.asset.id,
          model: ticket.asset.model || 'Unknown'
        } : undefined
      }))
    };

    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to calculate average response time
async function calculateAverageResponseTime(startDate: Date, endDate: Date) {
  try {
    // Get tickets that have moved from OPEN to ASSIGNED status within the time period
    const ticketsWithStatusHistory = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        createdAt: true,
        statusHistory: {
          where: {
            status: 'ASSIGNED'
          },
          orderBy: {
            changedAt: 'asc'
          },
          select: {
            status: true,
            changedAt: true
          }
        }
      }
    });

    // Calculate response times (time from ticket creation to ASSIGNED - first response)
    const responseTimes = ticketsWithStatusHistory
      .map((ticket: any) => {
        const statusHistory = ticket.statusHistory;

        // Find the ASSIGNED status record (first response/assignment)
        const assignedStatus = statusHistory.find((h: any) => h.status === 'ASSIGNED');

        if (assignedStatus) {
          // Calculate business hours from ticket creation to ASSIGNED
          return calculateBusinessHoursInMinutes(ticket.createdAt, assignedStatus.changedAt);
        }

        return null;
      })
      .filter((time: number | null): time is number => time !== null && time > 0);

    if (responseTimes.length === 0) {
      // If no tickets with proper status transitions, return zeros
      return { hours: 0, minutes: 0, change: 0, isPositive: true };
    }

    // Calculate average in minutes
    const averageMinutes = responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length;

    // Convert to hours and minutes
    const hours = Math.floor(averageMinutes / 60);
    const minutes = Math.round(averageMinutes % 60);

    const isPositive = averageMinutes < 120; // Positive if less than 2 hours

    return { hours, minutes, change: 0, isPositive };
  } catch (error) {
    return { hours: 0, minutes: 0, change: 0, isPositive: true }; // Return zeros on error
  }
}

// Helper function to calculate average resolution time
async function calculateAverageResolutionTime(startDate: Date, endDate: Date): Promise<{ days: number, hours: number, minutes: number, change: number, isPositive: boolean }> {
  try {
    // Get tickets that are CLOSED (final resolution)
    const closedTickets = await prisma.ticket.findMany({
      where: {
        status: 'CLOSED',
        updatedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        createdAt: true,
        updatedAt: true,
        status: true
      }
    });

    // Calculate resolution times (business hours from ticket open to CLOSED)
    const resolutionTimes = closedTickets
      .map((ticket: any) => {
        return calculateBusinessHoursInMinutes(ticket.createdAt, ticket.updatedAt);
      })
      .filter((time: any) => time > 0); // Filter out negative times

    if (resolutionTimes.length === 0) {
      // If no resolved tickets, check for any tickets that might be resolved
      const allTickets = await prisma.ticket.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          createdAt: true,
          updatedAt: true,
          status: true
        }
      });

      if (allTickets.length > 0) {
        // Use average age of all tickets as a baseline (business hours)
        const avgMinutes = allTickets.reduce((sum: any, ticket: any) => {
          return sum + calculateBusinessHoursInMinutes(ticket.createdAt, ticket.updatedAt);
        }, 0) / allTickets.length;

        // Convert business minutes to business days (8 hours per business day)
        const businessHoursPerDay = 8 * 60; // 480 minutes per business day
        const days = Math.floor(avgMinutes / businessHoursPerDay);
        const remainingMinutesAfterDays = avgMinutes % businessHoursPerDay;
        const hours = Math.floor(remainingMinutesAfterDays / 60);
        const minutes = Math.round(remainingMinutesAfterDays % 60);
        const isPositive = avgMinutes < (2 * businessHoursPerDay); // Less than 2 business days

        return { days, hours, minutes, change: 0, isPositive };
      }

      return { days: 0, hours: 0, minutes: 0, change: 0, isPositive: true }; // Return zeros when no data
    }

    // Calculate average in minutes
    const averageMinutes = resolutionTimes.reduce((sum: number, time: number) => sum + time, 0) / resolutionTimes.length;

    // Convert business minutes to business days (8 hours per business day)
    const businessHoursPerDay = 8 * 60; // 480 minutes per business day
    const days = Math.floor(averageMinutes / businessHoursPerDay);
    const remainingMinutesAfterDays = averageMinutes % businessHoursPerDay;
    const hours = Math.floor(remainingMinutesAfterDays / 60);
    const minutes = Math.round(remainingMinutesAfterDays % 60);

    const isPositive = averageMinutes < (2 * businessHoursPerDay); // Positive if less than 2 business days

    return { days, hours, minutes, change: 0, isPositive };
  } catch (error) {
    return { days: 0, hours: 0, minutes: 0, change: 0, isPositive: true };
  }
}

// Helper function to calculate average downtime
async function calculateAverageDowntime(startDate: Date, endDate: Date): Promise<{ hours: number, minutes: number, change: number, isPositive: boolean }> {
  try {
    // Calculate machine downtime using status history (ticket open to CLOSED_PENDING/RESOLVED/CLOSED)
    // Find tickets that reached CLOSED_PENDING status in the period
    const closedStatusHistory = await prisma.ticketStatusHistory.findMany({
      where: {
        status: {
          in: ['CLOSED_PENDING', 'RESOLVED', 'CLOSED']
        },
        changedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        ticket: {
          select: {
            createdAt: true,
            id: true
          }
        }
      },
      orderBy: {
        changedAt: 'asc'
      }
    });

    if (closedStatusHistory.length === 0) {
      // If no closed tickets, calculate based on currently open tickets
      const openTickets = await prisma.ticket.findMany({
        where: {
          status: {
            in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ONSITE_VISIT', 'WAITING_CUSTOMER']
          },
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          createdAt: true,
          updatedAt: true
        }
      });

      if (openTickets.length > 0) {
        // Use current age of open tickets as downtime (business hours)
        const now = new Date();
        const avgDowntime = openTickets.reduce((sum: any, ticket: any) => {
          return sum + calculateBusinessHoursInMinutes(ticket.createdAt, now);
        }, 0) / openTickets.length;

        const hours = Math.floor(avgDowntime / 60);
        const minutes = Math.round(avgDowntime % 60);
        const isPositive = avgDowntime < 240; // Less than 4 hours is positive

        return { hours, minutes, change: 0, isPositive };
      }

      return { hours: 0, minutes: 0, change: 0, isPositive: true };
    }

    // Group by ticket ID and find first closure time for each ticket
    const ticketClosureTimes = new Map<number, Date>();
    closedStatusHistory.forEach(history => {
      if (!ticketClosureTimes.has(history.ticketId)) {
        ticketClosureTimes.set(history.ticketId, history.changedAt);
      }
    });

    // Calculate downtime for each ticket (creation to first closure)
    const downtimes = Array.from(ticketClosureTimes.entries()).map(([ticketId, closedAt]) => {
      const ticket = closedStatusHistory.find(h => h.ticketId === ticketId)?.ticket;
      if (!ticket) return 0;
      return calculateBusinessHoursInMinutes(ticket.createdAt, closedAt);
    }).filter((time: number) => time > 0);

    if (downtimes.length === 0) {
      return { hours: 0, minutes: 0, change: 0, isPositive: true };
    }

    const averageMinutes = downtimes.reduce((sum: number, time: number) => sum + time, 0) / downtimes.length;

    // Convert to hours and minutes
    const hours = Math.floor(averageMinutes / 60);
    const minutes = Math.round(averageMinutes % 60);

    const isPositive = averageMinutes < 240; // Positive if less than 4 hours

    return { hours, minutes, change: 0, isPositive };
  } catch (error) {
    return { hours: 0, minutes: 0, change: 0, isPositive: true };
  }
}

// Helper function to calculate SLA compliance
async function calculateSLACompliance(startDate: Date, endDate: Date) {
  try {
    // Get all tickets in the period
    const tickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        statusHistory: true
      }
    });

    // SLA target: 1 business day (8.5 hours with 9 AM - 5:30 PM schedule)
    // In a real scenario, you would check against SLA policies based on priority
    const compliantTickets = tickets.filter((ticket: any) => {
      if (!['CLOSED', 'RESOLVED', 'CLOSED_PENDING'].includes(ticket.status)) return false;

      const openedAt = ticket.createdAt;
      const closedAt = ticket.updatedAt;
      const resolutionTime = calculateBusinessHoursInMinutes(openedAt, closedAt);

      return resolutionTime <= 510; // 1 business day = 8.5 hours * 60 = 510 minutes (9 AM - 5:30 PM)
    });

    const percentage = tickets.length > 0
      ? Math.round((compliantTickets.length / tickets.length) * 100)
      : 100;

    return {
      count: compliantTickets.length,
      total: tickets.length,
      percentage
    };
  } catch (error) {
    return { count: 0, total: 0, percentage: 0 };
  }
}

// Helper function to get zone-wise ticket data with real average resolution time
async function getZoneWiseTicketData() {
  try {
    const zones = await prisma.serviceZone.findMany({
      where: { isActive: true },
      include: {
        tickets: {
          where: {
            status: {
              in: [
                'OPEN',
                'ASSIGNED',
                'IN_PROGRESS',
                'IN_PROCESS',
                'WAITING_CUSTOMER',
                'ONSITE_VISIT',
                'ONSITE_VISIT_PLANNED',
                'ONSITE_VISIT_STARTED',
                'ONSITE_VISIT_REACHED',
                'ONSITE_VISIT_IN_PROGRESS',
                'ONSITE_VISIT_RESOLVED',
                'ONSITE_VISIT_PENDING',
                'ONSITE_VISIT_COMPLETED',
                'PO_NEEDED',
                'PO_RECEIVED',
                'PO_REACHED',
                'SPARE_PARTS_NEEDED',
                'SPARE_PARTS_BOOKED',
                'SPARE_PARTS_DELIVERED',
                'REOPENED',
                'ON_HOLD',
                'ESCALATED',
                'PENDING',
                'RESOLVED',
                'CLOSED_PENDING'
              ]
            }
          }
        },
        servicePersons: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true
              }
            }
          }
        },
        customers: {
          where: { isActive: true },
          include: {
            assets: {
              where: {
                status: 'ACTIVE'
              }
            }
          }
        }
      }
    });

    // Calculate average resolution time for each zone
    const zoneDataWithResolutionTime = await Promise.all(
      zones.map(async (zone: any) => {
        // Get CLOSED tickets for this zone to calculate average resolution time (consistent with main dashboard)
        const closedTickets = await prisma.ticket.findMany({
          where: {
            zoneId: zone.id,
            status: 'CLOSED',
            // Get tickets from last 90 days for better average calculation
            createdAt: {
              gte: subDays(new Date(), 90)
            }
          },
          select: {
            createdAt: true,
            updatedAt: true
          }
        });

        let avgResolutionTimeHours = 0;

        if (closedTickets.length > 0) {
          // Calculate resolution times in business hours (time from creation to CLOSED)
          const resolutionTimes = closedTickets.map((ticket: any) =>
            calculateBusinessHoursInMinutes(ticket.createdAt, ticket.updatedAt)
          ).filter(time => time > 0); // Filter out negative times

          if (resolutionTimes.length > 0) {
            const avgMinutes = resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length;
            // Convert to hours (keep decimal for proper display of sub-hour values)
            avgResolutionTimeHours = Math.round((avgMinutes / 60) * 10) / 10; // Round to 1 decimal place
          }
        } else {
          // If no closed tickets, check if there are any tickets at all
          const allZoneTickets = await prisma.ticket.findMany({
            where: {
              zoneId: zone.id,
              createdAt: {
                gte: subDays(new Date(), 90)
              }
            },
            select: {
              createdAt: true,
              updatedAt: true
            }
          });

          if (allZoneTickets.length > 0) {
            // Use average age of all tickets as estimation (business hours)
            const avgAge = allZoneTickets.reduce((sum, ticket) =>
              sum + calculateBusinessHoursInMinutes(ticket.createdAt, ticket.updatedAt), 0
            ) / allZoneTickets.length;
            // Convert to hours (keep decimal for proper display of sub-hour values)
            avgResolutionTimeHours = Math.round((avgAge / 60) * 10) / 10; // Round to 1 decimal place
          } else {
            // Default to 0 hours if no data available
            avgResolutionTimeHours = 0;
          }
        }

        // Count users from ServicePersonZone junction table
        const usersFromJunction = zone.servicePersons
          .filter((sp: any) => sp.user?.isActive !== false)
          .map((sp: any) => sp.user);

        // Also count users who have zoneId field set to this zone
        const usersFromZoneId = await prisma.user.findMany({
          where: {
            zoneId: String(zone.id),
            isActive: true
          },
          select: {
            id: true,
            role: true
          }
        });

        // Combine both sources and deduplicate by user id
        const allUserIds = new Set<number>();
        const allUsers: Array<{ id: number; role: string }> = [];

        // Add junction users
        usersFromJunction.forEach((user: any) => {
          if (user && !allUserIds.has(user.id)) {
            allUserIds.add(user.id);
            allUsers.push({ id: user.id, role: user.role });
          }
        });

        // Add zoneId users
        usersFromZoneId.forEach((user: any) => {
          if (!allUserIds.has(user.id)) {
            allUserIds.add(user.id);
            allUsers.push({ id: user.id, role: user.role });
          }
        });

        // Count by role
        const zoneManagerCount = allUsers.filter(u => u.role === 'ZONE_MANAGER').length;
        const zoneUserCount = allUsers.filter(u => u.role === 'ZONE_USER').length;
        const servicePersonCount = allUsers.filter(u => u.role === 'SERVICE_PERSON').length;

        // Count total assets in zone
        const assetCount = zone.customers.reduce((sum: number, customer: any) =>
          sum + (customer.assets?.length || 0), 0);

        return {
          id: zone.id,
          name: zone.name,
          totalTickets: zone.tickets.length,
          servicePersonCount: servicePersonCount,
          zoneManagerCount: zoneManagerCount,
          zoneUserCount: zoneUserCount,
          customerCount: zone.customers.length,
          assetCount: assetCount,
          avgResolutionTimeHours
        };
      })
    );

    return zoneDataWithResolutionTime;
  } catch (error) {
    return [];
  }
}

// Helper function to get ticket trends
async function getTicketTrends(days: number = 30) {
  try {
    const trends = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const start = startOfDay(date);
      const end = endOfDay(date);

      const count = await prisma.ticket.count({
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        }
      });

      trends.push({
        date: format(date, 'yyyy-MM-dd'),
        count,
        status: 'ALL' // You could break this down by status if needed
      });
    }

    return trends;
  } catch (error) {
    return [];
  }
}

// Helper function to calculate average travel time (same as service person reports)
// Travel time: ONSITE_VISIT_STARTED to ONSITE_VISIT_REACHED + ONSITE_VISIT_RESOLVED to ONSITE_VISIT_COMPLETED
async function calculateAverageTravelTime(startDate: Date, endDate: Date) {
  try {
    // Get all tickets (no date filter on createdAt - match service person report logic)
    const tickets = await prisma.ticket.findMany({
      include: {
        statusHistory: {
          orderBy: {
            changedAt: 'asc',
          },
        },
      },
    });

    const travelTimes: number[] = [];

    for (const ticket of tickets) {
      const statusHistory = ticket.statusHistory;
      if (statusHistory.length > 0) {
        // Travel time: ONSITE_VISIT_STARTED to ONSITE_VISIT_REACHED + ONSITE_VISIT_RESOLVED to ONSITE_VISIT_COMPLETED
        const goingStart = statusHistory.find(h => h.status === 'ONSITE_VISIT_STARTED');
        const goingEnd = statusHistory.find(h => h.status === 'ONSITE_VISIT_REACHED');
        const returnStart = statusHistory.find(h => h.status === 'ONSITE_VISIT_RESOLVED');
        const returnEnd = statusHistory.find(h => h.status === 'ONSITE_VISIT_COMPLETED');

        let ticketTravelTime = 0;

        // Going travel time
        if (goingStart && goingEnd && goingStart.changedAt < goingEnd.changedAt) {
          ticketTravelTime += differenceInMinutes(goingEnd.changedAt, goingStart.changedAt);
        }

        // Return travel time
        if (returnStart && returnEnd && returnStart.changedAt < returnEnd.changedAt) {
          ticketTravelTime += differenceInMinutes(returnEnd.changedAt, returnStart.changedAt);
        }

        if (ticketTravelTime > 0) {
          travelTimes.push(ticketTravelTime);
        }
      }
    }

    if (travelTimes.length === 0) {
      return {
        hours: 0,
        minutes: 0,
        change: 0,
        isPositive: true
      };
    }

    // Calculate average in minutes
    const avgMinutes = Math.round((travelTimes.reduce((sum, time) => sum + time, 0) / travelTimes.length));
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;
    return {
      hours,
      minutes,
      change: 0,
      isPositive: true
    };
  } catch (error) {
    return {
      hours: 0,
      minutes: 0,
      change: 0,
      isPositive: true
    };
  }
}

// Helper function to calculate average onsite resolution time (same as service person reports)
// Onsite work time: ONSITE_VISIT_IN_PROGRESS to ONSITE_VISIT_RESOLVED
async function calculateAverageOnsiteResolutionTime(startDate: Date, endDate: Date) {
  try {
    // Get all tickets (no date filter on createdAt - match service person report logic)
    const tickets = await prisma.ticket.findMany({
      include: {
        statusHistory: {
          orderBy: {
            changedAt: 'asc',
          },
        },
      },
    });

    const onsiteTimes: number[] = [];

    for (const ticket of tickets) {
      const statusHistory = ticket.statusHistory;
      if (statusHistory.length > 0) {
        // Onsite work time: ONSITE_VISIT_IN_PROGRESS to ONSITE_VISIT_RESOLVED
        const onsiteStart = statusHistory.find(h => h.status === 'ONSITE_VISIT_IN_PROGRESS');
        const onsiteEnd = statusHistory.find(h => h.status === 'ONSITE_VISIT_RESOLVED');

        if (onsiteStart && onsiteEnd && onsiteStart.changedAt < onsiteEnd.changedAt) {
          const onsiteTime = differenceInMinutes(onsiteEnd.changedAt, onsiteStart.changedAt);
          if (onsiteTime > 0) {
            onsiteTimes.push(onsiteTime);
          }
        }
      }
    }

    if (onsiteTimes.length === 0) {
      return {
        hours: 0,
        minutes: 0,
        change: 0,
        isPositive: true
      };
    }

    // Calculate average in minutes
    const avgMinutes = Math.round((onsiteTimes.reduce((sum, time) => sum + time, 0) / onsiteTimes.length));
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;
    return {
      hours,
      minutes,
      change: 0,
      isPositive: true
    };
  } catch (error) {
    return {
      hours: 0,
      minutes: 0,
      change: 0,
      isPositive: true
    };
  }
}

// Old implementation kept for reference - ONSITE_VISIT_LOG based
async function calculateAverageOnsiteResolutionTime_OLD(startDate: Date, endDate: Date) {
  try {
    // First try: Use OnsiteVisitLog (WORK_STARTED -> WORK_COMPLETED|RESOLVED|ENDED)
    try {
      const endLogCandidates = await prisma.onsiteVisitLog.findMany({
        where: {
          event: { in: [OnsiteVisitEvent.WORK_COMPLETED, OnsiteVisitEvent.RESOLVED, OnsiteVisitEvent.ENDED] },
          createdAt: { gte: startDate, lte: endDate }
        },
        select: { ticketId: true },
        distinct: ['ticketId']
      });
      if (endLogCandidates.length > 0) {
        const ticketIdsForLogs = endLogCandidates.map((e: any) => e.ticketId);
        const fullLogs = await prisma.onsiteVisitLog.findMany({
          where: {
            ticketId: { in: ticketIdsForLogs },
            event: {
              in: [
                OnsiteVisitEvent.WORK_STARTED,
                OnsiteVisitEvent.WORK_PAUSED,
                OnsiteVisitEvent.WORK_RESUMED,
                OnsiteVisitEvent.WORK_COMPLETED,
                OnsiteVisitEvent.RESOLVED,
                OnsiteVisitEvent.ENDED
              ]
            }
          },
          orderBy: { createdAt: 'asc' }
        });

        const logMap = new Map<number, any[]>();
        for (const l of fullLogs) {
          if (!logMap.has(l.ticketId)) logMap.set(l.ticketId, []);
          logMap.get(l.ticketId)!.push(l);
        }

        const perTicketMinutes = new Map<number, number>();
        let segmentCount = 0;
        let filteredOutliers = 0;
        const MAX_ONSITE_MIN = 12 * 60; // 12h sanity cap per segment

        for (const [ticketId, logs] of logMap) {
          logs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          let ticketMinutes = 0;
          for (let i = 0; i < logs.length; i++) {
            const e: any = logs[i];
            // End inside window -> pair with nearest preceding WORK_STARTED by same user
            if ((e.event === OnsiteVisitEvent.WORK_COMPLETED || e.event === OnsiteVisitEvent.RESOLVED || e.event === OnsiteVisitEvent.ENDED)
              && e.createdAt >= startDate && e.createdAt <= endDate) {
              let start: any = null;
              for (let j = i - 1; j >= 0; j--) {
                if (logs[j].event === OnsiteVisitEvent.WORK_STARTED && logs[j].userId === e.userId) { start = logs[j]; break; }
              }
              if (start && start.createdAt < e.createdAt) {
                const mins = differenceInMinutes(new Date(e.createdAt), new Date(start.createdAt));
                if (mins > 0) { ticketMinutes += mins; segmentCount++; }
              }
            }
          }
          if (ticketMinutes > 0) perTicketMinutes.set(ticketId, ticketMinutes);
        }

        if (perTicketMinutes.size > 0) {
          const total = Array.from(perTicketMinutes.values()).reduce((a, b) => a + b, 0);
          const avgMinutesFromLogs = Math.round(total / perTicketMinutes.size);
          const hoursFromLogs = Math.floor(avgMinutesFromLogs / 60);
          const minutesFromLogs = avgMinutesFromLogs % 60;
          if (filteredOutliers > 0)
            return { hours: hoursFromLogs, minutes: minutesFromLogs, change: 0, isPositive: true };
        }
      }
    } catch (e) {
    }

    // Fallback: Find tickets that had onsite in-progress/resolved changes during the window
    const statusHistoryEntries = await prisma.ticketStatusHistory.findMany({
      where: {
        status: {
          in: ['ONSITE_VISIT_IN_PROGRESS', 'ONSITE_VISIT_RESOLVED']
        },
        changedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        ticketId: true,
        status: true,
        changedAt: true
      },
      orderBy: {
        changedAt: 'asc'
      }
    });

    if (statusHistoryEntries.length === 0) {
      return {
        hours: 0,
        minutes: 0, // No data = show 0
        change: 0,
        isPositive: true
      };
    }

    // Step 2: Load full relevant status history for those tickets (to handle boundary conditions)
    const ticketIds = Array.from(new Set(statusHistoryEntries.map((e: any) => e.ticketId)));
    const fullHistory = await prisma.ticketStatusHistory.findMany({
      where: {
        ticketId: { in: ticketIds },
        status: {
          in: ['ONSITE_VISIT_IN_PROGRESS', 'ONSITE_VISIT_RESOLVED']
        }
      },
      orderBy: {
        changedAt: 'asc'
      }
    });

    // Group by ticket ID
    const ticketStatusMap = new Map<number, any[]>();
    for (const entry of fullHistory) {
      if (!ticketStatusMap.has(entry.ticketId)) {
        ticketStatusMap.set(entry.ticketId, []);
      }
      ticketStatusMap.get(entry.ticketId)!.push(entry);
    }

    let totalMinutes = 0;
    let validTickets = 0;
    let filteredTickets = 0;
    let ticketOnsiteDetails: any[] = [];
    const MAX_ONSITE_MIN_FALLBACK = 12 * 60; // 12h sanity cap

    for (const [ticketId, statusHistory] of ticketStatusMap) {
      // Ensure chronological
      statusHistory.sort((a: any, b: any) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());

      // For each RESOLVED event that ends within the window, pair with the nearest preceding IN_PROGRESS
      for (let i = 0; i < statusHistory.length; i++) {
        const e: any = statusHistory[i];
        if (e.status === 'ONSITE_VISIT_RESOLVED' && e.changedAt >= startDate && e.changedAt <= endDate) {
          // Find previous IN_PROGRESS
          let startStatus: any = null;
          for (let j = i - 1; j >= 0; j--) {
            if (statusHistory[j].status === 'ONSITE_VISIT_IN_PROGRESS') {
              startStatus = statusHistory[j];
              break;
            }
          }

          if (startStatus && startStatus.changedAt < e.changedAt) {
            // Use real elapsed minutes for onsite duration
            const durationMinutes = differenceInMinutes(new Date(e.changedAt), new Date(startStatus.changedAt));
            if (durationMinutes > 0) {
              totalMinutes += durationMinutes;
              validTickets++;
              ticketOnsiteDetails.push({ ticketId, onsiteMinutes: durationMinutes });
            }
          }
        }
      }
    }

    if (validTickets === 0) {
      return {
        hours: 0,
        minutes: 0, // No data = show 0
        change: 0,
        isPositive: true
      };
    }

    const avgMinutes = Math.round(totalMinutes / validTickets);
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;
    return {
      hours,
      minutes,
      change: 0, // You could calculate this compared to previous period
      isPositive: true // Lower resolution time is better
    };
  } catch (error) {
    return {
      hours: 0,
      minutes: 0, // Error = show 0
      change: 0,
      isPositive: true
    };
  }
}

// Additional endpoint for status distribution
export const getStatusDistribution = async (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = subDays(new Date(), 30);

    const distribution = await prisma.ticket.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        status: true
      }
    });

    res.json({
      distribution: distribution.map((item: any) => ({
        status: item.status,
        count: item._count.status
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status distribution' });
  }
};

// Additional endpoint for ticket trends
export const getTicketTrendsData = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const trends = await getTicketTrends(days);

    res.json({ trends });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ticket trends' });
  }
};