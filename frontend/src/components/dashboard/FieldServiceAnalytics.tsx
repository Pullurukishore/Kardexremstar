"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Timer,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Activity,
  Settings,
  Wrench,
  TrendingUp,
  TrendingDown,
  Navigation,
  Clock
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
      title: "Response Efficiency",
      value: formatDuration(
        dashboardData?.stats?.avgResponseTime?.hours || 0, 
        dashboardData?.stats?.avgResponseTime?.minutes || 0
      ),
      subtitle: "Average first response",
      change: dashboardData?.stats?.avgResponseTime?.change || 0,
      isPositive: dashboardData?.stats?.avgResponseTime?.isPositive !== false,
      icon: Timer,
      color: "from-blue-500 to-cyan-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Service Coverage",
      value: `${dashboardData?.adminStats?.totalServiceZones || 0}`,
      subtitle: `${dashboardData?.stats?.kpis?.activeServicePersons?.value || 0} active technicians`,
      utilization: (dashboardData?.adminStats?.totalServiceZones || 0) > 0 
        ? Math.round(((dashboardData?.stats?.kpis?.activeServicePersons?.value || 0) / (dashboardData?.adminStats?.totalServiceZones || 1)) * 100)
        : 0,
      icon: MapPin,
      color: "from-emerald-500 to-green-600",
      bgColor: "bg-emerald-50"
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
      color: "from-purple-500 to-violet-600",
      bgColor: "bg-purple-50"
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
      color: "from-orange-500 to-amber-600",
      bgColor: "bg-orange-50"
    }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          Field Service Analytics (FSA)
        </h2>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
            <Activity className="w-4 h-4 mr-1" />
            Real-time
          </Badge>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Configure
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, i) => (
          <Card key={i} className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className={`${metric.bgColor} rounded-lg p-4 mb-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${metric.color} shadow-lg`}>
                    <metric.icon className="w-6 h-6 text-white" />
                  </div>
                  {metric.change !== undefined && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                      metric.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {metric.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span className="text-sm font-medium">{metric.change > 0 ? '+' : ''}{metric.change}%</span>
                    </div>
                  )}
                  {(metric as any).critical && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-700">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Critical</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-800">{metric.title}</h3>
                  <p className="text-3xl font-bold text-slate-900">{metric.value}</p>
                  <p className="text-sm text-slate-600">{metric.subtitle}</p>
                  {metric.utilization !== undefined && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Coverage Efficiency</span>
                        <span>{metric.utilization}%</span>
                      </div>
                      <Progress 
                        value={metric.utilization} 
                        className="h-2"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
