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
  Camera
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
      <div className="flex items-center justify-center min-h-[80vh]">
        <p>{loading ? 'Loading ticket details...' : 'Ticket not found'}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Ticket Header - Moved to proper position */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <span className="sr-only">Go back</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7"/>
                <path d="M19 12H5"/>
              </svg>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">
              Ticket #{ticket.id}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} />
            <span className="text-sm text-muted-foreground">
              Created on {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Left Column - Main Ticket Info */}
        <div className="space-y-4 md:space-y-6">
          <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-t-lg border-b p-4 md:p-6">
              <div className="space-y-3">
                <div className="flex flex-col space-y-2">
                  <CardTitle className="text-lg md:text-xl break-words">{ticket.title}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Created {formatDistanceToNow(new Date(ticket.createdAt))} ago
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-3 text-xs md:text-sm bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 transition-all duration-200 shadow-sm hover:shadow-md btn-touch" 
                    onClick={() => setIsStatusDialogOpen(true)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Change Status
                  </Button>
                  {(ticket.status === 'ONSITE_VISIT_REACHED' || ticket.status === 'ONSITE_VISIT_IN_PROGRESS' || ticket.status === 'ONSITE_VISIT_RESOLVED') && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 px-3 text-xs md:text-sm bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-green-200 hover:border-green-300 text-green-700 hover:text-green-800 transition-all duration-200 shadow-sm hover:shadow-md btn-touch" 
                      onClick={() => setActiveTab('photos')}
                    >
                      <Camera className="h-3.5 w-3.5 mr-1.5" />
                      <span className="hidden sm:inline">View Photos</span>
                      <span className="sm:hidden">Photos</span>
                    </Button>
                  )}
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
                    {ticket.subOwner && (ticket.subOwner.role === 'ZONE_USER' || ticket.subOwner.role === 'ZONE_MANAGER') ? (
                      <>
                        <Avatar className="h-5 w-5 mr-2">
                          <AvatarFallback className={`${ticket.subOwner.role === 'ZONE_MANAGER' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {ticket.subOwner.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span>{ticket.subOwner.name || 'No name'}</span>
                          <span className={`text-xs font-medium ${ticket.subOwner.role === 'ZONE_MANAGER' ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {ticket.subOwner.role === 'ZONE_MANAGER' ? 'Zone Manager' : 'Zone User'}
                          </span>
                          {ticket.subOwner.phone && (
                            <span className="text-xs text-muted-foreground">{ticket.subOwner.phone}</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Service Person</span>
                  <div className="flex items-center">
                    {ticket.assignedTo && ticket.assignedTo.role === 'SERVICE_PERSON' ? (
                      <>
                        <Avatar className="h-5 w-5 mr-2">
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {ticket.assignedTo.name?.charAt(0) || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span>{ticket.assignedTo.name || 'No name'}</span>
                          {ticket.zone?.name && (
                            <span className="text-xs text-blue-600 font-medium">Zone: {ticket.zone.name}</span>
                          )}
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
                  disabled={!ticket}
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
                  disabled={!ticket}
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
        currentAssignedZoneUser={ticket.subOwner && (ticket.subOwner.role === 'ZONE_USER' || ticket.subOwner.role === 'ZONE_MANAGER') ? {
          id: ticket.subOwner.id.toString(),
          name: ticket.subOwner.name || 'No name',
          email: ticket.subOwner.email,
          phone: ticket.subOwner.phone || undefined
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
