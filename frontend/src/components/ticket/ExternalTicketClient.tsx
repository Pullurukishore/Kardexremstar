'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api/axios';
import { Ticket, TicketStatus, Priority } from '@/types/ticket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Client-side stats calculation
function calculateClientTicketStats(tickets: Ticket[]) {
  return {
    total: tickets.length,
    open: tickets.filter(t => t.status === TicketStatus.OPEN).length,
    inProgress: tickets.filter(t => 
      t.status === TicketStatus.IN_PROGRESS || 
      t.status === TicketStatus.ASSIGNED ||
      t.status === TicketStatus.ONSITE_VISIT_PLANNED ||
      t.status === TicketStatus.ONSITE_VISIT
    ).length,
    closed: tickets.filter(t => t.status === TicketStatus.CLOSED).length,
  };
}

interface ExternalTicketClientProps {
  initialTickets: Ticket[];
  initialStats: any;
  searchParams: {
    status?: string;
    priority?: string;
    search?: string;
    page?: string;
    limit?: string;
    view?: string;
  };
}

function getStatusBadgeVariant(status: TicketStatus) {
  switch (status) {
    case TicketStatus.OPEN:
      return 'default';
    case TicketStatus.ASSIGNED:
      return 'secondary';
    case TicketStatus.IN_PROGRESS:
      return 'default';
    case TicketStatus.ONSITE_VISIT_PLANNED:
      return 'outline';
    case TicketStatus.ONSITE_VISIT:
      return 'default';
    case TicketStatus.CLOSED_PENDING:
      return 'secondary';
    case TicketStatus.CLOSED:
      return 'secondary';
    case TicketStatus.SPARE_PARTS_NEEDED:
      return 'outline';
    case TicketStatus.SPARE_PARTS_BOOKED:
      return 'secondary';
    case TicketStatus.SPARE_PARTS_DELIVERED:
      return 'default';
    case TicketStatus.PO_NEEDED:
      return 'outline';
    case TicketStatus.PO_REACHED:
      return 'secondary';
    case TicketStatus.PO_RECEIVED:
      return 'default';
    default:
      return 'default';
  }
}

function getPriorityBadgeVariant(priority: Priority) {
  switch (priority) {
    case Priority.LOW:
      return 'outline';
    case Priority.MEDIUM:
      return 'secondary';
    case Priority.HIGH:
      return 'destructive';
    case Priority.CRITICAL:
      return 'destructive';
    default:
      return 'secondary';
  }
}

function getStatusIcon(status: TicketStatus) {
  switch (status) {
    case TicketStatus.OPEN:
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case TicketStatus.ASSIGNED:
    case TicketStatus.IN_PROGRESS:
      return <Clock className="h-4 w-4 text-blue-500" />;
    case TicketStatus.ONSITE_VISIT:
    case TicketStatus.ONSITE_VISIT_PLANNED:
      return <Users className="h-4 w-4 text-purple-500" />;
    case TicketStatus.CLOSED:
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case TicketStatus.CANCELLED:
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
}

export default function ExternalTicketClient({ initialTickets, initialStats, searchParams }: ExternalTicketClientProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const refreshTickets = async () => {
    try {
      setLoading(true);
      
      // Filter out empty string parameters to avoid validation errors
      const cleanParams: any = {};
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value && value !== '' && value !== 'all') {
          cleanParams[key] = value;
        }
      });
      
      const response = await api.get('/tickets', { params: cleanParams });
      const ticketsData = response.data.data || [];
      const calculatedStats = calculateClientTicketStats(ticketsData);
      
      setTickets(ticketsData);
      setStats(calculatedStats);
      toast.success('Tickets refreshed successfully');
    } catch (error) {
      console.error('Error refreshing tickets:', error);
      toast.error('Failed to refresh tickets');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Open</p>
                <p className="text-2xl font-bold text-orange-900">{stats.open || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium">In Progress</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.inProgress || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Closed</p>
                <p className="text-2xl font-bold text-green-900">{stats.closed || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-semibold">Your Support Tickets</CardTitle>
            <CardDescription>
              Track the status of your support requests
            </CardDescription>
          </div>
          <button
            onClick={refreshTickets}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </button>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
              <p className="text-gray-500">You haven't created any support tickets yet.</p>
            </div>
          ) : isMobile ? (
            // Mobile Card Layout
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <Card key={ticket.id} className="border border-gray-200 hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                          #{ticket.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm truncate">
                            {ticket.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {ticket.description}
                          </div>
                        </div>
                      </div>
                      {getStatusIcon(ticket.status)}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant={getStatusBadgeVariant(ticket.status)} className="text-xs">
                        {ticket.status.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant={getPriorityBadgeVariant(ticket.priority)} className="text-xs">
                        {ticket.priority}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">Customer:</span>
                        <span>{ticket.customer?.companyName || 'N/A'}</span>
                      </div>
                      <div className="flex flex-col gap-1 text-right">
                        <span className="font-medium">Created:</span>
                        <span>{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Desktop Table Layout (No Actions Column)
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Ticket</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Customer</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Priority</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-200">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            #{ticket.id}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {ticket.title}
                            </div>
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {ticket.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {ticket.customer?.companyName || 'N/A'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(ticket.status)}
                          <Badge variant={getStatusBadgeVariant(ticket.status)}>
                            {ticket.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
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
