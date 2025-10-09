"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Calendar, Clock, RefreshCw, Download, Info } from "lucide-react";
import CreateTicketButton from "@/components/tickets/CreateTicketButton";

interface ExecutiveHeaderProps {
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
}

export default function ExecutiveHeader({ isRefreshing, onRefresh }: ExecutiveHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Executive Dashboard
              </h1>
              <p className="text-slate-600 font-medium">Business Intelligence & Field Service Analytics</p>
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
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2">
            <CreateTicketButton 
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 flex items-center gap-2"
            >
              Create New Ticket
            </CreateTicketButton>
            <Button
              onClick={onRefresh}
              variant="default"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 flex items-center gap-2"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Business Hours Notice */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 text-blue-800">
          <Info className="h-4 w-4" />
          <span className="text-sm font-medium">
            Time metrics (Response Time, Resolution Time, Downtime, Onsite Work) are calculated using business hours only (9 AM - 5 PM, Monday to Saturday). Travel times show actual elapsed time.
          </span>
        </div>
      </div>
    </div>
  );
}
