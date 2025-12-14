"use client";

import { useState, useEffect } from 'react';
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
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  Loader2, 
  Users, 
  User, 
  MapPin, 
  Mail, 
  CheckCircle,
  ArrowRight,
  Zap,
  Search
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
  const [selectedZoneUserId, setSelectedZoneUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
    }
  }, [open, currentStep, currentAssignedExpertHelpdesk, currentAssignedZoneUser, currentAssignedServicePerson]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Fetch zone users if we're in the first step or if zoneId is provided
        if (currentStep === 'ZONE_USER' || zoneId) {
          const zoneUsersRes = await api.get('/zone-users/zone-users');
          // Handle both array response and paginated response
          const usersData = zoneUsersRes.data.data || zoneUsersRes.data;
          console.log('Zone users response:', usersData);
          // Include both ZONE_USER and ZONE_MANAGER roles
          const filteredUsers = usersData
            .filter((user: any) => user.role === 'ZONE_USER' || user.role === 'ZONE_MANAGER');
          console.log('Filtered zone users:', filteredUsers);
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
          // Handle both array response and paginated response
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
      // Reset state when dialog is opened
      setCurrentStep(initialStep);
      setSelectedZoneUserId('');
      fetchUsers();
      setSelectedUserId('');
    }
  }, [open, toast, currentStep, zoneId]);

  const handleNextStep = async () => {
    if (currentStep === 'ZONE_USER') {
      if (!selectedUserId) {
        toast.error('Please select a zone user first');
        return;
      }
      // Directly assign to zone user without showing service person step
      await handleAssignToZoneUser(selectedUserId);
    } else if (currentStep === 'SERVICE_PERSON') {
      if (!selectedUserId) {
        toast.error('Please select a service person');
        return;
      }
      await handleAssign();
    } else if (currentStep === 'EXPERT_HELPDESK') {
      if (!selectedUserId) {
        toast.error('Please select an expert helpdesk user');
        return;
      }
      await handleAssignToExpertHelpdesk(selectedUserId);
    }
  };

  const handleBack = () => {
    if (currentStep === 'ZONE_USER') {
      setCurrentStep('EXPERT_HELPDESK');
    } else if (currentStep === 'SERVICE_PERSON') {
      setCurrentStep('ZONE_USER');
    }
    setSelectedUserId('');
  };
  
  const handleAssignToExpertHelpdesk = async (expertUserId: string) => {
    if (!expertUserId) {
      toast.error('Please select an expert helpdesk user');
      return;
    }

    try {
      setLoading(true);
      
      // Assign to expert helpdesk using the standard assign endpoint
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
    if (!zoneUserId) {
      toast.error('Please select a zone user');
      return;
    }

    try {
      setLoading(true);
      
      // Assign to zone user
      const response = await api.patch(`/tickets/${ticketId}/assign-zone-user`, {
        zoneUserId: parseInt(zoneUserId),
        note: 'Assigned to zone user'
      });
      
      // Update status to ASSIGNED
      await api.patch(`/tickets/${ticketId}/status`, {
        status: 'ASSIGNED',
        comments: 'Ticket assigned to zone user'
      });
      
      if (response.data) {
        toast.success('Ticket assigned to zone user and status updated to Assigned');
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
      
      // Directly assign to service person
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        setSelectedUserId('');
      }
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            {currentStep === 'ZONE_USER' ? (
              <>
                <Users className="h-5 w-5 text-emerald-600" />
                Assign to Zone User
              </>
            ) : currentStep === 'SERVICE_PERSON' ? (
              <>
                <User className="h-5 w-5 text-blue-600" />
                Assign to Service Person
              </>
            ) : (
              <>
                <Users className="h-5 w-5 text-purple-600" />
                Assign to Expert Helpdesk
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-base">
            {currentStep === 'ZONE_USER' 
              ? 'Select a zone coordinator to delegate this ticket for local handling.'
              : currentStep === 'SERVICE_PERSON'
              ? 'Choose a field technician to handle the technical work on this ticket.'
              : 'Assign this ticket to an expert helpdesk user for specialized review and handling.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-2">
            <div 
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full cursor-pointer ${
                currentStep === 'EXPERT_HELPDESK'
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              onClick={() => setCurrentStep('EXPERT_HELPDESK')}
            >
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Expert Helpdesk</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div 
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full cursor-pointer ${
                currentStep === 'ZONE_USER' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              onClick={() => setCurrentStep('ZONE_USER')}
            >
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Zone User</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div 
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full cursor-pointer ${
                currentStep === 'SERVICE_PERSON' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              onClick={() => currentStep !== 'EXPERT_HELPDESK' && setCurrentStep('SERVICE_PERSON')}
            >
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">Service Person</span>
            </div>
          </div>

          {/* Current Assignment */}
          {(currentStep === 'ZONE_USER' && currentAssignedZoneUser) && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-emerald-100">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-emerald-800">Currently Assigned Zone User</div>
                      <div className="text-xs text-emerald-600">{currentAssignedZoneUser.name}{currentAssignedZoneUser.phone ? ` - ${currentAssignedZoneUser.phone}` : ''}</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    Current
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {(currentStep === 'SERVICE_PERSON' && currentAssignedServicePerson) && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-blue-800">Currently Assigned Service Person</div>
                      <div className="text-xs text-blue-600">{currentAssignedServicePerson.name}{currentAssignedServicePerson.phone ? ` - ${currentAssignedServicePerson.phone}` : ''}</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Current
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Selection */}
          <Card className="border-2 border-muted">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  {currentStep === 'ZONE_USER' ? (
                    <Users className="h-5 w-5 text-emerald-600" />
                  ) : currentStep === 'SERVICE_PERSON' ? (
                    <User className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Users className="h-5 w-5 text-purple-600" />
                  )}
                  <h3 className="font-medium">
                    {currentStep === 'ZONE_USER' 
                      ? 'Available Zone Users' 
                      : currentStep === 'SERVICE_PERSON'
                      ? 'Available Service Persons'
                      : 'Available Expert Helpdesk Users'}
                  </h3>
                </div>
                
                <Select 
                  onValueChange={setSelectedUserId} 
                  value={selectedUserId}
                  disabled={loading}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder={
                      currentStep === 'ZONE_USER' 
                        ? 'Choose a zone coordinator...' 
                        : currentStep === 'SERVICE_PERSON'
                        ? 'Choose a field technician...'
                        : 'Choose an expert helpdesk user...'
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-[500px] overflow-hidden p-0">
                    <div className="max-h-[500px] overflow-y-auto">
                      <SelectGroup>
                      {currentStep === 'ZONE_USER' ? (
                        zoneUsers.length > 0 ? (
                          zoneUsers
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id} className="py-3">
                                <div className="flex items-center space-x-3 w-full">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-emerald-100 text-emerald-700">
                                      {user.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-xs">{user.name}</span>
                                        <Badge 
                                          variant="secondary" 
                                          className={`text-xs ${user.role === 'ZONE_MANAGER' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}
                                        >
                                          {user.role === 'ZONE_MANAGER' ? 'Zone Manager' : 'Zone User'}
                                        </Badge>
                                      </div>
                                      {user.phone && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <span className="truncate max-w-[120px]">{user.phone}</span>
                                        </div>
                                      )}
                                    </div>
                                    {user.serviceZones && user.serviceZones.length > 0 && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <MapPin className="h-3 w-3 text-muted-foreground" />
                                        <div className="flex flex-wrap gap-1">
                                          {user.serviceZones.map((zone, index) => (
                                            <Badge 
                                              key={zone?.serviceZone?.id || index}
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {zone?.serviceZone?.name || 'Unknown Zone'}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                        ) : (
                          <div className="p-4 text-center text-muted-foreground">
                            {searchTerm ? (
                              <div className="flex flex-col items-center gap-2">
                                <Search className="h-8 w-8 text-muted-foreground" />
                                <p>No zone users found matching "{searchTerm}"</p>
                                <p className="text-sm">Try searching with different keywords</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Users className="h-8 w-8 text-muted-foreground" />
                                <p>No zone users available</p>
                              </div>
                            )}
                          </div>
                        )
                      ) : currentStep === 'SERVICE_PERSON' ? (
                        servicePersons.length > 0 ? (
                          servicePersons
                            .filter(user => {
                              if (!zoneId) return true;
                              return user.serviceZones?.some(
                                (zone: { serviceZone: { id: number } }) => 
                                  zone?.serviceZone?.id === zoneId
                              );
                            })
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id} className="py-3">
                                <div className="flex items-center space-x-3 w-full">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-blue-100 text-blue-700">
                                      {user.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-xs">{user.name}</span>
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                          Service Person
                                        </Badge>
                                      </div>
                                      {user.phone && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <span className="truncate max-w-[120px]">{user.phone}</span>
                                        </div>
                                      )}
                                    </div>
                                    {user.serviceZones && user.serviceZones.length > 0 && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <MapPin className="h-3 w-3 text-muted-foreground" />
                                        <div className="flex flex-wrap gap-1">
                                          {user.serviceZones.map((zone, index) => (
                                            <Badge 
                                              key={zone?.serviceZone?.id || index}
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {zone?.serviceZone?.name || 'Unknown Zone'}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                        ) : (
                          <div className="p-4 text-center text-muted-foreground">
                            {searchTerm ? (
                              <div className="flex flex-col items-center gap-2">
                                <Search className="h-8 w-8 text-muted-foreground" />
                                <p>No service persons found matching "{searchTerm}"</p>
                                <p className="text-sm">Try searching with different keywords</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <User className="h-8 w-8 text-muted-foreground" />
                                <p>No service persons available</p>
                              </div>
                            )}
                          </div>
                        )
                      ) : (
                        expertHelpdeskUsers.length > 0 ? (
                          expertHelpdeskUsers
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id} className="py-3">
                                <div className="flex items-center space-x-3 w-full">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-purple-100 text-purple-700">
                                      {user.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-xs">{user.name}</span>
                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                          Expert Helpdesk
                                        </Badge>
                                      </div>
                                      {user.phone && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <span className="truncate max-w-[120px]">{user.phone}</span>
                                        </div>
                                      )}
                                    </div>
                                    {user.email && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {user.email}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                        ) : (
                          <div className="p-4 text-center text-muted-foreground">
                            {searchTerm ? (
                              <div className="flex flex-col items-center gap-2">
                                <Search className="h-8 w-8 text-muted-foreground" />
                                <p>No expert helpdesk users found matching "{searchTerm}"</p>
                                <p className="text-sm">Try searching with different keywords</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Users className="h-8 w-8 text-muted-foreground" />
                                <p>No expert helpdesk users available</p>
                              </div>
                            )}
                          </div>
                        )
                      )}
                      </SelectGroup>
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Selected User Preview */}
          {selectedUserId && (
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Ready to assign</p>
                    <p className="text-sm text-muted-foreground">
                      {currentStep === 'ZONE_USER' 
                        ? 'This ticket will be delegated to the selected zone coordinator'
                        : currentStep === 'SERVICE_PERSON'
                        ? 'This ticket will be assigned to the selected field technician'
                        : 'This ticket will be assigned to the selected expert helpdesk user'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <DialogFooter className="mt-6">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          {(currentStep === 'SERVICE_PERSON' || currentStep === 'EXPERT_HELPDESK') && (
            <Button 
              variant="outline" 
              onClick={handleBack}
              disabled={loading}
            >
              Back
            </Button>
          )}
          <Button 
            onClick={handleNextStep}
            disabled={loading || !selectedUserId}
            className={currentStep === 'EXPERT_HELPDESK' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              `Assign to ${
                currentStep === 'ZONE_USER' 
                  ? 'Zone User' 
                  : currentStep === 'SERVICE_PERSON'
                  ? 'Service Person'
                  : 'Expert Helpdesk'
              }`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
