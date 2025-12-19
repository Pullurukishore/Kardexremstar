'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Clock,
  MapPin,
  User,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  UserCheck,
  UserX,
  Zap,
  Radio,
  Building,
  LogIn,
  LogOut
} from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';
import { format, parseISO, startOfDay, endOfDay, isToday } from 'date-fns';
import Link from 'next/link';

// Types based on backend schema
interface AttendanceRecord {
  id: number | string;
  userId: number;
  checkInAt: string | null;
  checkOutAt?: string | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkInAddress?: string | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  checkOutAddress?: string | null;
  totalHours?: number | null;
  status: 'CHECKED_IN' | 'CHECKED_OUT' | 'ABSENT' | 'LATE' | 'EARLY_CHECKOUT' | 'AUTO_CHECKED_OUT';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string | null;
    email: string;
    role: string;
    serviceZones: Array<{
      serviceZone: {
        id: number;
        name: string;
      };
    }>;
    _count?: {
      activityLogs: number;
    };
  };
  flags?: Array<{
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
  }>;
  activityCount?: number;
}

interface AttendanceStats {
  totalRecords: number;
  statusBreakdown: Record<string, number>;
  averageHours: number;
  period: string;
}

interface ServicePerson {
  id: number;
  name: string | null;
  email: string;
  serviceZones: Array<{
    serviceZone: {
      id: number;
      name: string;
    };
  }>;
}

