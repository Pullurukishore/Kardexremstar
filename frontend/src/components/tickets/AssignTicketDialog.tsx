"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Loader2, 
  Users, 
  User, 
  MapPin, 
  Mail, 
  CheckCircle,
  ArrowRight,
  Search,
  Phone,
  Sparkles,
  UserCheck,
  X
} from 'lucide-react';
import api from '@/lib/api/axios';

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: 'ZONE_USER' | 'SERVICE_PERSON' | 'EXPERT_HELPDESK';
  role?: 'ZONE_USER' | 'ZONE_MANAGER' | 'SERVICE_PERSON' | 'EXPERT_HELPDESK';
  serviceZones?: Array<{ 
    userId: number;
    serviceZoneId: number;
    serviceZone: { 
      id: number; 
      name: string;
      description?: string;
      isActive?: boolean;
    } 
  }>;
};

type AssignTicketDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: number | null;
  onSuccess: () => void;
  zoneId?: number;
  initialStep?: AssignmentStep;
  currentAssignedExpertHelpdesk?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  } | null;
  currentAssignedZoneUser?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  } | null;
  currentAssignedServicePerson?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  } | null;
};

type AssignmentStep = 'ZONE_USER' | 'SERVICE_PERSON' | 'EXPERT_HELPDESK';

