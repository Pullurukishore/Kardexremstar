import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface ZoneUserPaginationProps {
  currentPage: number;
  totalPages: number;
  searchParams: {
    search?: string;
    page?: string;
  };
}

export function ZoneUserPagination({ currentPage, totalPages, searchParams }: ZoneUserPaginationProps) {
  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (searchParams.search) params.set('search', searchParams.search);
    if (page > 1) params.set('page', page.toString());
    
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  };

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-500">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Link href={createPageUrl(currentPage - 1)}>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={currentPage <= 1}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
        </Link>
        
        <Link href={createPageUrl(currentPage + 1)}>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
