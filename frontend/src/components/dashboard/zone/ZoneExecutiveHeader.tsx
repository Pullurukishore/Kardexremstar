'use client';

import React from 'react';
import { RefreshCw, MapPin, Users, Wrench, Server, Calendar, Clock, BarChart3, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CreateTicketButton from '@/components/tickets/CreateTicketButton';

interface ZoneExecutiveHeaderProps {
  zoneData: {
    id: number;
    name: string;
    description: string;
    totalCustomers?: number;
    totalTechnicians?: number;
    totalAssets?: number;
  };
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function ZoneExecutiveHeader({ 
  zoneData, 
  onRefresh, 
  isRefreshing 
}: ZoneExecutiveHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {zoneData.name}
              </h1>
              <p className="text-slate-600 font-medium">Zone Field Service Management & Analytics</p>
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

          {/* Zone Stats */}
          {(zoneData.totalCustomers || zoneData.totalTechnicians || zoneData.totalAssets) && (
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {zoneData.totalCustomers && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-blue-100 to-blue-200 px-4 py-2 rounded-xl shadow-sm">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-800">
                    {zoneData.totalCustomers} Customers
                  </span>
                </div>
              )}
              {zoneData.totalTechnicians && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-purple-200 px-4 py-2 rounded-xl shadow-sm">
                  <Wrench className="h-4 w-4 text-purple-600" />
                  <span className="font-semibold text-purple-800">
                    {zoneData.totalTechnicians} Technicians
                  </span>
                </div>
              )}
              {zoneData.totalAssets && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-green-100 to-green-200 px-4 py-2 rounded-xl shadow-sm">
                  <Server className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-800">
                    {zoneData.totalAssets} Assets
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
