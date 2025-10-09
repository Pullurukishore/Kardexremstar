import { Priority } from '@/types/ticket';
import { cn } from '@/lib/utils';

const priorityColors: Record<Priority, string> = {
  [Priority.LOW]: 'bg-green-100 text-green-800',
  [Priority.MEDIUM]: 'bg-yellow-100 text-yellow-800',
  [Priority.HIGH]: 'bg-orange-100 text-orange-800',
  [Priority.CRITICAL]: 'bg-red-100 text-red-800',
};

const priorityLabels: Record<Priority, string> = {
  [Priority.LOW]: 'Low',
  [Priority.MEDIUM]: 'Medium',
  [Priority.HIGH]: 'High',
  [Priority.CRITICAL]: 'Critical',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        priorityColors[priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800'
      )}
    >
      {priorityLabels[priority as keyof typeof priorityLabels] || priority}
    </span>
  );
}
