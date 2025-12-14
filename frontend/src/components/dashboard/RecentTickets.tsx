"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Ticket,
  Clock,
  Eye,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  Building2,
  Cpu,
  Zap
} from "lucide-react";
import type { DashboardData } from "./types";

interface RecentTicketsProps {
  dashboardData: Partial<DashboardData>;
  loading: boolean;
}

// Enhanced status colors with subtle gradients
const getStatusStyles = (status: string) => {
  const statusLower = status.toLowerCase();
  
  const styles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    'open': { 
      bg: 'bg-blue-50', 
      text: 'text-blue-700', 
      border: 'border-blue-200',
      dot: 'bg-blue-500'
    },
    'assigned': { 
      bg: 'bg-purple-50', 
      text: 'text-purple-700', 
      border: 'border-purple-200',
      dot: 'bg-purple-500'
    },
    'in_progress': { 
      bg: 'bg-amber-50', 
      text: 'text-amber-700', 
      border: 'border-amber-200',
      dot: 'bg-amber-500'
    },
    'waiting_customer': { 
      bg: 'bg-orange-50', 
      text: 'text-orange-700', 
      border: 'border-orange-200',
      dot: 'bg-orange-500'
    },
    'resolved': { 
      bg: 'bg-emerald-50', 
      text: 'text-emerald-700', 
      border: 'border-emerald-200',
      dot: 'bg-emerald-500'
    },
    'closed': { 
      bg: 'bg-green-50', 
      text: 'text-green-700', 
      border: 'border-green-200',
      dot: 'bg-green-500'
    },
    'escalated': { 
      bg: 'bg-red-50', 
      text: 'text-red-700', 
      border: 'border-red-200',
      dot: 'bg-red-500'
    }
  };

  return styles[statusLower] || { 
    bg: 'bg-slate-50', 
    text: 'text-slate-700', 
    border: 'border-slate-200',
    dot: 'bg-slate-500'
  };
};

const getPriorityStyles = (priority: string) => {
  const priorityLower = priority.toLowerCase();
  
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    'critical': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    'high': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    'medium': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'low': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' }
  };

  return styles[priorityLower] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
};

const formatStatus = (status: string) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatPriority = (priority: string) => {
  return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
};

export default function RecentTickets({ dashboardData, loading }: RecentTicketsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const getTicketsRoute = (ticketId?: string) => {
    const basePath = pathname.startsWith('/zone') 
      ? '/zone' 
      : pathname.startsWith('/service-person') 
        ? '/service-person' 
        : '/admin';
    
    return ticketId ? `${basePath}/tickets/${ticketId}` : `${basePath}/tickets`;
  };

  const tickets = dashboardData?.recentTickets?.slice(0, 6) || [];

  return (
    <Card className="relative overflow-hidden bg-white/90 backdrop-blur-xl border-0 shadow-xl rounded-2xl sm:rounded-3xl">
      {/* Background decorations */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-orange-200/40 to-rose-200/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-amber-200/30 to-yellow-200/20 rounded-full blur-3xl" />
      
      <CardHeader className="relative z-10 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold">
              <div className="relative">
                <div className="p-2.5 sm:p-3 bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 rounded-xl sm:rounded-2xl shadow-lg shadow-orange-500/25">
                  <Ticket className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <span className="text-slate-800">Recent Activity</span>
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-2 text-slate-500 ml-14 sm:ml-16">
              Latest support requests and ticket updates
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap ml-14 sm:ml-0">
            <Badge className="bg-orange-100 text-orange-700 border border-orange-200/50 px-3 py-1.5 text-xs font-semibold">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2 animate-pulse" />
              <Zap className="w-3 h-3 mr-1" />
              Live
            </Badge>
            
            <Button 
              variant="outline" 
              onClick={() => router.push(getTicketsRoute())}
              className="bg-white hover:bg-orange-50 border-orange-200 text-orange-700 hover:text-orange-800 flex items-center gap-2 text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-300 rounded-xl"
              size="sm"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View All</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 pt-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="p-4 bg-gradient-to-br from-orange-100 to-rose-100 rounded-2xl">
                <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            </div>
            <span className="text-slate-500 font-medium">Loading tickets...</span>
          </div>
        ) : tickets.length > 0 ? (
          <div className="space-y-3">
            {tickets.map((ticket, index) => {
              const statusStyles = getStatusStyles(ticket.status);
              const priorityStyles = getPriorityStyles(ticket.priority);
              
              return (
                <div 
                  key={ticket.id} 
                  className="group relative p-4 sm:p-5 bg-gradient-to-r from-white to-slate-50/50 border border-slate-200/60 rounded-xl sm:rounded-2xl hover:border-orange-300/60 hover:shadow-lg hover:shadow-orange-100/50 transition-all duration-300 cursor-pointer"
                  onClick={() => router.push(getTicketsRoute(ticket.id.toString()))}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Status indicator line */}
                  <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-full ${statusStyles.dot} opacity-60 group-hover:opacity-100 transition-opacity`} />
                  
                  <div className="flex items-start sm:items-center gap-4 ml-3">
                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
                      {/* Title and badges row */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5 sm:mb-0">
                          <h4 className="font-semibold text-slate-800 text-sm sm:text-base group-hover:text-orange-700 transition-colors truncate max-w-[200px] sm:max-w-none">
                            {ticket.title}
                          </h4>
                          
                          {/* Badges - responsive layout */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge className={`${statusStyles.bg} ${statusStyles.text} ${statusStyles.border} border text-[10px] sm:text-xs font-medium px-2 py-0.5`}>
                              {formatStatus(ticket.status)}
                            </Badge>
                            <Badge className={`${priorityStyles.bg} ${priorityStyles.text} ${priorityStyles.border} border text-[10px] sm:text-xs font-medium px-2 py-0.5`}>
                              {formatPriority(ticket.priority)}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Info row */}
                        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[120px] sm:max-w-[200px]">{ticket.customer.companyName}</span>
                          </span>
                          
                          {ticket.asset && (
                            <span className="flex items-center gap-1.5">
                              <Cpu className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[80px] sm:max-w-[120px]">{ticket.asset.model}</span>
                            </span>
                          )}
                          
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Arrow button */}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="flex-shrink-0 text-slate-400 hover:text-orange-600 hover:bg-orange-50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
                    >
                      <ArrowUpRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 space-y-4">
            <div className="relative inline-flex">
              <div className="p-5 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl">
                <Ticket className="h-10 w-10 text-slate-400" />
              </div>
              <div className="absolute -top-1 -right-1 p-2 bg-emerald-100 rounded-full border-2 border-white">
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-slate-700">All caught up!</p>
              <p className="text-sm text-slate-500">No recent tickets found</p>
            </div>
            <Button 
              onClick={() => router.push(getTicketsRoute())}
              className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-semibold mt-2 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
            >
              <Eye className="w-4 h-4 mr-2" />
              Browse All Tickets
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
