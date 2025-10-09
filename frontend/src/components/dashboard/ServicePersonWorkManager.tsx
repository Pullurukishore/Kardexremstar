'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  Play,
  Pause,
  Square,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Activity,
  Ticket,
  ArrowRight,
  Timer,
  Navigation,
  Settings,
  Target,
  Zap,
  User,
  Calendar,
  ChevronRight,
  PlayCircle,
  PauseCircle,
  StopCircle,
  RotateCcw
} from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';
import Link from 'next/link';

// Enhanced status configurations with better visual hierarchy
const TICKET_STATUS_CONFIG = {
  ASSIGNED: { 
    label: 'Ready to Start', 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: Target,
    priority: 1,
    description: 'Ticket assigned and ready to begin'
  },
  IN_PROGRESS: { 
    label: 'Working On It', 
    color: 'bg-orange-100 text-orange-800 border-orange-200', 
    icon: Zap,
    priority: 2,
    description: 'Currently working on this ticket'
  },
  ONSITE_VISIT_STARTED: { 
    label: 'Traveling to Site', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    icon: Navigation,
    priority: 3,
    description: 'En route to customer location'
  },
  ONSITE_VISIT_REACHED: { 
    label: 'On Site', 
    color: 'bg-purple-100 text-purple-800 border-purple-200', 
    icon: MapPin,
    priority: 4,
    description: 'Arrived at customer location'
  },
  ONSITE_VISIT_IN_PROGRESS: { 
    label: 'Working On Site', 
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200', 
    icon: Settings,
    priority: 5,
    description: 'Actively working at customer site'
  },
  WAITING_CUSTOMER: { 
    label: 'Waiting for Customer', 
    color: 'bg-amber-100 text-amber-800 border-amber-200', 
    icon: User,
    priority: 3,
    description: 'Waiting for customer response or availability'
  },
  RESOLVED: { 
    label: 'Work Complete', 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: CheckCircle,
    priority: 6,
    description: 'Work completed successfully'
  },
  CLOSED: { 
    label: 'Closed', 
    color: 'bg-gray-100 text-gray-800 border-gray-200', 
    icon: Square,
    priority: 7,
    description: 'Ticket closed and completed'
  }
};

const ACTIVITY_STATUS_CONFIG = {
  ACTIVE: {
    label: 'In Progress',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: PlayCircle,
    description: 'Activity is currently running'
  },
  PAUSED: {
    label: 'Paused',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: PauseCircle,
    description: 'Activity is temporarily paused'
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: CheckCircle,
    description: 'Activity has been completed'
  }
};

interface WorkItem {
  id: number;
  type: 'ticket' | 'activity';
  title: string;
  description?: string;
  status: string;
  priority?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  location?: string;
  customer?: string;
  ticketId?: number;
  activityType?: string;
  metadata?: any;
}

interface ServicePersonWorkManagerProps {
  tickets?: any[];
  activities?: any[];
  onRefresh?: () => void;
}

