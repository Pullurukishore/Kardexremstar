import React from 'react';
import { notFound } from 'next/navigation';
import { getExternalUserById } from '@/lib/server/external';
import { MobilePageHeader } from '@/components/ui/mobile-responsive';
import ExternalUserPasswordChangeClient from '@/components/admin/ExternalUserPasswordChangeClient';

interface ExternalUserPasswordChangePageProps {
  params: {
    id: string;
  };
}

export default async function ExternalUserPasswordChangePage({ params }: ExternalUserPasswordChangePageProps) {
  const { id } = params;

  // Server-side data fetching
  try {
    const externalUser = await getExternalUserById(parseInt(id));
    
    if (!externalUser) {
      notFound();
    }

    return (
      <div className="space-y-6">
        {/* Desktop Header with Gradient */}
        <div className="hidden md:block relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 p-6 text-white">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Change Password</h1>
              <p className="text-indigo-100">
                Update password for {externalUser.name || externalUser.email}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                <span className="text-2xl">🔒</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden">
          <MobilePageHeader
            title="Change Password"
            description={`Update password for ${externalUser.name || externalUser.email}`}
          />
        </div>

        {/* Password Change Client Component */}
        <ExternalUserPasswordChangeClient externalUser={externalUser} />
      </div>
    );
  } catch (error) {
    console.error('Error fetching external user:', error);
    notFound();
  }
}