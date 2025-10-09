'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, Loader2, Ticket } from 'lucide-react';

interface TicketFormActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
}

export function TicketFormActions({ isSubmitting, onCancel }: TicketFormActionsProps) {
  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
      <CardContent className="p-6">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>All required fields will be validated before submission</span>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
              className="hover:bg-gray-50 border-gray-300"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg text-white px-8"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Ticket...
                </>
              ) : (
                <>
                  <Ticket className="mr-2 h-4 w-4" />
                  Create Ticket
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
