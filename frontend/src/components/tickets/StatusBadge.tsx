import { cn } from '@/lib/utils';

type TicketStatus = string;

const statusColors: Record<string, string> = {
  'OPEN': 'bg-blue-100 text-blue-800',
  'ASSIGNED': 'bg-purple-100 text-purple-800',
  'WAITING_CUSTOMER': 'bg-orange-100 text-orange-800',
  'ONSITE_VISIT': 'bg-indigo-100 text-indigo-800',
  'ONSITE_VISIT_PLANNED': 'bg-indigo-100 text-indigo-800',
  'ONSITE_VISIT_STARTED': 'bg-indigo-100 text-indigo-800',
  'ONSITE_VISIT_REACHED': 'bg-indigo-100 text-indigo-800',
  'ONSITE_VISIT_IN_PROGRESS': 'bg-indigo-100 text-indigo-800',
  'ONSITE_VISIT_RESOLVED': 'bg-indigo-100 text-indigo-800',
  'ONSITE_VISIT_PENDING': 'bg-indigo-100 text-indigo-800',
  'ONSITE_VISIT_COMPLETED': 'bg-indigo-100 text-indigo-800',
  'PO_NEEDED': 'bg-amber-100 text-amber-800',
  'PO_REACHED': 'bg-amber-100 text-amber-800',
  'PO_RECEIVED': 'bg-amber-100 text-amber-800',
  'SPARE_PARTS_NEEDED': 'bg-amber-100 text-amber-800',
  'SPARE_PARTS_BOOKED': 'bg-amber-100 text-amber-800',
  'SPARE_PARTS_DELIVERED': 'bg-amber-100 text-amber-800',
  'CLOSED_PENDING': 'bg-gray-100 text-gray-800',
  'CLOSED': 'bg-green-100 text-green-800',
  'CANCELLED': 'bg-red-100 text-red-800',
  'REOPENED': 'bg-blue-100 text-blue-800',
  'IN_PROGRESS': 'bg-yellow-100 text-yellow-800',
  'ON_HOLD': 'bg-gray-100 text-gray-800',
  'ESCALATED': 'bg-red-100 text-red-800',
  'RESOLVED': 'bg-green-100 text-green-800',
  'PENDING': 'bg-gray-100 text-gray-800',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
