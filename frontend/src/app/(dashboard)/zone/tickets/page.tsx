"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import api from '@/lib/api/axios';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MobilePageHeader, MobileCard, MobileTable } from '@/components/ui/mobile-responsive';
import { Plus, Search, Filter, RefreshCw, List, AlertCircle, Users, Clock, CheckCircle, XCircle, Eye, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

type TicketStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'ONSITE_VISIT' | 
  'ONSITE_VISIT_PLANNED' | 'PO_NEEDED' | 'PO_RECEIVED' | 'SPARE_PARTS_NEEDED' | 
  'SPARE_PARTS_BOOKED' | 'SPARE_PARTS_DELIVERED' | 'CLOSED_PENDING' | 'CLOSED' | 
  'CANCELLED' | 'REOPENED' | 'ON_HOLD' | 'ESCALATED' | 'RESOLVED' | 'PENDING';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type Ticket = {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    companyName: string;
  };
  assignedTo?: {
    id: number;
    email: string;
    name?: string;
  };
  zone?: {
    id: number;
    name: string;
  };
};

type ApiResponse = {
  data: Ticket[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export default function ZoneTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    page: 1,
    limit: 30,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 30,
    totalPages: 1,
  });
  
  const router = useRouter();
  const { toast } = useToast();

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.search && { search: filters.search }),
        ...(activeTab === 'assigned' && { view: 'assigned' }),
        ...(activeTab === 'unassigned' && { view: 'unassigned' }),
      });

      const response = await api.get(`/tickets?${queryParams}`);
      const data: ApiResponse = response.data;
      setTickets(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tickets. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filters.page, filters.status, filters.priority, filters.limit, activeTab]);

  const handleSearch = () => {
    setFilters({ ...filters, page: 1 });
    fetchTickets();
  };

  const getStatusBadgeVariant = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return 'default';
      case 'ASSIGNED':
        return 'secondary';
      case 'IN_PROGRESS':
        return 'default';
      case 'ONSITE_VISIT_PLANNED':
        return 'outline';
      case 'ONSITE_VISIT':
        return 'default';
      case 'CLOSED_PENDING':
        return 'secondary';
      case 'CLOSED':
        return 'secondary';
      case 'SPARE_PARTS_NEEDED':
        return 'outline';
      case 'SPARE_PARTS_BOOKED':
        return 'secondary';
      case 'SPARE_PARTS_DELIVERED':
        return 'default';
      case 'PO_NEEDED':
        return 'outline';
      case 'PO_RECEIVED':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: Priority) => {
    switch (priority) {
      case 'LOW':
        return 'outline';
      case 'MEDIUM':
        return 'secondary';
      case 'HIGH':
        return 'default';
      case 'CRITICAL':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Calculate stats
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'OPEN').length;
  const assignedTickets = tickets.filter(t => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS').length;
  const closedTickets = tickets.filter(t => t.status === 'CLOSED').length;
  const criticalTickets = tickets.filter(t => t.priority === 'CRITICAL').length;

  // Mobile ticket card component
  const TicketMobileCard = ({ ticket }: { ticket: Ticket }) => (
    <MobileCard className="hover:shadow-md transition-shadow duration-200">
      <div className="space-y-4">
        {/* Header with ticket info */}
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            #{ticket.id}
          </div>
          <div className="min-w-0 flex-1">
            <button 
              onClick={() => router.push(`/zone/tickets/${ticket.id}`)}
              className="font-semibold text-lg text-gray-900 hover:text-indigo-600 transition-colors block leading-tight text-left"
            >
              {ticket.title}
            </button>
            <div className="text-sm text-gray-500 mt-1">
              {ticket.customer?.companyName || 'No customer'}
            </div>
          </div>
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/zone/tickets/${ticket.id}`)}
              className="hover:bg-indigo-50 hover:text-indigo-600 btn-touch"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status and Priority */}
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant={getStatusBadgeVariant(ticket.status)}
            className={
              ticket.status === 'OPEN' ? 'bg-orange-100 text-orange-800' :
              ticket.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
              ticket.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-800' :
              ticket.status === 'CLOSED' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-600'
            }
          >
            {ticket.status.replace(/_/g, ' ')}
          </Badge>
          <Badge 
            variant={getPriorityBadgeVariant(ticket.priority)}
            className={
              ticket.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
              ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
              ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-600'
            }
          >
            {ticket.priority}
          </Badge>
        </div>

        {/* Assignment and Date */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Assigned to:</span>
            <span className="font-medium">
              {ticket.assignedTo ? 
                (ticket.assignedTo.name || ticket.assignedTo.email.split('@')[0]) : 
                'Unassigned'
              }
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Created:</span>
            <span className="font-medium">
              {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      </div>
    </MobileCard>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto py-6 space-y-6"
    >
      {/* Desktop Header with Gradient */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="hidden md:block relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 p-6 text-white"
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Zone Tickets</h1>
            <p className="text-indigo-100">
              Manage and track tickets in your service zone
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center text-indigo-100">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">Your Zone</span>
            </div>
            <Button 
              onClick={() => router.push('/zone/tickets/create')}
              className="bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Mobile Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="md:hidden"
      >
        <MobilePageHeader
          title="Zone Tickets"
          description="Manage and track tickets in your service zone"
          action={
            <Button 
              onClick={() => router.push('/zone/tickets/create')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" /> New
            </Button>
          }
        />
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
      >
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">Total Tickets</p>
                <p className="text-2xl font-bold text-indigo-900">{totalTickets}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-500 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Open Tickets</p>
                <p className="text-2xl font-bold text-orange-900">{openTickets}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-900">{assignedTickets}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Closed</p>
                <p className="text-2xl font-bold text-green-900">{closedTickets}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Critical</p>
                <p className="text-2xl font-bold text-red-900">{criticalTickets}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg pb-3">
            <div className="tabs-mobile">
              <Button
                variant={activeTab === 'all' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('all')}
                className={`btn-touch ${activeTab === 'all' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'hover:bg-indigo-50'}`}
                size="sm"
              >
                <List className="mr-1 md:mr-2 h-4 w-4" />
                <span className="text-xs md:text-sm">All</span>
              </Button>
              <Button
                variant={activeTab === 'assigned' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('assigned')}
                className={`btn-touch ${activeTab === 'assigned' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'hover:bg-blue-50'}`}
                size="sm"
              >
                <Users className="mr-1 md:mr-2 h-4 w-4" />
                <span className="text-xs md:text-sm">Assigned</span>
              </Button>
              <Button
                variant={activeTab === 'unassigned' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('unassigned')}
                className={`btn-touch ${activeTab === 'unassigned' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'hover:bg-orange-50'}`}
                size="sm"
              >
                <AlertCircle className="mr-1 md:mr-2 h-4 w-4" />
                <span className="text-xs md:text-sm">Unassigned</span>
              </Button>
            </div>
          </CardHeader>
          {/* Enhanced Search and Filters */}
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="search"
                    placeholder="Search tickets by ID, title, or customer..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
                >
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="ONSITE_VISIT_PLANNED">Onsite Visit Planned</SelectItem>
                    <SelectItem value="ONSITE_VISIT">Onsite Visit</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED_PENDING">Closed Pending</SelectItem>
                    <SelectItem value="SPARE_PARTS_NEEDED">Spare Parts Needed</SelectItem>
                    <SelectItem value="SPARE_PARTS_BOOKED">Spare Parts Booked</SelectItem>
                    <SelectItem value="SPARE_PARTS_DELIVERED">Spare Parts Delivered</SelectItem>
                    <SelectItem value="PO_NEEDED">PO Needed</SelectItem>
                    <SelectItem value="PO_RECEIVED">PO Received</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select
                  value={filters.priority}
                  onValueChange={(value) => setFilters({ ...filters, priority: value, page: 1 })}
                >
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Priorities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={fetchTickets}
                  className="hover:bg-indigo-50 hover:border-indigo-300"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Desktop Table View */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="hidden md:block"
      >
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
            <CardTitle className="text-gray-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-indigo-600" />
              Zone Tickets ({tickets.length})
            </CardTitle>
            <CardDescription>
              Track and manage tickets in your service zone
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {tickets.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
                  <AlertCircle className="h-12 w-12 text-indigo-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No tickets found</h3>
                <p className="text-gray-500 mb-6">
                  {activeTab === 'assigned' ? 'No tickets are currently assigned.' : 
                   activeTab === 'unassigned' ? 'All tickets in your zone are assigned.' :
                   'Create your first support ticket to get started.'}
                </p>
                <Button 
                  onClick={() => router.push('/zone/tickets/create')}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Ticket
                </Button>
              </div>
            ) : (
              <MobileTable>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700 min-w-[250px]">Ticket Details</th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700 min-w-[150px]">Customer</th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700 min-w-[180px]">Status & Priority</th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700 min-w-[180px]">Assigned To</th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700 w-32">Created</th>
                        <th className="text-right py-4 px-6 font-semibold text-gray-700 w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8">
                            <div className="flex items-center justify-center">
                              <RefreshCw className="h-6 w-6 animate-spin text-indigo-500 mr-2" />
                              Loading tickets...
                            </div>
                          </td>
                        </tr>
                      ) : (
                        tickets.map((ticket) => (
                          <motion.tr 
                            key={ticket.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all duration-200"
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                  #{ticket.id}
                                </div>
                                <div className="min-w-0">
                                  <button 
                                    onClick={() => router.push(`/zone/tickets/${ticket.id}`)}
                                    className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-left break-all"
                                  >
                                    {ticket.title}
                                  </button>
                                  <div className="text-sm text-gray-500">Ticket #{ticket.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-medium text-gray-900 break-all">
                                {ticket.customer?.companyName || 'N/A'}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="space-y-2">
                                <Badge 
                                  variant={getStatusBadgeVariant(ticket.status)}
                                  className={
                                    ticket.status === 'OPEN' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                                    ticket.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                                    ticket.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' :
                                    ticket.status === 'CLOSED' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                    'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }
                                >
                                  {ticket.status.replace(/_/g, ' ')}
                                </Badge>
                                <div>
                                  <Badge 
                                    variant={getPriorityBadgeVariant(ticket.priority)}
                                    className={
                                      ticket.priority === 'CRITICAL' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                                      ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                                      ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                                      'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }
                                  >
                                    {ticket.priority}
                                  </Badge>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              {ticket.assignedTo ? (
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                                    {ticket.assignedTo.name?.charAt(0) || ticket.assignedTo.email.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-gray-900 break-all">
                                      {ticket.assignedTo.name || ticket.assignedTo.email.split('@')[0]}
                                    </div>
                                    <div className="text-xs text-gray-500 break-all">
                                      {ticket.assignedTo.email}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-500 italic">Unassigned</span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-sm text-gray-900">
                                {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                              </div>
                              <div className="text-xs text-gray-500">
                                {format(new Date(ticket.createdAt), 'h:mm a')}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/zone/tickets/${ticket.id}`)}
                                className="hover:bg-indigo-50 hover:text-indigo-600"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </MobileTable>
            )}
            
            {/* Enhanced Pagination */}
            {pagination.totalPages > 1 && (
              <div className="border-t bg-gray-50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing page <span className="font-semibold">{filters.page}</span> of{' '}
                    <span className="font-semibold">{pagination.totalPages}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                      disabled={filters.page === 1}
                      className="hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-50"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={filters.page === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilters({ ...filters, page })}
                            className={
                              filters.page === page
                                ? "bg-indigo-600 hover:bg-indigo-700"
                                : "hover:bg-indigo-50 hover:border-indigo-300"
                            }
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ ...filters, page: Math.min(pagination.totalPages, filters.page + 1) })}
                      disabled={filters.page >= pagination.totalPages}
                      className="hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-50"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Mobile Card View */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="md:hidden space-y-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-800">
            Zone Tickets ({tickets.length})
          </h2>
        </div>
        {tickets.length === 0 ? (
          <MobileCard className="text-center py-8">
            <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-10 w-10 text-indigo-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tickets found</h3>
            <p className="text-gray-500 mb-6 text-sm">
              {activeTab === 'assigned' ? 'No tickets are currently assigned.' : 
               activeTab === 'unassigned' ? 'All tickets in your zone are assigned.' :
               'Create your first support ticket to get started.'}
            </p>
            <Button 
              onClick={() => router.push('/zone/tickets/create')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Ticket
            </Button>
          </MobileCard>
        ) : loading ? (
          <MobileCard className="text-center py-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-500 mr-2" />
              Loading tickets...
            </div>
          </MobileCard>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <TicketMobileCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}