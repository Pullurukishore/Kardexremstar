"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3,
  Activity,
  Database,
  Timer,
  Users,
  Building2,
  Ticket,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  MapPin,
  AlertTriangle
} from "lucide-react";
import { formatNumber, formatDuration } from "./utils";
import type { DashboardData } from "./types";

interface PerformanceAnalyticsProps {
  dashboardData: Partial<DashboardData>;
  loading?: boolean;
}

export default function PerformanceAnalytics({ dashboardData }: PerformanceAnalyticsProps) {
  const overviewMetrics = [
    { 
      label: "Operational Efficiency", 
      value: formatDuration(
        dashboardData?.stats?.avgResponseTime?.hours || 0, 
        dashboardData?.stats?.avgResponseTime?.minutes || 0
      ),
      subtitle: "Average response time",
      benchmark: "Target: < 2 hours",
      performance: ((dashboardData?.stats?.avgResponseTime?.hours || 0) * 60 + (dashboardData?.stats?.avgResponseTime?.minutes || 0)) < 120 ? 95 : 65,
      trend: dashboardData?.stats?.avgResponseTime?.change || 0,
      isPositive: dashboardData?.stats?.avgResponseTime?.isPositive !== false,
      icon: Timer,
      color: "from-blue-500 to-cyan-600",
      bgColor: "bg-gradient-to-br from-blue-50 to-cyan-50"
    },
    { 
      label: "Resource Utilization", 
      value: `${Math.round(((dashboardData?.stats?.kpis?.activeServicePersons?.value || 0) / Math.max(1, dashboardData?.adminStats?.totalServicePersons || 1)) * 100)}%`,
      subtitle: `${dashboardData?.stats?.kpis?.activeServicePersons?.value || 0} of ${dashboardData?.adminStats?.totalServicePersons || 0} technicians active`,
      benchmark: "Target: > 80%",
      performance: Math.round(((dashboardData?.stats?.kpis?.activeServicePersons?.value || 0) / Math.max(1, dashboardData?.adminStats?.totalServicePersons || 1)) * 100),
      trend: dashboardData?.stats?.kpis?.activeServicePersons?.change || 0,
      isPositive: true,
      icon: Users,
      color: "from-emerald-500 to-green-600",
      bgColor: "bg-gradient-to-br from-emerald-50 to-green-50"
    },
    { 
      label: "Customer Engagement", 
      value: `${Math.round(((dashboardData?.stats?.kpis?.activeCustomers?.value || 0) / Math.max(1, dashboardData?.adminStats?.totalCustomers || 1)) * 100)}%`,
      subtitle: `${dashboardData?.stats?.kpis?.activeCustomers?.value || 0} of ${dashboardData?.adminStats?.totalCustomers || 0} customers with active tickets`,
      benchmark: "Engagement rate",
      performance: Math.round(((dashboardData?.stats?.kpis?.activeCustomers?.value || 0) / Math.max(1, dashboardData?.adminStats?.totalCustomers || 1)) * 100),
      trend: dashboardData?.stats?.kpis?.activeCustomers?.change || 0,
      isPositive: true,
      icon: Building2,
      color: "from-purple-500 to-violet-600",
      bgColor: "bg-gradient-to-br from-purple-50 to-violet-50"
    },
    { 
      label: "Workload Distribution", 
      value: `${dashboardData?.stats?.kpis?.totalTickets?.value || 0}`,
      subtitle: `${dashboardData?.stats?.kpis?.unassignedTickets?.value || 0} unassigned tickets`,
      benchmark: dashboardData?.adminStats?.zoneWiseTickets?.length 
        ? `Across ${dashboardData?.adminStats?.zoneWiseTickets?.length} zones`
        : "System-wide",
      performance: Math.max(0, 100 - ((dashboardData?.stats?.kpis?.unassignedTickets?.value || 0) * 10)),
      trend: -(dashboardData?.stats?.kpis?.unassignedTickets?.value || 0),
      isPositive: (dashboardData?.stats?.kpis?.unassignedTickets?.value || 0) < 5,
      icon: Ticket,
      color: "from-orange-500 to-red-600",
      bgColor: "bg-gradient-to-br from-orange-50 to-red-50"
    }
  ];

  const currentPeriodMetrics = [
    {
      label: "Total Tickets",
      value: formatNumber(dashboardData?.stats?.kpis?.totalTickets?.value || 0),
      change: dashboardData?.stats?.kpis?.totalTickets?.change || "0%",
      isPositive: dashboardData?.stats?.kpis?.totalTickets?.isPositive !== false,
      icon: Ticket,
      color: "from-blue-500 to-cyan-600"
    },
    {
      label: "SLA Compliance",
      value: `${dashboardData?.stats?.kpis?.slaCompliance?.value || 0}%`,
      change: `${dashboardData?.stats?.kpis?.slaCompliance?.change || 0}%`,
      isPositive: (dashboardData?.stats?.kpis?.slaCompliance?.change || 0) >= 0,
      icon: Shield,
      color: "from-green-500 to-emerald-600"
    },
    {
      label: "Active Customers",
      value: formatNumber(dashboardData?.stats?.kpis?.activeCustomers?.value || 0),
      change: `${dashboardData?.stats?.kpis?.activeCustomers?.change || 0}%`,
      isPositive: (dashboardData?.stats?.kpis?.activeCustomers?.change || 0) >= 0,
      icon: Building2,
      color: "from-purple-500 to-violet-600"
    },
    {
      label: "Response Time",
      value: `${dashboardData?.stats?.kpis?.avgResponseTime?.value || 0} ${dashboardData?.stats?.kpis?.avgResponseTime?.unit || 'hrs'}`,
      change: `${dashboardData?.stats?.kpis?.avgResponseTime?.change || 0}%`,
      isPositive: (dashboardData?.stats?.kpis?.avgResponseTime?.change || 0) <= 0,
      icon: Timer,
      color: "from-orange-500 to-red-600"
    }
  ];

  const systemResources = [
    {
      label: "Service Zones",
      value: dashboardData?.adminStats?.totalServiceZones || 0,
      utilization: (dashboardData?.adminStats?.zoneWiseTickets || []).filter(z => z.totalTickets > 0).length,
      total: dashboardData?.adminStats?.totalServiceZones || 0,
      icon: MapPin,
      color: "from-cyan-500 to-blue-600"
    },
    {
      label: "Service Personnel",
      value: dashboardData?.adminStats?.totalServicePersons || 0,
      utilization: dashboardData?.stats?.kpis?.activeServicePersons?.value || 0,
      total: dashboardData?.adminStats?.totalServicePersons || 0,
      icon: Users,
      color: "from-green-500 to-emerald-600"
    },
    {
      label: "Total Customers",
      value: formatNumber(dashboardData?.adminStats?.totalCustomers || 0),
      utilization: dashboardData?.stats?.kpis?.activeCustomers?.value || 0,
      total: dashboardData?.adminStats?.totalCustomers || 0,
      icon: Building2,
      color: "from-purple-500 to-violet-600"
    },
    {
      label: "Unassigned Tickets",
      value: dashboardData?.stats?.kpis?.unassignedTickets?.value || 0,
      utilization: Math.max(0, 100 - ((dashboardData?.stats?.kpis?.unassignedTickets?.value || 0) * 20)),
      total: 100,
      icon: AlertTriangle,
      color: (dashboardData?.stats?.kpis?.unassignedTickets?.value || 0) > 5 ? "from-red-500 to-pink-600" : "from-orange-500 to-amber-600"
    }
  ];

  const benchmarks = [
    {
      metric: "Response Time",
      current: ((dashboardData?.stats?.avgResponseTime?.hours || 0) * 60 + (dashboardData?.stats?.avgResponseTime?.minutes || 0)),
      target: 120,
      unit: "minutes",
      format: (val: number) => `${Math.floor(val / 60)}h ${val % 60}m`,
      isLowerBetter: true
    },
    {
      metric: "SLA Compliance",
      current: dashboardData?.stats?.kpis?.slaCompliance?.value || 0,
      target: 95,
      unit: "%",
      format: (val: number) => `${val}%`,
      isLowerBetter: false
    },
    {
      metric: "Resource Utilization",
      current: Math.round(((dashboardData?.stats?.kpis?.activeServicePersons?.value || 0) / Math.max(1, dashboardData?.adminStats?.totalServicePersons || 1)) * 100),
      target: 80,
      unit: "%",
      format: (val: number) => `${val}%`,
      isLowerBetter: false
    },
    {
      metric: "Unassigned Tickets",
      current: dashboardData?.stats?.kpis?.unassignedTickets?.value || 0,
      target: 5,
      unit: "tickets",
      format: (val: number) => `${val}`,
      isLowerBetter: true
    }
  ];

  return (
    <Card className="lg:col-span-2 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50 border-0 shadow-xl">
      <CardHeader className="pb-6 bg-gradient-to-r from-indigo-600/5 to-purple-600/5 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-2xl font-bold">
              <div className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Performance Analytics
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    <Activity className="w-3 h-3 mr-1" />
                    Live Metrics
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700 text-xs">
                    <Database className="w-3 h-3 mr-1" />
                    Real-time
                  </Badge>
                </div>
              </div>
            </CardTitle>
            <CardDescription className="text-base mt-3 text-slate-600">
              Advanced business intelligence with predictive analytics and performance insights
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {overviewMetrics.map((item, i) => (
                <div key={i} className={`${item.bgColor} rounded-2xl p-8 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 group`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`p-4 rounded-2xl bg-gradient-to-r ${item.color} shadow-2xl group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-white/90 text-slate-700 border-0 shadow-sm">
                        <Activity className="w-3 h-3 mr-1" />
                        Live
                      </Badge>
                      {item.trend !== 0 && (
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          item.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {Math.abs(item.trend)}%
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-800">{item.label}</h3>
                    <p className="text-5xl font-bold text-slate-900 group-hover:scale-105 transition-transform duration-300">{item.value}</p>
                    <p className="text-sm text-slate-600 font-medium">{item.subtitle}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Performance Score</span>
                        <span>{item.performance}%</span>
                      </div>
                      <div className="relative">
                        <Progress 
                          value={item.performance} 
                          className="h-3 bg-white/50"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-white/50">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500 font-medium">{item.benchmark}</p>
                        <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                          item.performance >= 80 ? 'bg-green-200 text-green-800' :
                          item.performance >= 60 ? 'bg-yellow-200 text-yellow-800' :
                          'bg-red-200 text-red-800'
                        }`}>
                          {item.performance >= 80 ? 'Excellent' : item.performance >= 60 ? 'Good' : 'Needs Attention'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="trends" className="mt-6">
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Service Performance
                </h4>
                <ul className="space-y-1 text-sm text-slate-600">
                  {dashboardData?.stats?.kpis?.slaCompliance?.value !== undefined && dashboardData.stats.kpis.slaCompliance.value >= 95 && (
                    <li>• Excellent SLA compliance at {dashboardData.stats.kpis.slaCompliance.value}%</li>
                  )}
                  {dashboardData?.stats?.kpis?.avgResponseTime?.value && (
                    <li>• Average response time: {dashboardData.stats.kpis.avgResponseTime.value} {dashboardData.stats.kpis.avgResponseTime.unit || 'hrs'}</li>
                  )}
                  {dashboardData?.adminStats?.zoneWiseTickets?.map(zone => (
                    zone?.totalTickets > 0 && (
                      <li key={`zone-${zone.id}`}>• {zone.name}: {zone.totalTickets} active tickets</li>
                    )
                  ))}
                </ul>
              </div>
              {(dashboardData?.stats?.kpis?.unassignedTickets?.value || 0) > 0 && (
                <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    Attention Required
                  </h4>
                  <ul className="space-y-1 text-sm text-slate-600">
                    <li>• {dashboardData?.stats?.kpis?.unassignedTickets?.value} unassigned tickets</li>
                    {dashboardData?.adminStats?.zoneWiseTickets?.some(z => z?.servicePersonCount === 0) && (
                      <li>• Some zones have no assigned service personnel</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="comparison" className="mt-8">
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Current Period Performance */}
                <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-0 shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-3 text-xl font-bold">
                        <div className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg">
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        Current Period
                      </CardTitle>
                      <Badge className="bg-green-100 text-green-800 px-3 py-1 shadow-sm">
                        <Activity className="w-4 h-4 mr-1" />
                        Live Data
                      </Badge>
                    </div>
                    <CardDescription className="text-base">Real-time performance metrics and KPIs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {currentPeriodMetrics.map((metric, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/80 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg bg-gradient-to-r ${metric.color} shadow-lg`}>
                              <metric.icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-600">{metric.label}</p>
                              <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            metric.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {metric.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {metric.change}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* System Capacity & Resources */}
                <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-0 shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-3 text-xl font-bold">
                        <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                          <Database className="w-6 h-6 text-white" />
                        </div>
                        System Capacity
                      </CardTitle>
                      <Badge className="bg-blue-100 text-blue-800 px-3 py-1 shadow-sm">
                        <Database className="w-4 h-4 mr-1" />
                        Infrastructure
                      </Badge>
                    </div>
                    <CardDescription className="text-base">Resource allocation and system utilization</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {systemResources.map((resource, i) => (
                        <div key={i} className="p-4 bg-white/80 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-gradient-to-r ${resource.color} shadow-lg`}>
                                <resource.icon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-600">{resource.label}</p>
                                <p className="text-xl font-bold text-slate-900">{resource.value}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-500">Utilization</p>
                              <p className="text-sm font-semibold text-slate-700">
                                {typeof resource.utilization === 'number' && typeof resource.total === 'number' && resource.total > 0
                                  ? `${Math.round((resource.utilization / resource.total) * 100)}%`
                                  : '0%'}
                              </p>
                            </div>
                          </div>
                          <Progress 
                            value={typeof resource.utilization === 'number' && typeof resource.total === 'number' && resource.total > 0
                              ? Math.min(100, (resource.utilization / resource.total) * 100)
                              : 0} 
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>{resource.utilization} active</span>
                            <span>{resource.total} total</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Benchmarks */}
              <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold">
                    <div className="p-3 bg-gradient-to-r from-slate-600 to-gray-600 rounded-xl shadow-lg">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    Performance Benchmarks & Goals
                  </CardTitle>
                  <CardDescription className="text-base">Key performance indicators vs industry standards</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {benchmarks.map((benchmark, i) => {
                      const performance = benchmark.isLowerBetter 
                        ? benchmark.current <= benchmark.target
                        : benchmark.current >= benchmark.target;
                      const percentage = benchmark.isLowerBetter
                        ? Math.min(100, Math.max(0, ((benchmark.target - benchmark.current + benchmark.target) / benchmark.target) * 100))
                        : Math.min(100, (benchmark.current / benchmark.target) * 100);
                      
                      return (
                        <div key={i} className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-slate-800">{benchmark.metric}</h4>
                              <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                                performance ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {performance ? '✓ Target Met' : '⚠ Below Target'}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Current:</span>
                                <span className="font-semibold">{benchmark.format(benchmark.current)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Target:</span>
                                <span className="font-semibold">{benchmark.format(benchmark.target)}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Progress value={percentage} className="h-3" />
                              <p className="text-xs text-slate-500 text-center">
                                Performance: {Math.round(percentage)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
