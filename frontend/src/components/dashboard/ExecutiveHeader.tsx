'use client';

import React from 'react';
import { RefreshCw, BarChart3, Calendar, Clock, Users, Wrench, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreateTicketButton from '@/components/tickets/CreateTicketButton';

interface ExecutiveHeaderProps {
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  // Optional stats to display
  stats?: {
    totalCustomers?: number;
    totalServicePersons?: number;
    totalServiceZones?: number;
  };
}

export default function ExecutiveHeader({ 
  isRefreshing, 
  onRefresh,
  stats 
}: ExecutiveHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-slate-600 font-medium">Real-time Operations & Field Service Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Last updated: {new Date().toLocaleTimeString()}
              {isRefreshing && <RefreshCw className="w-4 h-4 ml-1 animate-spin" />}
            </div>
          </div>

          {/* Admin Stats */}
          {stats && (stats.totalCustomers || stats.totalServicePersons || stats.totalServiceZones) && (
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {stats.totalCustomers !== undefined && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-blue-100 to-blue-200 px-4 py-2 rounded-xl shadow-sm">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-800">
                    {stats.totalCustomers} Customers
                  </span>
                </div>
              )}
              {stats.totalServicePersons !== undefined && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-purple-200 px-4 py-2 rounded-xl shadow-sm">
                  <Wrench className="h-4 w-4 text-purple-600" />
                  <span className="font-semibold text-purple-800">
                    {stats.totalServicePersons} Technicians
                  </span>
                </div>
              )}
              {stats.totalServiceZones !== undefined && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-green-100 to-green-200 px-4 py-2 rounded-xl shadow-sm">
                  <Building2 className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-800">
                    {stats.totalServiceZones} Zones
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2">
            <CreateTicketButton 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center gap-2"
            >
              Create New Ticket
            </CreateTicketButton>
            <Button
              onClick={onRefresh}
              variant="default"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center gap-2"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
