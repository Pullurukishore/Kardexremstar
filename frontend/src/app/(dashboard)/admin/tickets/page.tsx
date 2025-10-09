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

export default async function AdminTicketsPage({ searchParams }: Props) {
  const currentView = (searchParams.view || 'all') as 'all' | 'unassigned' | 'assigned-to-zone' | 'assigned-to-service-person';
  const currentPage = parseInt(searchParams.page || '1');
  const currentLimit = parseInt(searchParams.limit || '30');
  
  const filters = {
    status: searchParams.status || '',
    priority: searchParams.priority || '',
    search: searchParams.search || '',
    page: currentPage,
    limit: currentLimit,
    view: currentView,
  };

  let ticketsData;
  let error = null;
  
  try {
    ticketsData = await getTickets(filters);
  } catch (err) {
    console.error('Error fetching tickets:', err);
    error = 'Failed to load tickets. Please try again.';
    ticketsData = { data: [], pagination: { total: 0, page: 1, limit: 30, totalPages: 1 } };
  }
  
  const { data: tickets, pagination } = ticketsData;
  const stats = calculateTicketStats(tickets);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with Gradient - Mobile Responsive */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-red-600 via-orange-600 to-red-800 p-4 md:p-6 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative header-mobile">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Support Tickets</h1>
            <p className="text-red-100 text-sm md:text-base">
              Manage and track all support tickets across your organization
            </p>
          </div>
          <Link href="/admin/tickets/create">
            <Button className="bg-white text-red-600 hover:bg-red-50 shadow-lg btn-touch">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">New Ticket</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Tab Navigation - Mobile Scrollable */}
      <div className="tabs-mobile">
        <Link href={`?${new URLSearchParams({ ...searchParams, view: 'all' }).toString()}`} className="tab-item">
          <Button
            variant={currentView === 'all' ? 'default' : 'ghost'}
            className={`btn-touch ${currentView === 'all' ? 'bg-red-600 hover:bg-red-700 text-white' : 'hover:bg-red-50'}`}
            size="sm"
          >
            <List className="mr-1 md:mr-2 h-4 w-4" />
            <span className="text-xs md:text-sm">All</span>
          </Button>
        </Link>
        <Link href={`?${new URLSearchParams({ ...searchParams, view: 'unassigned' }).toString()}`} className="tab-item">
          <Button
            variant={currentView === 'unassigned' ? 'default' : 'ghost'}
            className={`btn-touch ${currentView === 'unassigned' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'hover:bg-orange-50'}`}
            size="sm"
          >
            <AlertCircle className="mr-1 md:mr-2 h-4 w-4" />
            <span className="text-xs md:text-sm">Unassigned</span>
          </Button>
        </Link>
        <Link href={`?${new URLSearchParams({ ...searchParams, view: 'assigned-to-zone' }).toString()}`} className="tab-item">
          <Button
            variant={currentView === 'assigned-to-zone' ? 'default' : 'ghost'}
            className={`btn-touch ${currentView === 'assigned-to-zone' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'hover:bg-blue-50'}`}
            size="sm"
          >
            <Users className="mr-1 md:mr-2 h-4 w-4" />
            <span className="text-xs md:text-sm">Zone Users</span>
          </Button>
        </Link>
        <Link href={`?${new URLSearchParams({ ...searchParams, view: 'assigned-to-service-person' }).toString()}`} className="tab-item">
          <Button
            variant={currentView === 'assigned-to-service-person' ? 'default' : 'ghost'}
            className={`btn-touch ${currentView === 'assigned-to-service-person' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-50'}`}
            size="sm"
          >
            <Wrench className="mr-1 md:mr-2 h-4 w-4" />
            <span className="text-xs md:text-sm">Service Person</span>
          </Button>
        </Link>
      </div>

      {/* Filters Section */}
      <TicketFilters searchParams={searchParams} />

      {/* Client Component for API calls */}
      <TicketClient 
        initialTickets={tickets}
        initialStats={stats}
        searchParams={searchParams}
      />
    </div>
  );
}
