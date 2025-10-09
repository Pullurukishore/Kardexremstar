import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MobileModal } from '@/components/ui/mobile-responsive';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clock,
  MapPin,
  User,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  ExternalLink,
  UserCheck,
  UserX,
  Zap,
  Clock3,
  Info,
  Eye,
  TrendingUp,
  BarChart3,
  Users,
  FileText,
  Target
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { ReportData, ServicePersonReport } from './types';

interface ServicePersonAttendanceReportProps {
  reportData: ReportData;
}

const STATUS_CONFIG = {
  CHECKED_IN: { label: 'Checked In', color: 'bg-green-100 text-green-800 border-green-200', icon: UserCheck },
  CHECKED_OUT: { label: 'Checked Out', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: UserX },
  AUTO_CHECKED_OUT: { label: 'Auto Checkout', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Zap },
  ABSENT: { label: 'Absent', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  LATE: { label: 'Late', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
  EARLY_CHECKOUT: { label: 'Early Checkout', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock3 },
};

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

export function ServicePersonAttendanceReport({ reportData }: ServicePersonAttendanceReportProps) {
  const [selectedPerson, setSelectedPerson] = useState<ServicePersonReport | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

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

  // Note: Only display backend-provided data. No demo/fallback data.

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'N/A';
    try {
      return format(parseISO(timeString), 'HH:mm');
    } catch {
      return 'N/A';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const openPersonDetails = (person: ServicePersonReport) => {
    setSelectedPerson(person);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
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

      {/* Service Person Reports Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Service Person Attendance Reports
              </CardTitle>
              <CardDescription>
                Detailed attendance breakdown for {dateRange.from && dateRange.to 
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
                    <th className="text-left p-3 font-medium text-gray-900">Present Days</th>
                    <th className="text-left p-3 font-medium text-gray-900">Absent Days</th>
                    <th className="text-left p-3 font-medium text-gray-900">Total Hours</th>
                    <th className="text-left p-3 font-medium text-gray-900">Avg Hours/Day</th>
                    <th className="text-left p-3 font-medium text-gray-900">Activities</th>
                    <th className="text-left p-3 font-medium text-gray-900">Auto Checkouts</th>
                    <th className="text-left p-3 font-medium text-gray-900">Actions</th>
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

                      {/* Present Days */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span className="text-green-600">{person.summary.presentDays || person.summary.totalWorkingDays || 0}</span>
                        </div>
                      </td>

                      {/* Absent Days */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <XCircle className={`h-3 w-3 ${
                            person.summary.absentDays > 0 ? 'text-red-600' : 'text-gray-400'
                          }`} />
                          <span className={person.summary.absentDays > 0 ? 'text-red-600' : 'text-gray-900'}>
                            {person.summary.absentDays || 0}
                          </span>
                        </div>
                      </td>

                      {/* Total Hours */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Clock className="h-3 w-3 text-blue-600" />
                          {Number(person.summary.totalHours).toFixed(1)}h
                        </div>
                      </td>

                      {/* Average Hours/Day */}
                      <td className="p-3">
                        <div className={`flex items-center gap-1 text-sm font-medium ${
                          person.summary.averageHoursPerDay > 8 ? 'text-green-600' : 
                          person.summary.averageHoursPerDay < 6 ? 'text-orange-600' : 'text-gray-900'
                        }`}>
                          <Timer className="h-3 w-3" />
                          {Number(person.summary.averageHoursPerDay).toFixed(1)}h
                        </div>
                      </td>

                      {/* Activities */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Activity className="h-3 w-3 text-purple-600" />
                          {person.summary.totalActivities || person.summary.activitiesLogged || 0}
                        </div>
                      </td>

                      {/* Auto Checkouts */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Zap className={`h-3 w-3 ${
                            person.summary.autoCheckouts > 0 ? 'text-orange-600' : 'text-gray-400'
                          }`} />
                          <span className={person.summary.autoCheckouts > 0 ? 'text-orange-600' : 'text-gray-900'}>
                            {person.summary.autoCheckouts || 0}
                          </span>
                        </div>
                      </td>


                      {/* Actions */}
                      <td className="p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPersonDetails(person)}
                          className="h-8 px-3"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Person Details Modal - Desktop */}
      <div className="hidden md:block">
        {detailModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setDetailModalOpen(false)}
            />
            
            {/* Modal positioned to avoid sidebar */}
            <div className="fixed top-4 bottom-4 left-[280px] right-4 flex items-center justify-center">
              <div className="relative w-full max-w-5xl max-h-full bg-white rounded-lg shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {selectedPerson?.name} - Attendance Details
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Comprehensive attendance breakdown for {dateRange.from && dateRange.to 
                        ? `${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}`
                        : 'selected period'
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => setDetailModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
            
            {selectedPerson && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Performance Overview</TabsTrigger>
                  <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
                  <TabsTrigger value="activities">Activities</TabsTrigger>
                  <TabsTrigger value="flags">Issues & Flags</TabsTrigger>
                </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                {/* Attendance Metrics */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                    Attendance Metrics
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Working Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {selectedPerson.summary.presentDays || selectedPerson.summary.totalWorkingDays || 0}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Total Hours</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-blue-600">
                            {Number(selectedPerson.summary.totalHours).toFixed(1)}h
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Absent Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-600">
                            {selectedPerson.summary.absentDays}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Activities</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-purple-600">
                            {selectedPerson.summary.totalActivities || selectedPerson.summary.activitiesLogged || 0}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Performance Metrics
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Total Tickets</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-blue-600">
                            {selectedPerson.summary.totalTickets || 0}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {selectedPerson.summary.ticketsResolved || 0} resolved
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Resolution Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {(() => {
                              const total = selectedPerson.summary.totalTickets || 0;
                              const resolved = selectedPerson.summary.ticketsResolved || 0;
                              return total > 0 ? Math.round((resolved / total) * 100) : 0;
                            })()}%
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Performance Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-purple-600">
                            {selectedPerson.summary.performanceScore || 0}%
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Avg Resolution Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-lg font-bold text-blue-600">
                            {(() => {
                              const hours = selectedPerson.summary.averageResolutionTimeHours || 0;
                              return hours > 0 ? `${hours.toFixed(1)}h` : 'N/A';
                            })()} 
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Avg Travel Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-lg font-bold text-orange-600">
                            {(() => {
                              const hours = selectedPerson.summary.averageTravelTimeHours || 0;
                              return hours > 0 ? `${hours.toFixed(1)}h` : 'N/A';
                            })()} 
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Avg Onsite Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-lg font-bold text-purple-600">
                            {(() => {
                              const hours = selectedPerson.summary.averageOnsiteTimeHours || 0;
                              return hours > 0 ? `${hours.toFixed(1)}h` : 'N/A';
                            })()} 
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                </div>
              </TabsContent>
              
              <TabsContent value="daily" className="space-y-4">
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {selectedPerson.dayWiseBreakdown.map((day, index) => {
                      const statusConfig = STATUS_CONFIG[day.attendanceStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.CHECKED_OUT;
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-600" />
                                <span className="font-medium">{formatDate(day.date)}</span>
                                <Badge className={`${statusConfig.color} border`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600">
                                {Number(day.totalHours).toFixed(1)}h
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Check-in:</span>
                                <span className="ml-2 font-medium">{formatTime(day.checkInTime)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Check-out:</span>
                                <span className="ml-2 font-medium">{formatTime(day.checkOutTime)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Activities:</span>
                                <span className="ml-2 font-medium">{day.activityCount}</span>
                              </div>
                            </div>
                            
                            {day.flags.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1">
                                {day.flags.map((flag, flagIndex) => {
                                  const flagConfig = FLAG_CONFIG[flag.type as keyof typeof FLAG_CONFIG];
                                  const FlagIcon = flagConfig?.icon || AlertTriangle;
                                  return (
                                    <Badge 
                                      key={flagIndex} 
                                      variant="outline" 
                                      className={`text-xs ${flagConfig?.color || 'bg-gray-100 text-gray-800'} border`}
                                    >
                                      <FlagIcon className="h-2 w-2 mr-1" />
                                      {flag.message}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="activities" className="space-y-4">
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {selectedPerson.dayWiseBreakdown.map((day) => 
                      day.activities.map((activity, index) => (
                        <Card key={`${day.date}-${index}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-purple-600" />
                                <span className="font-medium">{activity.title}</span>
                                <Badge variant="outline">{activity.activityType}</Badge>
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatDate(day.date)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Start:</span>
                                <span className="ml-2 font-medium">{formatTime(activity.startTime)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">End:</span>
                                <span className="ml-2 font-medium">{formatTime(activity.endTime)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Duration:</span>
                                <span className="ml-2 font-medium">
                                  {activity.duration ? `${Math.round(activity.duration)}m` : 'N/A'}
                                </span>
                              </div>
                            </div>
                            
                            {activity.location && (
                              <div className="mt-2 flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3 text-gray-600" />
                                <span className="text-gray-600">{activity.location}</span>
                              </div>
                            )}
                            
                            {activity.ticketId && activity.ticket && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-600">Ticket:</span>
                                <span className="ml-2 font-medium">#{activity.ticketId} - {activity.ticket.title}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="flags" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedPerson.flags.map((flag, index) => {
                    const flagConfig = FLAG_CONFIG[flag.type as keyof typeof FLAG_CONFIG];
                    const FlagIcon = flagConfig?.icon || AlertTriangle;
                    
                    return (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FlagIcon className="h-4 w-4" />
                            <span className="font-medium">{flag.type.replace('_', ' ')}</span>
                            <Badge variant="outline">{flag.count}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{flag.message}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Modal */}
      <div className="md:hidden">
        <MobileModal 
          isOpen={detailModalOpen} 
          onClose={() => setDetailModalOpen(false)}
          className="max-w-[95vw] max-h-[95vh]"
        >
          <div className="space-y-4">
            {/* Mobile Header */}
            <div className="border-b pb-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">{selectedPerson?.name}</h2>
              </div>
              <p className="text-sm text-gray-600">
                Attendance Details for {dateRange.from && dateRange.to 
                  ? `${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}`
                  : 'selected period'
                }
              </p>
            </div>

            {selectedPerson && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  {/* Mobile Overview - Simplified */}
                  <div className="space-y-4">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="text-lg font-bold text-green-600">
                          {selectedPerson.summary.presentDays || selectedPerson.summary.totalWorkingDays || 0}
                        </div>
                        <div className="text-xs text-green-700">Working Days</div>
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="text-lg font-bold text-blue-600">
                          {Number(selectedPerson.summary.totalHours).toFixed(1)}h
                        </div>
                        <div className="text-xs text-blue-700">Total Hours</div>
                      </div>
                      
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="text-lg font-bold text-red-600">
                          {selectedPerson.summary.absentDays}
                        </div>
                        <div className="text-xs text-red-700">Absent Days</div>
                      </div>
                      
                      <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <div className="text-lg font-bold text-purple-600">
                          {selectedPerson.summary.totalActivities || selectedPerson.summary.activitiesLogged || 0}
                        </div>
                        <div className="text-xs text-purple-700">Activities</div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-600" />
                        Performance
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total Tickets</span>
                            <span className="font-semibold text-blue-600">{selectedPerson.summary.totalTickets || 0}</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Resolution Rate</span>
                            <span className="font-semibold text-green-600">
                              {(() => {
                                const total = selectedPerson.summary.totalTickets || 0;
                                const resolved = selectedPerson.summary.ticketsResolved || 0;
                                return total > 0 ? Math.round((resolved / total) * 100) : 0;
                              })()}%
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Performance Score</span>
                            <span className="font-semibold text-purple-600">{selectedPerson.summary.performanceScore || 0}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Issues & Flags */}
                    {selectedPerson.flags.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          Issues ({selectedPerson.flags.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedPerson.flags.slice(0, 3).map((flag, index) => {
                            const flagConfig = FLAG_CONFIG[flag.type as keyof typeof FLAG_CONFIG];
                            const FlagIcon = flagConfig?.icon || AlertTriangle;
                            return (
                              <div key={index} className="bg-red-50 p-3 rounded-lg border border-red-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <FlagIcon className="h-3 w-3 text-red-600" />
                                  <span className="text-sm font-medium text-red-800">{flag.type.replace('_', ' ')}</span>
                                  <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">{flag.count}</span>
                                </div>
                                <p className="text-xs text-red-700">{flag.message}</p>
                              </div>
                            );
                          })}
                          {selectedPerson.flags.length > 3 && (
                            <div className="text-center">
                              <span className="text-xs text-gray-500">+{selectedPerson.flags.length - 3} more issues</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="daily" className="space-y-4">
                  <ScrollArea className="h-80">
                    <div className="space-y-3">
                      {selectedPerson.dayWiseBreakdown.slice(0, 10).map((day, index) => {
                        const statusConfig = STATUS_CONFIG[day.attendanceStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.CHECKED_OUT;
                        const StatusIcon = statusConfig.icon;
                        
                        return (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-gray-600" />
                                <span className="text-sm font-medium">{formatDate(day.date)}</span>
                              </div>
                              <div className="text-xs text-gray-600">
                                {Number(day.totalHours).toFixed(1)}h
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${statusConfig.color} border`}>
                                <StatusIcon className="h-2 w-2" />
                                {statusConfig.label}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">In:</span>
                                <span className="ml-1 font-medium">{formatTime(day.checkInTime)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Out:</span>
                                <span className="ml-1 font-medium">{formatTime(day.checkOutTime)}</span>
                              </div>
                            </div>
                            
                            {day.flags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {day.flags.slice(0, 2).map((flag, flagIndex) => {
                                  const flagConfig = FLAG_CONFIG[flag.type as keyof typeof FLAG_CONFIG];
                                  const FlagIcon = flagConfig?.icon || AlertTriangle;
                                  return (
                                    <div key={flagIndex} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${flagConfig?.color || 'bg-gray-100 text-gray-800'} border`}>
                                      <FlagIcon className="h-2 w-2" />
                                      {flag.message.substring(0, 20)}...
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {selectedPerson.dayWiseBreakdown.length > 10 && (
                        <div className="text-center py-2">
                          <span className="text-xs text-gray-500">Showing first 10 days</span>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </MobileModal>
      </div>
    </div>
  );
}
