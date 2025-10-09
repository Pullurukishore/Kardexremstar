'use client';

import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Target,
  Award,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ZonePerformanceAnalyticsProps {
  zoneDashboardData: {
    trends: {
      resolvedTickets: Array<{
        date: string;
        count: number;
      }>;
    };
    metrics: {
      openTickets: number;
      inProgressTickets: number;
      resolvedTickets: number;
      technicianEfficiency: number;
      customerSatisfactionScore: number;
    };
  };
}

// Helper function to format numbers
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

// Helper function to get performance rating
const getPerformanceRating = (score: number): { rating: string; color: string; icon: React.ReactNode } => {
  if (score >= 90) {
    return {
      rating: 'Excellent',
      color: 'text-green-600',
      icon: <Award className="h-4 w-4" />
    };
  } else if (score >= 75) {
    return {
      rating: 'Good',
      color: 'text-blue-600',
      icon: <TrendingUp className="h-4 w-4" />
    };
  } else if (score >= 60) {
    return {
      rating: 'Average',
      color: 'text-yellow-600',
      icon: <Activity className="h-4 w-4" />
    };
  } else {
    return {
      rating: 'Needs Improvement',
      color: 'text-red-600',
      icon: <AlertTriangle className="h-4 w-4" />
    };
  }
};

export default function ZonePerformanceAnalytics({ 
  zoneDashboardData 
}: ZonePerformanceAnalyticsProps) {
  const { trends, metrics } = zoneDashboardData;
  
  // Calculate weekly average for resolved tickets
  const weeklyAverage = trends.resolvedTickets.length > 0 
    ? trends.resolvedTickets.reduce((sum: number, day: any) => sum + day.count, 0) / trends.resolvedTickets.length
    : 0;

  const totalTickets = metrics.openTickets + metrics.inProgressTickets + metrics.resolvedTickets;
  const resolutionRate = totalTickets > 0 ? (metrics.resolvedTickets / totalTickets) * 100 : 0;
  
  // Calculate trend data
  const recentTrend = trends.resolvedTickets.slice(-7); // Last 7 days
  const totalResolved = recentTrend.reduce((sum, day) => sum + day.count, 0);
  const avgDailyResolved = recentTrend.length > 0 ? totalResolved / recentTrend.length : 0;
  
  // Get performance ratings
  const efficiencyRating = getPerformanceRating(metrics.technicianEfficiency);
  const satisfactionRating = getPerformanceRating(metrics.customerSatisfactionScore * 20); // Convert to 100 scale
  const resolutionRating = getPerformanceRating(resolutionRate);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Performance Overview */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(totalTickets)}
              </div>
              <div className="text-sm text-blue-800">Total Tickets</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100">
              <div className="text-2xl font-bold text-green-600">
                {resolutionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-green-800">Resolution Rate</div>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${efficiencyRating.color.replace('text-', 'bg-').replace('600', '100')}`}>
                  {efficiencyRating.icon}
                </div>
                <div>
                  <div className="font-medium">Technician Efficiency</div>
                  <div className={`text-sm ${efficiencyRating.color}`}>
                    {efficiencyRating.rating}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{metrics.technicianEfficiency.toFixed(1)}%</div>
                <Progress value={metrics.technicianEfficiency} className="w-20 h-2" />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${satisfactionRating.color.replace('text-', 'bg-').replace('600', '100')}`}>
                  {satisfactionRating.icon}
                </div>
                <div>
                  <div className="font-medium">Customer Satisfaction</div>
                  <div className={`text-sm ${satisfactionRating.color}`}>
                    {satisfactionRating.rating}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{metrics.customerSatisfactionScore.toFixed(1)}/5.0</div>
                <Progress value={(metrics.customerSatisfactionScore / 5) * 100} className="w-20 h-2" />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${resolutionRating.color.replace('text-', 'bg-').replace('600', '100')}`}>
                  {resolutionRating.icon}
                </div>
                <div>
                  <div className="font-medium">Resolution Rate</div>
                  <div className={`text-sm ${resolutionRating.color}`}>
                    {resolutionRating.rating}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{resolutionRate.toFixed(1)}%</div>
                <Progress value={resolutionRate} className="w-20 h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resolved Tickets Trend */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Resolved Tickets Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trend Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-gradient-to-r from-green-50 to-green-100">
              <div className="text-xl font-bold text-green-600">
                {formatNumber(totalResolved)}
              </div>
              <div className="text-sm text-green-800">Last 7 Days</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="text-xl font-bold text-blue-600">
                {avgDailyResolved.toFixed(1)}
              </div>
              <div className="text-sm text-blue-800">Daily Average</div>
            </div>
          </div>

          {/* Simple Trend Visualization */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Recent Activity (Last 7 Days)</span>
              <span>Tickets Resolved</span>
            </div>
            
            <div className="space-y-1">
              {recentTrend.map((day: any, index: number) => {
                const maxCount = Math.max(...recentTrend.map((d: any) => d.count));
                const percentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="text-xs text-muted-foreground w-16">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs font-medium text-gray-600 w-8 text-right">
                      {day.count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance Insights */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Performance Insights</span>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              {avgDailyResolved > 5 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Strong daily resolution performance</span>
                </div>
              )}
              {resolutionRate > 80 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>Excellent ticket resolution rate</span>
                </div>
              )}
              {metrics.technicianEfficiency > 80 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span>High technician efficiency maintained</span>
                </div>
              )}
              {metrics.customerSatisfactionScore > 4.0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span>Outstanding customer satisfaction</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
