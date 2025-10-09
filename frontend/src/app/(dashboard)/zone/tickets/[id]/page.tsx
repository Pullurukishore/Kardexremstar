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
import { useToast } from '@/components/ui/use-toast';
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
  const { toast } = useToast();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'comments' | 'reports' | 'photos'>('details');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignmentStep, setAssignmentStep] = useState<'ZONE_USER' | 'SERVICE_PERSON'>('ZONE_USER');
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tickets/${id}`);
      setTicket(response.data);
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ticket details',
        variant: 'destructive',
      });
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
        console.error('Error fetching ticket:', error);
        toast({
          title: 'Error',
          description: 'Failed to load ticket details',
          variant: 'destructive',
        });
        router.push('/admin/tickets');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTicket();
    }
  }, [id, router, toast]);

  const handleStatusChange = async (
    status: string, 
    comments?: string, 
    location?: { latitude: number; longitude: number; address?: string; timestamp: string },
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
      
      toast({
        title: 'Success',
        description: 'Ticket status updated successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket status',
        variant: 'destructive',
      });
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
      
      toast({
        title: 'Success',
        description: 'Ticket assigned successfully',
      });
    } catch (error: any) {
      console.error('Error assigning ticket:', error);
      const errorMessage = error.response?.data?.message || 'Failed to assign ticket';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Main Ticket Info */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-t-lg border-b">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-xl">{ticket.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={ticket.status} />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 transition-all duration-200 shadow-sm hover:shadow-md" 
                        onClick={() => setIsStatusDialogOpen(true)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Change Status
                      </Button>
                    </div>
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Created {formatDistanceToNow(new Date(ticket.createdAt))} ago
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground">{ticket.description}</p>
                </div>

                {ticket.contact && (
                  <div>
                    <h3 className="font-medium mb-2">Contact Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <span>{ticket.contact.name}</span>
                      </div>
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                          <rect width="20" height="16" x="2" y="4" rx="2"/>
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                        </svg>
                        <span>{ticket.contact.email}</span>
                      </div>
                      {ticket.contact.phone && (
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          <span>{ticket.contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {ticket.asset && (
                  <div>
                    <h3 className="font-medium mb-2">Asset Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model:</span>
                        <span>{ticket.asset.model}</span>
                      </div>
                      {(ticket.asset as any).serialNo && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Serial Number:</span>
                          <span>{(ticket.asset as any).serialNo}</span>
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
        <div className="space-y-6">
          <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow duration-200">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-t-lg border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-amber-900">Details</CardTitle>
                <div className="flex items-center space-x-1 flex-wrap gap-1">
                  <Button 
                    variant={activeTab === 'details' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setActiveTab('details')}
                    className="text-xs px-2"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                  <Button 
                    variant={activeTab === 'comments' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setActiveTab('comments')}
                    className="text-xs px-2"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Comments
                  </Button>
                  <Button 
                    variant={activeTab === 'reports' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setActiveTab('reports')}
                    className="text-xs px-2"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Reports
                  </Button>
                  <Button 
                    variant={activeTab === 'photos' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setActiveTab('photos')}
                    className="text-xs px-2"
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Photos
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="max-w-full">
                {activeTab === 'details' ? (
   <TicketDetails ticket={ticket} onStatusChange={async (status) => {
                    try {
                      await api.patch(`/tickets/${ticket.id}`, { status });
                      setTicket({ ...ticket, status });
                    } catch (error) {
                      console.error('Error updating status:', error);
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
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-t-lg border-b">
              <CardTitle className="text-emerald-900">Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Assignment</h3>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Zone User</span>
                  <div className="flex items-center">
                    {ticket.subOwner && ticket.subOwner.role === 'ZONE_USER' ? (
                      <>
                        <Avatar className="h-5 w-5 mr-2">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700">
                            {ticket.subOwner.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span>{ticket.subOwner.name || 'No name'}</span>
                          {ticket.zone?.name && (
                            <span className="text-xs text-emerald-600 font-medium">Zone: {ticket.zone.name}</span>
                          )}
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
                      <div className="text-xs text-emerald-600 opacity-80">Delegate to zone coordinator</div>
                    </div>
                  </div>
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      // Directly open service person selection
                      const servicePersons = await api.get('/service-persons');
                      if (servicePersons.data.length === 0) {
                        toast({
                          title: 'No Service Persons',
                          description: 'There are no service persons available for assignment',
                          variant: 'destructive',
                        });
                        return;
                      }
                      setAssignmentStep('SERVICE_PERSON');
                      setIsAssignDialogOpen(true);
                    } catch (error) {
                      console.error('Error fetching service persons:', error);
                      toast({
                        title: 'Error',
                        description: 'Failed to load service persons. Please try again.',
                        variant: 'destructive',
                      });
                    }
                  }}
                  disabled={!ticket}
                  variant="outline"
                  className="w-full justify-start h-12 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 transition-all duration-200 shadow-sm hover:shadow-md group"
                >
                  <div className="flex items-center">
                    <div className="p-1.5 rounded-full bg-blue-100 group-hover:bg-blue-200 mr-3 transition-colors">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Assign to Service Person</div>
                      <div className="text-xs text-blue-600 opacity-80">Send to field technician</div>
                    </div>
                  </div>
                </Button>
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
                          <div className="mt-1 space-y-1">
                            {history.notes && (
                              <p className="text-xs text-muted-foreground">
                                {history.notes.split('\n\n')[0]}
                              </p>
                            )}
                            {history.location && (
                              <div className="flex items-start mt-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 mt-0.5 mr-1 flex-shrink-0" />
                                <div>
                                  <p className="font-medium">Location:</p>
                                  {history.location.address ? (
                                    <p>{history.location.address}</p>
                                  ) : history.location.latitude && history.location.longitude ? (
                                    <p>
                                      {history.location.latitude.toFixed(6)}, {history.location.longitude.toFixed(6)}
                                    </p>
                                  ) : (
                                    <p>Location data available</p>
                                  )}
                                  {history.location.timestamp && (
                                    <p className="text-[10px] opacity-75">
                                      {format(new Date(history.location.timestamp), 'MMM d, h:mm a')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
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
        currentAssignedZoneUser={ticket.subOwner && ticket.subOwner.role === 'ZONE_USER' ? {
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
        userRole={user?.role}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
