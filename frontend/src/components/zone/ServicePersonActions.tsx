'use client';

import { useState } from 'react';
import { Pencil, Trash2, Eye, MoreHorizontal } from 'lucide-react';
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
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

interface ServicePerson {
  id: number;
  email: string;
  isActive: boolean;
}

interface ZoneServicePersonActionsProps {
  person: ServicePerson;
  onRefresh?: () => Promise<void>;
}

export function ZoneServicePersonActions({ person, onRefresh }: ZoneServicePersonActionsProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      // Use general delete endpoint (backend will handle zone restrictions)
      await apiClient.delete(`/service-persons/${person.id}`);

      toast({
        title: 'Success',
        description: 'Service person deleted successfully',
      });

      // Refresh the data instead of reloading the page
      if (onRefresh) {
        await onRefresh();
      } else {
        router.refresh(); // Fallback to router refresh if no callback provided
      }
    } catch (error: any) {
      console.error('Error deleting service person:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete service person',
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
            <DropdownMenuItem asChild>
              <Link href={`/zone/service-persons/${person.id}`} className="flex items-center">
                <Eye className="mr-2 h-4 w-4 text-blue-500" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/zone/service-persons/${person.id}/edit`} className="flex items-center">
                <Pencil className="mr-2 h-4 w-4 text-green-500" />
                Edit
              </Link>
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
              Actions for {person.email}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Link 
              href={`/zone/service-persons/${person.id}`}
              className="flex items-center w-full p-3 text-left hover:bg-blue-50 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Eye className="mr-3 h-5 w-5 text-blue-500" />
              <span className="font-medium">View Details</span>
            </Link>
            <Link 
              href={`/zone/service-persons/${person.id}/edit`}
              className="flex items-center w-full p-3 text-left hover:bg-green-50 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Pencil className="mr-3 h-5 w-5 text-green-500" />
              <span className="font-medium">Edit</span>
            </Link>
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
              Delete Service Person
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete <span className="font-semibold">"{person.email}"</span>? This action cannot be undone.
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
