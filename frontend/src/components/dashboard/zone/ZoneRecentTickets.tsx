'use client';

import React from 'react';
import { 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  MapPin,
  Calendar,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ZoneRecentTicketsProps {
  zoneDashboardData: {
    recentActivities?: Array<{
      id: number;
      type: string;
      description: string;
      timestamp: string;
      priority: string;
      technician?: string;
    }>;
    topIssues?: Array<{
      title: string;
      count: number;
      priority?: string;
      avgResolutionTime?: number;
    }>;
  };
}

// Helper function to format timestamp
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }
};

// Helper function to get priority color
const getPriorityColor = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Helper function to get activity icon
const getActivityIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'ticket_created':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'ticket_resolved':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'ticket_assigned':
      return <User className="h-4 w-4 text-blue-500" />;
    case 'maintenance':
      return <RefreshCw className="h-4 w-4 text-purple-500" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
  }
};

export default function ZoneRecentTickets({ 
  zoneDashboardData 
}: ZoneRecentTicketsProps) {
  const { recentActivities = [], topIssues = [] } = zoneDashboardData;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Recent Activities */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent activities</p>
              </div>
            ) : (
              recentActivities.slice(0, 8).map((activity: any) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.description}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getPriorityColor(activity.priority)}`}
                      >
                        {activity.priority}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatTimestamp(activity.timestamp)}</span>
                      </div>
                      
                      {activity.technician && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{activity.technician}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Issues */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Top Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topIssues.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No major issues reported</p>
              </div>
            ) : (
              topIssues.slice(0, 8).map((issue: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-100 to-red-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-orange-600">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {issue.title}
                      </p>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {issue.avgResolutionTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{issue.avgResolutionTime}h avg</span>
                          </div>
                        )}
                        
                        {issue.priority && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPriorityColor(issue.priority)}`}
                          >
                            {issue.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 ml-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-600">
                        {issue.count}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {issue.count === 1 ? 'ticket' : 'tickets'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