export function AssignTicketDialog({ open, onOpenChange, ticketId, onSuccess, zoneId, initialStep = 'EXPERT_HELPDESK', currentAssignedExpertHelpdesk, currentAssignedZoneUser, currentAssignedServicePerson }: AssignTicketDialogProps) {
  if (ticketId === null) return null;
  const [loading, setLoading] = useState(false);
  const [zoneUsers, setZoneUsers] = useState<User[]>([]);
  const [servicePersons, setServicePersons] = useState<User[]>([]);
  const [expertHelpdeskUsers, setExpertHelpdeskUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [currentStep, setCurrentStep] = useState<AssignmentStep>(initialStep);
  const [searchTerm, setSearchTerm] = useState('');

  // Get step-specific colors
  const getStepColors = (step: AssignmentStep) => {
    switch (step) {
      case 'EXPERT_HELPDESK':
        return {
          gradient: 'from-purple-600 via-fuchsia-600 to-purple-700',
          light: 'bg-purple-50',
          border: 'border-purple-200',
          text: 'text-purple-700',
          bg: 'bg-purple-100',
          ring: 'ring-purple-500/30',
          shadow: 'shadow-purple-500/20'
        };
      case 'ZONE_USER':
        return {
          gradient: 'from-emerald-600 via-teal-600 to-emerald-700',
          light: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          bg: 'bg-emerald-100',
          ring: 'ring-emerald-500/30',
          shadow: 'shadow-emerald-500/20'
        };
      case 'SERVICE_PERSON':
        return {
          gradient: 'from-blue-600 via-indigo-600 to-blue-700',
          light: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          bg: 'bg-blue-100',
          ring: 'ring-blue-500/30',
          shadow: 'shadow-blue-500/20'
        };
    }
  };

  const colors = getStepColors(currentStep);

  // Get current users based on step
  const getCurrentUsers = () => {
    switch (currentStep) {
      case 'EXPERT_HELPDESK':
        return expertHelpdeskUsers;
      case 'ZONE_USER':
        return zoneUsers;
      case 'SERVICE_PERSON':
        return servicePersons.filter(user => {
          if (!zoneId) return true;
          return user.serviceZones?.some(
            (zone: { serviceZone: { id: number } }) => 
              zone?.serviceZone?.id === zoneId
          );
        });
    }
  };

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    const users = getCurrentUsers();
    if (!searchTerm.trim()) return users;
    
    const search = searchTerm.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      user.phone?.toLowerCase().includes(search) ||
      user.serviceZones?.some(zone => 
        zone?.serviceZone?.name?.toLowerCase().includes(search)
      )
    );
  }, [currentStep, expertHelpdeskUsers, zoneUsers, servicePersons, searchTerm, zoneId]);

  // Get selected user details
  const selectedUser = useMemo(() => {
    return getCurrentUsers().find(u => u.id === selectedUserId);
  }, [selectedUserId, currentStep, expertHelpdeskUsers, zoneUsers, servicePersons]);

  // Pre-select current assigned person when dialog opens
  useEffect(() => {
    if (open) {
      if (currentStep === 'EXPERT_HELPDESK' && currentAssignedExpertHelpdesk) {
        setSelectedUserId(currentAssignedExpertHelpdesk.id);
      } else if (currentStep === 'ZONE_USER' && currentAssignedZoneUser) {
        setSelectedUserId(currentAssignedZoneUser.id);
      } else if (currentStep === 'SERVICE_PERSON' && currentAssignedServicePerson) {
        setSelectedUserId(currentAssignedServicePerson.id);
      } else {
        setSelectedUserId('');
      }
      setSearchTerm('');
    }
  }, [open, currentStep, currentAssignedExpertHelpdesk, currentAssignedZoneUser, currentAssignedServicePerson]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Fetch zone users if we're in the first step or if zoneId is provided
        if (currentStep === 'ZONE_USER' || zoneId) {
          const zoneUsersRes = await api.get('/zone-users/zone-users');
          const usersData = zoneUsersRes.data.data || zoneUsersRes.data;
          const filteredUsers = usersData
            .filter((user: any) => user.role === 'ZONE_USER' || user.role === 'ZONE_MANAGER');
          setZoneUsers(filteredUsers
            .map((user: any) => ({
              id: user.id.toString(),
              name: user.name || user.email.split('@')[0],
              email: user.email,
              phone: user.phone,
              type: 'ZONE_USER' as const,
              role: user.role,
              serviceZones: user.serviceZones || []
            }))
          );
        }
        
        // Fetch service persons if we're in the service person step
        if (currentStep === 'SERVICE_PERSON') {
          const servicePersonsRes = await api.get('/service-persons');
          const personsData = servicePersonsRes.data.data || servicePersonsRes.data;
          
          if (Array.isArray(personsData)) {
            setServicePersons(personsData.map((user: any) => ({
              id: user.id.toString(),
              name: user.name || user.email.split('@')[0],
              email: user.email,
              phone: user.phone,
              type: 'SERVICE_PERSON' as const,
              serviceZones: user.serviceZones || []
            })));
          } else {
            setServicePersons([]);
          }
        }
        
        // Fetch expert helpdesk users if we're in the expert helpdesk step
        if (currentStep === 'EXPERT_HELPDESK') {
          try {
            const expertUsersRes = await api.get('/admin/users', { params: { role: 'EXPERT_HELPDESK' } });
            const expertUsersData = expertUsersRes.data.users || expertUsersRes.data;
            
            if (Array.isArray(expertUsersData)) {
              setExpertHelpdeskUsers(expertUsersData.map((user: any) => ({
                id: user.id.toString(),
                name: user.name || user.email.split('@')[0],
                email: user.email,
                phone: user.phone,
                type: 'EXPERT_HELPDESK' as const
              })));
            } else {
              setExpertHelpdeskUsers([]);
            }
          } catch (error) {
            console.error('Failed to fetch expert helpdesk users:', error);
            setExpertHelpdeskUsers([]);
          }
        }
      } catch (error) {
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      setCurrentStep(initialStep);
      fetchUsers();
      setSelectedUserId('');
    }
  }, [open, toast, currentStep, zoneId]);

  const handleAssignToExpertHelpdesk = async (expertUserId: string) => {
    try {
      setLoading(true);
      const response = await api.patch(`/tickets/${ticketId}/assign`, {
        assignedToId: parseInt(expertUserId),
        note: 'Assigned to expert helpdesk'
      });
      
      if (response.data) {
        toast.success('Ticket assigned to expert helpdesk');
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error('Failed to assign ticket to expert helpdesk');
      }
    } catch (error: unknown) {
      let errorMessage = 'Failed to assign ticket to expert helpdesk';
      if (error && typeof error === 'object' && 'response' in error) {
        const responseError = error as { response?: { data?: { message?: string } } };
        errorMessage = responseError.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToZoneUser = async (zoneUserId: string) => {
    try {
      setLoading(true);
      const response = await api.patch(`/tickets/${ticketId}/assign-zone-user`, {
        zoneUserId: parseInt(zoneUserId),
        note: 'Assigned to zone user'
      });
      
      await api.patch(`/tickets/${ticketId}/status`, {
        status: 'ASSIGNED',
        comments: 'Ticket assigned to zone user'
      });
      
      if (response.data) {
        toast.success('Ticket assigned to zone user');
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error('Failed to assign ticket');
      }
    } catch (error: unknown) {
      let errorMessage = 'Failed to assign ticket';
      if (error && typeof error === 'object' && 'response' in error) {
        const responseError = error as { response?: { data?: { message?: string } } };
        errorMessage = responseError.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast.error('Please select a service person');
      return;
    }

    try {
      setLoading(true);
      const response = await api.patch(`/tickets/${ticketId}/assign`, {
        assignedToId: parseInt(selectedUserId),
        note: 'Assigned to service person'
      });
      
      if (response.data) {
        toast.success(`Ticket assigned successfully`);
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error('Failed to assign ticket');
      }
    } catch (error: unknown) {
      let errorMessage = 'Failed to assign ticket';
      if (error && typeof error === 'object' && 'response' in error) {
        const responseError = error as { response?: { data?: { message?: string } } };
        errorMessage = responseError.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user first');
      return;
    }
    
    if (currentStep === 'ZONE_USER') {
      await handleAssignToZoneUser(selectedUserId);
    } else if (currentStep === 'EXPERT_HELPDESK') {
      await handleAssignToExpertHelpdesk(selectedUserId);
    }
  };

  const handleBack = () => {
    if (currentStep === 'ZONE_USER') {
      setCurrentStep('EXPERT_HELPDESK');
    }
    setSelectedUserId('');
    setSearchTerm('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        setSelectedUserId('');
        setSearchTerm('');
      }
    }}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] p-0 overflow-hidden border-0 shadow-2xl flex flex-col">
        {/* Premium Gradient Header */}
        <div className={`bg-gradient-to-r ${colors.gradient} p-6 text-white relative overflow-hidden flex-shrink-0`}>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl ring-1 ring-white/30">
                {currentStep === 'ZONE_USER' ? (
                  <Users className="h-5 w-5 text-white" />
                ) : currentStep === 'SERVICE_PERSON' ? (
                  <User className="h-5 w-5 text-white" />
                ) : (
                  <Sparkles className="h-5 w-5 text-white" />
                )}
              </div>
              <DialogTitle className="text-xl font-bold text-white">
                {currentStep === 'ZONE_USER' 
                  ? 'Assign to Zone User' 
                  : currentStep === 'SERVICE_PERSON'
                  ? 'Assign to Service Person'
                  : 'Assign to Expert Helpdesk'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-white/80 text-sm">
              {currentStep === 'ZONE_USER' 
                ? 'Select a zone coordinator to delegate this ticket for local handling.'
                : currentStep === 'SERVICE_PERSON'
                ? 'Choose a field technician to handle the technical work on this ticket.'
                : 'Assign this ticket to an expert helpdesk user for specialized review and handling.'}
            </DialogDescription>
          </div>
        </div>
        
        <div className="p-6 space-y-5 bg-gradient-to-b from-slate-50/50 to-white flex-1 overflow-y-auto">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 pb-2">
            <button 
              onClick={() => { setCurrentStep('EXPERT_HELPDESK'); setSelectedUserId(''); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                currentStep === 'EXPERT_HELPDESK'
                  ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/25' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Expert</span>
            </button>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <button 
              onClick={() => { setCurrentStep('ZONE_USER'); setSelectedUserId(''); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                currentStep === 'ZONE_USER' 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Zone</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, email, phone, or zone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-12 bg-white border-slate-200 focus:border-slate-300 rounded-xl shadow-sm"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* User List */}
          <div className={`rounded-xl border ${colors.border} bg-white overflow-hidden`}>
            <div className={`px-4 py-3 ${colors.light} border-b ${colors.border} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <UserCheck className={`h-4 w-4 ${colors.text}`} />
                <span className={`text-sm font-medium ${colors.text}`}>
                  {filteredUsers.length} Available {currentStep === 'ZONE_USER' ? 'Zone Users' : 'Expert Users'}
                </span>
              </div>
              {searchTerm && (
                <Badge variant="secondary" className="text-xs">
                  Filtered
                </Badge>
              )}
            </div>
            
            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className={`h-6 w-6 animate-spin ${colors.text}`} />
                  <span className="ml-2 text-sm text-slate-500">Loading users...</span>
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`p-4 cursor-pointer transition-all duration-200 hover:bg-slate-50 ${
                        selectedUserId === user.id 
                          ? `${colors.light} ring-2 ${colors.ring}` 
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className={`h-10 w-10 ring-2 ${selectedUserId === user.id ? colors.ring : 'ring-slate-100'}`}>
                          <AvatarFallback className={`${colors.bg} ${colors.text} font-semibold`}>
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-800 text-sm">{user.name}</span>
                            {user.role && (
                              <Badge 
                                className={`text-[10px] ${
                                  user.role === 'ZONE_MANAGER' 
                                    ? 'bg-amber-100 text-amber-700 border-amber-200' 
                                    : `${colors.bg} ${colors.text} ${colors.border}`
                                }`}
                              >
                                {user.role === 'ZONE_MANAGER' ? 'Manager' : 
                                 user.role === 'ZONE_USER' ? 'Zone User' :
                                 user.role === 'SERVICE_PERSON' ? 'Service Person' : 'Expert'}
                              </Badge>
                            )}
                            {selectedUserId === user.id && (
                              <CheckCircle className={`h-4 w-4 ${colors.text} ml-auto`} />
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </span>
                            {user.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {user.phone}
                              </span>
                            )}
                          </div>
                          
                          {user.serviceZones && user.serviceZones.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {user.serviceZones.slice(0, 3).map((zone, index) => (
                                <Badge 
                                  key={zone?.serviceZone?.id || index}
                                  variant="outline"
                                  className="text-[10px] bg-slate-50"
                                >
                                  {zone?.serviceZone?.name || 'Unknown Zone'}
                                </Badge>
                              ))}
                              {user.serviceZones.length > 3 && (
                                <Badge variant="outline" className="text-[10px] bg-slate-50">
                                  +{user.serviceZones.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Search className="h-10 w-10 text-slate-300 mb-3" />
                  {searchTerm ? (
                    <>
                      <p className="font-medium">No users found</p>
                      <p className="text-sm text-slate-400">Try searching with different keywords</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">No users available</p>
                      <p className="text-sm text-slate-400">No {currentStep.toLowerCase().replace('_', ' ')} users to display</p>
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Selected User Preview */}
          {selectedUser && (
            <Card className={`border-2 ${colors.border} ${colors.light} overflow-hidden`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${colors.bg} rounded-lg`}>
                    <CheckCircle className={`h-5 w-5 ${colors.text}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">Ready to assign to {selectedUser.name}</p>
                    <p className="text-sm text-slate-500">
                      {selectedUser.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl"
          >
            Cancel
          </Button>
          
          <div className="flex gap-2">
            {currentStep === 'ZONE_USER' && (
              <Button 
                variant="outline" 
                onClick={handleBack}
                disabled={loading}
                className="rounded-xl"
              >
                Back
              </Button>
            )}
            <Button 
              onClick={handleNextStep}
              disabled={loading || !selectedUserId}
              className={`rounded-xl bg-gradient-to-r ${colors.gradient} hover:opacity-90 shadow-lg ${colors.shadow} transition-all duration-200`}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Assign to {currentStep === 'ZONE_USER' ? 'Zone User' : 'Expert'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
