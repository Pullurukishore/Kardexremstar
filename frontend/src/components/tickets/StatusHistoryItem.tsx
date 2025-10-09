'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LocationDisplay, getNotesWithoutLocation, hasLocationData } from './LocationDisplay';
import { StatusBadge } from './StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { User, Clock, MessageSquare } from 'lucide-react';

type StatusHistoryItemProps = {
  statusHistory: {
    id: number;
    status: string;
    changedAt: string | Date;
    notes?: string;
    timeInStatus?: number;
    totalTimeOpen?: number;
    changedBy: {
      id: number;
      name?: string;
      email: string;
    };
  };
  className?: string;
};

export function StatusHistoryItem({ statusHistory, className = '' }: StatusHistoryItemProps) {
  const changedAt = new Date(statusHistory.changedAt);
  const cleanNotes = getNotesWithoutLocation(statusHistory.notes);
  const hasLocation = hasLocationData(statusHistory.notes);

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with status and time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusBadge status={statusHistory.status} />
              {/* Location badge removed from status history */}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatDistanceToNow(changedAt, { addSuffix: true })}</span>
            </div>
          </div>

          {/* Changed by information */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>
              Changed by {statusHistory.changedBy.name || statusHistory.changedBy.email}
            </span>
            <span className="text-xs">
              on {changedAt.toLocaleDateString()} at {changedAt.toLocaleTimeString()}
            </span>
          </div>

          {/* Time tracking information */}
          {(statusHistory.timeInStatus || statusHistory.totalTimeOpen) && (
            <div className="flex gap-4 text-sm">
              {statusHistory.timeInStatus && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-orange-500" />
                  <span className="text-muted-foreground">
                    Time in previous status: {Math.round(statusHistory.timeInStatus)} minutes
                  </span>
                </div>
              )}
              {statusHistory.totalTimeOpen && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-blue-500" />
                  <span className="text-muted-foreground">
                    Total time open: {Math.round(statusHistory.totalTimeOpen)} minutes
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Location information - Disabled for status history */}
          {/* Location display removed from status history as per requirement */}

          {/* Notes/Comments */}
          {cleanNotes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Notes</span>
              </div>
              <div className="bg-gray-50 border rounded-md p-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{cleanNotes}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
