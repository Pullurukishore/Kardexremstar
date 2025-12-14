import { Button } from '@/components/ui/button';
import { Plus, List, AlertCircle, Users, Wrench } from 'lucide-react';
import { getTickets, calculateTicketStats } from '@/lib/server/ticket';
import TicketClient from '@/components/ticket/TicketClient';
import TicketFilters from '@/components/tickets/TicketFilters';
import Link from 'next/link';

type SearchParams = {
  status?: string;
  priority?: string;
  search?: string;
  page?: string;
  limit?: string;
  view?: 'all' | 'unassigned' | 'assigned-to-zone' | 'assigned-to-service-person';
};

type Props = {
  searchParams: SearchParams;
};

export default async function ExpertTicketsPage({ searchParams }: Props) {
  // Expert users only see their own assigned tickets
  const currentPage = parseInt(searchParams.page || '1');
  const currentLimit = parseInt(searchParams.limit || '100');
  
  const filters = {
    status: searchParams.status || '',
    priority: searchParams.priority || '',
    search: searchParams.search || '',
    page: currentPage,
    limit: currentLimit,
    view: 'assigned-to-service-person' as const, // Always show only expert's tickets
  };

  let ticketsData;
  let error = null;
  
  try {
    ticketsData = await getTickets(filters);
  } catch (err) {
    error = 'Failed to load tickets. Please try again.';
    ticketsData = { data: [], pagination: { total: 0, page: 1, limit: 100, totalPages: 1 } };
  }
  
  const { data: tickets, pagination } = ticketsData;
  const stats = calculateTicketStats(tickets);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with Gradient - Mobile Responsive */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 p-4 md:p-6 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative header-mobile">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">My Assigned Tickets</h1>
            <p className="text-blue-100 text-sm md:text-base">
              Manage all tickets assigned to you across all zones
            </p>
          </div>
          <Link href="/expert/tickets/create">
            <Button className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg btn-touch">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">New Ticket</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* No tabs needed - expert only sees their own tickets */}

      {/* Filters Section */}
      <TicketFilters searchParams={searchParams} />

      {/* Client Component for API calls - Expert only sees their assigned tickets */}
      <TicketClient 
        initialTickets={tickets}
        initialStats={stats}
        initialPagination={pagination}
        searchParams={searchParams}
        basePath="/expert/tickets"
      />
    </div>
  );
}
