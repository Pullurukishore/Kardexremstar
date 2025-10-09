'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  UserCheck,
  UserX,
  Zap,
  Clock3,
  Info,
  TrendingUp,
  BarChart3,
  Users,
  FileText,
  Ticket,
  Target,
  Award,
  Clock4,
  MapPin as TravelIcon,
  Wrench
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { ReportData, ServicePersonReport } from './types';

interface ServicePersonPerformanceReportProps {
  reportData: ReportData;
}

const FLAG_CONFIG = {
  LATE: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle, severity: 'warning' },
  EARLY_CHECKOUT: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock3, severity: 'warning' },
  LONG_DAY: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Timer, severity: 'warning' },
  AUTO_CHECKOUT: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Zap, severity: 'info' },
  NO_ACTIVITY: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, severity: 'error' },
  MISSING_CHECKOUT: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle, severity: 'error' },
  MULTIPLE_SESSIONS: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Info, severity: 'info' },
  ABSENT: { color: 'bg-red-100 text-red-800 border-red-200', icon: UserX, severity: 'error' },
};

export function ServicePersonPerformanceReport({ reportData }: ServicePersonPerformanceReportProps) {
  const reports = Array.isArray(reportData.reports) ? reportData.reports : [];
  
  // Create safe summary object with proper type conversion
  const safeSummary = {
    totalServicePersons: Number(reportData.summary?.totalServicePersons || 0),
    totalCheckIns: Number(reportData.summary?.totalCheckIns || 0),
    averageHoursPerDay: Number(reportData.summary?.averageHoursPerDay || 0),
    totalAbsentees: Number(reportData.summary?.totalAbsentees || 0),
    totalActivitiesLogged: Number(reportData.summary?.totalActivitiesLogged || 0),
    mostActiveUser: reportData.summary?.mostActiveUser && typeof reportData.summary.mostActiveUser === 'object' ? {
      name: String(reportData.summary.mostActiveUser.name || ''),
      email: String(reportData.summary.mostActiveUser.email || ''),
      activityCount: Number(reportData.summary.mostActiveUser.activityCount || 0)
    } : null
  };
  
  const summary = safeSummary;
  const dateRange = reportData.dateRange || { from: '', to: '', totalDays: 0 };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Business Hours Notice */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 text-blue-800">
          <Info className="h-4 w-4" />
          <span className="text-sm font-medium">
            Time calculations are based on business hours only (9 AM - 5 PM, Monday to Saturday). Travel times show actual elapsed time.
          </span>
        </div>
      </div>

      {/* Summary Statistics - Attendance Metrics */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-blue-600" />
          Attendance Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Service Persons</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalServicePersons || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active personnel
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.totalCheckIns || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dateRange.totalDays || 0} days period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Hours/Day</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(summary.averageHoursPerDay || 0).toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">Per person</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Absentees</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.totalAbsentees || 0}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          Performance Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reports.reduce((sum, person) => sum + (person.summary.totalTickets || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all service persons
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {reports.reduce((sum, person) => sum + (person.summary.ticketsResolved || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
              <Clock4 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {(() => {
                  const totalHours = reports.reduce((sum, person) => {
                    const hours = person.summary.averageResolutionTimeHours || 0;
                    return sum + (hours > 0 ? hours : 0);
                  }, 0);
                  const validReports = reports.filter(p => (p.summary.averageResolutionTimeHours || 0) > 0).length;
                  const avgHours = validReports > 0 ? (totalHours / validReports) : 0;
                  return avgHours > 0 ? `${avgHours.toFixed(1)}h` : '0h';
                })()} 
              </div>
              <p className="text-xs text-muted-foreground">
                Per ticket average (business hours)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Travel Time</CardTitle>
              <TravelIcon className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {(() => {
                  const totalHours = reports.reduce((sum, person) => {
                    const hours = person.summary.averageTravelTimeHours || 0;
                    return sum + (hours > 0 ? hours : 0);
                  }, 0);
                  const validReports = reports.filter(p => (p.summary.averageTravelTimeHours || 0) > 0).length;
                  const avgHours = validReports > 0 ? (totalHours / validReports) : 0;
                  return avgHours > 0 ? `${avgHours.toFixed(1)}h` : '0h';
                })()} 
              </div>
              <p className="text-xs text-muted-foreground">
                Per ticket travel (real-time)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Onsite Time</CardTitle>
              <Wrench className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {(() => {
                  const totalHours = reports.reduce((sum, person) => {
                    const hours = person.summary.averageOnsiteTimeHours || 0;
                    return sum + (hours > 0 ? hours : 0);
                  }, 0);
                  const validReports = reports.filter(p => (p.summary.averageOnsiteTimeHours || 0) > 0).length;
                  const avgHours = validReports > 0 ? (totalHours / validReports) : 0;
                  return avgHours > 0 ? `${avgHours.toFixed(1)}h` : '0h';
                })()} 
              </div>
              <p className="text-xs text-muted-foreground">
                Per ticket onsite work (business hours)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Most Active User Card */}
      {summary.mostActiveUser && summary.mostActiveUser.name && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Most Active Service Person
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-lg">{summary.mostActiveUser.name}</div>
                <div className="text-sm text-gray-600">{summary.mostActiveUser.email}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{summary.mostActiveUser.activityCount}</div>
                <div className="text-sm text-gray-600">Activities logged</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Person Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Service Person Performance Report
              </CardTitle>
              <CardDescription>
                Performance metrics for {dateRange.from && dateRange.to 
                  ? `${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}`
                  : 'selected period'
                }
              </CardDescription>
            </div>
            <Badge variant="outline">
              {reports.length} persons
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Reports Found</h3>
              <p className="text-gray-500">No service person reports available for the selected period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium text-gray-900">Service Person</th>
                    <th className="text-left p-3 font-medium text-gray-900">Working Days</th>
                    <th className="text-left p-3 font-medium text-gray-900">Total Hours</th>
                    <th className="text-left p-3 font-medium text-gray-900">Tickets</th>
                    <th className="text-left p-3 font-medium text-gray-900">Resolution Rate</th>
                    <th className="text-left p-3 font-medium text-gray-900">Avg Resolution</th>
                    <th className="text-left p-3 font-medium text-gray-900">Avg Travel</th>
                    <th className="text-left p-3 font-medium text-gray-900">Avg Onsite</th>
                    <th className="text-left p-3 font-medium text-gray-900">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((person) => (
                    <tr key={person.id} className="border-b hover:bg-gray-50 transition-colors">
                      {/* Service Person */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium text-gray-900">{person.name}</div>
                            <div className="text-sm text-gray-600">{person.email}</div>
                            {person.zones.length > 0 && (
                              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1">
                                {person.zones.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Working Days */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Calendar className="h-3 w-3 text-green-600" />
                          {person.summary.presentDays || person.summary.totalWorkingDays || 0}
                        </div>
                      </td>

                      {/* Total Hours */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Clock className="h-3 w-3 text-blue-600" />
                          {Number(person.summary.totalHours).toFixed(1)}h
                        </div>
                      </td>

                      {/* Tickets */}
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Ticket className="h-3 w-3 text-blue-600" />
                            {person.summary.totalTickets || 0}
                          </div>
                          <div className="text-xs text-gray-500">
                            {person.summary.ticketsResolved || 0} resolved
                          </div>
                        </div>
                      </td>

                      {/* Resolution Rate */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          {(() => {
                            const total = person.summary.totalTickets || 0;
                            const resolved = person.summary.ticketsResolved || 0;
                            const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
                            const color = rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-yellow-600' : 'text-red-600';
                            return (
                              <>
                                <Target className={`h-3 w-3 ${color}`} />
                                <span className={color}>{rate}%</span>
                              </>
                            );
                          })()} 
                        </div>
                      </td>

                      {/* Average Resolution Time */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Clock4 className="h-3 w-3 text-blue-600" />
                          {(() => {
                            const hours = person.summary.averageResolutionTimeHours || 0;
                            return hours > 0 ? `${hours.toFixed(1)}h` : 'N/A';
                          })()} 
                        </div>
                      </td>

                      {/* Average Travel Time */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <TravelIcon className="h-3 w-3 text-orange-600" />
                          {(() => {
                            const hours = person.summary.averageTravelTimeHours || 0;
                            return hours > 0 ? `${hours.toFixed(1)}h` : 'N/A';
                          })()} 
                        </div>
                      </td>

                      {/* Average Onsite Time */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Wrench className="h-3 w-3 text-purple-600" />
                          {(() => {
                            const hours = person.summary.averageOnsiteTimeHours || 0;
                            return hours > 0 ? `${hours.toFixed(1)}h` : 'N/A';
                          })()} 
                        </div>
                      </td>

                      {/* Performance Score */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const score = person.summary.performanceScore || 0;
                            let color = 'bg-gray-100 text-gray-800';
                            
                            if (score >= 80) {
                              color = 'bg-green-100 text-green-800 border-green-200';
                            } else if (score >= 60) {
                              color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
                            } else if (score > 0) {
                              color = 'bg-red-100 text-red-800 border-red-200';
                            }
                            
                            return (
                              <Badge variant="outline" className={`${color} border font-medium`}>
                                <Award className="h-3 w-3 mr-1" />
                                {score}%
                              </Badge>
                            );
                          })()} 
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
