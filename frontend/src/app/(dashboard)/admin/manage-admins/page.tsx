import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { MobilePageHeader } from '@/components/ui/mobile-responsive';
import { getAdmins, getAdminStats } from '@/lib/server/admin';
import AdminClient from '@/components/admin/AdminClientSimple';
import Link from 'next/link';

interface ManageAdminsPageProps {
  searchParams: {
    search?: string;
    page?: string;
  };
}

// Disable caching for this page to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ManageAdminsPage({ searchParams }: ManageAdminsPageProps) {
  const currentPage = parseInt(searchParams.page || '1');
  const search = searchParams.search || '';

  // Server-side data fetching with cache revalidation
  const response = await getAdmins({
    page: currentPage,
    limit: 20,
    search: search || undefined,
  });

  const admins = response.data;
  const pagination = response.pagination;
  const stats = await getAdminStats(admins);

  return (
    <div className="space-y-6">
      {/* Desktop Header with Gradient */}
      <div className="hidden md:block relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 p-6 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Manage Admins</h1>
            <p className="text-blue-100">
              Manage administrator accounts and permissions
            </p>
          </div>
          <Link href="/admin/manage-admins/new">
            <Button className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              Add Admin
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <MobilePageHeader
          title="Manage Admins"
          description="Manage administrator accounts and permissions"
          action={
            <Link href="/admin/manage-admins/new">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </Link>
          }
        />
      </div>

      {/* Client Component for API calls */}
      <AdminClient 
        initialAdmins={admins}
        initialStats={stats}
        initialPagination={pagination}
        searchParams={searchParams}
      />
    </div>
  );
}
