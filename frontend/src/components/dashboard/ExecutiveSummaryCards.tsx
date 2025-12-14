"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Ticket, 
  Clock, 
  AlertTriangle, 
  Loader2,
  Timer,
  Cpu,
  TrendingUp,
  TrendingDown,
  Award,
  Users,
  Building2,
  Zap,
  Wrench,
  MapPin,
  Navigation,
  Target
} from "lucide-react";
import { formatNumber, formatDuration, formatChange } from "./utils";
import type { DashboardData } from "./types";

interface ExecutiveSummaryCardsProps {
  dashboardData: Partial<DashboardData>;
  loading?: boolean;
}

// Unique, non-overlapping metrics configuration
const getMetricsConfig = (dashboardData: Partial<DashboardData>) => {
  // GROUP 1: TICKET STATUS METRICS - Current state of tickets + SLA
  const ticketMetrics = [
    {
      title: "Open Tickets",
      value: formatNumber(dashboardData?.stats?.openTickets?.count ?? 0),
      change: Number(dashboardData?.stats?.openTickets?.change ?? 0),
      isPositive: (Number(dashboardData?.stats?.openTickets?.change ?? 0)) <= 0,
      icon: Ticket,
      description: 'Tickets awaiting action',
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      iconBg: 'bg-blue-500',
      category: 'status'
    },
    {
      title: 'Unassigned',
      value: formatNumber(dashboardData?.stats?.unassignedTickets?.count ?? 0),
      description: 'Needs assignment',
      critical: dashboardData?.stats?.unassignedTickets?.critical || false,
      gradient: dashboardData?.stats?.unassignedTickets?.critical 
        ? 'from-rose-500 to-orange-500' 
        : 'from-slate-500 to-gray-500',
      bgGradient: dashboardData?.stats?.unassignedTickets?.critical 
        ? 'from-rose-50 to-orange-50' 
        : 'from-slate-50 to-gray-50',
      iconBg: dashboardData?.stats?.unassignedTickets?.critical ? 'bg-rose-500' : 'bg-slate-500',
      icon: AlertTriangle,
      category: 'status'
    },
    {
      title: 'In Progress',
      value: formatNumber(dashboardData?.stats?.inProgressTickets?.count ?? 0),
      description: 'Being worked on',
      change: Number(dashboardData?.stats?.inProgressTickets?.change ?? 0),
      isPositive: true,
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-50 to-orange-50',
      iconBg: 'bg-amber-500',
      icon: Loader2,
      category: 'status'
    },
    {
      title: 'Monthly Tickets',
      value: formatNumber(dashboardData?.stats?.monthlyTickets?.count ?? 0),
      change: Number(dashboardData?.stats?.monthlyTickets?.change ?? 0),
      isPositive: true,
      icon: Target,
      gradient: 'from-violet-500 to-purple-500',
      bgGradient: 'from-violet-50 to-purple-50',
      iconBg: 'bg-violet-500',
      description: 'Created this month',
      category: 'volume'
    }
  ];

  // GROUP 2: TIME METRICS - All time-based measurements including Onsite Resolution
  const timeMetrics = [
    {
      title: 'Response Time',
      value: formatDuration(
        dashboardData?.stats?.avgResponseTime?.hours || 0, 
        dashboardData?.stats?.avgResponseTime?.minutes || 0
      ),
      description: 'Avg time to first response',
      change: Number(dashboardData?.stats?.avgResponseTime?.change ?? 0),
      isPositive: dashboardData?.stats?.avgResponseTime?.isPositive !== false,
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
      iconBg: 'bg-emerald-500',
      icon: Clock,
      category: 'time'
    },
    {
      title: 'Resolution Time',
      value: formatDuration(
        (dashboardData?.stats?.avgResolutionTime?.days || 0) * 24 + (dashboardData?.stats?.avgResolutionTime?.hours || 0),
        dashboardData?.stats?.avgResolutionTime?.minutes || 0
      ),
      description: 'Avg time to resolve',
      change: Number(dashboardData?.stats?.avgResolutionTime?.change ?? 0),
      isPositive: dashboardData?.stats?.avgResolutionTime?.isPositive !== false,
      gradient: 'from-teal-500 to-cyan-500',
      bgGradient: 'from-teal-50 to-cyan-50',
      iconBg: 'bg-teal-500',
      icon: Timer,
      category: 'time'
    },
    {
      title: 'Machine Downtime',
      value: formatDuration(
        dashboardData?.stats?.avgDowntime?.hours || 0, 
        dashboardData?.stats?.avgDowntime?.minutes || 0
      ),
      change: Number(dashboardData?.stats?.avgDowntime?.change ?? 0),
      isPositive: dashboardData?.stats?.avgDowntime?.isPositive ?? false,
      gradient: 'from-rose-500 to-pink-500',
      bgGradient: 'from-rose-50 to-pink-50',
      iconBg: 'bg-rose-500',
      icon: Cpu,
      description: 'Avg equipment downtime',
      category: 'time'
    },
    {
      title: 'Travel Time',
      value: formatDuration(
        dashboardData?.stats?.avgTravelTime?.hours || 0,
        dashboardData?.stats?.avgTravelTime?.minutes || 0
      ),
      subtitle: "Total (going + returning)",
      change: dashboardData?.stats?.avgTravelTime?.change || 0,
      isPositive: dashboardData?.stats?.avgTravelTime?.isPositive !== false,
      icon: Navigation,
      gradient: "from-indigo-500 to-blue-500",
      bgGradient: "from-indigo-50 to-blue-50",
      iconBg: 'bg-indigo-500',
      description: 'Avg technician travel',
      category: 'time'
    },
    {
      title: 'Onsite Resolution',
      value: formatDuration(
        dashboardData?.stats?.avgOnsiteResolutionTime?.hours || 0,
        dashboardData?.stats?.avgOnsiteResolutionTime?.minutes || 0
      ),
      subtitle: "Onsite to resolved",
      change: dashboardData?.stats?.avgOnsiteResolutionTime?.change || 0,
      isPositive: dashboardData?.stats?.avgOnsiteResolutionTime?.isPositive !== false,
      icon: Wrench,
      gradient: "from-orange-500 to-amber-500",
      bgGradient: "from-orange-50 to-amber-50",
      iconBg: 'bg-orange-500',
      description: 'Avg onsite work duration',
      category: 'time'
    }
  ];

  // GROUP 3: RESOURCE METRICS - People and assets
  const resourceMetrics = [
    {
      title: 'Active Customers',
      value: formatNumber(dashboardData?.stats?.kpis?.activeCustomers?.value || 0),
      subtitle: `of ${formatNumber(dashboardData?.adminStats?.totalCustomers || 0)} total`,
      change: dashboardData?.stats?.kpis?.activeCustomers?.change || 0,
      isPositive: true,
      icon: Building2,
      gradient: "from-purple-500 to-violet-500",
      bgGradient: "from-purple-50 to-violet-50",
      iconBg: 'bg-purple-500',
      description: 'Customers with active tickets',
      category: 'resources'
    },
    {
      title: 'Active Technicians',
      value: formatNumber(dashboardData?.stats?.kpis?.activeServicePersons?.value || 0),
      subtitle: `of ${formatNumber(dashboardData?.adminStats?.totalServicePersons || 0)} total`,
      change: dashboardData?.stats?.kpis?.activeServicePersons?.change || 0,
      isPositive: true,
      icon: Users,
      gradient: "from-cyan-500 to-blue-500",
      bgGradient: "from-cyan-50 to-blue-50",
      iconBg: 'bg-cyan-500',
      description: 'Technicians on active tickets',
      category: 'resources'
    },
    {
      title: 'Service Zones',
      value: formatNumber(dashboardData?.adminStats?.totalServiceZones || 0),
      valueLabel: "zones",
      subtitle: `${dashboardData?.stats?.kpis?.activeServicePersons?.value || 0} active technicians`,
      icon: MapPin,
      gradient: "from-lime-500 to-green-500",
      bgGradient: "from-lime-50 to-green-50",
      iconBg: 'bg-lime-500',
      description: 'Geographic coverage areas',
      category: 'resources'
    },
    {
      title: 'Active Machines',
      value: formatNumber(dashboardData?.stats?.activeMachines?.count ?? 0),
      change: Number(dashboardData?.stats?.activeMachines?.change ?? 0),
      isPositive: true,
      icon: Cpu,
      gradient: 'from-fuchsia-500 to-pink-500',
      bgGradient: 'from-fuchsia-50 to-pink-50',
      iconBg: 'bg-fuchsia-500',
      description: 'Equipment in operation',
      category: 'resources'
    }
  ];

  return { ticketMetrics, timeMetrics, resourceMetrics };
};

