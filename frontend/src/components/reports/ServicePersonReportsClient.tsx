'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Ticket,
  MapPin,
  User,
  Download,
  Loader2,
  BarChart3,
  CalendarDays,
  Target,
  Award,
  FileText
} from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';
import { format } from 'date-fns';

interface Flag {
  type: 'LATE' | 'AUTO_CHECKOUT' | 'ABSENT' | string;
  message: string;
  count: number;
}

interface TicketReference {
  id: string;
  title: string;
  status: string;
}

interface Activity {
  id: string;
  title: string;
  name: string;
  activityType: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;
  location?: string;
  ticket?: TicketReference;
  ticketId?: string;
  createdAt: string;
  updatedAt: string;
}

interface DayWiseBreakdown {
  date: string;
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'CHECKED_IN' | string;
  totalHours: number;
  activityCount: number;
  checkInTime?: string;
  checkOutTime?: string;
  flags: Flag[];
  activities: Activity[];
}

interface ReportSummary {
  totalWorkingDays: number;
  totalHours: number;
  absentDays: number;
  autoCheckouts: number;
  activitiesLogged: number;
  averageHoursPerDay: number;
}

interface PersonalReportData {
  summary: ReportSummary;
  flags: Flag[];
  dayWiseBreakdown: DayWiseBreakdown[];
}

interface ReportsSummary {
  totalCheckIns: number;
  totalAbsentees: number;
  totalServicePersons: number;
  averageHoursPerDay: number;
  totalActivitiesLogged: number;
  mostActiveUser: {
    id: string;
    name: string;
    activities: number;
  } | null;
}

interface ServicePersonReportsClientProps {
  initialReportData: PersonalReportData | null;
  initialSummaryData: ReportsSummary | null;
  initialDateRange: {
    from: string;
    to: string;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ServicePersonReportsClient({
  initialReportData,
  initialSummaryData,
  initialDateRange
}: ServicePersonReportsClientProps) {
  const [reportData, setReportData] = useState<PersonalReportData | null>(initialReportData);
  const [summaryData, setSummaryData] = useState<ReportsSummary | null>(initialSummaryData);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(initialDateRange);
  const { toast } = useToast();

  // Fetch data when date range changes
  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  // Handle date range change
  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fetch report data
  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching reports with params:', {
        fromDate: dateRange.from,
        toDate: dateRange.to
      });
      
      // Fetch data using apiClient for consistent authentication
      const [reportsResponse, summaryResponse] = await Promise.allSettled([
        apiClient.get('/service-person-reports', {
          params: { 
            fromDate: dateRange.from,
            toDate: dateRange.to,
            limit: 1 // Only get current user's data
          }
        }),
        apiClient.get('/service-person-reports/summary', {
          params: { 
            fromDate: dateRange.from,
            toDate: dateRange.to
          }
        })
      ]);

      console.log('Reports response:', reportsResponse);
      console.log('Summary response:', summaryResponse);

      // Process reports response
      if (reportsResponse.status === 'fulfilled') {
        const response = reportsResponse.value;
        console.log('Full reports response:', response);
        
        if (response.success) {
          const reportData = response.data?.servicePersonReports?.[0];
          console.log('Processed report data:', reportData);
          setReportData(reportData || null);
        } else {
          console.warn('Reports API did not return success:', response);
          setReportData(null);
        }
      } else {
        console.error('Reports API call rejected:', reportsResponse.reason);
        setReportData(null);
        // Don't throw here, allow the component to render with partial data
      }