export default function ServicePersonWorkManager({ 
  tickets = [], 
  activities = [], 
  onRefresh 
}: ServicePersonWorkManagerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Combine tickets and activities into unified work items
    const ticketItems: WorkItem[] = tickets.map(ticket => ({
      id: ticket.id,
      type: 'ticket' as const,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      customer: ticket.customer?.companyName || ticket.asset?.customer?.companyName,
      location: ticket.asset?.location,
      ticketId: ticket.id
    }));

    const activityItems: WorkItem[] = activities.map(activity => ({
      id: activity.id,
      type: 'activity' as const,
      title: activity.title,
      description: activity.description,
      status: activity.endTime ? 'COMPLETED' : 'ACTIVE',
      startTime: activity.startTime,
      endTime: activity.endTime,
      duration: activity.duration,
      location: activity.location,
      activityType: activity.activityType,
      ticketId: activity.ticketId
    }));

    // Sort by priority and status
    const allItems = [...ticketItems, ...activityItems].sort((a, b) => {
      if (a.type === 'ticket' && b.type === 'ticket') {
        const aConfig = TICKET_STATUS_CONFIG[a.status as keyof typeof TICKET_STATUS_CONFIG];
        const bConfig = TICKET_STATUS_CONFIG[b.status as keyof typeof TICKET_STATUS_CONFIG];
        return (aConfig?.priority || 999) - (bConfig?.priority || 999);
      }
      if (a.type === 'activity' && b.type === 'activity') {
        return a.status === 'ACTIVE' ? -1 : 1;
      }
      return a.type === 'ticket' ? -1 : 1;
    });

    setWorkItems(allItems);
  }, [tickets, activities]);

  const getStatusConfig = (item: WorkItem) => {
    if (item.type === 'ticket') {
      return TICKET_STATUS_CONFIG[item.status as keyof typeof TICKET_STATUS_CONFIG] || {
        label: item.status,
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: AlertCircle,
        priority: 999,
        description: 'Unknown status'
      };
    } else {
      return ACTIVITY_STATUS_CONFIG[item.status as keyof typeof ACTIVITY_STATUS_CONFIG] || {
        label: item.status,
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: AlertCircle,
        priority: undefined,
        description: 'Unknown status'
      };
    }
  };

  const formatDuration = (startTime: string, endTime?: string): string => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getWorkProgress = () => {
    const totalItems = workItems.length;
    const completedItems = workItems.filter(item => 
      item.status === 'COMPLETED' || item.status === 'CLOSED' || item.status === 'RESOLVED'
    ).length;
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  const getActiveItems = () => workItems.filter(item => 
    !['COMPLETED', 'CLOSED', 'RESOLVED'].includes(item.status)
  );

  const getCompletedItems = () => workItems.filter(item => 
    ['COMPLETED', 'CLOSED', 'RESOLVED'].includes(item.status)
  );

  const handleQuickAction = async (item: WorkItem, action: string) => {
    setLoading(true);
    try {
      if (item.type === 'ticket') {
        // Handle ticket actions
        const response = await apiClient.patch(`/tickets/${item.id}/status`, {
          status: action,
          comments: `Quick action: ${action}`
        });
        
        toast({
          title: "Ticket Updated",
          description: `Ticket status changed to ${action}`,
        });
      } else {
        // Handle activity actions
        if (action === 'complete') {
          await apiClient.patch(`/activities/${item.id}`, {
            endTime: new Date().toISOString()
          });
          
          toast({
            title: "Activity Completed",
            description: "Activity has been marked as completed",
          });
        }
      }
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error performing quick action:', error);
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderWorkItem = (item: WorkItem) => {
    const statusConfig = getStatusConfig(item);
    const StatusIcon = statusConfig.icon;

    return (
      <Card key={`${item.type}-${item.id}`} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {item.type === 'ticket' ? '🎫 Ticket' : '📋 Activity'}
                </Badge>
                <Badge className={`${statusConfig.color} border text-xs`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                {item.priority && (
                  <Badge variant={item.priority === 'CRITICAL' ? 'destructive' : 'secondary'} className="text-xs">
                    {item.priority}
                  </Badge>
                )}
              </div>
              
              <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
              {item.description && (
                <p className="text-gray-600 text-sm mb-2">{item.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {item.startTime && (
                  <div className="flex items-center gap-1">
                    <Timer className="h-4 w-4" />
                    {formatDuration(item.startTime, item.endTime)}
                  </div>
                )}
                {item.customer && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span className="truncate max-w-32">{item.customer}</span>
                  </div>
                )}
                {item.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate max-w-32">{item.location}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-2 ml-4">
              {item.type === 'ticket' && !['CLOSED', 'RESOLVED'].includes(item.status) && (
                <Link href={`/dashboard/service-person/tickets/${item.id}`}>
                  <Button size="sm" variant="outline" className="text-xs">
                    <Settings className="h-3 w-3 mr-1" />
                    Manage
                  </Button>
                </Link>
              )}
              
              {item.type === 'activity' && item.status === 'ACTIVE' && (
                <Button
                  size="sm"
                  onClick={() => handleQuickAction(item, 'complete')}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Button>
              )}
            </div>
          </div>
          
          {/* Progress indicator for tickets */}
          {item.type === 'ticket' && (
            (() => {
              const ticketStatusConfig = TICKET_STATUS_CONFIG[item.status as keyof typeof TICKET_STATUS_CONFIG];
              if (ticketStatusConfig?.priority) {
                return (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{ticketStatusConfig.priority} / 7</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(ticketStatusConfig.priority / 7) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              }
              return null;
            })()
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Work Overview Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Target className="h-6 w-6 text-blue-600" />
                Work Management Center
              </CardTitle>
              <CardDescription className="text-base">
                Manage all your tickets and activities in one place
              </CardDescription>
            </div>
            <Button onClick={onRefresh} variant="outline" size="sm" disabled={loading}>
              <RotateCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{workItems.length}</div>
              <div className="text-sm text-gray-600">Total Work Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{getActiveItems().length}</div>
              <div className="text-sm text-gray-600">Active Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{getCompletedItems().length}</div>
              <div className="text-sm text-gray-600">Completed Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{getWorkProgress()}%</div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
          </div>
          
          {/* Overall Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Daily Progress</span>
              <span>{getWorkProgress()}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${getWorkProgress()}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Work Management */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4" />
            Active Work ({getActiveItems().length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed ({getCompletedItems().length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {workItems.slice(0, 6).map(renderWorkItem)}
            {workItems.length > 6 && (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">
                    And {workItems.length - 6} more items...
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setActiveTab('active')}
                  >
                    View All Active Work
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4">
            {getActiveItems().length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
                  <p className="text-gray-600">No active work items at the moment.</p>
                </CardContent>
              </Card>
            ) : (
              getActiveItems().map(renderWorkItem)
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid gap-4">
            {getCompletedItems().length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Target className="h-12 w-12 mx-auto mb-4 text-blue-500 opacity-50" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Work</h3>
                  <p className="text-gray-600">Completed items will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              getCompletedItems().map(renderWorkItem)
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
