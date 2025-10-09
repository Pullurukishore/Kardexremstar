"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, PieChart, TrendingUp, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { getStatusColor } from "./utils";
import type { DashboardData, StatusDistribution, TrendsData } from "./types";

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
  return (
    <div className="mb-8">
      <Card className="bg-gradient-to-br from-white to-slate-50 border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
                  <PieChart className="w-5 h-5 text-white" />
                </div>
                Advanced Analytics Dashboard
              </CardTitle>
              <CardDescription className="text-base mt-2">Comprehensive ticket analytics, trends, and performance insights</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-100 text-purple-800 px-3 py-1">
                <TrendingUp className="w-4 h-4 mr-1" />
                Analytics
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status">Status Distribution</TabsTrigger>
              <TabsTrigger value="trends">Weekly Trends</TabsTrigger>
              <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="status" className="mt-6">
              <div className="space-y-4">
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>
                ) : statusDistribution?.distribution?.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {statusDistribution.distribution.map((item, i) => {
                      const total = statusDistribution.distribution.reduce((sum, d) => sum + d.count, 0);
                      const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                      return (
                        <div key={i} className="p-4 bg-gradient-to-r from-white to-slate-50 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full ${getStatusColor(item.status).replace('text-', 'bg-').replace('100', '500')}`}></div>
                              <span className="font-semibold capitalize text-slate-800">{item.status.replace('_', ' ')}</span>
                            </div>
                            <Badge className={getStatusColor(item.status)}>{percentage}%</Badge>
                          </div>
                          <div className="flex items-end justify-between">
                            <span className="text-3xl font-bold text-slate-900">{item.count}</span>
                            <span className="text-sm text-slate-500">tickets</span>
                          </div>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${getStatusColor(item.status).replace('text-', 'bg-').replace('100', '500')}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">No status distribution data available</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="trends" className="mt-6">
              <div className="space-y-6">
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>
                ) : ticketTrends?.trends?.length ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold">7-Day Ticket Trends</h4>
                      <div className="flex items-center gap-4">
                        <Badge className="bg-blue-100 text-blue-800">
                          {ticketTrends.trends.slice(-7).reduce((sum, t) => sum + t.count, 0)} Total Tickets
                        </Badge>
                        <Badge className="bg-green-100 text-green-800">
                          Avg: {Math.round(ticketTrends.trends.slice(-7).reduce((sum, t) => sum + t.count, 0) / 7)} per day
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
                      {ticketTrends.trends.slice(-7).map((trend, i) => {
                        const maxCount = Math.max(...ticketTrends.trends.slice(-7).map(t => t.count));
                        const percentage = maxCount > 0 ? (trend.count / maxCount) * 100 : 0;
                        const isHighest = trend.count === maxCount;
                        return (
                          <div key={i} className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${isHighest ? 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-300' : 'bg-white'}`}>
                            <div className="text-center mb-3">
                              <p className="text-xs font-medium text-slate-600 mb-1">
                                {new Date(trend.date).toLocaleDateString('en-US', { weekday: 'short' })}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                            <div className="text-center mb-3">
                              <span className={`text-2xl font-bold ${isHighest ? 'text-blue-900' : 'text-slate-900'}`}>
                                {trend.count}
                              </span>
                              {isHighest && <p className="text-xs text-blue-600 font-medium">Peak</p>}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-500 ${isHighest ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-slate-400 to-slate-500'}`}
                                style={{ width: `${Math.max(10, percentage)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">No trends data available</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="performance" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border border-green-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-semibold text-green-800">SLA Compliance</span>
                    </div>
                    <Badge className={`${(dashboardData?.stats?.kpis?.slaCompliance?.value || 0) >= 95 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                      {(dashboardData?.stats?.kpis?.slaCompliance?.value || 0) >= 95 ? 'Excellent' : 'Needs Improvement'}
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-green-900 mb-2">{dashboardData?.stats?.kpis?.slaCompliance?.value || 0}%</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">Target: 95%</span>
                    <span className={`font-medium ${(dashboardData?.stats?.kpis?.slaCompliance?.value || 0) >= 95 ? 'text-green-600' : 'text-orange-600'}`}>
                      {(dashboardData?.stats?.kpis?.slaCompliance?.value || 0) >= 95 ? '✓ On Track' : '⚠ Below Target'}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 bg-gradient-to-br from-blue-50 to-sky-100 rounded-xl border border-blue-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-semibold text-blue-800">Response Time</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">Average</Badge>
                  </div>
                  <p className="text-3xl font-bold text-blue-900 mb-2">{dashboardData?.stats?.kpis?.avgResponseTime?.value || 'N/A'}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600">Target: 2 hours</span>
                    <span className="text-blue-600 font-medium">Current Period</span>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl border border-orange-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-semibold text-orange-800">Unassigned</span>
                    </div>
                    <Badge className={`${(dashboardData?.stats?.kpis?.unassignedTickets?.value || 0) > 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {(dashboardData?.stats?.kpis?.unassignedTickets?.value || 0) > 5 ? 'High Priority' : 'Normal'}
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-orange-900 mb-2">{dashboardData?.stats?.kpis?.unassignedTickets?.value || 0}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-orange-600">Pending Assignment</span>
                    <span className={`font-medium ${(dashboardData?.stats?.kpis?.unassignedTickets?.value || 0) > 5 ? 'text-red-600' : 'text-green-600'}`}>
                      {(dashboardData?.stats?.kpis?.unassignedTickets?.value || 0) > 5 ? '⚠ Action Needed' : '✓ Under Control'}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
