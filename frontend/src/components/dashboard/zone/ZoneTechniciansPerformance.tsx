'use client';

import React from 'react';
import { 
  Users, 
  Star, 
  Activity, 
  TrendingUp,
  TrendingDown,
  Award,
  Clock,
  Target,
  Wrench
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ZoneTechniciansPerformanceProps {
  zoneDashboardData: {
    technicians?: Array<{
      id: number;
      name: string;
      activeTickets: number;
      efficiency: number;
      rating: number;
    }>;
  };
}

// Helper function to get performance rating
const getPerformanceRating = (efficiency: number, rating: number): { 
  rating: string; 
  color: string; 
  icon: React.ReactNode;
  bgColor: string;
} => {
  const score = (efficiency + (rating * 20)) / 2; // Convert rating to 100 scale and average
  
  if (score >= 85) {
    return {
      rating: 'Excellent',
      color: 'text-green-600',
      icon: <Award className="h-4 w-4" />,
      bgColor: 'bg-green-50'
    };
  } else if (score >= 70) {
    return {
      rating: 'Good',
      color: 'text-blue-600',
      icon: <TrendingUp className="h-4 w-4" />,
      bgColor: 'bg-blue-50'
    };
  } else if (score >= 55) {
    return {
      rating: 'Average',
      color: 'text-yellow-600',
      icon: <Activity className="h-4 w-4" />,
      bgColor: 'bg-yellow-50'
    };
  } else {
    return {
      rating: 'Needs Improvement',
      color: 'text-red-600',
      icon: <TrendingDown className="h-4 w-4" />,
      bgColor: 'bg-red-50'
    };
  }
};

// Helper function to get workload status
const getWorkloadStatus = (activeTickets: number): { 
  status: string; 
  color: string; 
  bgColor: string;
} => {
  if (activeTickets === 0) {
    return {
      status: 'Available',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    };
  } else if (activeTickets <= 3) {
    return {
      status: 'Normal',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    };
  } else if (activeTickets <= 6) {
    return {
      status: 'Busy',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    };
  } else {
    return {
      status: 'Overloaded',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    };
  }
};

export default function ZoneTechniciansPerformance({ 
  zoneDashboardData 
}: ZoneTechniciansPerformanceProps) {
  const { technicians = [] } = zoneDashboardData;
  
  // Calculate team statistics
  const totalTechnicians = technicians.length;
  const avgEfficiency = totalTechnicians > 0 
    ? technicians.reduce((sum: number, tech: any) => sum + tech.efficiency, 0) / totalTechnicians 
    : 0;
  const avgRating = totalTechnicians > 0 
    ? technicians.reduce((sum: number, tech: any) => sum + tech.rating, 0) / totalTechnicians 
    : 0;
  const totalActiveTickets = technicians.reduce((sum: number, tech: any) => sum + tech.activeTickets, 0);
  
  // Sort technicians by efficiency (highest first)
  const sortedTechnicians = [...technicians].sort((a, b) => b.efficiency - a.efficiency);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-500" />
          Technicians Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100">
            <div className="text-2xl font-bold text-purple-600">
              {totalTechnicians}
            </div>
            <div className="text-sm text-purple-800">Total Technicians</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="text-2xl font-bold text-blue-600">
              {avgEfficiency.toFixed(1)}%
            </div>
            <div className="text-sm text-blue-800">Avg Efficiency</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100">
            <div className="text-2xl font-bold text-orange-600">
              {avgRating.toFixed(1)}/5.0
            </div>
            <div className="text-sm text-orange-800">Avg Rating</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-gradient-to-r from-green-50 to-green-100">
            <div className="text-2xl font-bold text-green-600">
              {totalActiveTickets}
            </div>
            <div className="text-sm text-green-800">Active Tickets</div>
          </div>
        </div>

        {/* Technicians List */}
        <div className="space-y-3">
          {technicians.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No technicians assigned to this zone</p>
            </div>
          ) : (
            sortedTechnicians.map((technician) => {
              const performanceRating = getPerformanceRating(technician.efficiency, technician.rating);
              const workloadStatus = getWorkloadStatus(technician.activeTickets);
              
              return (
                <div
                  key={technician.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  {/* Technician Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {technician.name}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${workloadStatus.bgColor} ${workloadStatus.color} border-current`}
                        >
                          {workloadStatus.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          <span>{technician.activeTickets} active tickets</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-orange-500" />
                          <span>{technician.rating.toFixed(1)}/5.0</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Performance Metrics */}
                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {technician.efficiency.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Efficiency</div>
                      <Progress value={technician.efficiency} className="w-20 h-2 mt-1" />
                    </div>
                    
                    <div className="text-center">
                      <div className={`text-sm font-medium ${performanceRating.color}`}>
                        {performanceRating.rating}
                      </div>
                      <div className="text-xs text-muted-foreground">Performance</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Performance Summary */}
        {technicians.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Team Performance Summary</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-2 rounded-lg bg-green-50">
                <div className="text-sm font-bold text-green-600">
                  {technicians.filter((t: any) => t.efficiency >= 80).length}
                </div>
                <div className="text-xs text-green-700">High Performers</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-blue-50">
                <div className="text-sm font-bold text-blue-600">
                  {technicians.filter((t: any) => t.activeTickets === 0).length}
                </div>
                <div className="text-xs text-blue-700">Available</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-yellow-50">
                <div className="text-sm font-bold text-yellow-600">
                  {technicians.filter((t: any) => t.activeTickets > 3).length}
                </div>
                <div className="text-xs text-yellow-700">Busy</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-purple-50">
                <div className="text-sm font-bold text-purple-600">
                  {technicians.filter((t: any) => t.rating >= 4.0).length}
                </div>
                <div className="text-xs text-purple-700">Top Rated</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