// Section Header Component
const SectionHeader = ({ icon: Icon, title, iconGradient, badge }: { 
  icon: any; 
  title: string; 
  iconGradient: string;
  badge?: { label: string; color: string };
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-5 gap-2">
    <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2.5">
      <div className={`p-2 rounded-xl bg-gradient-to-br ${iconGradient} shadow-lg`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      </div>
      <span className="text-slate-800">{title}</span>
    </h3>
    {badge && (
      <Badge className={`${badge.color} px-3 py-1 text-xs font-semibold`}>
        <Zap className="w-3 h-3 mr-1" />
        {badge.label}
      </Badge>
    )}
  </div>
);

// Metric Card Component
const MetricCard = ({ metric, index }: { metric: any; index: number }) => (
  <Card 
    className={`relative overflow-hidden bg-gradient-to-br ${metric.bgGradient} border-0 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 group`}
    style={{ animationDelay: `${index * 50}ms` }}
  >
    {/* Shimmer effect on hover */}
    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    
    {/* Background decoration */}
    <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-white/30 blur-2xl" />
    <div className="absolute -bottom-8 -left-8 w-20 h-20 rounded-full bg-white/20 blur-2xl" />
    
    <CardContent className="relative z-10 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          {/* Title */}
          <p className="text-xs sm:text-sm font-semibold text-slate-600 truncate">
            {metric.title}
          </p>
          
          {/* Main Value */}
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {metric.value}
            </p>
            {metric.valueLabel && (
              <span className="text-xs font-medium text-slate-500">{metric.valueLabel}</span>
            )}
          </div>
          
          {/* Description or Subtitle */}
          <p className="text-xs text-slate-500 line-clamp-1">
            {metric.subtitle || metric.description}
          </p>
          
          {/* Change Indicator - only show when there's an actual change */}
          {metric.change !== undefined && metric.change !== 0 && !metric.critical && (
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              metric.isPositive 
                ? 'bg-emerald-100/80 text-emerald-700' 
                : 'bg-rose-100/80 text-rose-700'
            }`}>
              {metric.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {formatChange(metric.change, metric.isPositive)}
            </div>
          )}

          {/* Critical Badge for Unassigned */}
          {metric.critical && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">
              <AlertTriangle className="w-3 h-3" />
              Needs Attention
            </div>
          )}
        </div>
        
        {/* Icon Badge */}
        <div className="relative flex-shrink-0">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${metric.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {metric.icon && React.createElement(metric.icon, { 
              className: "w-5 h-5 sm:w-6 sm:h-6 text-white" 
            })}
          </div>
          {/* Glow effect */}
          <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${metric.gradient} blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function ExecutiveSummaryCards({ dashboardData }: ExecutiveSummaryCardsProps) {
  const { ticketMetrics, timeMetrics, resourceMetrics } = getMetricsConfig(dashboardData);

  return (
    <div className="space-y-8 sm:space-y-10 mb-8 sm:mb-10">
      {/* SECTION 1: TICKET STATUS */}
      <section>
        <SectionHeader 
          icon={Ticket} 
          title="Ticket Overview" 
          iconGradient="from-blue-500 to-cyan-500"
          badge={{ label: 'Live', color: 'bg-blue-100 text-blue-700 border border-blue-200' }}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {ticketMetrics.map((metric, i) => (
            <MetricCard key={`ticket-${i}`} metric={metric} index={i} />
          ))}
        </div>
      </section>

      {/* SECTION 2: TIME METRICS (includes Onsite Resolution) */}
      <section>
        <SectionHeader 
          icon={Clock} 
          title="Time Analytics" 
          iconGradient="from-emerald-500 to-teal-500"
          badge={{ label: 'Business Hours', color: 'bg-emerald-100 text-emerald-700 border border-emerald-200' }}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {timeMetrics.map((metric, i) => (
            <MetricCard key={`time-${i}`} metric={metric} index={i} />
          ))}
        </div>
      </section>

      {/* SECTION 3: RESOURCES */}
      <section>
        <SectionHeader 
          icon={Users} 
          title="Resources & Assets" 
          iconGradient="from-purple-500 to-violet-500"
          badge={{ label: 'Capacity', color: 'bg-purple-100 text-purple-700 border border-purple-200' }}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {resourceMetrics.map((metric, i) => (
            <MetricCard key={`resource-${i}`} metric={metric} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

