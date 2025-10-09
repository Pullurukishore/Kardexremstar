'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Users, 
  Ticket, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Calendar,
  User,
  Building,
  Zap,
  Target,
  Award,
  RefreshCw,
  Filter,
  Search,
  Bell,
  Settings,
  Download,
  Eye,
  ArrowUp,
  ArrowDown,
  MapPin,
  Phone,
  Mail,
  Star,
  Wrench,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { apiClient } from '@/lib/api/api-client';
import { toast } from 'sonner';

// Enhanced Types for FSA Dashboard
interface FSADashboardData {
  overview: {
    customerName?: string;
    serviceZone?: string;
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    resolutionRate: number;
    avgResolutionTime: string;
    slaCompliance?: number;
  };
  distribution: {
    byStatus: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    byPriority: Array<{
      priority: string;
      count: number;
      percentage: number;
    }>;
  };
  recentActivity: {
    tickets: Array<{
      id: number;
      title: string;
      status: string;
      priority: string;
      createdAt: string;
      assignedTo?: {
        id: number;
        name: string;
        email: string;
      };
      lastStatusChange: string;
    }>;
  };
  performance?: any;
}

interface ZoneAnalytics {
  zoneInfo: {
    id: number;
    name: string;
    description: string;
    isActive: boolean;
  };
  overview: {
    totalCustomers: number;
    totalServicePersons: number;
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    resolutionRate: number;
    avgResolutionTime: string;
    slaCompliance: number;
  };
  distribution: {
    byStatus: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    byPriority: Array<{
      priority: string;
      count: number;
      percentage: number;
    }>;
  };
  performance: {
    customers: Array<{
      id: number;
      name: string;
      ticketCount: number;
      resolvedTickets: number;
      resolutionRate: number;
    }>;
    servicePersons: Array<{
      id: number;
      name: string;
      email: string;
      ticketCount: number;
      resolvedTickets: number;
      resolutionRate: number;
      avgResolutionTime: string;
    }>;
  };
}

interface FSAZoneClientProps {
  initialDashboardData: FSADashboardData | null;
  initialZoneAnalytics: ZoneAnalytics | null;
}

