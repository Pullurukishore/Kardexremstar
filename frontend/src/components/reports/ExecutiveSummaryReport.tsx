// Server-side component - charts replaced with static summaries

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Star, Clock, Settings, TrendingUp, Target, Award } from 'lucide-react';
import { ReportData } from './types';

interface ExecutiveSummaryReportProps {
  reportData: ReportData;
}

export function ExecutiveSummaryReport({ reportData }: ExecutiveSummaryReportProps) {
  if (!reportData) return null;
  
  return (
    <div className="space-y-8">
      {/* Executive KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Tickets</p>
                <p className="text-3xl font-bold text-blue-900">{reportData.summary?.totalTickets || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-4">
              <Progress value={(reportData.summary?.resolutionRate || 0)} className="h-2" />
              <p className="text-xs text-blue-600 mt-1">{(reportData.summary?.resolutionRate || 0).toFixed(1)}% Resolution Rate</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Customer Satisfaction</p>
                <p className="text-3xl font-bold text-green-900">{reportData.summary?.customerSatisfaction || 0}/5</p>
              </div>
              <Star className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-4 flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(reportData.summary?.customerSatisfaction || 0)
                      ? 'fill-green-400 text-green-400'
                      : 'text-green-300'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Avg Resolution Time</p>
                <p className="text-3xl font-bold text-purple-900">{reportData.summary?.avgResolutionTimeHours || 0}h</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
            <div className="mt-4">
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                Target: 4h
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-600 text-sm font-medium">Active Assets</p>
                <p className="text-3xl font-bold text-amber-900">{reportData.summary?.activeAssets || 0}</p>
              </div>
              <Settings className="h-8 w-8 text-amber-500" />
            </div>
            <div className="mt-4">
              <p className="text-xs text-amber-600">Across {reportData.summary?.totalCustomers || 0} customers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      {reportData?.trends && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Trends (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.trends && reportData.trends.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {reportData.trends.slice(-7).map((trend: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="text-sm font-medium text-muted-foreground">{trend.date}</div>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Created:</span>
                          <span className="font-semibold text-blue-600">{trend.ticketsCreated}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Resolved:</span>
                          <span className="font-semibold text-green-600">{trend.ticketsResolved}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Avg Rating:</span>
                          <span className="font-semibold text-amber-600">{trend.avgRating?.toFixed(1) || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No trend data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zone Performance Overview */}
      {reportData?.zonePerformance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Zone Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.zonePerformance.slice(0, 6).map((zone: any, index: number) => (
                <Card key={zone.name} className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-slate-900">{zone.name}</h4>
                      <Badge 
                        variant={zone.efficiency > 80 ? "default" : zone.efficiency > 60 ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {zone.efficiency.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Tickets:</span>
                        <span className="font-medium">{zone.ticketCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Customers:</span>
                        <span className="font-medium">{zone.customerCount}</span>
                      </div>
                      <Progress value={zone.efficiency} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Performance Indicators */}
      {reportData?.kpis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Key Performance Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - (reportData.kpis.firstCallResolution || 0) / 100)}`}
                      className="text-blue-500"
                    />
                  </svg>
                  <span className="absolute text-lg font-bold text-blue-600">
                    {reportData.kpis.firstCallResolution}%
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700">First Call Resolution</p>
              </div>

              <div className="text-center">
                <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - (reportData.kpis.slaCompliance || 0) / 100)}`}
                      className="text-green-500"
                    />
                  </svg>
                  <span className="absolute text-lg font-bold text-green-600">
                    {reportData.kpis.slaCompliance}%
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700">SLA Compliance</p>
              </div>

              <div className="text-center">
                <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - (reportData.kpis.customerRetention || 0) / 100)}`}
                      className="text-purple-500"
                    />
                  </svg>
                  <span className="absolute text-lg font-bold text-purple-600">
                    {reportData.kpis.customerRetention}%
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700">Customer Retention</p>
              </div>

              <div className="text-center">
                <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - (reportData.kpis.operationalEfficiency || 0) / 100)}`}
                      className="text-amber-500"
                    />
                  </svg>
                  <span className="absolute text-lg font-bold text-amber-600">
                    {reportData.kpis.operationalEfficiency}%
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700">Operational Efficiency</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
