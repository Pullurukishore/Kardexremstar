"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Ticket,
  Clock,
  Eye,
  ArrowUpRight,
  RefreshCw
} from "lucide-react";
import { getStatusColor, getPriorityColor } from "./utils";
import type { DashboardData } from "./types";

interface RecentTicketsProps {
  dashboardData: Partial<DashboardData>;
  loading: boolean;
}

export default function RecentTickets({ dashboardData, loading }: RecentTicketsProps) {
  const router = useRouter();

  return (
    <Card className="bg-gradient-to-br from-white to-slate-50 border-0 shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              Recent Tickets
            </CardTitle>
            <CardDescription className="text-base mt-2">Latest support requests and critical issues requiring attention</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-orange-100 text-orange-800 px-3 py-1">
              <Clock className="w-4 h-4 mr-1" />
              Live Updates
            </Badge>
            <Button 
              variant="outline" 
              onClick={() => router.push('/admin/tickets')}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View All Tickets
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Loading recent tickets...</span>
          </div>
        ) : dashboardData?.recentTickets?.length ? (
          <div className="space-y-4">
            {dashboardData.recentTickets.slice(0, 5).map((ticket) => (
              <div 
                key={ticket.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{ticket.title}</h4>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={getPriorityColor(ticket.priority)} variant="outline">
                      {ticket.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {ticket.customer.companyName}
                    {ticket.asset && ` • ${ticket.asset.model}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created {new Date(ticket.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No recent tickets found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
