"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  MapPin,
  Building2,
  Users,
  Ticket,
  Activity,
  Globe,
  RefreshCw,
  Download,
  PieChart,
  Target,
  Award,
  Star,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Timer
} from "lucide-react";
import { formatNumber } from "./utils";
import type { DashboardData } from "./types";

interface ZonePerformanceAnalyticsProps {
  dashboardData: Partial<DashboardData>;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
}

// Helper function to get real zone-specific resolution time from backend data
const getZoneResolutionTime = (zone: any) => {
  // Use real backend data if available, otherwise return 0 for no data
  return zone.avgResolutionTimeHours || 0; // Return 0 if no data available
};

// Helper function to format resolution time
const formatResolutionTime = (hours: number) => {
  // Ensure we're working with a clean integer
  const cleanHours = Math.round(hours);
  
  if (cleanHours >= 24) {
    const days = Math.floor(cleanHours / 24);
    const remainingHours = cleanHours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  return `${cleanHours}h`;
};

// Helper function to get resolution time performance level
const getResolutionTimePerformance = (hours: number) => {
  if (hours === 0) return { level: 'No Data', color: 'bg-gray-500', bgClass: 'bg-gray-100 text-gray-800' };
  if (hours <= 24) return { level: 'Excellent', color: 'bg-green-500', bgClass: 'bg-green-100 text-green-800' };
  if (hours <= 48) return { level: 'Good', color: 'bg-yellow-500', bgClass: 'bg-yellow-100 text-yellow-800' };
  return { level: 'Needs Improvement', color: 'bg-red-500', bgClass: 'bg-red-100 text-red-800' };
};

export default function ZonePerformanceAnalytics({ 
  dashboardData, 
  isRefreshing, 
  onRefresh 
}: ZonePerformanceAnalyticsProps) {

  if (!dashboardData?.adminStats?.zoneWiseTickets?.length) {
    return null;
  }

  const summaryMetrics = [
    {
      title: "Total Tickets",
      value: (dashboardData?.adminStats?.zoneWiseTickets || []).reduce((sum, zone) => sum + zone.totalTickets, 0),
      subtitle: "Across all zones",
      icon: Ticket,
      color: "from-blue-500 to-cyan-600",
      bgColor: "bg-gradient-to-br from-blue-50 to-cyan-50",
      trend: "+12%",
      isPositive: true
    },
    {
      title: "Total Customers",
      value: formatNumber(dashboardData?.adminStats?.totalCustomers || 0),
      subtitle: "Active customer base",
      icon: Building2,
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-gradient-to-br from-green-50 to-emerald-50",
      trend: "+8%",
      isPositive: true
    },
    {
      title: "Avg. Tickets/Zone",
      value: (dashboardData?.adminStats?.zoneWiseTickets || []).length > 0 
        ? Math.round((dashboardData?.adminStats?.zoneWiseTickets || []).reduce((sum, zone) => sum + zone.totalTickets, 0) / (dashboardData?.adminStats?.zoneWiseTickets || []).length)
        : 0,
      subtitle: "Workload distribution",
      icon: BarChart3,
      color: "from-purple-500 to-violet-600",
      bgColor: "bg-gradient-to-br from-purple-50 to-violet-50",
      trend: "-3%",
      isPositive: false
    },
    {
      title: "Total Staff",
      value: (dashboardData?.adminStats?.zoneWiseTickets || []).reduce((sum, zone) => sum + zone.servicePersonCount, 0),
      subtitle: "Service personnel",
      icon: Users,
      color: "from-orange-500 to-red-600",
      bgColor: "bg-gradient-to-br from-orange-50 to-red-50",
      trend: "+5%",
      isPositive: true
    }
  ];

  return (
    <Card className="mt-8 bg-gradient-to-br from-white to-slate-50 border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              Zone Performance Analytics
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Comprehensive analysis of service zones, resource allocation, and operational efficiency
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-cyan-100 text-cyan-800 px-3 py-1">
              <Globe className="w-4 h-4 mr-1" />
              {dashboardData?.adminStats?.zoneWiseTickets?.length || 0} Zones
            </Badge>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(dashboardData?.adminStats?.zoneWiseTickets || []).map((zone) => (
            <Card key={zone.id} className="bg-white border-0 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-50">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {zone.name}
                      </p>
                      <p className="text-sm text-gray-500">Zone ID: {zone.id}</p>
                    </div>
                  </div>
                  <Badge className={`${zone.totalTickets > 0 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {zone.totalTickets > 0 ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Ticket className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-blue-900">{zone.totalTickets}</p>
                    <p className="text-xs text-blue-600">Total Tickets</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <Clock className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-900">
                      {formatResolutionTime(getZoneResolutionTime(zone))}
                    </p>
                    <p className="text-xs text-green-600">Avg Resolution</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-slate-700">Customers</span>
                    </div>
                    <span className="font-semibold text-slate-900">
                      {zone.customerCount} {zone.customerCount === 1 ? 'customer' : 'customers'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-slate-700">Resolution Time</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-900">
                        {formatResolutionTime(getZoneResolutionTime(zone))} avg
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-slate-700">Active Tickets</span>
                    </div>
                    <Badge variant={zone.totalTickets > 0 ? 'destructive' : 'outline'}>
                      {zone.totalTickets} {zone.totalTickets === 1 ? 'ticket' : 'tickets'}
                    </Badge>
                  </div>
                  
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Avg Resolution Time</span>
                      <span>{formatResolutionTime(getZoneResolutionTime(zone))}</span>
                    </div>
                    <Progress 
                      value={(() => {
                        const resolutionHours = getZoneResolutionTime(zone);
                        // Invert progress - lower resolution time = better (higher progress)
                        return Math.max(10, 100 - Math.min(90, (resolutionHours / 72) * 100));
                      })()} 
                      className={`h-2 [&>div]:${getResolutionTimePerformance(getZoneResolutionTime(zone)).color}`}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      {getResolutionTimePerformance(getZoneResolutionTime(zone)).level.toLowerCase()} resolution time
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-end">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Activity className="w-3 h-3" />
                      Live Data
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Enhanced Zone Performance Summary */}
        <div className="mt-8 space-y-6">
          <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-0 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                  <div className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                    <PieChart className="w-6 h-6 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Zone Performance Summary
                  </span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-100 text-indigo-800 px-3 py-1">
                    <Activity className="w-4 h-4 mr-1" />
                    Real-time Analytics
                  </Badge>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    Export Summary
                  </Button>
                </div>
              </div>
              <CardDescription className="text-base mt-2">
                Comprehensive overview of zone performance metrics and resource distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {summaryMetrics.map((metric, i) => (
                  <div key={i} className={`${metric.bgColor} rounded-2xl p-6 border-0 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 group`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${metric.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <metric.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        metric.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {metric.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {metric.trend}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-slate-800">{metric.title}</h4>
                      <p className="text-3xl font-bold text-slate-900 group-hover:scale-105 transition-transform duration-300">
                        {typeof metric.value === 'number' ? formatNumber(metric.value) : metric.value}
                      </p>
                      <p className="text-sm text-slate-600">{metric.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Zone Efficiency Metrics - Only show for multiple zones */}
              {(dashboardData?.adminStats?.zoneWiseTickets?.length || 0) > 1 && (
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Timer className="w-5 h-5 text-indigo-600" />
                    Zone Resolution Time Analysis
                  </h4>
                  <div className="space-y-4">
                    {(dashboardData?.adminStats?.zoneWiseTickets || []).slice(0, 5).map((zone, i) => {
                      const resolutionHours = getZoneResolutionTime(zone);
                      const maxResolutionTime = Math.max(...(dashboardData?.adminStats?.zoneWiseTickets || []).map(z => getZoneResolutionTime(z)));
                      // Invert percentage for resolution time (lower is better)
                      const performancePercentage = maxResolutionTime > 0 ? Math.max(10, 100 - ((resolutionHours / maxResolutionTime) * 100)) : 0;
                      const performance = getResolutionTimePerformance(resolutionHours);
                      
                      return (
                        <div key={zone.id} className="flex items-center justify-between p-4 bg-white/80 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                              <MapPin className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{zone.name}</p>
                              <p className="text-sm text-slate-600">
                                {zone.totalTickets} tickets • {zone.servicePersonCount} staff • {zone.customerCount} customers
                              </p>
                            </div>
                          </div>
                          <div className="text-right min-w-[120px]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-slate-700">
                                {formatResolutionTime(resolutionHours)}
                              </span>
                              <div className={`px-2 py-1 rounded-full text-xs font-bold ${performance.bgClass}`}>
                                {performance.level}
                              </div>
                            </div>
                            <Progress value={Math.min(100, performancePercentage)} className="h-2 w-24" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-green-600" />
                    Fastest Resolution Zones
                  </h4>
                  <div className="space-y-3">
                    {(dashboardData?.adminStats?.zoneWiseTickets || [])
                      .filter(zone => zone.servicePersonCount > 0)
                      .sort((a, b) => {
                        const aResolutionTime = getZoneResolutionTime(a);
                        const bResolutionTime = getZoneResolutionTime(b);
                        return aResolutionTime - bResolutionTime; // Sort by fastest (lowest) resolution time
                      })
                      .slice(0, 3)
                      .map((zone, i) => {
                        const resolutionHours = getZoneResolutionTime(zone);
                        return (
                          <div key={zone.id} className="flex items-center gap-3 p-3 bg-white/80 rounded-lg shadow-sm">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              i === 0 ? 'bg-yellow-100 text-yellow-800' :
                              i === 1 ? 'bg-gray-100 text-gray-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-800 text-sm">{zone.name}</p>
                              <p className="text-xs text-slate-600">
                                {formatResolutionTime(resolutionHours)} avg resolution
                              </p>
                            </div>
                            {i === 0 && <Star className="w-4 h-4 text-yellow-500" />}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