interface ServiceZone {
  id: number;
  name: string;
  description?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; dotColor: string }> = {
  CHECKED_IN: { label: 'Checked In', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', dotColor: 'bg-green-500' },
  CHECKED_OUT: { label: 'Checked Out', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', dotColor: 'bg-blue-500' },
  AUTO_CHECKED_OUT: { label: 'Auto Checkout', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200', dotColor: 'bg-purple-500' },
  ABSENT: { label: 'Absent', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', dotColor: 'bg-red-500' },
  LATE: { label: 'Late', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200', dotColor: 'bg-yellow-500' },
  EARLY_CHECKOUT: { label: 'Early Checkout', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200', dotColor: 'bg-orange-500' },
};

const ZONE_COLORS: Record<string, string> = {
  'South': 'bg-red-500',
  'North': 'bg-blue-500',
  'East': 'bg-green-500',
  'West': 'bg-purple-500',
  'Central': 'bg-orange-500',
};

const ACTIVITY_TYPES: Record<string, string> = {
  TICKET_WORK: '🎫 Ticket Work',
  BD_VISIT: '🏢 BD Visit',
  PO_DISCUSSION: '📋 PO Discussion',
  SPARE_REPLACEMENT: '🔧 Spare Replacement',
  TRAVEL: '🚗 Travel',
  TRAINING: '📚 Training',
  MEETING: '👥 Meeting',
  MAINTENANCE: '🛠️ Maintenance',
  DOCUMENTATION: '📝 Documentation',
  OTHER: '📌 Other',
  WORK_FROM_HOME: '🏠 Work From Home',
  INSTALLATION: '⚙️ Installation',
  MAINTENANCE_PLANNED: '📅 Planned Maintenance',
  REVIEW_MEETING: '📊 Review Meeting',
  RELOCATION: '🚚 Relocation',
};

const ExpertAttendancePage = memo(function ExpertAttendancePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [servicePersons, setServicePersons] = useState<ServicePerson[]>([]);
  const [serviceZones, setServiceZones] = useState<ServiceZone[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'specific'>('today');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedActivityType, setSelectedActivityType] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get date range based on selection
  const getDateRange = useCallback(() => {
    const now = new Date();
    if (dateRange === 'today') {
      return {
        startDate: startOfDay(now).toISOString(),
        endDate: endOfDay(now).toISOString(),
      };
    }
    if (dateRange === 'yesterday') {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return {
        startDate: startOfDay(y).toISOString(),
        endDate: endOfDay(y).toISOString(),
      };
    }
    if (dateRange === 'specific') {
      const d = selectedDate ? new Date(selectedDate) : now;
      return {
        startDate: startOfDay(d).toISOString(),
        endDate: endOfDay(d).toISOString(),
      };
    }
    return {
      startDate: startOfDay(now).toISOString(),
      endDate: endOfDay(now).toISOString(),
    };
  }, [dateRange, selectedDate]);

  // Fetch attendance data
  const fetchAttendanceData = useCallback(async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setLoading(true);

      const { startDate, endDate } = getDateRange();
      const params: Record<string, any> = {
        startDate,
        endDate,
        page: currentPage,
        limit: 20
      };

      if (selectedUser !== 'all') params.userId = selectedUser;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedZone !== 'all') params.zoneId = selectedZone;
      if (selectedActivityType !== 'all') params.activityType = selectedActivityType;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [attendanceResponse, statsResponse, servicePersonsResponse, serviceZonesResponse] = await Promise.allSettled([
        apiClient.get('/admin/attendance', { params }),
        apiClient.get('/admin/attendance/stats', { params: { startDate, endDate } }),
        apiClient.get('/admin/attendance/service-persons'),
        apiClient.get('/admin/attendance/service-zones')
      ]);

      if (attendanceResponse.status === 'fulfilled') {
        const response = attendanceResponse.value as any;
        if (response.success && response.data) {
          const data = response.data;
          if (data.attendance && Array.isArray(data.attendance)) {
            setAttendanceRecords(data.attendance);
            setTotalPages(data.pagination?.totalPages || 1);
          } else {
            setAttendanceRecords([]);
          }
        } else {
          setAttendanceRecords([]);
        }
      }

      if (statsResponse.status === 'fulfilled') {
        const response = statsResponse.value as any;
        if (response.success && response.data) {
          setStats(response.data);
        }
      }

      if (servicePersonsResponse.status === 'fulfilled') {
        const response = servicePersonsResponse.value as any;
        if (response.success && response.data) {
          setServicePersons(Array.isArray(response.data) ? response.data : []);
        }
      }

      if (serviceZonesResponse.status === 'fulfilled') {
        const response = serviceZonesResponse.value as any;
        if (response.success && response.data) {
          setServiceZones(Array.isArray(response.data) ? response.data : []);
        }
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load attendance data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, getDateRange, selectedUser, selectedStatus, selectedZone, selectedActivityType, searchQuery, toast]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (currentPage === 1) {
        fetchAttendanceData();
      } else {
        setCurrentPage(1);
      }
    }, 500);
    return () => clearTimeout(delayedSearch);
  }, [searchQuery, dateRange, selectedDate, selectedUser, selectedStatus, selectedZone, selectedActivityType]);

  // Get zone color
  const getZoneColor = (zoneName: string) => {
    for (const [key, color] of Object.entries(ZONE_COLORS)) {
      if (zoneName.toLowerCase().includes(key.toLowerCase())) {
        return color;
      }
    }
    return 'bg-slate-500';
  };

  // Format time
  const formatTime = (dateString: string | null) => {
    if (!dateString) return null;
    return format(parseISO(dateString), 'HH:mm');
  };

  // Format date
  const formatDateDisplay = (dateString: string | null) => {
    if (!dateString) return { date: 'N/A', isToday: false };
    const date = parseISO(dateString);
    return {
      date: format(date, 'MMM dd, yyyy'),
      isToday: isToday(date)
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Records</p>
                  <p className="text-2xl font-bold text-blue-900">{loading ? '...' : stats?.totalRecords || attendanceRecords.length}</p>
                </div>
                <div className="p-2.5 bg-blue-500 rounded-xl">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-green-200 bg-gradient-to-br from-green-50 to-green-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Active Now</p>
                  <p className="text-2xl font-bold text-green-900">{loading ? '...' : stats?.statusBreakdown?.CHECKED_IN || 0}</p>
                </div>
                <div className="p-2.5 bg-green-500 rounded-xl">
                  <UserCheck className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Avg Hours</p>
                  <p className="text-2xl font-bold text-purple-900">{loading ? '...' : stats?.averageHours ? `${stats.averageHours.toFixed(1)}h` : '0h'}</p>
                </div>
                <div className="p-2.5 bg-purple-500 rounded-xl">
                  <Timer className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Issues</p>
                  <p className="text-2xl font-bold text-orange-900">{loading ? '...' : (stats?.statusBreakdown?.LATE || 0) + (stats?.statusBreakdown?.ABSENT || 0)}</p>
                </div>
                <div className="p-2.5 bg-orange-500 rounded-xl">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Filters</span>
              </div>
              
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-slate-200">
                  <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="specific">Pick Date</SelectItem>
                </SelectContent>
              </Select>

              {dateRange === 'specific' && (
                <Input
                  type="date"
                  value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-[140px] h-9"
                />
              )}
              
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-[160px] h-9 bg-white border-slate-200">
                  <User className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Person" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Persons</SelectItem>
                  {servicePersons.map((person) => (
                    <SelectItem key={person.id} value={person.id.toString()}>
                      {person.name || person.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-slate-200">
                  <CheckCircle className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-slate-200">
                  <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {serviceZones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id.toString()}>{zone.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedActivityType} onValueChange={setSelectedActivityType}>
                <SelectTrigger className="w-[160px] h-9 bg-white border-slate-200">
                  <Activity className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Activity" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">📋 All Types</SelectItem>
                  {Object.entries(ACTIVITY_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-white border-slate-200"
                />
              </div>
              
              <Button 
                onClick={() => fetchAttendanceData(true)} 
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                className="h-9"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-100 py-4 px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-800">Attendance Records</CardTitle>
                  <p className="text-sm text-slate-500">Comprehensive attendance tracking with smart analytics and real-time insights</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1">
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  {attendanceRecords.length} records
                </Badge>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full">
                  <Radio className="h-3.5 w-3.5 text-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-slate-600">Live Data</span>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-8 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-sm font-medium text-slate-600">
              <div className="col-span-1 flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                User Name
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                Date
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                Check-In
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                Check-Out
              </div>
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-slate-400" />
                Total Hours
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-400" />
                Status
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                Activities
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-400" />
                Actions
              </div>
            </div>
            
            {/* Table Body */}
            {loading ? (
              <div className="p-8">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-50 rounded-lg mb-3 animate-pulse"></div>
                ))}
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600">No attendance records found</h3>
                <p className="text-slate-400 mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {attendanceRecords.map((record) => {
                  const statusConfig = STATUS_CONFIG[record.status] || STATUS_CONFIG.CHECKED_OUT;
                  const zoneName = record.user.serviceZones?.[0]?.serviceZone?.name || 'Unknown';
                  const zoneColor = getZoneColor(zoneName);
                  const dateInfo = formatDateDisplay(record.checkInAt || record.createdAt);
                  const checkInTime = formatTime(record.checkInAt);
                  const checkOutTime = formatTime(record.checkOutAt || null);
                  const activityCount = record.activityCount || record.user._count?.activityLogs || 0;
                  
                  return (
                    <div key={record.id} className="grid grid-cols-8 gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors items-center">
                      {/* User Name */}
                      <div className="col-span-1 flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                            {(record.user.name || record.user.email).charAt(0).toUpperCase()}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 ${zoneColor} rounded text-[10px] font-medium text-white shadow-sm`}>
                            {zoneName.split(' ')[0]}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{record.user.name || record.user.email.split('@')[0]}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{zoneName}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Date */}
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-green-50 rounded">
                            <Calendar className="h-3.5 w-3.5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">{dateInfo.date.split(',')[0]}</p>
                            <p className="text-xs text-slate-400">{dateInfo.date.split(',')[1] || ''}</p>
                          </div>
                        </div>
                        {dateInfo.isToday && (
                          <Badge variant="outline" className="mt-1 text-[10px] bg-green-50 text-green-600 border-green-200">
                            Today
                          </Badge>
                        )}
                      </div>
                      
                      {/* Check-In */}
                      <div>
                        {checkInTime ? (
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-50 rounded">
                              <LogIn className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">{checkInTime}</p>
                              <p className="text-xs text-slate-400">Check-in</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-red-50 rounded">
                              <XCircle className="h-3.5 w-3.5 text-red-500" />
                            </div>
                            <span className="text-sm text-red-500 font-medium">No check-in</span>
                          </div>
                        )}
                        {record.checkInAddress && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{record.checkInAddress?.split(',')[0]}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Check-Out */}
                      <div>
                        {checkOutTime ? (
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-orange-50 rounded">
                              <LogOut className="h-3.5 w-3.5 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">{checkOutTime}</p>
                              <p className="text-xs text-slate-400">{record.notes?.includes('Auto') ? 'Auto checkout' : 'Manual checkout'}</p>
                            </div>
                          </div>
                        ) : record.status === 'CHECKED_IN' ? (
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-50 rounded animate-pulse">
                              <Activity className="h-3.5 w-3.5 text-green-500" />
                            </div>
                            <span className="text-sm text-green-600 font-medium">Still active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-slate-50 rounded">
                              <XCircle className="h-3.5 w-3.5 text-slate-400" />
                            </div>
                            <span className="text-sm text-slate-400">—</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Total Hours */}
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-purple-50 rounded">
                            <Timer className="h-3.5 w-3.5 text-purple-600" />
                          </div>
                          <div>
                            {record.totalHours && record.totalHours > 0 ? (
                              <>
                                <p className="text-sm font-semibold text-slate-700">{Number(record.totalHours).toFixed(1)}h</p>
                                <p className="text-xs text-slate-400">{record.totalHours < 4 ? 'Short day' : record.totalHours > 10 ? 'Long day' : 'Normal'}</p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-slate-400">Calculating...</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Status */}
                      <div>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${statusConfig.bgColor}`}>
                          <div className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`}></div>
                          <span className={`text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {record.status === 'CHECKED_IN' ? '● Active now' : record.status === 'ABSENT' ? 'Inactive' : 'Inactive'}
                        </p>
                      </div>
                      
                      {/* Activities */}
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-amber-50 rounded">
                            <Activity className="h-3.5 w-3.5 text-amber-600" />
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${activityCount === 0 ? 'text-red-500' : activityCount < 3 ? 'text-amber-600' : 'text-green-600'}`}>
                              {activityCount}
                            </p>
                            {activityCount === 0 ? (
                              <p className="text-xs text-red-400 flex items-center gap-0.5">
                                <XCircle className="h-3 w-3" /> No activity
                              </p>
                            ) : activityCount < 3 ? (
                              <p className="text-xs text-amber-500 flex items-center gap-0.5">
                                <AlertTriangle className="h-3 w-3" /> Low activity
                              </p>
                            ) : (
                              <p className="text-xs text-green-500">Good</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div>
                        <Link href={`/admin/attendance/${record.id}`}>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full bg-blue-50 hover:bg-blue-100">
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Footer */}
            {attendanceRecords.length > 0 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Showing {attendanceRecords.length} records
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-slate-600 px-3">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default ExpertAttendancePage;
