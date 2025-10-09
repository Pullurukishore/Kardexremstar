"use client";

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreateTicketButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

export default function CreateTicketButton({ 
  variant = 'default', 
  size = 'default',
  className = '',
  children 
}: CreateTicketButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push('/admin/tickets/create');
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      className={className}
      onClick={handleClick}
    >
      <Plus className="mr-2 h-4 w-4" />
      {children || 'New Ticket'}
    </Button>
  );
}