      // Process summary response
      if (summaryResponse.status === 'fulfilled') {
        const response = summaryResponse.value;
        console.log('Full summary response:', response);
        
        if (response.success) {
          console.log('Processed summary data:', response.data);
          setSummaryData(response.data || null);
        } else {
          console.warn('Summary API did not return success:', response);
          setSummaryData(null);
        }
      } else {
        console.error('Summary API call rejected:', summaryResponse.reason);
        setSummaryData(null);
      }
    } catch (error) {
      console.error('Error in fetchReportData:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to load report data: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle export to PDF
  const handleExport = async (format: 'pdf' | 'excel' = 'pdf') => {
    try {
      setLoading(true);
      const reportType = activeTab === 'attendance' ? 'attendance' : 'performance';

      const response = await apiClient.get('/service-person-reports/export', {
        params: {
          fromDate: dateRange.from,
          toDate: dateRange.to,
          reportType,
          format,
        },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `service-reports-${reportType}-${dateRange.from}-to-${dateRange.to}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: 'Export successful',
        description: 'Your report has been exported successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  // Handle refresh
  const handleRefresh = () => {
    fetchReportData();
  };

  // Safe data access with fallbacks
  const safeReportData = {
    summary: reportData?.summary || {
      totalWorkingDays: 0,
      totalHours: 0,
      absentDays: 0,
      autoCheckouts: 0,
      activitiesLogged: 0,
      averageHoursPerDay: 0
    },
    flags: Array.isArray(reportData?.flags) ? reportData.flags : [],
    dayWiseBreakdown: Array.isArray(reportData?.dayWiseBreakdown) ? reportData.dayWiseBreakdown.map(day => ({
      ...day,
      activities: Array.isArray(day.activities) ? day.activities.map(activity => ({
        ...activity,
        title: activity.title || activity.name || 'Untitled Activity',
        activityType: activity.activityType || 'GENERAL',
        duration: activity.duration || 0,
        status: activity.status || 'COMPLETED'
      })) : []
    })) : []
  };

  const safeSummaryData = summaryData || {
    totalCheckIns: 0,
    totalAbsentees: 0,
    totalServicePersons: 0,
    averageHoursPerDay: 0,
    totalActivitiesLogged: 0,
    mostActiveUser: null
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Performance Reports</h1>
            <p className="text-blue-100 text-lg">Track your attendance, activities, and performance metrics</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => handleDateRangeChange('from', e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/70"
              />
              <span className="text-white/70">to</span>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => handleDateRangeChange('to', e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/70"
              />
            </div>
            <Button onClick={handleRefresh} variant="secondary" className="bg-white/20 hover:bg-white/30 border-white/20">
              <Download className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => handleExport('pdf')} variant="secondary" className="bg-white/20 hover:bg-white/30 border-white/20">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="overview" className="rounded-md">Overview</TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-md">Attendance Details</TabsTrigger>
          <TabsTrigger value="activities" className="rounded-md">Activity Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-8 mt-8">
          {/* Key Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">Total Hours Worked</CardTitle>
                <Clock className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{safeReportData.summary.totalHours.toFixed(1)}h</div>
                <p className="text-xs text-blue-600 mt-1">
                  Avg {safeReportData.summary.averageHoursPerDay.toFixed(1)}h per day
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-800">Working Days</CardTitle>
                <CalendarDays className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900">{safeReportData.summary.totalWorkingDays}</div>
                <p className="text-xs text-green-600 mt-1">
                  {safeReportData.summary.absentDays} absent days
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-800">Activities Logged</CardTitle>
                <Activity className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900">{safeReportData.summary.activitiesLogged}</div>
                <p className="text-xs text-purple-600 mt-1">
                  Across {safeReportData.summary.totalWorkingDays} working days
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-800">Performance Score</CardTitle>
                <Award className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-900">
                  {safeReportData.summary.totalWorkingDays > 0 ? 
                    Math.round((safeReportData.summary.activitiesLogged / safeReportData.summary.totalWorkingDays) * 10) : 0}%
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  {safeReportData.summary.activitiesLogged > safeReportData.summary.totalWorkingDays ? 'Excellent' : 'Good'} productivity
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Flags and Issues */}
          {safeReportData.flags.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Attention Required
                </CardTitle>
                <CardDescription className="text-yellow-700">
                  Issues identified in your attendance and activity patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {safeReportData.flags.map((flag: Flag, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-yellow-200">
                      <div className={`p-2 rounded-full ${
                        flag.type === 'LATE' ? 'bg-yellow-100 text-yellow-600' :
                        flag.type === 'AUTO_CHECKOUT' ? 'bg-blue-100 text-blue-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {flag.type === 'LATE' ? <Clock className="h-4 w-4" /> :
                         flag.type === 'AUTO_CHECKOUT' ? <Target className="h-4 w-4" /> :
                         <AlertCircle className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{flag.message}</div>
                        <div className="text-xs text-gray-500">{flag.count} occurrences</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Hours Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Daily Hours Trend
                </CardTitle>
                <CardDescription>Your daily working hours over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={safeReportData.dayWiseBreakdown.map(day => ({
                    date: format(new Date(day.date), 'MMM dd'),
                    hours: day.totalHours,
                    status: day.attendanceStatus
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="hours" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  Activity Summary
                </CardTitle>
                <CardDescription>Your activity logging patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-purple-900">Total Activities</div>
                      <div className="text-2xl font-bold text-purple-700">{safeReportData.summary.activitiesLogged}</div>
                    </div>
                    <Activity className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-green-900">Average per Day</div>
                      <div className="text-2xl font-bold text-green-700">
                        {safeReportData.summary.totalWorkingDays > 0 ? 
                          (safeReportData.summary.activitiesLogged / safeReportData.summary.totalWorkingDays).toFixed(1) : '0.0'}
                      </div>
                    </div>
                    <Target className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-blue-900">Productivity Score</div>
                      <div className="text-2xl font-bold text-blue-700">
                        {safeReportData.summary.activitiesLogged > 0 ? 'High' : 'Low'}
                      </div>
                    </div>
                    <Award className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Daily Attendance Records
              </CardTitle>
              <CardDescription>Detailed breakdown of your daily attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {safeReportData.dayWiseBreakdown.map((day: DayWiseBreakdown, index: number) => (
                  <div key={index} className={`p-4 rounded-lg border-2 ${
                    day.attendanceStatus === 'ABSENT' ? 'bg-red-50 border-red-200' :
                    day.attendanceStatus === 'CHECKED_IN' ? 'bg-green-50 border-green-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-semibold">
                          {format(new Date(day.date), 'EEEE, MMM dd, yyyy')}
                        </div>
                        <Badge variant={
                          day.attendanceStatus === 'ABSENT' ? 'destructive' :
                          day.attendanceStatus === 'CHECKED_IN' ? 'default' :
                          'secondary'
                        }>
                          {day.attendanceStatus}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {day.totalHours > 0 ? `${day.totalHours.toFixed(1)}h` : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {day.activityCount} activities
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Check-in:</span>
                          <span>{day.checkInTime ? format(new Date(day.checkInTime), 'HH:mm') : 'Not checked in'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-red-600" />
                          <span className="font-medium">Check-out:</span>
                          <span>{day.checkOutTime ? format(new Date(day.checkOutTime), 'HH:mm') : 'Not checked out'}</span>
                        </div>
                      </div>
                      
                      {day.flags.length > 0 && (
                        <div className="space-y-1">
                          <div className="font-medium text-sm">Issues:</div>
                          {day.flags.map((flag: Flag, flagIndex: number) => (
                            <div key={flagIndex} className="flex items-center gap-2">
                              <AlertCircle className="h-3 w-3 text-yellow-600" />
                              <span className="text-sm text-yellow-700">{flag.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Activity Timeline
              </CardTitle>
              <CardDescription>Chronological view of all your logged activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {safeReportData.dayWiseBreakdown
                  .filter(day => day.activities.length > 0)
                  .map((day, dayIndex) => (
                    <div key={dayIndex} className="border-l-4 border-purple-200 pl-6 pb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-purple-100 p-2 rounded-full">
                          <Calendar className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">
                            {format(new Date(day.date), 'EEEE, MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {day.activities.length} activities logged
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3 ml-10">
                        {day.activities.map((activity, actIndex) => (
                          <div key={actIndex} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-full">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium">{activity.title}</div>
                                  <div className="text-sm text-gray-500">
                                    {activity.activityType.replace('_', ' ')}
                                  </div>
                                </div>
                              </div>
                              <Badge variant="outline">
                                {activity.duration ? `${activity.duration}min` : 'Ongoing'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-green-600" />
                                <span>Start: {format(new Date(activity.startTime), 'HH:mm')}</span>
                              </div>
                              {activity.endTime && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-red-600" />
                                  <span>End: {format(new Date(activity.endTime), 'HH:mm')}</span>
                                </div>
                              )}
                              {activity.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-blue-600" />
                                  <span className="truncate">{activity.location}</span>
                                </div>
                              )}
                              {activity.ticket && (
                                <div className="flex items-center gap-2">
                                  <Ticket className="h-4 w-4 text-purple-600" />
                                  <span className="truncate">
                                    Ticket #{activity.ticketId}: {activity.ticket.title}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                
                {safeReportData.dayWiseBreakdown.filter(day => day.activities.length > 0).length === 0 && (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <div className="text-lg font-medium text-gray-500">No activities logged</div>
                    <div className="text-sm text-gray-400">Start logging activities to see them here</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
