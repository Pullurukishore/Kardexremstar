'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Ticket } from 'lucide-react';

interface TicketFormHeaderProps {
  onBack: () => void;
  isSubmitting?: boolean;
}

export function TicketFormHeader({ onBack, isSubmitting = false }: TicketFormHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-800 p-6 text-white">
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20"></div>
      <div className="relative flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Ticket className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Create New Ticket</h1>
            <p className="text-indigo-100">
              Submit a new support request with detailed information for faster resolution
            </p>
          </div>
        </div>
        <Button 
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );
}
