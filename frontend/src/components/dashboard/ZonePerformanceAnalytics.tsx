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
  Award,
  Star,
  Clock,
  Timer,
  TrendingUp,
  BarChart3,
  Sparkles,
  Zap,
  Target,
  Server
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
  return zone.avgResolutionTimeHours || 0;
};

// Helper function to format resolution time
const formatResolutionTime = (hours: number) => {
  if (hours === 0) return '0h';
  
  const totalMinutes = Math.round(hours * 60);
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);
  const displayHours = Math.floor(remainingMinutes / 60);
  const displayMinutes = remainingMinutes % 60;
  
  if (days > 0) {
    if (displayHours > 0) return `${days}d ${displayHours}h`;
    return `${days}d`;
  }
  
  if (displayHours > 0) {
    if (displayMinutes > 0) return `${displayHours}h ${displayMinutes}m`;
    return `${displayHours}h`;
  }
  
  return `${displayMinutes}m`;
};

// Helper function to get resolution time performance level
const getResolutionTimePerformance = (hours: number) => {
  if (hours === 0) return { level: 'No Data', color: 'from-slate-400 to-gray-500', textClass: 'text-slate-600', bgClass: 'bg-slate-100', dotColor: 'bg-slate-400' };
  if (hours <= 24) return { level: 'Excellent', color: 'from-emerald-400 to-green-500', textClass: 'text-emerald-700', bgClass: 'bg-emerald-100', dotColor: 'bg-emerald-500' };
  if (hours <= 48) return { level: 'Good', color: 'from-amber-400 to-orange-500', textClass: 'text-amber-700', bgClass: 'bg-amber-100', dotColor: 'bg-amber-500' };
  return { level: 'Needs Work', color: 'from-rose-400 to-red-500', textClass: 'text-rose-700', bgClass: 'bg-rose-100', dotColor: 'bg-rose-500' };
};

// Zone card gradient colors
const zoneGradients = [
  'from-blue-500 via-indigo-500 to-purple-500',
  'from-emerald-500 via-teal-500 to-cyan-500',
  'from-orange-500 via-rose-500 to-pink-500',
  'from-violet-500 via-purple-500 to-fuchsia-500',
  'from-cyan-500 via-blue-500 to-indigo-500',
  'from-rose-500 via-pink-500 to-purple-500',
];

