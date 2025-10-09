'use client';

import dynamic from 'next/dynamic';

// Simple loading component to avoid import issues
const SimpleLoading = () => (
  <div className="bg-white rounded-lg shadow-sm border p-6">
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);

// Dynamic imports for heavy customer components
export const DynamicCustomerTable = dynamic(
  () => import('./CustomerTable'),
  {
    loading: () => <SimpleLoading />,
    ssr: false, // Disable SSR for better performance
  }
);

export const DynamicCustomerStats = dynamic(
  () => import('./CustomerStats'),
  {
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    ),
    ssr: true, // Keep SSR for stats as they're above fold
  }
);

export const DynamicCustomerFilters = dynamic(
  () => import('./CustomerFilters'),
  {
    loading: () => (
      <div className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
        <div className="flex gap-4">
          <div className="h-10 bg-gray-200 rounded flex-1"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    ),
    ssr: true, // Keep SSR for filters as they're interactive
  }
);
