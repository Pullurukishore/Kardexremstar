'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api/axios';
import { Ticket, TicketStatus, Priority, TicketStats } from '@/types/ticket';
import { calculateTicketStats } from '@/lib/utils/ticketStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Users, Clock, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface TicketClientProps {
  initialTickets: Ticket[];
  initialStats: TicketStats;
  initialPagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  searchParams: {
    status?: string;
    priority?: string;
    search?: string;
    page?: string;
    limit?: string;
    view?: 'all' | 'unassigned' | 'assigned-to-zone' | 'assigned-to-service-person';
  };
  basePath?: string; // e.g., '/admin/tickets' or '/expert/tickets'
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
    case TicketStatus.PO_RECEIVED:
      return 'secondary';
    default:
      return 'outline';
  }
}

function getPriorityBadgeVariant(priority: Priority) {
  switch (priority) {
    case Priority.CRITICAL:
      return 'destructive';
    case Priority.HIGH:
      return 'default';
    case Priority.MEDIUM:
      return 'secondary';
    case Priority.LOW:
      return 'outline';
    default:
      return 'outline';
  }
}

const TicketClient = memo(function TicketClient({
  initialTickets,
  initialStats,
  initialPagination,
  searchParams,
  basePath = '/admin/tickets'
}: TicketClientProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [stats, setStats] = useState<TicketStats>(initialStats);
  const [pagination, setPagination] = useState(initialPagination);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const initialLoadComplete = useRef(false);
  const lastSearchParams = useRef<string>('');

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchTicketData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchParams.status) params.append('status', searchParams.status);
      if (searchParams.priority) params.append('priority', searchParams.priority);
      if (searchParams.search) params.append('search', searchParams.search);
      if (searchParams.page) params.append('page', searchParams.page);
      if (searchParams.limit) params.append('limit', searchParams.limit);
      if (searchParams.view && searchParams.view !== 'all') {
        params.append('view', searchParams.view);
      }

      const response = await api.get(`/tickets?${params.toString()}`);
      const ticketData = response.data?.data || [];
      const paginationData = response.data?.pagination || initialPagination;
      
      setTickets(ticketData);
      setPagination(paginationData);
      
      // Calculate stats using shared utility function
      const newStats = calculateTicketStats(ticketData);
      setStats(newStats);
      
      return true;
    } catch (err) {
      setError('Failed to load ticket data. Please try again.');
      toast.error('Failed to refresh ticket data');
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [searchParams]);

  useEffect(() => {
    // Create a string representation of current search params
    const currentSearchParams = JSON.stringify(searchParams);
    
    // Only fetch data if search params have actually changed (not on initial mount)
    if (initialLoadComplete.current && currentSearchParams !== lastSearchParams.current) {
      fetchTicketData();
    } else if (!initialLoadComplete.current) {
      // Mark initial load as complete without fetching (we already have server-side data)
      initialLoadComplete.current = true;
    }
    
    // Update the last search params reference
    lastSearchParams.current = currentSearchParams;
  }, [searchParams, fetchTicketData]);

  const handleRefresh = useCallback(async () => {
    await fetchTicketData();
  }, [fetchTicketData]);

  // Memoize ticket count to prevent unnecessary recalculations
  const ticketCount = useMemo(() => tickets.length, [tickets.length]);

  // Memoize stats to prevent unnecessary recalculations
  const memoizedStats = useMemo(() => stats, [stats]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Failed to load tickets</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", isMobile ? "space-y-4" : "space-y-6")}>
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            "flex items-center gap-2 font-medium rounded-md touch-manipulation",
            isMobile ? "px-3 py-2 text-sm w-full justify-center" : "px-4 py-2 text-sm",
            isRefreshing 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          )}
        >
          <RefreshCw className={cn(
            isRefreshing ? 'animate-spin' : '',
            isMobile ? "w-5 h-5" : "w-4 h-4"
          )} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className={cn(
        "grid gap-4",
        isMobile 
          ? "grid-cols-2 gap-3" 
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
      )}>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 touch-manipulation">
          <CardContent className={isMobile ? "p-3" : "p-6"}>
            <div className={cn(
              "flex items-center justify-between",
              isMobile ? "flex-col gap-2" : "flex-row"
            )}>
              <div className={isMobile ? "text-center" : ""}>
                <p className={cn(
                  "font-medium text-blue-600",
                  isMobile ? "text-xs" : "text-sm"
                )}>Total Tickets</p>
                <p className={cn(
                  "font-bold text-blue-900",
                  isMobile ? "text-xl" : "text-2xl"
                )}>{memoizedStats.total}</p>
              </div>
              <div className={cn(
                "rounded-full bg-blue-500 flex items-center justify-center",
                isMobile ? "h-8 w-8" : "h-12 w-12"
              )}>
                <AlertCircle className={cn(
                  "text-white",
                  isMobile ? "h-4 w-4" : "h-6 w-6"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 touch-manipulation">
          <CardContent className={isMobile ? "p-3" : "p-6"}>
            <div className={cn(
              "flex items-center justify-between",
              isMobile ? "flex-col gap-2" : "flex-row"
            )}>
              <div className={isMobile ? "text-center" : ""}>
                <p className={cn(
                  "font-medium text-green-600",
                  isMobile ? "text-xs" : "text-sm"
                )}>Open</p>
                <p className={cn(
                  "font-bold text-green-900",
                  isMobile ? "text-xl" : "text-2xl"
                )}>{memoizedStats.open}</p>
              </div>
              <div className={cn(
                "rounded-full bg-green-500 flex items-center justify-center",
                isMobile ? "h-8 w-8" : "h-12 w-12"
              )}>
                <Clock className={cn(
                  "text-white",
                  isMobile ? "h-4 w-4" : "h-6 w-6"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 touch-manipulation",
          isMobile ? "col-span-2" : ""
        )}>
          <CardContent className={isMobile ? "p-3" : "p-6"}>
            <div className={cn(
              "flex items-center justify-between",
              isMobile ? "flex-col gap-2" : "flex-row"
            )}>
              <div className={isMobile ? "text-center" : ""}>
                <p className={cn(
                  "font-medium text-yellow-600",
                  isMobile ? "text-xs" : "text-sm"
                )}>Assigned</p>
                <p className={cn(
                  "font-bold text-yellow-900",
                  isMobile ? "text-xl" : "text-2xl"
                )}>{memoizedStats.assigned}</p>
              </div>
              <div className={cn(
                "rounded-full bg-yellow-500 flex items-center justify-center",
                isMobile ? "h-8 w-8" : "h-12 w-12"
              )}>
                <Users className={cn(
                  "text-white",
                  isMobile ? "h-4 w-4" : "h-6 w-6"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 touch-manipulation">
          <CardContent className={isMobile ? "p-3" : "p-6"}>
            <div className={cn(
              "flex items-center justify-between",
              isMobile ? "flex-col gap-2" : "flex-row"
            )}>
              <div className={isMobile ? "text-center" : ""}>
                <p className={cn(
                  "font-medium text-purple-600",
                  isMobile ? "text-xs" : "text-sm"
                )}>Closed</p>
                <p className={cn(
                  "font-bold text-purple-900",
                  isMobile ? "text-xl" : "text-2xl"
                )}>{memoizedStats.closed}</p>
              </div>
              <div className={cn(
                "rounded-full bg-purple-500 flex items-center justify-center",
                isMobile ? "h-8 w-8" : "h-12 w-12"
              )}>
                <CheckCircle className={cn(
                  "text-white",
                  isMobile ? "h-4 w-4" : "h-6 w-6"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 touch-manipulation">
          <CardContent className={isMobile ? "p-3" : "p-6"}>
            <div className={cn(
              "flex items-center justify-between",
              isMobile ? "flex-col gap-2" : "flex-row"
            )}>
              <div className={isMobile ? "text-center" : ""}>
                <p className={cn(
                  "font-medium text-red-600",
                  isMobile ? "text-xs" : "text-sm"
                )}>Critical</p>
                <p className={cn(
                  "font-bold text-red-900",
                  isMobile ? "text-xl" : "text-2xl"
                )}>{memoizedStats.critical}</p>
              </div>
              <div className={cn(
                "rounded-full bg-red-500 flex items-center justify-center",
                isMobile ? "h-8 w-8" : "h-12 w-12"
              )}>
                <XCircle className={cn(
                  "text-white",
                  isMobile ? "h-4 w-4" : "h-6 w-6"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table/Cards */}
      <Card className="shadow-lg">
        <CardHeader className={cn(
          "bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg",
          isMobile ? "p-4" : "p-6"
        )}>
          <CardTitle className={cn(
            "text-gray-800 flex items-center gap-2",
            isMobile ? "text-lg" : "text-xl"
          )}>
            <AlertCircle className={cn(
              "text-blue-600",
              isMobile ? "h-4 w-4" : "h-5 w-5"
            )} />
            Tickets ({ticketCount})
          </CardTitle>
          <CardDescription className={isMobile ? "text-sm" : ""}>
            Manage and track service tickets
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? "p-4" : "p-0"}>
          {tickets.length === 0 ? (
            <div className={cn(
              "text-center",
              isMobile ? "py-8" : "py-12"
            )}>
              <div className={cn(
                "mx-auto rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4",
                isMobile ? "h-16 w-16" : "h-24 w-24"
              )}>
                <AlertCircle className={cn(
                  "text-blue-500",
                  isMobile ? "h-8 w-8" : "h-12 w-12"
                )} />
              </div>
              <h3 className={cn(
                "font-semibold text-gray-900 mb-2",
                isMobile ? "text-base" : "text-lg"
              )}>No tickets found</h3>
              <p className={cn(
                "text-gray-500 mb-6",
                isMobile ? "text-sm" : ""
              )}>
                No tickets match your current filters.
              </p>
            </div>
          ) : isMobile ? (
            // Mobile Card Layout
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <Card key={ticket.id} className="border border-gray-200 hover:shadow-md transition-shadow duration-200 touch-manipulation">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <Link href={`${basePath}/${ticket.id}/list`} className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs hover:from-blue-600 hover:to-purple-700 transition-colors duration-200">
                          #{ticket.id}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`${basePath}/${ticket.id}/list`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-200 text-sm block truncate">
                            {ticket.title}
                          </Link>
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {ticket.description}
                          </div>
                        </div>
                      </div>
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
                    
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <Link href={`${basePath}/${ticket.id}/list`} className="block">
                        <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-manipulation">
                          <Eye className="h-4 w-4 mr-2" />
                          View Ticket
                        </button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Desktop Table Layout
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Ticket</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Customer</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Priority</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Created</th>
                    <th className="text-right py-4 px-6 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-200">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Link href={`${basePath}/${ticket.id}/list`} className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold hover:from-blue-600 hover:to-purple-700 transition-colors duration-200">
                            #{ticket.id}
                          </Link>
                          <div>
                            <Link href={`${basePath}/${ticket.id}/list`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-200">
                              {ticket.title}
                            </Link>
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
                        <Badge variant={getStatusBadgeVariant(ticket.status)}>
                          {ticket.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link href={`${basePath}/${ticket.id}/list`}>
                          <button className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <Card className="shadow-sm">
          <CardContent className={cn("flex items-center justify-between", isMobile ? "p-4 flex-col gap-4" : "p-6 flex-row")}>
            {/* Pagination Info */}
            <div className={cn("text-sm text-gray-600", isMobile ? "order-2" : "")}>
              Showing <span className="font-semibold text-gray-900">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
              <span className="font-semibold text-gray-900">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span> of{' '}
              <span className="font-semibold text-gray-900">{pagination.total}</span> tickets
            </div>

            {/* Pagination Buttons */}
            <div className={cn("flex items-center gap-2", isMobile ? "order-1 w-full justify-between" : "")}>
              {/* Previous Button */}
              <Link 
                href={`?${new URLSearchParams({ 
                  ...searchParams, 
                  page: (pagination.page - 1).toString() 
                }).toString()}`}
                className={cn(pagination.page === 1 ? "pointer-events-none opacity-50" : "")}
              >
                <button
                  disabled={pagination.page === 1}
                  className={cn(
                    "inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md",
                    "bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                    isMobile ? "touch-manipulation min-h-[44px]" : ""
                  )}
                >
                  <ChevronLeft className={cn(isMobile ? "h-5 w-5" : "h-4 w-4 mr-2")} />
                  {!isMobile && "Previous"}
                </button>
              </Link>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNumber: number;
                  
                  // Show first page, current page context, and last page
                  if (pagination.totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNumber = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNumber = pagination.totalPages - 4 + i;
                  } else {
                    pageNumber = pagination.page - 2 + i;
                  }

                  const isCurrentPage = pageNumber === pagination.page;

                  return (
                    <Link 
                      key={pageNumber}
                      href={`?${new URLSearchParams({ 
                        ...searchParams, 
                        page: pageNumber.toString() 
                      }).toString()}`}
                      className={cn(isMobile && "hidden sm:block")}
                    >
                      <button
                        className={cn(
                          "inline-flex items-center justify-center w-10 h-10 border text-sm font-medium rounded-md",
                          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                          isCurrentPage
                            ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        {pageNumber}
                      </button>
                    </Link>
                  );
                })}
              </div>

              {/* Mobile: Simple Page Indicator */}
              {isMobile && (
                <div className="sm:hidden px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md">
                  Page {pagination.page} / {pagination.totalPages}
                </div>
              )}

              {/* Next Button */}
              <Link 
                href={`?${new URLSearchParams({ 
                  ...searchParams, 
                  page: (pagination.page + 1).toString() 
                }).toString()}`}
                className={cn(pagination.page >= pagination.totalPages ? "pointer-events-none opacity-50" : "")}
              >
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  className={cn(
                    "inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md",
                    "bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                    isMobile ? "touch-manipulation min-h-[44px]" : ""
                  )}
                >
                  {!isMobile && "Next"}
                  <ChevronRight className={cn(isMobile ? "h-5 w-5" : "h-4 w-4 ml-2")} />
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

TicketClient.displayName = 'TicketClient';

export default TicketClient;
