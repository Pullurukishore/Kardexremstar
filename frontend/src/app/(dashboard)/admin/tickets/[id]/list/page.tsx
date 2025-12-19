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
  User,
  Phone,
  Mail,
  Building2,
  Hash,
  Sparkles,
  Shield,
  History,
  ChevronRight,
  AlertCircle,
  Zap
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

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tickets/${id}`);
      setTicket(response.data);
    } catch (error) {
      toast.error('Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/tickets/${id}`);
        setTicket(response.data);
      } catch (error) {
        toast.error('Failed to load ticket details');
        router.push('/admin/tickets');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTicket();
    }
  }, [id, router]);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 opacity-20 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Premium Header with Glassmorphism */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 rounded-2xl shadow-2xl shadow-blue-500/20 p-6 md:p-8">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-indigo-400/10 rounded-full blur-2xl" />
          
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
                    <p className="text-blue-100 mt-1 text-sm md:text-base flex items-center gap-2">
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
                  <Button 
                    onClick={() => setIsStatusDialogOpen(true)}
                    className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 border-0 shadow-xl shadow-orange-500/40 hover:shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 font-semibold animate-pulse hover:animate-none"
                    size="default"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                    <Zap className="h-4 w-4 mr-2" />
                    Change Status
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Quick Stats Strip */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20">
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wide">Priority</p>
                <p className="text-white font-bold text-lg capitalize">{ticket.priority?.toLowerCase() || 'Normal'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20">
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wide">Zone</p>
                <p className="text-white font-bold text-lg truncate">{ticket.zone?.name || 'Unassigned'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20">
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wide">Call Type</p>
                <p className="text-white font-bold text-lg truncate">{ticket.callType === 'UNDER_MAINTENANCE_CONTRACT' ? 'Under Contract' : 'Not Under Contract'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20">
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wide">Created On</p>
                <p className="text-white font-bold text-lg">{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Main Ticket Info */}
        <div className="space-y-6">
          {/* Ticket Overview Card */}
          <Card className="border-0 shadow-xl bg-white overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-4 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 border-b border-slate-100/80 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold text-slate-800 leading-tight">{ticket.title}</CardTitle>
                    <p className="text-sm text-slate-500 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Created {formatDistanceToNow(new Date(ticket.createdAt))} ago
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Description */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Description</h3>
                </div>
                <p className="text-slate-600 leading-relaxed pl-4 border-l-2 border-blue-200">{ticket.description}</p>
              </div>

              {ticket.callType && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Call Type</h3>
                  </div>
                  <div className="pl-4">
                    <Badge 
                      className={`${ticket.callType === 'UNDER_MAINTENANCE_CONTRACT' 
                        ? 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 border-emerald-300' 
                        : 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 border-amber-300'} 
                        font-semibold px-4 py-1.5 shadow-sm`}
                    >
                      {ticket.callType === 'UNDER_MAINTENANCE_CONTRACT' 
                        ? '✓ Under Maintenance Contract' 
                        : '○ Not Under Contract'}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {ticket.contact && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                    <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Contact Information</h3>
                  </div>
                  <div className="pl-4 space-y-2.5">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100/50 hover:from-slate-100 hover:to-slate-150 transition-colors">
                      <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-violet-600" />
                      </div>
                      <span className="text-slate-700 font-medium">{ticket.contact.name}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100/50 hover:from-slate-100 hover:to-slate-150 transition-colors">
                      <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-slate-700 font-medium break-all">{ticket.contact.email}</span>
                    </div>
                    {ticket.contact.phone && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100/50 hover:from-slate-100 hover:to-slate-150 transition-colors">
                        <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <Phone className="h-4 w-4 text-emerald-600" />
                        </div>
                        <span className="text-slate-700 font-medium">{ticket.contact.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Asset Details */}
              {ticket.asset && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Asset Details</h3>
                  </div>
                  <div className="pl-4 p-4 rounded-xl bg-gradient-to-br from-orange-50/50 to-amber-50/30 border border-orange-100">
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-sm">Model</span>
                        <span className="font-semibold text-slate-800 bg-white px-3 py-1 rounded-lg shadow-sm">{ticket.asset.model}</span>
                      </div>
                      {(ticket.asset as any).serialNo && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-sm">Serial Number</span>
                          <span className="font-mono font-semibold text-slate-800 bg-white px-3 py-1 rounded-lg shadow-sm text-sm">{(ticket.asset as any).serialNo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Card */}
          <Card className="border-0 shadow-xl bg-white overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white p-5 border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl ring-2 ring-white/30">
                    <Activity className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg font-bold">Activity Timeline</CardTitle>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 overflow-hidden">
              <div className="max-w-full">
                <TicketActivity ticketId={ticket.id} ticket={ticket} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar Content */}
        <div className="space-y-6">
          {/* Assignment Card - Premium Design */}
          <Card className="border-0 shadow-xl bg-white overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white p-5 border-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl ring-2 ring-white/30">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Assignment Panel</CardTitle>
                  <p className="text-emerald-100 text-xs mt-0.5">Manage ticket assignments</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Assignment Rows */}
              <div className="space-y-3">
                {/* Expert Helpdesk */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50/80 to-pink-50/50 border border-purple-100 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Expert Helpdesk</span>
                    {ticket.assignedTo && ticket.assignedTo.role === 'EXPERT_HELPDESK' && (
                      <div className="flex items-center gap-2">
                        {/* Assignment Status Badge */}
                        {ticket.assignmentStatus === 'PENDING' && (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] px-2 py-0.5 animate-pulse">
                            Awaiting Response
                          </Badge>
                        )}
                        {ticket.assignmentStatus === 'ACCEPTED' && (
                          <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px] px-2 py-0.5">
                            ✓ Accepted
                          </Badge>
                        )}
                        {ticket.assignmentStatus === 'REJECTED' && (
                          <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px] px-2 py-0.5">
                            ✗ Rejected
                          </Badge>
                        )}
                        <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {ticket.assignedTo && ticket.assignedTo.role === 'EXPERT_HELPDESK' ? (
                      <>
                        <Avatar className="h-10 w-10 ring-2 ring-purple-200 shadow-md">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                            {ticket.assignedTo.name?.charAt(0) || 'E'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <span className="font-semibold text-slate-800 block">{ticket.assignedTo.name || 'No name'}</span>
                          {ticket.assignedTo.phone && (
                            <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" /> {ticket.assignedTo.phone}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400 italic text-sm">Unassigned</span>
                    )}
                  </div>
                  {/* Show rejection notes if rejected */}
                  {ticket.assignmentStatus === 'REJECTED' && ticket.assignmentNotes && ticket.assignedTo?.role === 'EXPERT_HELPDESK' && (
                    <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-xs text-red-600"><strong>Rejection Reason:</strong> {ticket.assignmentNotes}</p>
                    </div>
                  )}
                </div>

                {/* Zone Manager / Zone User */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border border-emerald-100 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Zone Manager / Zone User</span>
                    {ticket.assignedTo && (ticket.assignedTo.role === 'ZONE_USER' || ticket.assignedTo.role === 'ZONE_MANAGER') && (
                      <div className="flex items-center gap-2">
                        {/* Assignment Status Badge */}
                        {ticket.assignmentStatus === 'PENDING' && (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] px-2 py-0.5 animate-pulse">
                            Awaiting Response
                          </Badge>
                        )}
                        {ticket.assignmentStatus === 'ACCEPTED' && (
                          <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px] px-2 py-0.5">
                            ✓ Accepted
                          </Badge>
                        )}
                        {ticket.assignmentStatus === 'REJECTED' && (
                          <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px] px-2 py-0.5">
                            ✗ Rejected
                          </Badge>
                        )}
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {ticket.assignedTo && (ticket.assignedTo.role === 'ZONE_USER' || ticket.assignedTo.role === 'ZONE_MANAGER') ? (
                      <>
                        <Avatar className="h-10 w-10 ring-2 ring-emerald-200 shadow-md">
                          <AvatarFallback className={`${ticket.assignedTo.role === 'ZONE_MANAGER' ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-emerald-500 to-teal-500'} text-white font-bold`}>
                            {ticket.assignedTo.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <span className="font-semibold text-slate-800 block">{ticket.assignedTo.name || 'No name'}</span>
                          <Badge className={`text-[10px] px-2 py-0 ${ticket.assignedTo.role === 'ZONE_MANAGER' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                            {ticket.assignedTo.role === 'ZONE_MANAGER' ? 'Zone Manager' : 'Zone User'}
                          </Badge>
                          {ticket.assignedTo.phone && (
                            <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <Phone className="h-3 w-3" /> {ticket.assignedTo.phone}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400 italic text-sm">Unassigned</span>
                    )}
                  </div>
                  {/* Show rejection notes if rejected */}
                  {ticket.assignmentStatus === 'REJECTED' && ticket.assignmentNotes && (ticket.assignedTo?.role === 'ZONE_USER' || ticket.assignedTo?.role === 'ZONE_MANAGER') && (
                    <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-xs text-red-600"><strong>Rejection Reason:</strong> {ticket.assignmentNotes}</p>
                    </div>
                  )}
                </div>

                {/* Zone & Created By Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Zone
                    </div>
                    <p className="font-semibold text-slate-800 truncate">{ticket.zone?.name || 'Unassigned'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                      <User className="h-3.5 w-3.5" />
                      Created By
                    </div>
                    <p className="font-semibold text-slate-800 truncate">{ticket.owner?.name || 'System'}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Quick Actions
                </p>
                <div className="space-y-2.5">
                  <Button 
                    onClick={() => {
                      setAssignmentStep('EXPERT_HELPDESK');
                      setIsAssignDialogOpen(true);
                    }}
                    disabled={!ticket}
                    className="w-full justify-between h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-white/20">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm">Assign to Expert Helpdesk</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={() => {
                      setAssignmentStep('ZONE_USER');
                      setIsAssignDialogOpen(true);
                    }}
                    disabled={!ticket}
                    className="w-full justify-between h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-white/20">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm">Assign to Zone User</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details Tabs Card - Premium Design */}
          <Card className="border-0 shadow-xl bg-white overflow-hidden hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white p-5 border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl ring-2 ring-white/30">
                    <FileText className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg font-bold">Ticket Information</CardTitle>
                </div>
              </div>
              {/* Tab Navigation */}
              <div className="flex flex-wrap gap-2 mt-4">
                {[
                  { id: 'details', label: 'Details', icon: FileText },
                  { id: 'comments', label: 'Comments', icon: MessageSquare },
                  { id: 'reports', label: 'Reports', icon: Upload },
                  { id: 'photos', label: 'Photos', icon: Camera },
                ].map((tab) => (
                  <Button 
                    key={tab.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 h-9 rounded-xl transition-all duration-200 ${
                      activeTab === tab.id 
                        ? 'bg-white text-orange-600 shadow-lg hover:bg-white' 
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    <tab.icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-5 overflow-hidden">
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

          {/* Status History Card - Premium Design */}
          <Card className="border-0 shadow-xl bg-white overflow-hidden hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white p-5 border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl ring-2 ring-white/30">
                    <History className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg font-bold">Status History</CardTitle>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                  {ticket.statusHistory?.length || 0} updates
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-4">
                {ticket.statusHistory?.length ? (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[19px] top-6 bottom-2 w-0.5 bg-gradient-to-b from-purple-200 via-purple-100 to-transparent" />
                    
                    <div className="space-y-4">
                      {ticket.statusHistory.map((history, index) => (
                        <div key={history.id} className="relative pl-12">
                          {/* Timeline dot */}
                          <div className={`absolute left-0 top-1 h-10 w-10 rounded-xl flex items-center justify-center shadow-lg ${
                            index === 0 
                              ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white ring-4 ring-green-100' 
                              : 'bg-white border-2 border-purple-200'
                          }`}>
                            {index === 0 ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <div className="h-2.5 w-2.5 rounded-full bg-purple-400" />
                            )}
                          </div>
                          
                          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-purple-50/30 border border-purple-50 hover:shadow-md transition-all duration-200">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <StatusBadge status={history.status} />
                                  <span className="text-slate-500 text-xs">•</span>
                                  <span className="text-sm text-slate-600 font-medium">
                                    by {history.changedBy?.name || history.changedBy?.email?.split('@')[0] || 'Unknown'}
                                  </span>
                                </div>
                                {history.notes && (
                                  <p className="text-sm text-slate-500 line-clamp-2">
                                    {history.notes.split('\n\n')[0]}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 whitespace-nowrap bg-white px-2 py-1 rounded-lg shadow-sm">
                                {format(new Date(history.changedAt), 'MMM d, h:mm a')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                      <History className="h-8 w-8 text-purple-300" />
                    </div>
                    <p className="text-slate-500 font-medium">No status history available</p>
                    <p className="text-slate-400 text-sm mt-1">Status changes will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>

      <AssignTicketDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        ticketId={ticket.id}
        onSuccess={fetchTicketDetails}
        zoneId={ticket.zone?.id}
        initialStep={assignmentStep}
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
  );
}
