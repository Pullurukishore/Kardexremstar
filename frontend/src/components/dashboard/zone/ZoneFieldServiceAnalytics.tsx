'use client';

import React from 'react';
import { 
  Clock, 
  TrendingUp,
  Gauge,
  MapPin,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ZoneFieldServiceAnalyticsProps {
  zoneDashboardData: {
    metrics: {
      avgTravelTime: number;
      avgResponseTime?: number;
      avgResolutionTime?: number;
      technicianEfficiency: number;
    };
    stats: {
      avgResponseTime: { hours: number; minutes: number; change: number; isPositive: boolean };
      avgResolutionTime: { days: number; hours: number; minutes: number; change: number; isPositive: boolean };
      avgDowntime: { hours: number; minutes: number; change: number; isPositive: boolean };
    };
  };
}

// Helper function to format duration
const formatDuration = (hours: number, minutes: number): string => {
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Helper function to render change indicator
const ChangeIndicator = ({ change, isPositive }: { change: number; isPositive: boolean }) => {
  if (change === 0) return null;
  
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
  const arrow = isPositive ? '↓' : '↑';
  
  return (
    <Badge variant={isPositive ? 'default' : 'destructive'} className="text-xs">
      {arrow} {Math.abs(change)}%
    </Badge>
  );
};

export default function ZoneFieldServiceAnalytics({ 
  zoneDashboardData 
}: ZoneFieldServiceAnalyticsProps) {
  const { metrics, stats } = zoneDashboardData;
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg">
            <Gauge className="w-6 h-6 text-white" />
          </div>
          Field Service Analytics
        </h2>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Response Time Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-700">
                  {formatDuration(stats.avgResponseTime.hours, stats.avgResponseTime.minutes)}
                </p>
                <p className="text-sm text-blue-600">Avg Response Time</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-blue-700">Time to first response</p>
              <ChangeIndicator 
                change={stats.avgResponseTime.change} 
                isPositive={stats.avgResponseTime.isPositive} 
              />
            </div>
          </CardContent>
        </Card>

        {/* Travel Time Card */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-700">
                  {formatDuration(Math.floor(metrics.avgTravelTime / 60), metrics.avgTravelTime % 60)}
                </p>
                <p className="text-sm text-purple-600">Avg Travel Time</p>
              </div>
            </div>
            <p className="text-xs text-purple-700">Time to reach customer sites</p>
          </CardContent>
        </Card>

        {/* Resolution Time Card */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-700">
                  {formatDuration(stats.avgResolutionTime.days * 24 + stats.avgResolutionTime.hours, 0)}
                </p>
                <p className="text-sm text-green-600">Avg Resolution Time</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-green-700">Time to complete tickets</p>
              <ChangeIndicator 
                change={stats.avgResolutionTime.change} 
                isPositive={stats.avgResolutionTime.isPositive} 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1 mt-6">
        {/* Technician Efficiency */}
        <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cyan-600" />
                <span className="text-sm font-medium text-gray-700">Technician Efficiency</span>
              </div>
              <span className="text-xl font-bold text-cyan-600">
                {metrics.technicianEfficiency.toFixed(1)}%
              </span>
            </div>
            <Progress value={metrics.technicianEfficiency} className="h-3 mb-2" />
            <p className="text-xs text-gray-600">Overall performance</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