const FSAZoneClient: React.FC<FSAZoneClientProps> = ({
  initialDashboardData,
  initialZoneAnalytics
}) => {
  const [dashboardData, setDashboardData] = useState<FSADashboardData | null>(initialDashboardData);
  const [zoneAnalytics, setZoneAnalytics] = useState<ZoneAnalytics | null>(initialZoneAnalytics);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('30d');
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Enhanced color schemes
  const statusColors = {
    'OPEN': '#ef4444',
    'ASSIGNED': '#f97316', 
    'IN_PROGRESS': '#eab308',
    'RESOLVED': '#22c55e',
    'CLOSED': '#10b981',
    'ON_HOLD': '#6b7280',
    'ESCALATED': '#dc2626'
  };

  const priorityColors = {
    'LOW': '#22c55e',
    'MEDIUM': '#eab308',
    'HIGH': '#f97316',
    'CRITICAL': '#ef4444'
  };

  const gradientThemes = {
    primary: 'from-indigo-500 to-purple-600',
    success: 'from-emerald-500 to-teal-600',
    warning: 'from-amber-500 to-orange-600',
    danger: 'from-red-500 to-pink-600',
    info: 'from-blue-500 to-cyan-600'
  };

  const fetchFSAData = async (showSuccessMessage = false) => {
    try {
      setLoading(true);
      setError(null);
      setRefreshing(true);

      // Fetch dashboard data
      const dashboardResponse = await apiClient.get(`/fsa/dashboard?timeframe=${timeframe}`);
      
      if (dashboardResponse.success) {
        setDashboardData(dashboardResponse.data.dashboard);
        
        // Try to fetch zone analytics
        try {
          const userResponse = await apiClient.get('/auth/me');
          
          if (userResponse.success && userResponse.data.user) {
            const user = userResponse.data.user;
            let zoneId = selectedZoneId;
            
            if (!zoneId) {
              if (user.zoneIds && user.zoneIds.length > 0) {
                zoneId = user.zoneIds[0];
              } else if (user.customer && user.customer.serviceZoneId) {
                zoneId = user.customer.serviceZoneId;
              }
            }
            
            if (zoneId) {
              const zoneResponse = await apiClient.get(`/fsa/zones/${zoneId}?timeframe=${timeframe}`);
              if (zoneResponse.success) {
                setZoneAnalytics(zoneResponse.data);
                setSelectedZoneId(zoneId);
              }
            }
          }
        } catch (zoneError: any) {
          console.warn('Could not fetch zone analytics:', zoneError);
        }
        
        // Only show success message when explicitly requested (manual refresh)
        if (showSuccessMessage) {
          toast.success('FSA dashboard data refreshed successfully');
        }
      } else {
        throw new Error(dashboardResponse.error || 'Failed to fetch FSA data');
      }
    } catch (err: any) {
      console.error('Error fetching FSA data:', err);
      setError(err.message || 'Failed to load FSA data');
      toast.error('Failed to load FSA dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Only fetch if we don't have initial data or timeframe/zone changed
    if (!initialDashboardData || timeframe !== '30d' || selectedZoneId) {
      fetchFSAData();
    }
  }, [timeframe, selectedZoneId]);

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      'OPEN': 'bg-red-100 text-red-800 border-red-200',
      'ASSIGNED': 'bg-orange-100 text-orange-800 border-orange-200',
      'IN_PROGRESS': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'RESOLVED': 'bg-green-100 text-green-800 border-green-200',
      'CLOSED': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'ON_HOLD': 'bg-gray-100 text-gray-800 border-gray-200',
      'ESCALATED': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityBadgeColor = (priority: string) => {
    const colors: Record<string, string> = {
      'LOW': 'bg-green-100 text-green-800 border-green-200',
      'MEDIUM': 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      'HIGH': 'bg-orange-100 text-orange-800 border-orange-200',
      'CRITICAL': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const filteredTickets = dashboardData?.recentActivity.tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  }) || [];

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <motion.div 
          className="flex items-center justify-center h-96"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <RefreshCw className="h-12 w-12 animate-spin text-indigo-600" />
              <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-indigo-400 opacity-20"></div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading FSA Dashboard</h3>
              <p className="text-gray-600">Fetching your zone analytics and performance data...</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-pink-100">
        <motion.div 
          className="flex items-center justify-center h-96"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Card className="p-8 max-w-md shadow-xl border-0">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button 
                onClick={() => fetchFSAData(true)} 
                className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <motion.div 
        className="p-6 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Enhanced Header */}
        <motion.div 
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                FSA Zone Dashboard
              </h1>
              {dashboardData?.overview?.customerName && (
                <p className="text-gray-600 mt-1 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {dashboardData.overview.customerName} - {dashboardData.overview.serviceZone}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-40 border-indigo-200 focus:ring-indigo-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="180d">Last 180 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={() => fetchFSAData(true)}
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="border-indigo-200 hover:bg-indigo-50 text-indigo-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button 
              variant="outline"
              size="sm"
              className="border-indigo-200 hover:bg-indigo-50 text-indigo-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </motion.div>

        {dashboardData && (
          <>
            {/* Enhanced Overview Stats */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="relative overflow-hidden border-0 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600"></div>
                <CardContent className="relative p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Tickets</p>
                      <p className="text-3xl font-bold">{dashboardData.overview.totalTickets}</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        <span className="text-sm">+12% from last month</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white/20 rounded-full">
                      <Ticket className="h-8 w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500"></div>
                <CardContent className="relative p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Open Tickets</p>
                      <p className="text-3xl font-bold">{dashboardData.overview.openTickets}</p>
                      <div className="flex items-center mt-2">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        <span className="text-sm">Needs attention</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white/20 rounded-full">
                      <AlertTriangle className="h-8 w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600"></div>
                <CardContent className="relative p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Resolution Rate</p>
                      <p className="text-3xl font-bold">{dashboardData.overview.resolutionRate}%</p>
                      <div className="flex items-center mt-2">
                        <ArrowUp className="h-4 w-4 mr-1" />
                        <span className="text-sm">Excellent performance</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white/20 rounded-full">
                      <CheckCircle className="h-8 w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-600"></div>
                <CardContent className="relative p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Avg Resolution Time</p>
                      <p className="text-3xl font-bold">{dashboardData.overview.avgResolutionTime}h</p>
                      <div className="flex items-center mt-2">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="text-sm">Within SLA</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white/20 rounded-full">
                      <Clock className="h-8 w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Enhanced Tabs Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px] bg-white shadow-lg border-0">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                    <PieChart className="h-4 w-4 mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                    <Award className="h-4 w-4 mr-2" />
                    Performance
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                    <Activity className="h-4 w-4 mr-2" />
                    Activity
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Enhanced Status Distribution */}
                    <Card className="shadow-xl border-0 overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                        <CardTitle className="flex items-center">
                          <PieChart className="h-5 w-5 mr-2" />
                          Ticket Status Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        {dashboardData.distribution.byStatus.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <RechartsPieChart>
                              <Pie
                                data={dashboardData.distribution.byStatus}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                dataKey="count"
                                nameKey="status"
                                label={(entry: any) => `${entry.status}: ${entry.percentage}%`}
                              >
                                {dashboardData.distribution.byStatus.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={statusColors[entry.status as keyof typeof statusColors] || '#6b7280'} 
                                  />
                                ))}
                              </Pie>
                              <Tooltip />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-64 text-gray-500">
                            <div className="text-center">
                              <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No status data available</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Enhanced Priority Distribution */}
                    <Card className="shadow-xl border-0 overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                        <CardTitle className="flex items-center">
                          <BarChart3 className="h-5 w-5 mr-2" />
                          Priority Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        {dashboardData.distribution.byPriority.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dashboardData.distribution.byPriority}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="priority" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {dashboardData.distribution.byPriority.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={priorityColors[entry.priority as keyof typeof priorityColors] || '#6b7280'} 
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-64 text-gray-500">
                            <div className="text-center">
                              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No priority data available</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6">
                  {zoneAnalytics ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card className="relative overflow-hidden border-0 shadow-xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600"></div>
                        <CardContent className="relative p-6 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-indigo-100 text-sm font-medium">Total Customers</p>
                              <p className="text-3xl font-bold">{zoneAnalytics.overview.totalCustomers}</p>
                              <div className="flex items-center mt-2">
                                <Building className="h-4 w-4 mr-1" />
                                <span className="text-sm">Active accounts</span>
                              </div>
                            </div>
                            <div className="p-3 bg-white/20 rounded-full">
                              <Building className="h-8 w-8" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="relative overflow-hidden border-0 shadow-xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-600"></div>
                        <CardContent className="relative p-6 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-teal-100 text-sm font-medium">Service Personnel</p>
                              <p className="text-3xl font-bold">{zoneAnalytics.overview.totalServicePersons}</p>
                              <div className="flex items-center mt-2">
                                <Users className="h-4 w-4 mr-1" />
                                <span className="text-sm">Field technicians</span>
                              </div>
                            </div>
                            <div className="p-3 bg-white/20 rounded-full">
                              <Users className="h-8 w-8" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="relative overflow-hidden border-0 shadow-xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-600"></div>
                        <CardContent className="relative p-6 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-emerald-100 text-sm font-medium">SLA Compliance</p>
                              <p className="text-3xl font-bold">{zoneAnalytics.overview.slaCompliance}%</p>
                              <div className="flex items-center mt-2">
                                <Target className="h-4 w-4 mr-1" />
                                <span className="text-sm">Meeting targets</span>
                              </div>
                            </div>
                            <div className="p-3 bg-white/20 rounded-full">
                              <Target className="h-8 w-8" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card className="p-8 text-center">
                      <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Zone Analytics Unavailable</h3>
                      <p className="text-gray-600">Zone-specific analytics data is not available for your current access level.</p>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="performance" className="space-y-6">
                  {zoneAnalytics ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Customer Performance */}
                      <Card className="shadow-xl border-0 overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                          <CardTitle className="flex items-center">
                            <Building className="h-5 w-5 mr-2" />
                            Top Customer Performance
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            {zoneAnalytics.performance.customers.slice(0, 5).map((customer, index) => (
                              <motion.div 
                                key={customer.id} 
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-all"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">{customer.name}</p>
                                    <p className="text-sm text-gray-600">{customer.ticketCount} tickets</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-gray-900">{customer.resolutionRate}%</p>
                                  <Progress value={customer.resolutionRate} className="w-24 mt-1" />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Service Person Performance */}
                      <Card className="shadow-xl border-0 overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                          <CardTitle className="flex items-center">
                            <Award className="h-5 w-5 mr-2" />
                            Top Technician Performance
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            {zoneAnalytics.performance.servicePersons.slice(0, 5).map((person, index) => (
                              <motion.div 
                                key={person.id} 
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-all"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {person.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">{person.name}</p>
                                    <p className="text-sm text-gray-600">{person.ticketCount} tickets</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-gray-900">{person.resolutionRate}%</p>
                                  <p className="text-sm text-gray-600">{person.avgResolutionTime}h avg</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card className="p-8 text-center">
                      <Award className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Performance Data Unavailable</h3>
                      <p className="text-gray-600">Performance metrics are not available for your current access level.</p>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="space-y-6">
                  {/* Enhanced Filters */}
                  <Card className="shadow-lg border-0">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              placeholder="Search tickets by ID or title..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="ASSIGNED">Assigned</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Priority</SelectItem>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Enhanced Activity Feed */}
                  <Card className="shadow-xl border-0 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Activity className="h-5 w-5 mr-2" />
                          Recent Ticket Activity
                        </div>
                        <Badge variant="secondary" className="bg-white/20 text-white border-0">
                          {filteredTickets.length} tickets
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <AnimatePresence>
                        {filteredTickets.length > 0 ? (
                          <div className="space-y-4">
                            {filteredTickets.slice(0, 10).map((ticket, index) => (
                              <motion.div 
                                key={ticket.id}
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-all cursor-pointer"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ scale: 1.02 }}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <span className="font-bold text-indigo-600">#{ticket.id}</span>
                                    <h4 className="font-semibold text-gray-900 truncate">{ticket.title}</h4>
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <Badge className={`${getStatusBadgeColor(ticket.status)} border`}>
                                      {ticket.status}
                                    </Badge>
                                    <Badge className={`${getPriorityBadgeColor(ticket.priority)} border`}>
                                      {ticket.priority}
                                    </Badge>
                                    {ticket.assignedTo && (
                                      <div className="flex items-center text-sm text-gray-600">
                                        <User className="h-4 w-4 mr-1" />
                                        {ticket.assignedTo.name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right text-sm text-gray-600">
                                  <p className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    {new Date(ticket.createdAt).toLocaleDateString()}
                                  </p>
                                  <p className="flex items-center mt-1">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {new Date(ticket.lastStatusChange).toLocaleDateString()}
                                  </p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <Activity className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recent Activity</h3>
                            <p className="text-gray-600">No tickets match your current filters.</p>
                          </div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default FSAZoneClient;
