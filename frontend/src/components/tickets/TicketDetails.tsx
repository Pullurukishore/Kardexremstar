import { Ticket, TicketStatus } from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

type TicketDetailsProps = {
  ticket: Ticket;
  onStatusChange: (status: TicketStatus) => Promise<void>;
};

export function TicketDetails({ ticket, onStatusChange }: TicketDetailsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line">{ticket.description}</p>
        </CardContent>
      </Card>

      {ticket.errorDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Error Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 p-4 rounded-md">
              <pre className="whitespace-pre-wrap text-sm">{ticket.errorDetails}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600">1</span>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">Ticket Created</div>
                <div className="text-sm text-gray-500">
                  {format(new Date(ticket.createdAt), 'MMM d, yyyy hh:mm a')}
                </div>
              </div>
            </div>

            {ticket.status === TicketStatus.CLOSED_PENDING && (
              <div className="flex items-start">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600">✓</span>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-900">Pending Closure</div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(ticket.updatedAt), 'MMM d, yyyy hh:mm a')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
