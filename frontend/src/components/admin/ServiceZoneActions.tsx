'use client';

import { useState } from 'react';
import { Pencil, Trash2, BarChart3, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

interface ServiceZone {
  id: number;
  name: string;
}

interface ServiceZoneActionsProps {
  zone: ServiceZone;
}

export function ServiceZoneActions({ zone }: ServiceZoneActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleViewStats = () => {
    router.push(`/admin/service-zones/${zone.id}`);
  };

  const handleEdit = () => {
    router.push(`/admin/service-zones/${zone.id}/edit`);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/service-zones/${zone.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete service zone');
      }

      toast({
        title: 'Success',
        description: 'Service zone deleted successfully',
      });

      router.refresh(); // Refresh the page to update the data
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete service zone',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      {/* Desktop Dropdown Menu */}
      <div className="hidden sm:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hover:bg-gray-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-48 z-50"
            sideOffset={5}
            alignOffset={-5}
          >
            <DropdownMenuItem onClick={handleViewStats}>
              <BarChart3 className="mr-2 h-4 w-4 text-blue-500" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="mr-2 h-4 w-4 text-green-500" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setDeleteDialogOpen(true)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Actions Menu */}
      <div className="sm:hidden">
        <Button 
          variant="ghost" 
          size="sm" 
          className="hover:bg-gray-100 btn-touch"
          onClick={() => setMobileMenuOpen(true)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Actions Modal */}
      <AlertDialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <MoreHorizontal className="h-5 w-5" />
              Actions for {zone.name}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleViewStats();
              }}
              className="flex items-center w-full p-3 text-left hover:bg-blue-50 rounded-lg transition-colors"
            >
              <BarChart3 className="mr-3 h-5 w-5 text-blue-500" />
              <span className="font-medium">View Details</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleEdit();
              }}
              className="flex items-center w-full p-3 text-left hover:bg-green-50 rounded-lg transition-colors"
            >
              <Pencil className="mr-3 h-5 w-5 text-green-500" />
              <span className="font-medium">Edit</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setDeleteDialogOpen(true);
              }}
              className="flex items-center w-full p-3 text-left hover:bg-red-50 rounded-lg transition-colors text-red-600"
            >
              <Trash2 className="mr-3 h-5 w-5" />
              <span className="font-medium">Delete</span>
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="w-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Service Zone
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              This will permanently delete the service zone <span className="font-semibold">"{zone.name}"</span>. 
              This action cannot be undone and will fail if there are associated customers, 
              service persons, or tickets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel 
              disabled={isDeleting}
              className="w-full sm:w-auto hover:bg-gray-100"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
