"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Timer,
  MapPin,
  AlertTriangle,
  Wrench,
  TrendingUp,
  TrendingDown,
  Navigation,
  Clock,
  Activity,
  Zap
} from "lucide-react";
import { formatDuration } from "./utils";
import type { DashboardData } from "./types";

interface FieldServiceAnalyticsProps {
  dashboardData: Partial<DashboardData>;
  loading?: boolean;
}

export default function FieldServiceAnalytics({ dashboardData }: FieldServiceAnalyticsProps) {
  const metrics = [
    {
      title: "SLA Compliance",
      value: `${dashboardData?.stats?.kpis?.slaCompliance?.value || 0}%`,
      subtitle: "Closed within 1 business day",
      change: dashboardData?.stats?.kpis?.slaCompliance?.change || 0,
      isPositive: (dashboardData?.stats?.kpis?.slaCompliance?.value || 0) >= 90,
      icon: Timer,
      gradient: "from-green-500 via-emerald-500 to-teal-600",
      bgGradient: "from-green-50 via-emerald-50/50 to-teal-50",
    },
    {
      title: "Service Coverage",
      value: `${dashboardData?.adminStats?.totalServiceZones || 0}`,
      valueLabel: "zones",
      subtitle: `${dashboardData?.stats?.kpis?.activeServicePersons?.value || 0} active technicians`,
      utilization: (dashboardData?.adminStats?.totalServiceZones || 0) > 0 
        ? Math.round(((dashboardData?.stats?.kpis?.activeServicePersons?.value || 0) / (dashboardData?.adminStats?.totalServiceZones || 1)) * 100)
        : 0,
      icon: MapPin,
      gradient: "from-emerald-500 via-green-500 to-lime-600",
      bgGradient: "from-emerald-50 via-green-50/50 to-lime-50",
    },
    {
      title: "Avg Travel Time",
      value: formatDuration(
        dashboardData?.stats?.avgTravelTime?.hours || 0,
        dashboardData?.stats?.avgTravelTime?.minutes || 0
      ),
      subtitle: "Total travel time (going + returning)",
      change: dashboardData?.stats?.avgTravelTime?.change || 0,
      isPositive: dashboardData?.stats?.avgTravelTime?.isPositive !== false,
      icon: Navigation,
      gradient: "from-purple-500 via-violet-500 to-indigo-600",
      bgGradient: "from-purple-50 via-violet-50/50 to-indigo-50",
    },
    {
      title: "Avg Onsite Resolution Time",
      value: formatDuration(
        dashboardData?.stats?.avgOnsiteResolutionTime?.hours || 0,
        dashboardData?.stats?.avgOnsiteResolutionTime?.minutes || 0
      ),
      subtitle: "Onsite in-progress to resolved",
      change: dashboardData?.stats?.avgOnsiteResolutionTime?.change || 0,
      isPositive: dashboardData?.stats?.avgOnsiteResolutionTime?.isPositive !== false,
      icon: Clock,
      gradient: "from-orange-500 via-amber-500 to-yellow-600",
      bgGradient: "from-orange-50 via-amber-50/50 to-yellow-50",
    }
  ];

  return (
    <div className="mb-6 sm:mb-8 space-y-5 sm:space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 rounded-xl shadow-lg">
              <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="absolute inset-0 rounded-xl border-2 border-cyan-300 animate-ping opacity-20" />
          </div>
          <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-clip-text text-transparent">
            Field Service Analytics (FSA)
          </span>
        </h2>
        <Badge className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200/50 px-3 py-1.5 text-xs sm:text-sm font-semibold">
          <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          Real-time Metrics
        </Badge>
      </div>
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
        {metrics.map((metric, i) => (
          <Card 
            key={i} 
            className={`relative overflow-hidden bg-gradient-to-br ${metric.bgGradient} border-0 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1.5 group`}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            
            {/* Background decorations */}
            <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-gradient-to-br from-white/40 to-transparent blur-2xl" />
            <div className="absolute -bottom-12 -left-12 w-28 h-28 rounded-full bg-gradient-to-br from-white/30 to-transparent blur-2xl" />
            
            <CardContent className="relative z-10 p-5 sm:p-6">
              {/* Header with Icon and Change Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${metric.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <metric.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                {metric.change !== undefined && (
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${
                    metric.isPositive 
                      ? 'bg-green-100/80 text-green-700' 
                      : 'bg-red-100/80 text-red-700'
                  }`}>
                    {metric.isPositive ? 
                      <TrendingUp className="w-3.5 h-3.5" /> : 
                      <TrendingDown className="w-3.5 h-3.5" />
                    }
                    <span className="text-xs font-semibold">
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </span>
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">{metric.title}</h3>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl sm:text-4xl font-bold text-slate-900 group-hover:scale-[1.02] transition-transform duration-300">
                    {metric.value}
                  </p>
                  {(metric as any).valueLabel && (
                    <span className="text-sm font-medium text-slate-600">{(metric as any).valueLabel}</span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">{metric.subtitle}</p>
                
                {/* Utilization Progress (for Service Coverage) */}
                {(metric as any).utilization !== undefined && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span className="font-medium">Coverage Efficiency</span>
                      <span className="font-semibold">{(metric as any).utilization}%</span>
                    </div>
                    <div className="relative">
                      <Progress 
                        value={(metric as any).utilization} 
                        className="h-2.5 bg-white/50"
                      />
                      <div 
                        className={`absolute top-0 h-2.5 rounded-full bg-gradient-to-r ${metric.gradient} shadow-sm transition-all duration-500`}
                        style={{ width: `${(metric as any).utilization}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Live indicator */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-xs text-slate-400">
                <Activity className="w-3 h-3" />
                <span className="font-medium">Live</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
