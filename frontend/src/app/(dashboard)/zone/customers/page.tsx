import { getCustomers, getCustomerStats } from '@/lib/server/customer';
import CustomerClient from '@/components/customer/CustomerClient';
import { MobilePageHeader } from '@/components/ui/mobile-responsive';

interface SearchParams {
  search?: string;
  status?: string;
  page?: string;
}

export default async function ZoneCustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const search = searchParams.search || '';
  const status = searchParams.status || 'all';
  const page = parseInt(searchParams.page || '1');

  try {
    // Fetch data server-side
    const allCustomers = await getCustomers({ search, status, page, limit: 100 });
    const stats = await getCustomerStats(allCustomers);

    return (
      <div className="space-y-6">
        {/* Desktop Header with Gradient */}
        <div className="hidden md:block relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 p-6 text-white">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Customers</h1>
              <p className="text-blue-100">
                View customers within your assigned service zones
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden">
          <MobilePageHeader
            title="Customers"
            description="View customers within your assigned service zones"
          />
        </div>

        {/* Client Component for API calls - read-only mode */}
        <CustomerClient 
          initialCustomers={allCustomers}
          initialStats={stats}
          searchParams={searchParams}
          readOnly={true}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading customers:', error);
    return (
      <div>
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-red-100 to-red-100 flex items-center justify-center mb-4">
            <div className="h-12 w-12 text-red-500">⚠️</div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading customers</h3>
          <p className="text-gray-500 mb-6">
            Failed to load customers. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
