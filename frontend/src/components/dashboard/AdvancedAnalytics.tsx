"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { 
  RefreshCw, 
  PieChart, 
  TrendingUp, 
  CheckCircle, 
  BarChart3, 
  Filter,
  Calendar,
  Sparkles
} from "lucide-react";
import type { DashboardData, StatusDistribution, TrendsData } from "./types";
import StatusPieChart from "./charts/StatusPieChart";
import TrendLineChart from "./charts/TrendLineChart";
import DrillDownModal from "./DrillDownModal";

interface AdvancedAnalyticsProps {
  dashboardData: Partial<DashboardData>;
  statusDistribution: StatusDistribution;
  ticketTrends: TrendsData;
  loading: boolean;
}

export default function AdvancedAnalytics({ 
  dashboardData, 
  statusDistribution, 
  ticketTrends, 
  loading 
}: AdvancedAnalyticsProps) {
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showClosedTickets, setShowClosedTickets] = useState(false);

  // Status color mapping
  const colorMap: { [key: string]: string } = {
    'open': '#0ea5e9',
    'reopened': '#3b82f6',
    'assigned': '#8b5cf6',
    'in_progress': '#f59e0b',
    'in_process': '#f59e0b',
    'onsite_visit': '#f97316',
    'onsite_visit_planned': '#fb923c',
    'onsite_visit_started': '#ea580c',
    'onsite_visit_reached': '#c2410c',
    'onsite_visit_in_progress': '#f97316',
    'onsite_visit_resolved': '#16a34a',
    'onsite_visit_pending': '#fdba74',
    'onsite_visit_completed': '#15803d',
    'spare_parts_needed': '#0891b2',
    'spare_parts_booked': '#06b6d4',
    'spare_parts_delivered': '#14b8a6',
    'po_needed': '#0284c7',
    'po_received': '#0369a1',
    'po_reached': '#075985',
    'waiting_customer': '#ec4899',
    'pending': '#d946ef',
    'on_hold': '#db2777',
    'escalated': '#dc2626',
    'resolved': '#10b981',
    'closed_pending': '#059669',
    'closed': '#6366f1',
    'cancelled': '#ef4444',
  };

  // Transform status distribution data for pie chart
  const statusChartData = useMemo(() => {
    if (!statusDistribution?.distribution?.length) return [];
    
    const isCompletedStatus = (status: string) => {
      const statusLower = status.toLowerCase();
      return statusLower === 'closed' || statusLower === 'cancelled';
    };
    
    const filteredDistribution = showClosedTickets 
      ? statusDistribution.distribution
      : statusDistribution.distribution.filter(item => !isCompletedStatus(item.status));

    return filteredDistribution.map(item => ({
      status: item.status.replace('_', ' '),
      count: item.count,
      color: colorMap[item.status.toLowerCase()] || '#6b7280'
    }));
  }, [statusDistribution, showClosedTickets]);

  // Transform trends data for line chart
  const trendsChartData = useMemo(() => {
    if (!ticketTrends?.trends?.length) return [];
    return ticketTrends.trends.slice(-14).map(trend => ({
      date: trend.date,
      count: trend.count
    }));
  }, [ticketTrends]);

  const handleStatusClick = (status: string) => {
    setSelectedStatus(status);
    setDrillDownOpen(true);
  };

  // Mock ticket data for drill-down
  const mockTickets = dashboardData?.recentTickets?.slice(0, 10).map(ticket => ({
    id: String(ticket.id),
    ticketNumber: `TKT-${ticket.id}`,
    title: ticket.title || 'Untitled',
    status: ticket.status || 'open',
    priority: ticket.priority || 'medium',
    customerName: ticket.customer?.companyName,
    assignedTo: (ticket as any).assignedTo || undefined,
    location: (ticket as any).location || ticket.customer?.companyName,
    createdAt: ticket.createdAt || new Date().toISOString(),
    updatedAt: (ticket as any).updatedAt,
    responseTime: (ticket as any).responseTime,
    resolutionTime: (ticket as any).resolutionTime,
  })) || [];

  return (
    <div className="mb-8">
      <Card className="relative overflow-hidden bg-white/90 backdrop-blur-xl border-0 shadow-xl rounded-2xl sm:rounded-3xl">
        {/* Background decorations */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-purple-200/40 to-pink-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-blue-200/30 to-cyan-200/20 rounded-full blur-3xl" />
        
        <CardHeader className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold">
                <div className="relative">
                  <div className="p-2.5 sm:p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-xl sm:rounded-2xl shadow-lg shadow-purple-500/25">
                    <PieChart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <span className="text-slate-800">Analytics Dashboard</span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base mt-2 text-slate-500 ml-14 sm:ml-16">
                Ticket distribution patterns and volume trends
              </CardDescription>
            </div>
            <Badge className="bg-purple-100 text-purple-700 border border-purple-200/50 px-3 py-1.5 text-xs font-semibold ml-14 sm:ml-0">
              <Sparkles className="w-3 h-3 mr-1.5" />
              Visual Insights
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="relative z-10">
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100/80 p-1 rounded-xl">
              <TabsTrigger value="status" className="rounded-lg text-xs sm:text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <PieChart className="w-4 h-4 mr-1.5" />
                Status Distribution
              </TabsTrigger>
              <TabsTrigger value="trends" className="rounded-lg text-xs sm:text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <TrendingUp className="w-4 h-4 mr-1.5" />
                Volume Trends
              </TabsTrigger>
            </TabsList>
            
            {/* STATUS DISTRIBUTION TAB */}
            <TabsContent value="status" className="mt-6">
              <div className="space-y-5">
                {/* Filter Toggle */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-purple-50/50 rounded-xl border border-slate-200/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Filter className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Show Archived</p>
                      <p className="text-xs text-slate-500">
                        {showClosedTickets ? 'All statuses visible' : 'Hiding closed & cancelled'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={showClosedTickets ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}>
                      {showClosedTickets ? 'All' : 'Active'}
                    </Badge>
                    <Switch 
                      checked={showClosedTickets}
                      onCheckedChange={setShowClosedTickets}
                      className="data-[state=checked]:bg-purple-600"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="h-[350px] flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <RefreshCw className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
                      <p className="text-sm text-slate-500">Loading analytics...</p>
                    </div>
                  </div>
                ) : statusChartData.length === 0 && !showClosedTickets ? (
                  <div className="h-[350px] flex flex-col items-center justify-center gap-4">
                    <div className="p-4 bg-emerald-100 rounded-2xl">
                      <CheckCircle className="w-12 h-12 text-emerald-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-slate-900">All Clear! 🎉</p>
                      <p className="text-sm text-slate-500 mt-1">No active tickets in queue</p>
                      <button
                        onClick={() => setShowClosedTickets(true)}
                        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        View Archived
                      </button>
                    </div>
                  </div>
                ) : statusDistribution?.distribution?.length ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm">
                      <StatusPieChart 
                        data={statusChartData}
                        title="Status Distribution"
                        onSegmentClick={handleStatusClick}
                      />
                    </div>
                    
                    {/* Status Breakdown List */}
                    <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm">
                      <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                        Status Breakdown
                      </h4>
                      <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-2">
                        {statusChartData.map((chartItem, i) => {
                          const item = statusDistribution.distribution.find(
                            d => d.status.toLowerCase() === chartItem.status.toLowerCase().replace(' ', '_')
                          );
                          if (!item) return null;
                          const total = statusDistribution.distribution.reduce((sum, d) => sum + d.count, 0);
                          const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                          const statusColor = statusChartData[i]?.color || '#6b7280';
                          
                          return (
                            <div 
                              key={i} 
                              className="p-3 bg-white rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
                              style={{ borderLeftColor: statusColor }}
                              onClick={() => handleStatusClick(item.status)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: statusColor }}
                                  />
                                  <span className="font-medium text-sm text-slate-700 capitalize">
                                    {item.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold" style={{ color: statusColor }}>
                                    {item.count}
                                  </span>
                                  <Badge 
                                    className="text-[10px] px-1.5 py-0.5"
                                    style={{ 
                                      backgroundColor: `${statusColor}15`,
                                      color: statusColor,
                                    }}
                                  >
                                    {percentage}%
                                  </Badge>
                                </div>
                              </div>
                              <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                                  style={{ 
                                    width: `${percentage}%`,
                                    backgroundColor: statusColor,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[350px] flex items-center justify-center">
                    <p className="text-slate-500">No status data available</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* TRENDS TAB */}
            <TabsContent value="trends" className="mt-6">
              <div className="space-y-6">
                {loading ? (
                  <div className="h-[350px] flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                      <p className="text-sm text-slate-500">Loading trends...</p>
                    </div>
                  </div>
                ) : ticketTrends?.trends?.length ? (
                  <>
                    {/* Trend Chart */}
                    <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-5 border border-slate-100 shadow-sm">
                      <TrendLineChart 
                        data={trendsChartData}
                        title="14-Day Ticket Volume"
                        description="Daily ticket creation patterns"
                        dataKey="count"
                        color="#3b82f6"
                        showArea={true}
                        showComparison={true}
                      />
                    </div>
                    
                    {/* Weekly Summary Cards */}
                    <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          Last 7 Days
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-700 border-0">
                            {ticketTrends.trends.slice(-7).reduce((sum, t) => sum + t.count, 0)} Total
                          </Badge>
                          <Badge className="bg-emerald-100 text-emerald-700 border-0">
                            ~{Math.round(ticketTrends.trends.slice(-7).reduce((sum, t) => sum + t.count, 0) / 7)}/day
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-2">
                        {ticketTrends.trends.slice(-7).map((trend, i) => {
                          const maxCount = Math.max(...ticketTrends.trends.slice(-7).map(t => t.count));
                          const percentage = maxCount > 0 ? (trend.count / maxCount) * 100 : 0;
                          const isHighest = trend.count === maxCount && maxCount > 0;
                          
                          return (
                            <div 
                              key={i} 
                              className={`p-3 rounded-xl text-center transition-all duration-300 hover:shadow-md ${
                                isHighest 
                                  ? 'bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200' 
                                  : 'bg-white border border-slate-100'
                              }`}
                            >
                              <p className="text-[10px] font-medium text-slate-500 mb-1">
                                {new Date(trend.date).toLocaleDateString('en-US', { weekday: 'short' })}
                              </p>
                              <p className={`text-xl font-bold ${isHighest ? 'text-blue-700' : 'text-slate-800'}`}>
                                {trend.count}
                              </p>
                              {isHighest && (
                                <p className="text-[10px] text-blue-600 font-medium mt-0.5">Peak</p>
                              )}
                              <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${isHighest ? 'bg-blue-500' : 'bg-slate-300'}`}
                                  style={{ width: `${Math.max(10, percentage)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-[350px] flex items-center justify-center">
                    <p className="text-slate-500">No trends data available</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Drill-Down Modal */}
      <DrillDownModal 
        isOpen={drillDownOpen}
        onClose={() => setDrillDownOpen(false)}
        title={selectedStatus ? `${selectedStatus.replace('_', ' ')} Tickets` : 'Ticket Details'}
        description={`Detailed view of all ${selectedStatus ? selectedStatus.replace('_', ' ').toLowerCase() : ''} tickets`}
        tickets={mockTickets}
        statusFilter={selectedStatus || undefined}
      />
    </div>
  );
}
