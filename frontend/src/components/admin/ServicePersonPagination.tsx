import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ServicePersonPaginationProps {
  currentPage: number;
  totalPages: number;
  searchParams: {
    search?: string;
  };
}

export function ServicePersonPagination({ currentPage, totalPages, searchParams }: ServicePersonPaginationProps) {
  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (searchParams.search) params.set('search', searchParams.search);
    params.set('page', page.toString());
    return `?${params.toString()}`;
  };

  const pages = [];
  const maxVisiblePages = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  for (let i = startPage; i <= endPage; i++) {
    pages.push(
      <Button
        key={i}
        variant={i === currentPage ? 'default' : 'outline'}
        size="sm"
        asChild
      >
        <Link href={createPageUrl(i)}>{i}</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-center space-x-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === 1}
        asChild={currentPage > 1}
      >
        {currentPage > 1 ? (
          <Link href={createPageUrl(Math.max(1, currentPage - 1))}>Previous</Link>
        ) : (
          <span>Previous</span>
        )}
      </Button>
      {pages}
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === totalPages}
        asChild={currentPage < totalPages}
      >
        {currentPage < totalPages ? (
          <Link href={createPageUrl(Math.min(totalPages, currentPage + 1))}>Next</Link>
        ) : (
          <span>Next</span>
        )}
      </Button>
    </div>
  );
}
