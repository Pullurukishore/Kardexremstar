'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Calendar, Plus, Search, Filter, Clock, User, AlertCircle, CheckCircle, 
  XCircle, TrendingUp, Users, Activity, Eye, Pencil as Edit, MapPin, 
  ChevronLeft, ChevronRight, Sparkles, Zap, Target, RefreshCw,
  LayoutGrid, List, ArrowUpRight, Timer, Building2, X
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ActivityScheduleDetail from '@/components/activity-schedule/ActivityScheduleDetail';

interface ActivitySchedule {
  id: number;
  servicePersonId: number;
  description?: string;
  activityType: string;
  priority: string;
  scheduledDate: string;
  estimatedDuration?: number;
  location?: string;
  status: string;
  zoneId?: string;
  servicePerson: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
  scheduledBy: {
    id: number;
    name: string;
    email: string;
  };
  ticket?: {
    id: number;
    title: string;
    status: string;
  };
  zone?: {
    id: number;
    name: string;
  };
  customer?: {
    id: number;
    companyName: string;
  };
}

interface Stats {
  total: number;
  pending: number;
  accepted: number;
  completed: number;
  rejected: number;
  cancelled: number;
  completionRate: number;
  acceptanceRate: number;
}

export default function ActivitySchedulingClient() {
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = pathname.includes('/admin/');
  const isZone = pathname.includes('/zone/');
  const isExpert = pathname.includes('/expert/');
  const [schedules, setSchedules] = useState<ActivitySchedule[]>([]);
  const [stats, setStats] = useState<Stats>({ 
    total: 0, 
    pending: 0, 
    accepted: 0, 
    completed: 0,
    rejected: 0,
    cancelled: 0,
    completionRate: 0,
    acceptanceRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedSchedule, setSelectedSchedule] = useState<ActivitySchedule | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [zoneFilter, setZoneFilter] = useState('all');
  const [servicePersonFilter, setServicePersonFilter] = useState('all');
  const [zones, setZones] = useState<any[]>([]);
  const [servicePersons, setServicePersons] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showFilters, setShowFilters] = useState(true);

  const getBasePath = () => `/${isAdmin ? 'admin' : isZone ? 'zone' : 'expert'}`;

  // Fetch schedules
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter && priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (search) params.append('search', search);
      if (zoneFilter && zoneFilter !== 'all') params.append('zoneId', zoneFilter);
      if (servicePersonFilter && servicePersonFilter !== 'all') params.append('servicePersonId', servicePersonFilter);
      params.append('sortBy', 'date');
      params.append('sortOrder', 'desc');

      const response = await apiClient.get(`/activity-schedule?${params.toString()}`);
      
      if (response.success) {
        const schedulesData = response.data || [];
        setSchedules(schedulesData);
        setTotalPages(response.pagination?.totalPages || 1);
        
        const total = response.pagination?.total || schedulesData.length;
        const pending = schedulesData.filter((s: ActivitySchedule) => s.status === 'PENDING').length;
        const accepted = schedulesData.filter((s: ActivitySchedule) => s.status === 'ACCEPTED').length;
        const completed = schedulesData.filter((s: ActivitySchedule) => s.status === 'COMPLETED').length;
        const rejected = schedulesData.filter((s: ActivitySchedule) => s.status === 'REJECTED').length;
        const cancelled = schedulesData.filter((s: ActivitySchedule) => s.status === 'CANCELLED').length;
        
        setStats({ 
          total, 
          pending, 
          accepted, 
          completed,
          rejected,
          cancelled,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          acceptanceRate: (pending + accepted + rejected) > 0 ? Math.round((accepted / (pending + accepted + rejected)) * 100) : 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterData = async () => {
    try {
      // Fetch zones
      const zonesResponse = await apiClient.get('/service-zones');
      if (zonesResponse.success && zonesResponse.data) {
        setZones(Array.isArray(zonesResponse.data) ? zonesResponse.data : []);
      }
      
      // Fetch service persons
      const servicePersonsResponse = await apiClient.get('/service-persons');
      if (servicePersonsResponse.success && servicePersonsResponse.data) {
        setServicePersons(Array.isArray(servicePersonsResponse.data) ? servicePersonsResponse.data : []);
      }
    } catch (error: any) {
      console.error('Error fetching filter data:', error);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchFilterData();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [page, statusFilter, priorityFilter, search, zoneFilter, servicePersonFilter]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { 
          gradient: 'from-amber-500 to-orange-500', 
          bg: 'bg-gradient-to-r from-amber-50 to-orange-50', 
          text: 'text-amber-700',
          border: 'border-amber-200',
          icon: <AlertCircle className="h-4 w-4" />
        };
      case 'ACCEPTED':
        return { 
          gradient: 'from-blue-500 to-indigo-500', 
          bg: 'bg-gradient-to-r from-blue-50 to-indigo-50', 
          text: 'text-blue-700',
          border: 'border-blue-200',
          icon: <CheckCircle className="h-4 w-4" />
        };
      case 'COMPLETED':
        return { 
          gradient: 'from-emerald-500 to-teal-500', 
          bg: 'bg-gradient-to-r from-emerald-50 to-teal-50', 
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          icon: <CheckCircle className="h-4 w-4" />
        };
      case 'REJECTED':
        return { 
          gradient: 'from-red-500 to-rose-500', 
          bg: 'bg-gradient-to-r from-red-50 to-rose-50', 
          text: 'text-red-700',
          border: 'border-red-200',
          icon: <XCircle className="h-4 w-4" />
        };
      case 'CANCELLED':
        return { 
          gradient: 'from-gray-500 to-slate-500', 
          bg: 'bg-gradient-to-r from-gray-50 to-slate-50', 
          text: 'text-gray-700',
          border: 'border-gray-200',
          icon: <X className="h-4 w-4" />
        };
      default:
        return { 
          gradient: 'from-gray-500 to-slate-500', 
          bg: 'bg-gradient-to-r from-gray-50 to-slate-50', 
          text: 'text-gray-700',
          border: 'border-gray-200',
          icon: null 
        };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return { color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', icon: <Zap className="h-3 w-3" /> };
      case 'HIGH':
        return { color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', icon: <Target className="h-3 w-3" /> };
      case 'MEDIUM':
        return { color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', icon: <Activity className="h-3 w-3" /> };
      case 'LOW':
        return { color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', icon: <CheckCircle className="h-3 w-3" /> };
      default:
        return { color: 'bg-gray-500', text: 'text-gray-700', bg: 'bg-gray-50', icon: null };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setSearch('');
    setZoneFilter('all');
    setServicePersonFilter('all');
  };

  const hasActiveFilters = (statusFilter && statusFilter !== 'all') || (priorityFilter && priorityFilter !== 'all') || search || (zoneFilter && zoneFilter !== 'all') || (servicePersonFilter && servicePersonFilter !== 'all');

  return (
    <div className="space-y-8">
      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Scheduled */}
        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-90" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGMxOS44ODIgMCAxOC04LjA1OSAxOC0xOHMtOC4wNTktMTgtMTgtMTh6IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')] opacity-30" />
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Scheduled</p>
                <p className="text-4xl font-bold text-white">{stats.total}</p>
                <p className="text-blue-100 text-xs mt-2 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  All time activities
                </p>
              </div>
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Response */}
        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 opacity-90" />
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium mb-1">Pending Response</p>
                <p className="text-4xl font-bold text-white">{stats.pending}</p>
                <div className="mt-3">
                  <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 opacity-90" />
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-1">Completion Rate</p>
                <p className="text-4xl font-bold text-white">{stats.completionRate}%</p>
                <div className="mt-3">
                  <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${stats.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acceptance Rate */}
        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 opacity-90" />
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-100 text-sm font-medium mb-1">Acceptance Rate</p>
                <p className="text-4xl font-bold text-white">{stats.acceptanceRate}%</p>
                <div className="mt-3">
                  <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${stats.acceptanceRate}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => router.push(`${getBasePath()}/activity-scheduling/new`)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
          >
            <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            New Schedule
          </Button>
          <Button 
            variant="outline" 
            onClick={fetchSchedules}
            className="border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-blue-600 text-white' : 'border-gray-200'}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                !
              </span>
            )}
          </Button>
          <div className="border-l border-gray-200 h-8 mx-2" />
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="border-0 shadow-lg overflow-hidden animate-in slide-in-from-top-2 duration-300">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Filter className="h-4 w-4 text-blue-600" />
                </div>
                Filters & Search
              </CardTitle>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search activities..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="PENDING">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full" />
                        Pending
                      </div>
                    </SelectItem>
                    <SelectItem value="ACCEPTED">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        Accepted
                      </div>
                    </SelectItem>
                    <SelectItem value="COMPLETED">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        Completed
                      </div>
                    </SelectItem>
                    <SelectItem value="REJECTED">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        Rejected
                      </div>
                    </SelectItem>
                    <SelectItem value="CANCELLED">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full" />
                        Cancelled
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="URGENT">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-red-500" />
                        Urgent
                      </div>
                    </SelectItem>
                    <SelectItem value="HIGH">
                      <div className="flex items-center gap-2">
                        <Target className="h-3 w-3 text-orange-500" />
                        High
                      </div>
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-blue-500" />
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="LOW">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Low
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zone</label>
                <Select value={zoneFilter} onValueChange={setZoneFilter}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="All zones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All zones</SelectItem>
                    {zones.map((zone: any) => (
                      <SelectItem key={zone.id} value={zone.id.toString()}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Person</label>
                <Select value={servicePersonFilter} onValueChange={setServicePersonFilter}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="All persons" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All persons</SelectItem>
                    {servicePersons.map((person: any) => (
                      <SelectItem key={person.id} value={person.id.toString()}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedules Content */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-white to-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Activity Schedules</CardTitle>
                <CardDescription className="text-gray-500">
                  {schedules.length} schedule{schedules.length !== 1 ? 's' : ''} found
                  {loading && ' • Loading...'}
                </CardDescription>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Page {page} of {totalPages}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
              </div>
              <p className="text-gray-600 font-medium">Loading schedules...</p>
              <p className="text-gray-400 text-sm mt-1">Please wait</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No schedules found</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {hasActiveFilters 
                  ? 'Try adjusting your filters to find more results'
                  : 'Create your first activity schedule to get started'}
              </p>
              <div className="flex items-center justify-center gap-3">
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
                <Button 
                  onClick={() => router.push(`${getBasePath()}/activity-scheduling/new`)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Schedule
                </Button>
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {schedules.map((schedule) => {
                const statusConfig = getStatusConfig(schedule.status);
                const priorityConfig = getPriorityConfig(schedule.priority);
                
                return (
                  <Card 
                    key={schedule.id} 
                    className="border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer"
                    onClick={() => router.push(`${getBasePath()}/activity-scheduling/${schedule.id}`)}
                  >
                    <div className={`h-2 bg-gradient-to-r ${statusConfig.gradient}`} />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${statusConfig.gradient} text-white shadow-md`}>
                            <Activity className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {schedule.activityType.replace(/_/g, ' ')}
                            </p>
                            <p className="text-sm text-gray-500">#{schedule.id}</p>
                          </div>
                        </div>
                        <Badge className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}>
                          {statusConfig.icon}
                          <span className="ml-1">{schedule.status}</span>
                        </Badge>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{schedule.servicePerson.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(schedule.scheduledDate)}</span>
                          <Clock className="h-4 w-4 text-gray-400 ml-2" />
                          <span>{formatTime(schedule.scheduledDate)}</span>
                        </div>
                        {schedule.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="truncate">{schedule.location}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${priorityConfig.color}`} />
                          <span className={`text-xs font-medium ${priorityConfig.text}`}>{schedule.priority}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 group-hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`${getBasePath()}/activity-scheduling/${schedule.id}`);
                          }}
                        >
                          View Details
                          <ArrowUpRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Activity</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned To</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created By</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Zone</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {schedules.map((schedule) => {
                    const statusConfig = getStatusConfig(schedule.status);
                    const priorityConfig = getPriorityConfig(schedule.priority);

                    return (
                      <tr key={schedule.id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="px-3 py-2">
                          <span 
                            onClick={() => router.push(`${getBasePath()}/activity-scheduling/${schedule.id}`)}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded cursor-pointer hover:from-blue-600 hover:to-indigo-700 hover:shadow-md transition-all"
                          >
                            #{schedule.id}
                          </span>
                        </td>
                        
                        <td className="px-3 py-2">
                          <div 
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => router.push(`${getBasePath()}/activity-scheduling/${schedule.id}`)}
                          >
                            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${statusConfig.gradient} text-white`}>
                              <Activity className="h-3 w-3" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-900 group-hover:text-blue-600 group-hover:underline">
                                {schedule.activityType.replace(/_/g, ' ')}
                              </p>
                              {schedule.description && (
                                <p className="text-xs text-gray-500 truncate max-w-[120px]">{schedule.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-3 py-2">
                          <Badge className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border text-xs py-0.5`}>
                            {statusConfig.icon}
                            <span className="ml-1">{schedule.status}</span>
                          </Badge>
                        </td>
                        
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${priorityConfig.color}`} />
                            <span className={`text-xs font-medium ${priorityConfig.text}`}>{schedule.priority}</span>
                          </div>
                        </td>
                        
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {schedule.servicePerson.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-900">{schedule.servicePerson.name}</span>
                          </div>
                        </td>
                        
                        <td className="px-3 py-2">
                          {schedule.scheduledBy ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {schedule.scheduledBy.name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <span className="text-sm text-gray-900">{schedule.scheduledBy.name || 'Unknown'}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        
                        <td className="px-3 py-2">
                          {schedule.zone ? (
                            <span className="text-sm text-gray-700 font-medium">{schedule.zone.name}</span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        
                        <td className="px-3 py-2">
                          {schedule.customer ? (
                            <span className="text-sm text-gray-700 truncate max-w-[100px] block">{schedule.customer.companyName}</span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        
                        <td className="px-3 py-2">
                          <div className="text-xs">
                            <span className="text-gray-900 font-medium">{formatDate(schedule.scheduledDate)}</span>
                            <span className="text-gray-500 ml-1">{formatTime(schedule.scheduledDate)}</span>
                          </div>
                        </td>
                        
                        <td className="px-3 py-2">
                          {schedule.location ? (
                            <span className="text-xs text-gray-600 truncate max-w-[80px] block">{schedule.location}</span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => router.push(`${getBasePath()}/activity-scheduling/${schedule.id}`)}
                              className="h-7 px-2 text-xs border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            {schedule.status === 'PENDING' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => router.push(`${getBasePath()}/activity-scheduling/${schedule.id}/edit`)}
                                className="h-7 px-2 text-xs border-gray-200 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t">
              <div className="text-sm text-gray-600">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, stats.total)} of {stats.total} schedules
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="border-gray-200"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className={`h-9 w-9 p-0 ${pageNum === page ? 'bg-blue-600 text-white' : 'border-gray-200'}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="border-gray-200"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity Schedule Details</DialogTitle>
          </DialogHeader>
          {selectedSchedule && (
            <ActivityScheduleDetail
              schedule={selectedSchedule}
              onRefresh={() => {
                setIsDetailDialogOpen(false);
                fetchSchedules();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
