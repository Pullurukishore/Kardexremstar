"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  Ticket, 
  TicketStatus, 
  User,
  AssignTicketData,
  PlanOnsiteVisitData,
  CompleteOnsiteVisitData,
  RequestPOData,
  ApprovePOData,
  UpdateSparePartsData,
  CloseTicketData,
  AddNoteData
} from '@/types/ticket';
import api from '@/lib/api/axios';
import { 
  UserPlus, 
  Calendar, 
  CheckCircle, 
  ShoppingCart, 
  Package, 
  XCircle,
  FileText,
  Clock
} from 'lucide-react';

interface TicketWorkflowActionsProps {
  ticket: Ticket;
  currentUser: User;
  onTicketUpdate: () => void;
}

export default function TicketWorkflowActions({ 
  ticket, 
  currentUser, 
  onTicketUpdate 
}: TicketWorkflowActionsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const canAssign = currentUser.role === 'ADMIN' || currentUser.role === 'ZONE_USER';
  const canPlanVisit = canAssign || currentUser.role === 'SERVICE_PERSON';
  const canCompleteVisit = currentUser.role === 'SERVICE_PERSON' && ticket.assignedTo?.id === currentUser.id;
  const canRequestPO = canCompleteVisit;
  const canApprovePO = currentUser.role === 'ADMIN';
  const canUpdateSpareParts = currentUser.role === 'SERVICE_PERSON' || currentUser.role === 'ADMIN';
  const canClose = currentUser.role === 'ZONE_USER' || currentUser.role === 'ADMIN';

  const handleStatusUpdate = async (newStatus: TicketStatus, data?: any) => {
    try {
      setLoading(true);
      await api.put(`/tickets/${ticket.id}/status`, { status: newStatus, ...data });
      toast({
        title: 'Success',
        description: 'Ticket status updated successfully',
      });
      onTicketUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update ticket status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (data: AssignTicketData) => {
    try {
      setLoading(true);
      await api.post(`/tickets/${ticket.id}/assign`, data);
      toast({
        title: 'Success',
        description: 'Ticket assigned successfully',
      });
      onTicketUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign ticket',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlanVisit = async (data: PlanOnsiteVisitData) => {
    try {
      setLoading(true);
      await api.post(`/tickets/${ticket.id}/plan-onsite-visit`, data);
      toast({
        title: 'Success',
        description: 'Onsite visit planned successfully',
      });
      onTicketUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to plan onsite visit',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableActions = () => {
    const actions = [];

    switch (ticket.status) {
      case TicketStatus.OPEN:
        if (canAssign) {
          actions.push(
            <AssignTicketDialog 
              key="assign" 
              onAssign={handleAssign} 
              loading={loading} 
            />
          );
        }
        break;

      case TicketStatus.ASSIGNED:
        if (canCompleteVisit) {
          actions.push(
            <Button 
              key="start" 
              onClick={() => handleStatusUpdate(TicketStatus.IN_PROGRESS)}
              disabled={loading}
            >
              <Clock className="mr-2 h-4 w-4" />
              Start Work
            </Button>
          );
        }
        if (canPlanVisit) {
          actions.push(
            <PlanVisitDialog 
              key="plan-visit" 
              onPlan={handlePlanVisit} 
              loading={loading} 
            />
          );
        }
        break;

      case TicketStatus.IN_PROGRESS:
        if (canPlanVisit) {
          actions.push(
            <PlanVisitDialog 
              key="plan-visit" 
              onPlan={handlePlanVisit} 
              loading={loading} 
            />
          );
        }
        if (canCompleteVisit) {
          actions.push(
            <Button 
              key="resolve" 
              onClick={() => handleStatusUpdate(TicketStatus.RESOLVED)}
              disabled={loading}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark Resolved
            </Button>
          );
        }
        break;

      case TicketStatus.ONSITE_VISIT_PLANNED:
        if (canCompleteVisit) {
          actions.push(
            <CompleteVisitDialog 
              key="complete-visit" 
              ticket={ticket}
              onComplete={onTicketUpdate} 
              loading={loading} 
            />
          );
        }
        break;

      case TicketStatus.RESOLVED:
        if (canClose) {
          actions.push(
            <CloseTicketDialog 
              key="close" 
              ticket={ticket}
              onClose={onTicketUpdate} 
              loading={loading} 
            />
          );
        }
        break;

      case TicketStatus.PO_NEEDED:
        if (canApprovePO) {
          actions.push(
            <ApprovePODialog 
              key="approve-po" 
              ticket={ticket}
              onApprove={onTicketUpdate} 
              loading={loading} 
            />
          );
        }
        break;

      case TicketStatus.SPARE_PARTS_NEEDED:
        if (canUpdateSpareParts) {
          actions.push(
            <UpdateSparePartsDialog 
              key="update-parts" 
              ticket={ticket}
              onUpdate={onTicketUpdate} 
              loading={loading} 
            />
          );
        }
        break;
    }

    // Always available actions
    actions.push(
      <AddNoteDialog 
        key="add-note" 
        ticket={ticket}
        onAdd={onTicketUpdate} 
        loading={loading} 
      />
    );

    return actions;
  };

  return (
    <div className="flex flex-wrap gap-2">
      {getAvailableActions()}
    </div>
  );
}

// Dialog Components
function AssignTicketDialog({ onAssign, loading }: { 
  onAssign: (data: AssignTicketData) => void; 
  loading: boolean; 
}) {
  const [open, setOpen] = useState(false);
  const [assignedToId, setAssignedToId] = useState<number | null>(null);

  const handleSubmit = () => {
    if (assignedToId) {
      onAssign({ assignedToId });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Assign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Service Person</label>
            <Input 
              type="number"
              placeholder="Enter service person ID"
              onChange={(e) => setAssignedToId(Number(e.target.value))}
            />
          </div>
          <Button onClick={handleSubmit} disabled={loading || !assignedToId}>
            Assign Ticket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlanVisitDialog({ onPlan, loading }: { 
  onPlan: (data: PlanOnsiteVisitData) => void; 
  loading: boolean; 
}) {
  const [open, setOpen] = useState(false);
  const [servicePersonId, setServicePersonId] = useState<number | null>(null);
  const [visitDate, setVisitDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (servicePersonId && visitDate) {
      onPlan({ servicePersonId, visitDate, notes });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Plan Visit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan Onsite Visit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Service Person ID</label>
            <Input 
              type="number"
              onChange={(e) => setServicePersonId(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Visit Date</label>
            <Input 
              type="datetime-local"
              onChange={(e) => setVisitDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea 
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button onClick={handleSubmit} disabled={loading || !servicePersonId || !visitDate}>
            Plan Visit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Placeholder dialog components - implement similar patterns
function CompleteVisitDialog({ ticket, onComplete, loading }: any) {
  return <Button disabled>Complete Visit</Button>;
}

function ApprovePODialog({ ticket, onApprove, loading }: any) {
  return <Button disabled>Approve PO</Button>;
}

function UpdateSparePartsDialog({ ticket, onUpdate, loading }: any) {
  return <Button disabled>Update Parts</Button>;
}

function CloseTicketDialog({ ticket, onClose, loading }: any) {
  return <Button disabled>Close Ticket</Button>;
}

function AddNoteDialog({ ticket, onAdd, loading }: any) {
  return <Button variant="outline" disabled>Add Note</Button>;
}
