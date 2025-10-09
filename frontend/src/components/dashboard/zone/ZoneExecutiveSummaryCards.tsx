'use client';

import React from 'react';
import { 
  Ticket, 
  RefreshCw, 
  Target, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Timer,
  FileText,
  Cpu,
  Award,
  Database,
  AlertTriangle,
  Users
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ZoneExecutiveSummaryCardsProps {
  zoneDashboardData: {
    metrics: {
      openTickets: number;
      inProgressTickets: number;
      resolvedTickets: number;
      technicianEfficiency: number;
      avgTravelTime: number;
      partsAvailability: number;
      equipmentUptime: number;
      firstCallResolutionRate: number;
      customerSatisfactionScore: number;
      avgResponseTime?: number;
      avgResolutionTime?: number;
    };
    stats: {
      openTickets: { count: number; change: number };
      unassignedTickets: { count: number; critical: boolean };
      inProgressTickets: { count: number; change: number };
      avgResponseTime: { hours: number; minutes: number; change: number; isPositive: boolean };
      avgResolutionTime: { days: number; hours: number; minutes: number; change: number; isPositive: boolean };
      avgDowntime: { hours: number; minutes: number; change: number; isPositive: boolean };
      monthlyTickets: { count: number; change: number };
      activeMachines: { count: number; change: number };
    };
  };
}

// Helper functions
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

const formatDuration = (hours: number, minutes: number): string => {
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatChange = (change: number, isPositive?: boolean): string => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change}%`;
};

export default function ZoneExecutiveSummaryCards({ 
  zoneDashboardData 
}: ZoneExecutiveSummaryCardsProps) {
  const { metrics, stats } = zoneDashboardData;

  const metricsData = [
    {
      title: "Open Tickets",
      value: formatNumber(stats?.openTickets?.count ?? 0),
      change: Number(stats?.openTickets?.change ?? 0),
      isPositive: false,
      icon: Ticket,
      description: 'Currently open tickets',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Unassigned',
      value: String(stats?.unassignedTickets?.count ?? '0'),
      description: 'Tickets waiting for assignment',
      critical: stats?.unassignedTickets?.critical || false,
      color: stats?.unassignedTickets?.critical 
        ? 'from-amber-500 to-amber-600' 
        : 'from-slate-500 to-slate-600',
      bgColor: stats?.unassignedTickets?.critical 
        ? 'bg-amber-50' 
        : 'bg-slate-50',
      icon: AlertTriangle
    },
    {
      title: 'In Progress',
      value: formatNumber(stats?.inProgressTickets?.count ?? 0),
      description: 'Tickets being worked on',
      change: Number(stats?.inProgressTickets?.change ?? 0),
      isPositive: (Number(stats?.inProgressTickets?.change ?? 0)) >= 0,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      icon: RefreshCw
    },
    {
      title: 'Avg Response Time',
      value: formatDuration(
        stats?.avgResponseTime?.hours || 0, 
        stats?.avgResponseTime?.minutes || 0
      ),
      description: 'Time to first response',
      change: Number(stats?.avgResponseTime?.change ?? 0),
      isPositive: stats?.avgResponseTime?.isPositive !== false,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      icon: Clock
    },
    {
      title: 'Avg Resolution Time',
      value: `${stats?.avgResolutionTime?.days || 0}d ${stats?.avgResolutionTime?.hours || 0}h ${stats?.avgResolutionTime?.minutes || 0}m`,
      description: 'Time to ticket resolution',
      change: Number(stats?.avgResolutionTime?.change ?? 0),
      isPositive: stats?.avgResolutionTime?.isPositive !== false,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
      icon: Timer
    },
    {
      title: 'Machine Downtime',
      value: formatDuration(
        stats?.avgDowntime?.hours || 0, 
        stats?.avgDowntime?.minutes || 0
      ),
      change: Number(stats?.avgDowntime?.change ?? 0),
      isPositive: stats?.avgDowntime?.isPositive ?? false,
      color: 'from-rose-500 to-pink-600',
      bgColor: 'bg-rose-50',
      icon: Timer,
      description: 'Average machine downtime'
    },
    {
      title: 'Tickets This Month',
      value: formatNumber(stats?.monthlyTickets?.count ?? 0),
      change: Number(stats?.monthlyTickets?.change ?? 0),
      isPositive: true,
      icon: FileText,
      color: 'from-indigo-500 to-blue-600',
      bgColor: 'bg-indigo-50',
      description: 'Tickets created this month'
    },
    {
      title: 'Active Machines',
      value: formatNumber(stats?.activeMachines?.count ?? 0),
      change: Number(stats?.activeMachines?.change ?? 0),
      isPositive: true,
      icon: Cpu,
      color: 'from-violet-500 to-purple-600',
      bgColor: 'bg-violet-50',
      description: 'Machines in operation'
    }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
            <Award className="w-6 h-6 text-white" />
          </div>
          Zone Executive Summary
        </h2>
        <div className="flex items-center gap-3">
          <Badge className="bg-green-100 text-green-800 px-3 py-1">
            <Database className="w-4 h-4 mr-1" />
            Live Data
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsData.map((metric, i) => (
          <Card 
            key={i} 
            className={`${metric.bgColor || 'bg-white'} border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 flex items-center gap-1">
                    <metric.icon className="w-4 h-4" />
                    {metric.title}
                  </p>
                  <p className="text-3xl font-bold text-slate-900">{metric.value}</p>
                  <p className="text-xs text-slate-500">{metric.description}</p>
                  {metric.change !== undefined && (
                    <div className="flex items-center gap-1">
                      {metric.isPositive ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-xs font-medium ${metric.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {formatChange(metric.change, metric.isPositive)}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-r ${metric.color} shadow-lg`}>
                  {metric.icon && React.createElement(metric.icon, { className: "w-6 h-6 text-white" })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
