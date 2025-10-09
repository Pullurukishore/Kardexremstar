import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { MobilePageHeader } from '@/components/ui/mobile-responsive';
import { getExternalUsers, getExternalUserStats } from '@/lib/server/external';
import ExternalUserClient from '@/components/admin/ExternalUserClient';
import Link from 'next/link';

interface ManageExternalUsersPageProps {
  searchParams: {
    search?: string;
    page?: string;
  };
}

// Disable caching for this page to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ManageExternalUsersPage({ searchParams }: ManageExternalUsersPageProps) {
  const currentPage = parseInt(searchParams.page || '1');
  const search = searchParams.search || '';

  // Server-side data fetching with cache revalidation
  const response = await getExternalUsers({
    page: currentPage,
    limit: 20,
    search: search || undefined,
  });

  const externalUsers = response.data;
  const pagination = response.pagination;
  const stats = await getExternalUserStats(externalUsers);

  return (
    <div className="space-y-6">
      {/* Desktop Header with Gradient */}
      <div className="hidden md:block relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 p-6 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Manage External Users</h1>
            <p className="text-indigo-100">
              Manage external user accounts and customer access
            </p>
          </div>
          <Link href="/admin/manage-external/new">
            <Button className="bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              Add External User
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <MobilePageHeader
          title="Manage External Users"
          description="Manage external user accounts and customer access"
          action={
            <Link href="/admin/manage-external/new">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </Link>
          }
        />
      </div>

      {/* Client Component for API calls */}
      <ExternalUserClient 
        initialExternalUsers={externalUsers}
        initialStats={stats}
        initialPagination={pagination}
        searchParams={searchParams}
      />
    </div>
  );
}