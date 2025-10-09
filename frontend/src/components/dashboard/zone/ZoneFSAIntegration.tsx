'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Ticket, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  Building,
  Target,
  Award,
  RefreshCw,
  Eye,
  Filter,
  Search
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
  Cell
} from 'recharts';
import { apiClient } from '@/lib/api/api-client';
import { toast } from 'sonner';

interface FSAData {
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
}

interface ZoneFSAIntegrationProps {
  zoneDashboardData: any;
}

export default function ZoneFSAIntegration({ zoneDashboardData }: ZoneFSAIntegrationProps) {
  const [fsaData, setFsaData] = useState<FSAData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('30d');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

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

  const fetchFSAData = async (showSuccessMessage = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/fsa/dashboard?timeframe=${timeframe}`);
      
      if (response.success) {
        setFsaData(response.data.dashboard);
        
        if (showSuccessMessage) {
          toast.success('FSA data refreshed successfully');
        }
      } else {
        throw new Error(response.error || 'Failed to fetch FSA data');
      }
    } catch (err: any) {
      console.error('Error fetching FSA data:', err);
      setError(err.message || 'Failed to load FSA data');
      if (showSuccessMessage) {
        toast.error('Failed to load FSA data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFSAData();
  }, [timeframe]);

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

  const filteredTickets = fsaData?.recentActivity.tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  }) || [];

  if (loading && !fsaData) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Loading FSA data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !fsaData) {
    return (
      <Card className="shadow-lg border-red-200">
        <CardContent className="p-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">FSA Data Unavailable</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => fetchFSAData(true)} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          Field Service Analytics (FSA)
        </h2>
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => fetchFSAData(true)}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {fsaData && (
        <>
          {/* FSA Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Tickets</p>
                    <p className="text-3xl font-bold text-blue-700">{fsaData.overview.totalTickets}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                    <Ticket className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-red-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Open Tickets</p>
                    <p className="text-3xl font-bold text-orange-700">{fsaData.overview.openTickets}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Resolution Rate</p>
                    <p className="text-3xl font-bold text-green-700">{fsaData.overview.resolutionRate}%</p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Avg Resolution</p>
                    <p className="text-3xl font-bold text-purple-700">{fsaData.overview.avgResolutionTime}h</p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FSA Analytics Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px] bg-white shadow-lg border-0">
              <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                <PieChart className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                <Ticket className="h-4 w-4 mr-2" />
                Recent Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                    <CardTitle className="flex items-center">
                      <PieChart className="h-5 w-5 mr-2" />
                      Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {fsaData.distribution.byStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={fsaData.distribution.byStatus}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="count"
                            nameKey="status"
                            label={(entry: any) => `${entry.status}: ${entry.percentage}%`}
                          >
                            {fsaData.distribution.byStatus.map((entry, index) => (
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

                {/* Priority Distribution */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Priority Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {fsaData.distribution.byPriority.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={fsaData.distribution.byPriority}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="priority" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {fsaData.distribution.byPriority.map((entry, index) => (
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
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                      <div className="text-2xl font-bold text-blue-600">
                        {fsaData.overview.resolutionRate}%
                      </div>
                      <div className="text-sm text-blue-700 mt-1">Resolution Rate</div>
                      <Progress value={fsaData.overview.resolutionRate} className="mt-2" />
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                      <div className="text-2xl font-bold text-green-600">
                        {fsaData.overview.slaCompliance || 0}%
                      </div>
                      <div className="text-sm text-green-700 mt-1">SLA Compliance</div>
                      <Progress value={fsaData.overview.slaCompliance || 0} className="mt-2" />
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                      <div className="text-2xl font-bold text-purple-600">
                        {fsaData.overview.avgResolutionTime}h
                      </div>
                      <div className="text-sm text-purple-700 mt-1">Avg Resolution Time</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Ticket className="h-5 w-5 mr-2 text-blue-600" />
                      Recent Tickets
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Search tickets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-48"
                      />
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="OPEN">Open</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="RESOLVED">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {filteredTickets.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No tickets found matching your criteria</p>
                      </div>
                    ) : (
                      filteredTickets.slice(0, 10).map((ticket) => (
                        <motion.div
                          key={ticket.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-sm font-mono text-gray-500">#{ticket.id}</div>
                            <div>
                              <p className="font-semibold text-gray-900">{ticket.title}</p>
                              <p className="text-sm text-gray-600">
                                {ticket.assignedTo ? `Assigned to ${ticket.assignedTo.name}` : 'Unassigned'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityBadgeColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                            <Badge className={getStatusBadgeColor(ticket.status)}>
                              {ticket.status}
                            </Badge>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
