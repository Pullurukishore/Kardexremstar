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
  Target,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { ReportData, ServicePersonReport } from './types';
import { STATUS_COLORS } from './types';

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
  const [expandedDays, setExpandedDays] = useState<{[key: string]: boolean}>({});

  // Safety check - if no report data, show loading state
  if (!reportData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Service Person Attendance Report...</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please wait while we load the data.</p>
        </CardContent>
      </Card>
    );
  }

  const toggleDay = (dayKey: string) => {
    setExpandedDays(prev => ({ ...prev, [dayKey]: !prev[dayKey] }));
  };

  const reports = Array.isArray(reportData?.reports) ? reportData.reports : [];
  
  // Additional safety check - if reports is empty, show empty state
  if (!reports || reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Person Attendance Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Reports Found</h3>
            <p className="text-gray-500">No service person reports available for the selected period.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
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

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!selectedPerson) return;

    try {
      // Get token from multiple sources (same as ReportsClient)
      const getToken = () => {
        if (typeof window !== 'undefined') {
          const localStorageToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
          if (localStorageToken) return localStorageToken;
          
          // Check cookies as fallback
          const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return null;
          };
          
          return getCookie('accessToken') || getCookie('token') || localStorage.getItem('cookie_accessToken');
        }
        return null;
      };

      const token = getToken();
      
      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }

      const params = new URLSearchParams({
        fromDate: dateRange.from || '',
        toDate: dateRange.to || '',
        servicePersonId: String(selectedPerson.id || ''),
        format: format
      });

      const url = `${process.env.NEXT_PUBLIC_API_URL}/admin/service-person-reports/export/detailed-person?${params}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${selectedPerson.name.replace(/\s+/g, '_')}_Attendance_${format === 'excel' ? 'Report.xlsx' : 'Report.pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      alert(`Failed to export ${format.toUpperCase()}. Please try again.`);
    }
  };

  return (
    <div className="space-y-6">
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
                <span className="ml-2 text-blue-600 font-medium">
                  (Monday - Saturday working days only)
                </span>
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
                            {person.zones && person.zones.length > 0 && (
                              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1">
                                {person.zones.map((zone, idx) => (
                                  <span key={idx}>
                                    {zone.name}
                                    {idx < person.zones.length - 1 && ', '}
                                  </span>
                                ))}
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
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                      <Calendar className="h-3 w-3" />
                      <span className="font-medium">Working Days: Monday - Saturday only</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Export to Excel */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('excel')}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-1" />
                      Excel
                    </Button>
                    
                    {/* Export to PDF */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('pdf')}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    
                    {/* Close button */}
                    <button
                      onClick={() => setDetailModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
            
            {selectedPerson && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Complete Overview</TabsTrigger>
                  <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
                  <TabsTrigger value="activities">Activities Log</TabsTrigger>
                </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                {/* Summary Card with Person Info */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{selectedPerson.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{selectedPerson.email}</p>
                        {selectedPerson.zones && selectedPerson.zones.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {selectedPerson.zones.map((zone, idx) => (
                              <Badge key={idx} variant="outline" className="bg-white">
                                {zone.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">
                          {selectedPerson.summary.performanceScore || 0}%
                        </div>
                        <div className="text-sm text-gray-600">Performance Score</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Attendance Metrics */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                    Attendance Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-gray-600">Working Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-green-600">
                            {selectedPerson.summary.presentDays || selectedPerson.summary.totalWorkingDays || 0}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Days present</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-gray-600">Total Hours</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-blue-600">
                            {Number(selectedPerson.summary.totalHours).toFixed(1)}h
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {selectedPerson.summary.averageHoursPerDay 
                              ? `${Number(selectedPerson.summary.averageHoursPerDay).toFixed(1)}h avg/day`
                              : 'N/A avg/day'
                            }
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-l-4 border-l-red-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-gray-600">Absent Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-red-600">
                            {selectedPerson.summary.absentDays}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Days absent</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-l-4 border-l-purple-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-gray-600">Activities</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-purple-600">
                            {selectedPerson.summary.totalActivities || selectedPerson.summary.activitiesLogged || 0}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Total logged</p>
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-orange-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-gray-600">Auto Checkouts</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-orange-600">
                            {selectedPerson.summary.autoCheckouts || 0}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">System generated</p>
                        </CardContent>
                      </Card>
                    </div>
                </div>

                {/* Ticket Performance Metrics */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Ticket Performance
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="bg-blue-50 border-blue-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-blue-800">Total Tickets</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-blue-700">
                            {selectedPerson.summary.totalTickets || 0}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-green-700">✓ {selectedPerson.summary.ticketsResolved || 0} resolved</span>
                            <span className="text-gray-600">
                              {selectedPerson.summary.totalTickets 
                                ? ((selectedPerson.summary.totalTickets - (selectedPerson.summary.ticketsResolved || 0))) 
                                : 0
                              } pending
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-green-50 border-green-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-green-800">Resolution Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-green-700">
                            {(() => {
                              const total = selectedPerson.summary.totalTickets || 0;
                              const resolved = selectedPerson.summary.ticketsResolved || 0;
                              return total > 0 ? Math.round((resolved / total) * 100) : 0;
                            })()}%
                          </div>
                          <p className="text-xs text-green-700 mt-2">Success rate</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-amber-50 border-amber-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-amber-800">Avg Resolution</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-amber-700">
                            {(() => {
                              const hours = selectedPerson.summary.averageResolutionTimeHours || 0;
                              return hours > 0 ? `${hours.toFixed(1)}h` : 'N/A';
                            })()} 
                          </div>
                          <p className="text-xs text-amber-700 mt-2">Business hours</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-purple-50 border-purple-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-purple-800">Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-purple-700">
                            {selectedPerson.summary.performanceScore || 0}%
                          </div>
                          <div className="mt-2">
                            <div className="w-full bg-purple-200 rounded-full h-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full transition-all"
                                style={{ width: `${selectedPerson.summary.performanceScore || 0}%` }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                </div>

                {/* Time Metrics */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    Time Analysis
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm text-gray-600">Avg Travel Time</CardTitle>
                            <MapPin className="h-4 w-4 text-orange-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-orange-600">
                            {(() => {
                              const hours = selectedPerson.summary.averageTravelTimeHours || 0;
                              return hours > 0 ? `${hours.toFixed(1)}h` : 'N/A';
                            })()} 
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Per ticket (real-time)</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm text-gray-600">Avg Onsite Time</CardTitle>
                            <Clock3 className="h-4 w-4 text-purple-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-purple-600">
                            {(() => {
                              const hours = selectedPerson.summary.averageOnsiteTimeHours || 0;
                              return hours > 0 ? `${hours.toFixed(1)}h` : 'N/A';
                            })()} 
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Per ticket (onsite)</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm text-gray-600">Total Work Time</CardTitle>
                            <Timer className="h-4 w-4 text-blue-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-blue-600">
                            {(() => {
                              const travel = selectedPerson.summary.averageTravelTimeHours || 0;
                              const onsite = selectedPerson.summary.averageOnsiteTimeHours || 0;
                              const total = travel + onsite;
                              return total > 0 ? `${total.toFixed(1)}h` : 'N/A';
                            })()} 
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Travel + Onsite avg</p>
                        </CardContent>
                      </Card>
                    </div>
                </div>
              </TabsContent>
              
              <TabsContent value="daily" className="space-y-4">
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Info className="h-4 w-4" />
                    <span>Detailed day-by-day attendance with all activities and times</span>
                  </div>
                </div>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {selectedPerson.dayWiseBreakdown.map((day, index) => {
                      const statusConfig = STATUS_CONFIG[day.attendanceStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.CHECKED_OUT;
                      const StatusIcon = statusConfig.icon;
                      const dayKey = `${day.date}-${index}`;
                      const isExpanded = expandedDays[dayKey] || false;
                      
                      return (
                        <Card key={index} className="overflow-hidden">
                          <CardContent className="p-0">
                            {/* Header Section */}
                            <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Calendar className="h-5 w-5 text-blue-600" />
                                  <div>
                                    <div className="font-semibold text-gray-900">{formatDate(day.date)}</div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                    </div>
                                  </div>
                                  <Badge className={`${statusConfig.color} border`}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-gray-900">{Number(day.totalHours).toFixed(1)}h</div>
                                  <div className="text-xs text-gray-500">Total Hours</div>
                                </div>
                              </div>
                              
                              {/* Time Details */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 bg-green-100 rounded-lg">
                                    <Clock className="h-4 w-4 text-green-700" />
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600">Check-in</div>
                                    <div className="font-semibold text-gray-900">{formatTime(day.checkInTime)}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="p-2 bg-red-100 rounded-lg">
                                    <Clock className="h-4 w-4 text-red-700" />
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600">Check-out</div>
                                    <div className="font-semibold text-gray-900">{formatTime(day.checkOutTime)}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="p-2 bg-purple-100 rounded-lg">
                                    <Activity className="h-4 w-4 text-purple-700" />
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600">Activities</div>
                                    <div className="font-semibold text-gray-900">{day.activityCount}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Activities Section */}
                            {day.activities && day.activities.length > 0 && (
                              <div className="p-4">
                                <button
                                  onClick={() => toggleDay(dayKey)}
                                  className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                                >
                                  <span className="flex items-center gap-2">
                                    <Activity className="h-4 w-4" />
                                    View {day.activities.length} {day.activities.length === 1 ? 'Activity' : 'Activities'}
                                  </span>
                                  <svg 
                                    className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                
                                {isExpanded && (
                                  <div className="mt-3 space-y-2">
                                    {day.activities.map((activity, actIdx) => (
                                      <div key={actIdx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1">
                                            <div className="font-medium text-gray-900">{activity.title}</div>
                                            <Badge variant="outline" className="text-xs mt-1">{activity.activityType}</Badge>
                                          </div>
                                          {activity.duration && (
                                            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                                              {Math.round(activity.duration)}m
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-2">
                                          <div>
                                            <span className="text-gray-500">Start:</span> {formatTime(activity.startTime)}
                                          </div>
                                          <div>
                                            <span className="text-gray-500">End:</span> {formatTime(activity.endTime)}
                                          </div>
                                        </div>
                                        {activity.location && (
                                          <div className="flex items-center gap-1 text-xs text-gray-600 mt-2">
                                            <MapPin className="h-3 w-3" />
                                            <span className="truncate">{activity.location}</span>
                                          </div>
                                        )}
                                        {activity.ticket && (
                                          <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                                            <div className="text-xs text-blue-800 font-medium">Ticket #{activity.ticketId}</div>
                                            <div className="text-xs text-gray-600 truncate">{activity.ticket.title}</div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
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
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Activity className="h-5 w-5 text-purple-700" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">All Activities</div>
                      <div className="text-xs text-gray-600">
                        {selectedPerson.dayWiseBreakdown.reduce((sum, day) => sum + day.activityCount, 0)} total activities
                      </div>
                    </div>
                  </div>
                </div>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {selectedPerson.dayWiseBreakdown.map((day) => {
                      if (day.activities.length === 0) return null;
                      
                      return (
                        <div key={day.date}>
                          {/* Date Header */}
                          <div className="sticky top-0 z-10 bg-white border-b-2 border-blue-600 pb-2 mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-blue-600" />
                              <span className="font-semibold text-gray-900">{formatDate(day.date)}</span>
                              <Badge variant="outline" className="text-xs">
                                {day.activities.length} {day.activities.length === 1 ? 'activity' : 'activities'}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Activities for this day */}
                          <div className="space-y-3 ml-6">
                            {day.activities.map((activity, index) => (
                              <Card key={`${day.date}-${index}`} className="border-l-4 border-l-purple-500">
                                <CardContent className="p-4">
                                  {/* Activity Header */}
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Activity className="h-4 w-4 text-purple-600" />
                                        <span className="font-semibold text-gray-900">{activity.title}</span>
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                          {activity.activityType}
                                        </Badge>
                                        {activity.duration && (
                                          <Badge className="text-xs bg-gray-100 text-gray-700 border-gray-300">
                                            <Timer className="h-3 w-3 mr-1" />
                                            {Math.round(activity.duration)} minutes
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Time Details */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                                      <Clock className="h-4 w-4 text-green-700" />
                                      <div>
                                        <div className="text-xs text-green-700 font-medium">Start Time</div>
                                        <div className="text-sm font-semibold text-gray-900">{formatTime(activity.startTime)}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                                      <Clock className="h-4 w-4 text-red-700" />
                                      <div>
                                        <div className="text-xs text-red-700 font-medium">End Time</div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {activity.endTime ? formatTime(activity.endTime) : 'In Progress'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Location */}
                                  {activity.location && (
                                    <div className="flex items-start gap-2 p-2 bg-orange-50 rounded-lg mb-3">
                                      <MapPin className="h-4 w-4 text-orange-700 mt-0.5" />
                                      <div className="flex-1">
                                        <div className="text-xs text-orange-700 font-medium">Location</div>
                                        <div className="text-sm text-gray-900 break-words">{activity.location}</div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Ticket Details */}
                                  {activity.ticket && (
                                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <div className="p-1.5 bg-blue-600 rounded">
                                            <FileText className="h-3 w-3 text-white" />
                                          </div>
                                          <div>
                                            <div className="text-xs text-blue-700 font-medium">Ticket #{activity.ticketId}</div>
                                            <div className="text-sm font-semibold text-gray-900">{activity.ticket.title}</div>
                                          </div>
                                        </div>
                                        {activity.ticket.status && (
                                          <Badge className="text-xs" style={{ 
                                            backgroundColor: STATUS_COLORS[activity.ticket.status as keyof typeof STATUS_COLORS] || '#6B7280',
                                            color: 'white',
                                            border: 'none'
                                          }}>
                                            {activity.ticket.status.replace(/_/g, ' ')}
                                          </Badge>
                                        )}
                                      </div>
                                      {activity.ticket.customer && (
                                        <div className="flex items-center gap-2 text-xs text-gray-700 mt-2">
                                          <Users className="h-3 w-3" />
                                          <span className="font-medium">Customer:</span>
                                          <span>{activity.ticket.customer.companyName}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
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
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">{selectedPerson?.name}</h2>
                </div>
                
                {/* Mobile Export Buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('excel')}
                    className="text-green-600 hover:bg-green-50 border-green-200 h-8 px-2"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('pdf')}
                    className="text-red-600 hover:bg-red-50 border-red-200 h-8 px-2"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
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

                    {/* Additional Metrics */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-600" />
                        Additional Info
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                          <div className="text-lg font-bold text-orange-600">
                            {selectedPerson.summary.autoCheckouts || 0}
                          </div>
                          <div className="text-xs text-orange-700">Auto Checkouts</div>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                          <div className="text-lg font-bold text-indigo-600">
                            {Number(selectedPerson.summary.averageHoursPerDay || 0).toFixed(1)}h
                          </div>
                          <div className="text-xs text-indigo-700">Avg Hours/Day</div>
                        </div>
                      </div>
                    </div>
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
