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
import api from '@/lib/api/axios';

interface ZoneUser {
  id: number;
  email: string;
}

interface ZoneUserActionsProps {
  user: ZoneUser;
  onDeleteSuccess?: () => void;
}

export function ZoneUserActions({ user, onDeleteSuccess }: ZoneUserActionsProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const response = await api.delete(`/zone-users/${user.id}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete zone user');
      }

      toast({
        title: 'Success',
        description: 'Zone user deleted successfully',
      });

      // Call the callback to update parent component state
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
      
      router.refresh(); // Refresh the page to update the data
    } catch (error: any) {
      console.error('Error deleting zone user:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to delete zone user',
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
              <Link href={`/admin/zone-users/${user.id}`} className="flex items-center">
                <Eye className="mr-2 h-4 w-4 text-blue-500" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/zone-users/${user.id}/edit`} className="flex items-center">
                <Pencil className="mr-2 h-4 w-4 text-green-500" />
                Edit Zones
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteDialogOpen(true)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove from Zones
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
              Actions for {user.email}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Link 
              href={`/admin/zone-users/${user.id}`}
              className="flex items-center w-full p-3 text-left hover:bg-blue-50 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Eye className="mr-3 h-5 w-5 text-blue-500" />
              <span className="font-medium">View Details</span>
            </Link>
            <Link 
              href={`/admin/zone-users/${user.id}/edit`}
              className="flex items-center w-full p-3 text-left hover:bg-green-50 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Pencil className="mr-3 h-5 w-5 text-green-500" />
              <span className="font-medium">Edit Zones</span>
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setDeleteDialogOpen(true);
              }}
              className="flex items-center w-full p-3 text-left hover:bg-red-50 rounded-lg transition-colors text-red-600"
            >
              <Trash2 className="mr-3 h-5 w-5" />
              <span className="font-medium">Remove from Zones</span>
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
              Remove Zone User
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              This action will permanently remove <span className="font-semibold">"{user.email}"</span> from all assigned service zones. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel 
              className="w-full sm:w-auto hover:bg-gray-100" 
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Removing...' : 'Remove User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
