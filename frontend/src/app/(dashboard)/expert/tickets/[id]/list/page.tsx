"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  FileText, 
  MessageSquare, 
  Activity,
  MapPin,
  CheckCircle,
  UserPlus,
  Wrench,
  Pencil,
  Upload,
  Camera,
  ArrowLeft,
  Clock,
  Hash,
  Zap,
  AlertCircle,
  XCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Ticket } from '@/types/ticket';
import api from '@/lib/api/axios';
import { StatusBadge } from '@/components/tickets/StatusBadge';
import { PriorityBadge } from '@/components/tickets/PriorityBadge';
import { TicketActivity } from '@/components/tickets/TicketActivity';
import { TicketComments } from '@/components/tickets/TicketComments';
import { TicketDetails } from '@/components/tickets/TicketDetails';
import { AssignTicketDialog } from '@/components/tickets/AssignTicketDialog';
import { StatusChangeDialog, TicketStatus, TicketStatusType } from '@/components/tickets/StatusChangeDialog';
import { TicketReports } from '@/components/tickets/TicketReports';
import { StatusHistoryItem } from '@/components/tickets/StatusHistoryItem';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import PhotoGallery from '@/components/photo/PhotoGallery';

export default function TicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'comments' | 'reports' | 'photos'>('details');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignmentStep, setAssignmentStep] = useState<'ZONE_USER' | 'SERVICE_PERSON' | 'EXPERT_HELPDESK'>('ZONE_USER');
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isRespondingToAssignment, setIsRespondingToAssignment] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tickets/${id}`);
      // API returns { data: Ticket }, so use nested data (fallback to root for safety)
      const ticketData = response.data?.data ?? response.data;
      if (!ticketData) {
        console.error('No ticket data in response:', response.data);
        toast.error('Ticket data not found');
        return;
      }
      setTicket(ticketData);
    } catch (error: any) {
      console.error('Failed to load ticket details:', error.response?.status, error.response?.data);
      const errorMessage = error.response?.status === 403 
        ? 'You do not have permission to view this ticket'
        : error.response?.status === 404
        ? 'Ticket not found'
        : 'Failed to load ticket details';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/tickets/${id}`);
        const ticketData = response.data?.data ?? response.data;
        if (!ticketData) {
          console.error('No ticket data in response:', response.data);
          toast.error('Ticket data not found');
          router.push('/expert/tickets');
          return;
        }
        setTicket(ticketData);
      } catch (error: any) {
        console.error('Failed to load ticket details:', error.response?.status, error.response?.data);
        const errorMessage = error.response?.status === 403 
          ? 'You do not have permission to view this ticket'
          : error.response?.status === 404
          ? 'Ticket not found'
          : 'Failed to load ticket details';
        toast.error(errorMessage);
        router.push('/expert/tickets');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTicket();
    }
  }, [id, router]);

  // Handle accept/reject assignment
  const handleRespondToAssignment = async (action: 'ACCEPT' | 'REJECT', notes?: string) => {
    if (!ticket) return;
    
    setIsRespondingToAssignment(true);
    try {
      const response = await api.post(`/tickets/${ticket.id}/respond-assignment`, {
        action,
        notes: notes || undefined
      });
      
      toast.success(action === 'ACCEPT' ? 'Assignment accepted successfully' : 'Assignment rejected');
      
      if (action === 'REJECT') {
        // Redirect back to tickets list after rejection
        router.push('/expert/tickets');
      } else {
        // Refresh ticket data
        await fetchTicketDetails();
      }
      
      setShowRejectDialog(false);
      setRejectNotes('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to respond to assignment');
    } finally {
      setIsRespondingToAssignment(false);
    }
  };

  const handleStatusChange = async (
    status: string, 
    comments?: string, 
    location?: { latitude: number; longitude: number; address?: string; timestamp: string; accuracy?: number; source?: 'gps' | 'manual' | 'network' },
    photos?: { photos: any[]; timestamp: string }
  ) => {
    if (!ticket) return;
    
    try {
      await api.patch(`/tickets/${ticket.id}/status`, { 
        status,
        comments: comments || `Status changed to ${status}`,
        location,
        photos
      });
      
      await fetchTicketDetails();
      
      toast.success('Ticket status updated successfully');
    } catch (error) {
      toast.error('Failed to update ticket status');
      throw error;
    }
  };

  const handleAssignToUser = async (userId: string, note: string) => {
    if (!ticket) return;
    
    try {
      await api.patch(`/tickets/${ticket.id}/assign`, { 
        assignedToId: parseInt(userId),
        note 
      });
      
      // Update ticket status to ASSIGNED if it's not already
      if (ticket.status !== 'ASSIGNED') {
        await api.patch(`/tickets/${ticket.id}/status`, { 
          status: 'ASSIGNED',
          comments: 'Ticket assigned to service person'
        });
      }
      
      // Refresh ticket data
      await fetchTicketDetails();
      
      toast.success('Ticket assigned successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to assign ticket';
      
      toast.error(errorMessage);
    }
  };

  if (loading || !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-fuchsia-50/20">
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 opacity-20 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-800">{loading ? 'Loading ticket details...' : 'Ticket not found'}</p>
              <p className="text-sm text-slate-500 mt-1">Please wait while we fetch the information</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-fuchsia-50/20">
      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Premium Header with Glassmorphism */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 rounded-2xl shadow-2xl shadow-purple-500/20 p-6 md:p-8">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-fuchsia-400/10 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => router.back()}
                  className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/20 transition-all duration-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl ring-2 ring-white/30">
                    <Hash className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                      Ticket #{ticket.id}
                    </h1>
                    <p className="text-purple-100 mt-1 text-sm md:text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Created {formatDistanceToNow(new Date(ticket.createdAt))} ago
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                </div>
                <div className="flex items-center gap-2">
                  {ticket.assignmentStatus === 'PENDING' && ticket.assignedToId === user?.id ? (
                    <div className="relative group">
                      <Button 
                        disabled
                        className="relative overflow-hidden bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0 shadow-lg cursor-not-allowed opacity-70"
                        size="default"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Change Status
                      </Button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
                        Accept or reject assignment first
                      </div>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => setIsStatusDialogOpen(true)}
                      className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 border-0 shadow-xl shadow-orange-500/40 hover:shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 font-semibold"
                      size="default"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] animate-shimmer" />
                      <Zap className="h-4 w-4 mr-2" />
                      Change Status
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Quick Stats Strip */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20">
                <p className="text-purple-100 text-xs font-medium uppercase tracking-wide">Priority</p>
                <p className="text-white font-bold text-lg capitalize">{ticket.priority?.toLowerCase() || 'Normal'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20">
                <p className="text-purple-100 text-xs font-medium uppercase tracking-wide">Zone</p>
                <p className="text-white font-bold text-lg truncate">{ticket.zone?.name || 'Unassigned'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20">
                <p className="text-purple-100 text-xs font-medium uppercase tracking-wide">Call Type</p>
                <p className="text-white font-bold text-lg truncate">{ticket.callType === 'UNDER_MAINTENANCE_CONTRACT' ? 'Under Contract' : 'Not Under Contract'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20">
                <p className="text-purple-100 text-xs font-medium uppercase tracking-wide">Created On</p>
                <p className="text-white font-bold text-lg">{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assignment Response Banner - Show if pending and user is assigned */}
        {ticket.assignmentStatus === 'PENDING' && ticket.assignedToId === user?.id && (
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl shadow-xl shadow-amber-500/20 p-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl ring-2 ring-white/30 animate-pulse">
                    <AlertCircle className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="text-xl font-bold">New Assignment</h3>
                    <p className="text-amber-100 text-sm">You have been assigned this ticket. Please review and respond.</p>
                  </div>
                </div>
                
                {!showRejectDialog ? (
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => handleRespondToAssignment('ACCEPT')}
                      disabled={isRespondingToAssignment}
                      className="bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all font-bold px-6"
                    >
                      {isRespondingToAssignment ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Accept
                    </Button>
                    <Button
                      onClick={() => setShowRejectDialog(true)}
                      disabled={isRespondingToAssignment}
                      className="bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all font-bold px-6"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 w-full md:w-auto">
                    <textarea
                      placeholder="Reason for rejection (optional)"
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      className="w-full md:w-80 px-4 py-2 rounded-lg border-2 border-white/30 bg-white/20 backdrop-blur-sm text-white placeholder-white/60 focus:outline-none focus:border-white text-sm"
                      rows={2}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleRespondToAssignment('REJECT', rejectNotes)}
                        disabled={isRespondingToAssignment}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-lg font-bold flex-1"
                      >
                        {isRespondingToAssignment ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Confirm Reject
                      </Button>
                      <Button
                        onClick={() => {
                          setShowRejectDialog(false);
                          setRejectNotes('');
                        }}
                        disabled={isRespondingToAssignment}
                        variant="outline"
                        className="border-2 border-white text-white hover:bg-white/20"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          {/* Left Column - Main Ticket Info */}
          <div className="space-y-4 md:space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-200">
              <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-fuchsia-50/50 rounded-t-lg border-b p-4 md:p-6">
                <div className="space-y-3">
                  <div className="flex flex-col space-y-2">
                    <CardTitle className="text-lg md:text-xl break-words text-purple-900">{ticket.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                  </div>
                </div>
              </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2 text-sm md:text-base">Description</h3>
                  <p className="text-muted-foreground text-sm break-words">{ticket.description}</p>
                </div>

                {ticket.callType && (
                  <div>
                    <h3 className="font-medium mb-2 text-sm md:text-base">Call Type</h3>
                    <Badge variant={ticket.callType === 'UNDER_MAINTENANCE_CONTRACT' ? 'default' : 'secondary'} className="text-xs">
                      {ticket.callType === 'UNDER_MAINTENANCE_CONTRACT' 
                        ? 'Under Maintenance Contract' 
                        : 'Not Under Contract'}
                    </Badge>
                  </div>
                )}

                {ticket.contact && (
                  <div>
                    <h3 className="font-medium mb-2 text-sm md:text-base">Contact Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground flex-shrink-0">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <span className="text-sm break-words">{ticket.contact.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground flex-shrink-0">
                          <rect width="20" height="16" x="2" y="4" rx="2"/>
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                        </svg>
                        <span className="text-sm break-all">{ticket.contact.email}</span>
                      </div>
                      {ticket.contact.phone && (
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground flex-shrink-0">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          <span className="text-sm">{ticket.contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {ticket.asset && (
                  <div>
                    <h3 className="font-medium mb-2 text-sm md:text-base">Asset Details</h3>
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-muted-foreground text-sm">Model:</span>
                        <span className="text-sm font-medium break-words">{ticket.asset.model}</span>
                      </div>
                      {(ticket.asset as any).serialNo && (
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-muted-foreground text-sm">Serial Number:</span>
                          <span className="text-sm font-medium break-all">{(ticket.asset as any).serialNo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow duration-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-t-lg border-b">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-blue-900">Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="max-w-full">
                <TicketActivity ticketId={ticket.id} ticket={ticket} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar Content */}
        <div className="space-y-4 md:space-y-6">
          <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow duration-200">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-t-lg border-b">
              <CardTitle className="text-emerald-900">Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Assignment</h3>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Expert Helpdesk</span>
                  <div className="flex items-center">
                    {ticket.assignedTo && ticket.assignedTo.role === 'EXPERT_HELPDESK' ? (
                      <>
                        <Avatar className="h-5 w-5 mr-2">
                          <AvatarFallback className="bg-purple-100 text-purple-700">
                            {ticket.assignedTo.name?.charAt(0) || 'E'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span>{ticket.assignedTo.name || 'No name'}</span>
                          {ticket.assignedTo.phone && (
                            <span className="text-xs text-muted-foreground">{ticket.assignedTo.phone}</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Zone Manager / Zone User</span>
                  <div className="flex items-center">
                    {ticket.assignedTo && (ticket.assignedTo.role === 'ZONE_USER' || ticket.assignedTo.role === 'ZONE_MANAGER') ? (
                      <>
                        <Avatar className="h-5 w-5 mr-2">
                          <AvatarFallback className={`${ticket.assignedTo.role === 'ZONE_MANAGER' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {ticket.assignedTo.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span>{ticket.assignedTo.name || 'No name'}</span>
                          <span className={`text-xs font-medium ${ticket.assignedTo.role === 'ZONE_MANAGER' ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {ticket.assignedTo.role === 'ZONE_MANAGER' ? 'Zone Manager' : 'Zone User'}
                          </span>
                          {ticket.assignedTo.phone && (
                            <span className="text-xs text-muted-foreground">{ticket.assignedTo.phone}</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Zone</span>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1.5 text-muted-foreground" />
                    {ticket.zone?.name || 'No zone assigned'}
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created By</span>
                  <div className="flex flex-col">
                    <span>{ticket.owner?.name || 'System'}</span>
                    {ticket.owner?.phone && (
                      <span className="text-xs text-muted-foreground">{ticket.owner.phone}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">Quick Actions</div>
                <Button 
                  onClick={() => {
                    // Open dialog for expert helpdesk assignment
                    setAssignmentStep('EXPERT_HELPDESK');
                    setIsAssignDialogOpen(true);
                  }}
                  disabled={!ticket || (ticket.assignmentStatus === 'PENDING' && ticket.assignedToId === user?.id)}
                  variant="outline"
                  className="w-full justify-start h-12 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200 hover:border-purple-300 text-purple-700 hover:text-purple-800 transition-all duration-200 shadow-sm hover:shadow-md group"
                >
                  <div className="flex items-center">
                    <div className="p-1.5 rounded-full bg-purple-100 group-hover:bg-purple-200 mr-3 transition-colors">
                      <UserPlus className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Assign to Expert Helpdesk</div>
                      <div className="text-xs text-purple-600 opacity-80">Specialized technical review</div>
                    </div>
                  </div>
                </Button>
                <Button 
                  onClick={() => {
                    // Open dialog for zone user assignment
                    setAssignmentStep('ZONE_USER');
                    setIsAssignDialogOpen(true);
                  }}
                  disabled={!ticket || (ticket.assignmentStatus === 'PENDING' && ticket.assignedToId === user?.id)}
                  variant="outline"
                  className="w-full justify-start h-12 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-emerald-200 hover:border-emerald-300 text-emerald-700 hover:text-emerald-800 transition-all duration-200 shadow-sm hover:shadow-md group"
                >
                  <div className="flex items-center">
                    <div className="p-1.5 rounded-full bg-emerald-100 group-hover:bg-emerald-200 mr-3 transition-colors">
                      <UserPlus className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Assign to Zone User</div>
                      <div className="text-xs text-emerald-600 opacity-80">Zone Manager or Zone User</div>
                    </div>
                  </div>
                </Button>
                              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow duration-200">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-t-lg border-b p-4 md:p-6">
              <div className="flex flex-col space-y-3">
                <CardTitle className="text-amber-900 text-base md:text-lg">Details</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant={activeTab === 'details' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setActiveTab('details')}
                    className="text-xs px-2 py-1 h-8 btn-touch"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Details</span>
                    <span className="sm:hidden">Info</span>
                  </Button>
                  <Button 
                    variant={activeTab === 'comments' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setActiveTab('comments')}
                    className="text-xs px-2 py-1 h-8 btn-touch"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Comments
                  </Button>
                  <Button 
                    variant={activeTab === 'reports' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setActiveTab('reports')}
                    className="text-xs px-2 py-1 h-8 btn-touch"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Reports
                  </Button>
                  <Button 
                    variant={activeTab === 'photos' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setActiveTab('photos')}
                    className="text-xs px-2 py-1 h-8 btn-touch"
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Photos
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-hidden p-4 md:p-6">
              <div className="max-w-full">
                {activeTab === 'details' ? (
   <TicketDetails ticket={ticket} onStatusChange={async (status) => {
                    try {
                      await api.patch(`/tickets/${ticket.id}`, { status });
                      setTicket({ ...ticket, status });
                    } catch (error) {
                      }
                  }} />
                ) : activeTab === 'reports' ? (
                  <TicketReports ticketId={ticket.id.toString()} />
                ) : activeTab === 'photos' ? (
                  <PhotoGallery 
                    ticketId={ticket.id} 
                    title="Onsite Verification Photos"
                    showUploadTime={true}
                    className="border-0 bg-transparent"
                  />
                ) : (
                  <TicketComments ticketId={ticket.id} />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow duration-200">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50/50 rounded-t-lg border-b">
              <CardTitle className="text-purple-900">Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ticket.statusHistory?.length ? (
                  <div className="space-y-3">
                    {ticket.statusHistory.map((history, index) => (
                      <div key={history.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-background flex items-center justify-center border">
                          {index === 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <StatusBadge status={history.status} />
                              <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground">
                                  by {history.changedBy?.name || history.changedBy?.email?.split('@')[0] || 'Unknown'}
                                </span>
                                {ticket.zone?.name && (history.changedBy?.role === 'ZONE_USER' || history.changedBy?.role === 'SERVICE_PERSON') && (
                                  <span className="text-xs text-muted-foreground">Zone: {ticket.zone.name}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(history.changedAt), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          {history.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {history.notes.split('\n\n')[0]} {/* Show only the first part before location data */}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No status history available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AssignTicketDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        ticketId={ticket.id}
        onSuccess={fetchTicketDetails}
        zoneId={ticket.zone?.id}
        initialStep={assignmentStep}
        currentAssignedExpertHelpdesk={ticket.assignedTo && ticket.assignedTo.role === 'EXPERT_HELPDESK' ? {
          id: ticket.assignedTo.id.toString(),
          name: ticket.assignedTo.name || 'No name',
          email: ticket.assignedTo.email,
          phone: ticket.assignedTo.phone || undefined
        } : null}
        currentAssignedZoneUser={ticket.assignedTo && (ticket.assignedTo.role === 'ZONE_USER' || ticket.assignedTo.role === 'ZONE_MANAGER') ? {
          id: ticket.assignedTo.id.toString(),
          name: ticket.assignedTo.name || 'No name',
          email: ticket.assignedTo.email,
          phone: ticket.assignedTo.phone || undefined
        } : null}
        currentAssignedServicePerson={ticket.assignedTo && ticket.assignedTo.role === 'SERVICE_PERSON' ? {
          id: ticket.assignedTo.id.toString(),
          name: ticket.assignedTo.name || 'No name',
          email: ticket.assignedTo.email,
          phone: ticket.assignedTo.phone || undefined
        } : null}
      />
      
      <StatusChangeDialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        currentStatus={ticket.status}
        ticketId={ticket.id}
        userRole={user?.role}
        onStatusChange={handleStatusChange}
      />
      </div>
    </div>
  );
}
