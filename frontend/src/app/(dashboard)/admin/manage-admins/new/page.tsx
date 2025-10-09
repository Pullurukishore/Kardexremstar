import React from 'react';
import { MobilePageHeader } from '@/components/ui/mobile-responsive';
import NewAdminClient from '@/components/admin/NewAdminClient';

export default function NewAdminPage() {
  return (
    <div className="space-y-6">
      {/* Desktop Header with Gradient */}
      <div className="hidden md:block relative overflow-hidden rounded-lg bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 p-6 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Add New Administrator</h1>
            <p className="text-green-100">
              Create a new administrator account with secure credentials
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
              <span className="text-2xl">👤</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <MobilePageHeader
          title="Add New Administrator"
          description="Create a new administrator account"
        />
      </div>

      {/* New Admin Form Client Component */}
      <NewAdminClient />
    </div>
  );
}