export default function ZonePerformanceAnalytics({ 
  dashboardData, 
  isRefreshing, 
  onRefresh 
}: ZonePerformanceAnalyticsProps) {

  if (!dashboardData?.adminStats?.zoneWiseTickets?.length) {
    return null;
  }

  const zones = dashboardData.adminStats.zoneWiseTickets;
  const totalZoneTickets = zones.reduce((sum, zone) => sum + zone.totalTickets, 0);
  const totalZoneStaff = zones.reduce((sum, zone) => sum + zone.servicePersonCount, 0);
  const avgTicketsPerZone = zones.length > 0 ? Math.round(totalZoneTickets / zones.length) : 0;
  const staffedZones = zones.filter(z => z.servicePersonCount > 0).length;

  // Sort zones by resolution time (fastest first)
  const sortedByResolution = [...zones]
    .filter(z => z.servicePersonCount > 0 && getZoneResolutionTime(z) > 0)
    .sort((a, b) => getZoneResolutionTime(a) - getZoneResolutionTime(b));

  return (
    <div className="relative">
      {/* Main Card with Gradient Border Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-2xl sm:rounded-3xl blur-sm opacity-20" />
      
      <Card className="relative overflow-hidden bg-white border-0 shadow-xl rounded-2xl sm:rounded-3xl">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 via-blue-400/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-indigo-400/20 via-purple-400/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-200/10 to-transparent rounded-full blur-3xl" />
        </div>
        
        <CardHeader className="relative z-10 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold">
                <div className="relative">
                  <div className="p-3 bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  {/* Pulse effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-2xl animate-ping opacity-20" />
                </div>
                <span className="bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                  Zone Analytics
                </span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base mt-2 text-slate-500 ml-[52px]">
                Geographic performance and service coverage insights
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 ml-[52px] sm:ml-0">
              <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 px-3 py-1.5 text-xs font-semibold shadow-lg shadow-cyan-500/25">
                <Globe className="w-3 h-3 mr-1.5" />
                {zones.length} Zones
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh} 
                disabled={isRefreshing}
                className="bg-white hover:bg-blue-50 border-blue-200 text-blue-700 hover:border-blue-300 shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="relative z-10 space-y-8">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Tickets in Zones */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 shadow-lg shadow-blue-500/20 group hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300">
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-white/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Ticket className="w-4 h-4 text-white/80" />
                  <span className="text-xs font-medium text-white/80">Zone Tickets</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{totalZoneTickets}</p>
                <p className="text-xs text-white/60 mt-1">across all zones</p>
              </div>
            </div>
            
            {/* Avg per Zone */}
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-4 shadow-lg shadow-violet-500/20 group hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300">
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-white/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-white/80" />
                  <span className="text-xs font-medium text-white/80">Avg/Zone</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{avgTicketsPerZone}</p>
                <p className="text-xs text-white/60 mt-1">tickets per zone</p>
              </div>
            </div>
            
            {/* Zone Staff */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 shadow-lg shadow-emerald-500/20 group hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300">
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-white/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-white/80" />
                  <span className="text-xs font-medium text-white/80">Zone Staff</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{totalZoneStaff}</p>
                <p className="text-xs text-white/60 mt-1">technicians</p>
              </div>
            </div>
            
            {/* Coverage */}
            <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-rose-600 rounded-2xl p-4 shadow-lg shadow-orange-500/20 group hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-300">
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-white/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-white/80" />
                  <span className="text-xs font-medium text-white/80">Coverage</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{staffedZones}/{zones.length}</p>
                <p className="text-xs text-white/60 mt-1">zones staffed</p>
              </div>
            </div>
          </div>

          {/* Zone Cards Grid */}
          <div>
            <h4 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              Zone Details
              <Badge className="bg-blue-100 text-blue-700 border-0 text-xs ml-2">
                {zones.length} zones
              </Badge>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {zones.map((zone, idx) => {
                const resolutionTime = getZoneResolutionTime(zone);
                const performance = getResolutionTimePerformance(resolutionTime);
                const gradientColor = zoneGradients[idx % zoneGradients.length];
                
                return (
                  <div 
                    key={zone.id} 
                    className="relative bg-white rounded-2xl border border-slate-200/60 overflow-hidden hover:shadow-xl hover:border-transparent transition-all duration-500 group"
                  >
                    {/* Gradient top border */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientColor}`} />
                    
                    {/* Hover gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradientColor} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                    
                    <div className="relative p-5">
                      {/* Zone Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 bg-gradient-to-br ${gradientColor} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{zone.name}</h5>
                            <p className="text-xs text-slate-400">Zone #{zone.id}</p>
                          </div>
                        </div>
                        <Badge className={`text-[10px] ${zone.totalTickets > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                          {zone.totalTickets > 0 ? (
                            <><Zap className="w-2.5 h-2.5 mr-1" />Active</>
                          ) : 'Idle'}
                        </Badge>
                      </div>
                      
                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-xl p-3 text-center border border-slate-100">
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <Ticket className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                          <p className="text-xl font-bold text-slate-800">{zone.totalTickets}</p>
                          <p className="text-[10px] font-medium text-slate-500">Tickets</p>
                        </div>
                        <div className="bg-gradient-to-br from-slate-50 to-emerald-50/50 rounded-xl p-3 text-center border border-slate-100">
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-500" />
                          </div>
                          <p className="text-xl font-bold text-slate-800">{formatResolutionTime(resolutionTime)}</p>
                          <p className="text-[10px] font-medium text-slate-500">Avg Resolve</p>
                        </div>
                      </div>
                      
                      {/* Details - Zone Manager, Zone Users, Service Persons */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between py-1.5 px-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-100/50">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-purple-500 rounded">
                              <Users className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-medium text-purple-700">Zone Manager</span>
                          </div>
                          <span className="text-sm font-bold text-purple-800">{zone.zoneManagerCount || 0}</span>
                        </div>
                        
                        <div className="flex items-center justify-between py-1.5 px-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100/50">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-blue-500 rounded">
                              <Users className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-medium text-blue-700">Zone Users</span>
                          </div>
                          <span className="text-sm font-bold text-blue-800">{zone.zoneUserCount || 0}</span>
                        </div>
                        
                        <div className="flex items-center justify-between py-1.5 px-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100/50">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-emerald-500 rounded">
                              <Users className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-medium text-emerald-700">Service Persons</span>
                          </div>
                          <span className="text-sm font-bold text-emerald-800">{zone.servicePersonCount || 0}</span>
                        </div>
                        
                        <div className="flex items-center justify-between py-1.5 px-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100/50">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-orange-500 rounded">
                              <Building2 className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-medium text-orange-700">Customers</span>
                          </div>
                          <span className="text-sm font-bold text-orange-800">{zone.customerCount || 0}</span>
                        </div>
                        
                        <div className="flex items-center justify-between py-1.5 px-3 bg-gradient-to-r from-cyan-50 to-sky-50 rounded-lg border border-cyan-100/50">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-cyan-500 rounded">
                              <Server className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-medium text-cyan-700">Assets</span>
                          </div>
                          <span className="text-sm font-bold text-cyan-800">{zone.assetCount || 0}</span>
                        </div>
                      </div>
                      
                      {/* Performance Bar */}
                      <div className="pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-500">Resolution Speed</span>
                          <Badge className={`text-[10px] font-semibold ${performance.bgClass} ${performance.textClass} border-0 px-2`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${performance.dotColor} mr-1.5`} />
                            {performance.level}
                          </Badge>
                        </div>
                        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${performance.color} rounded-full transition-all duration-500`}
                            style={{ width: `${resolutionTime === 0 ? 0 : Math.max(15, 100 - Math.min(85, (resolutionTime / 72) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Performers Section */}
          {zones.length > 1 && sortedByResolution.length > 0 && (
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl p-6 shadow-xl shadow-emerald-500/20">
              {/* Background decorations */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
              
              <div className="relative">
                <h4 className="font-bold text-lg text-white mb-5 flex items-center gap-3">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  Fastest Resolution Zones
                  <Badge className="bg-white/20 text-white border-0 text-xs backdrop-blur-sm">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Top Performers
                  </Badge>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {sortedByResolution.slice(0, 3).map((zone, i) => {
                    const resolutionHours = getZoneResolutionTime(zone);
                    const medals = ['🥇', '🥈', '🥉'];
                    const bgStyles = [
                      'bg-gradient-to-br from-yellow-400/30 to-amber-400/20 border-yellow-300/50',
                      'bg-gradient-to-br from-slate-300/30 to-gray-300/20 border-slate-300/50',
                      'bg-gradient-to-br from-orange-400/30 to-amber-400/20 border-orange-300/50'
                    ];
                    
                    return (
                      <div 
                        key={zone.id} 
                        className={`${bgStyles[i]} border backdrop-blur-sm rounded-xl p-4 flex items-center gap-4 hover:scale-105 transition-transform duration-300`}
                      >
                        <div className="text-3xl drop-shadow-lg">{medals[i]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">{zone.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Timer className="w-3.5 h-3.5 text-white/70" />
                            <span className="text-sm font-semibold text-white/90">
                              {formatResolutionTime(resolutionHours)}
                            </span>
                          </div>
                        </div>
                        {i === 0 && <Star className="w-5 h-5 text-yellow-300 animate-pulse" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Live Indicator */}
          <div className="flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-200">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-slate-500">Live Data</span>
              <Activity className="w-3 h-3 text-slate-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
