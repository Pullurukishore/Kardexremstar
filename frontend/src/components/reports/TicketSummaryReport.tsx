// Server-side component - charts replaced with static summaries

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ReportData } from './types';

interface TicketSummaryReportProps {
  reportData: ReportData;
}

export function TicketSummaryReport({ reportData }: TicketSummaryReportProps) {
  const { 
    statusDistribution, 
    priorityDistribution, 
    zoneDistribution,
    customerDistribution,
    customerPerformanceMetrics,
    summary,
    insights
  } = reportData;

  if (!summary || !statusDistribution) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket Summary Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No ticket data available for the selected period.</p>
        </CardContent>
      </Card>
    );
  }

  // Helper function to format minutes to hours and minutes
  const formatMinutesToHoursAndMinutes = (totalMinutes: number): { hours: number; minutes: number; formatted: string } => {
    if (!totalMinutes || totalMinutes <= 0) {
      return { hours: 0, minutes: 0, formatted: '0h 0m' };
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return { 
        hours, 
        minutes, 
        formatted: minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
      };
    } else {
      return { 
        hours: 0, 
        minutes, 
        formatted: `${minutes}m`
      };
    }
  };

  // Use the processed data from the server
  const statusCounts = statusDistribution || {};
  const priorityCounts = priorityDistribution || {};
  const totalTickets = summary.totalTickets || 0;

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'OPEN': 'bg-blue-500',
      'IN_PROGRESS': 'bg-yellow-500',
      'ASSIGNED': 'bg-purple-500',
      'RESOLVED': 'bg-green-500',
      'CLOSED': 'bg-gray-500',
      'ESCALATED': 'bg-red-500',
      'PENDING': 'bg-orange-500'
    };
    return colors[status] || 'bg-gray-400';
  };

  // Helper function to get priority color
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'LOW': 'bg-green-500',
      'MEDIUM': 'bg-yellow-500',
      'HIGH': 'bg-orange-500',
      'CRITICAL': 'bg-red-500'
    };
    return colors[priority] || 'bg-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Ticket Summary - Always show summary cards */}
      <Card>
        <CardHeader>
          <CardTitle>Ticket Summary Report</CardTitle>
          <CardDescription>Overview of ticket performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-900">
                  {summary.totalTickets || 0}
                </div>
                <div className="text-sm text-blue-700">Total Tickets</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-green-50 to-green-100">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-900">
                  {summary.resolvedTickets || 0}
                </div>
                <div className="text-sm text-green-700">Resolved Tickets</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-amber-50 to-amber-100">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-amber-900">
                  {formatMinutesToHoursAndMinutes(summary.averageResolutionTime || 0).formatted}
                </div>
                <div className="text-sm text-amber-700">Avg Resolution Time (Business Hours)</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-900">
                  {summary.resolutionRate || 0}%
                </div>
                <div className="text-sm text-purple-700">Resolution Rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <Card className="bg-gradient-to-r from-red-50 to-red-100">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-900">
                  {summary.criticalTickets || 0}
                </div>
                <div className="text-sm text-red-700">Critical Tickets</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-900">
                  {summary.highPriorityTickets || 0}
                </div>
                <div className="text-sm text-orange-700">High Priority</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-900">
                  {summary.overdueTickets || 0}
                </div>
                <div className="text-sm text-yellow-700">Overdue Tickets</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {summary.unassignedTickets || 0}
                </div>
                <div className="text-sm text-gray-700">Unassigned</div>
              </CardContent>
            </Card>
          </div>

          {/* Time Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card className="bg-gradient-to-r from-indigo-50 to-indigo-100">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-indigo-900">
                  {formatMinutesToHoursAndMinutes(summary.averageFirstResponseTime || 0).formatted}
                </div>
                <div className="text-sm text-indigo-700">Avg First Response (Business Hours)</div>
              </CardContent>
            </Card>
            {summary.avgOnsiteTravelTime > 0 && (
              <Card className="bg-gradient-to-r from-cyan-50 to-cyan-100">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-cyan-900">
                    {formatMinutesToHoursAndMinutes(summary.avgOnsiteTravelTime || 0).formatted}
                  </div>
                  <div className="text-sm text-cyan-700">Avg Travel Time (Real-time)</div>
                </CardContent>
              </Card>
            )}
            {summary.totalOnsiteVisits > 0 && (
              <Card className="bg-gradient-to-r from-teal-50 to-teal-100">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-teal-900">
                    {summary.totalOnsiteVisits || 0}
                  </div>
                  <div className="text-sm text-teal-700">Onsite Visits</div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Customer Satisfaction */}
          {summary.averageCustomerRating > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-emerald-900">
                    {summary.averageCustomerRating}/5
                  </div>
                  <div className="text-sm text-emerald-700">Average Rating</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-lime-50 to-lime-100">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-lime-900">
                    {summary.totalRatings || 0}
                  </div>
                  <div className="text-sm text-lime-700">Total Ratings</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-green-50 to-green-100">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-900">
                    {summary.ticketsWithFeedback || 0}
                  </div>
                  <div className="text-sm text-green-700">With Feedback</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Show message when no tickets */}
          {(!summary.totalTickets || summary.totalTickets === 0) && (
            <div className="mt-6 text-center py-8">
              <div className="text-green-600 mb-2">
                <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-green-800 mb-1">Excellent Service!</h3>
              <p className="text-green-600 text-sm">
                No tickets found for the selected period. All systems are running smoothly.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Distribution */}
      {statusDistribution && Object.keys(statusDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Breakdown of tickets by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(statusCounts).map(([status, count]) => {
                const percentage = totalTickets > 0 ? ((count / totalTickets) * 100).toFixed(1) : '0';
                return (
                  <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</div>
                    <div className="text-xs text-gray-500">{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Priority Distribution */}
      {priorityDistribution && Object.keys(priorityDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <CardDescription>Breakdown of tickets by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(priorityCounts).map(([priority, count]) => {
                const percentage = totalTickets > 0 ? ((count / totalTickets) * 100).toFixed(1) : '0';
                const colors = {
                  'CRITICAL': 'bg-red-50 text-red-900',
                  'HIGH': 'bg-orange-50 text-orange-900',
                  'MEDIUM': 'bg-yellow-50 text-yellow-900',
                  'LOW': 'bg-green-50 text-green-900'
                };
                return (
                  <div key={priority} className={`text-center p-4 rounded-lg ${colors[priority as keyof typeof colors] || 'bg-gray-50 text-gray-900'}`}>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm capitalize">{priority}</div>
                    <div className="text-xs opacity-75">{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zone Distribution */}
      {zoneDistribution && zoneDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Zone-wise Distribution</CardTitle>
            <CardDescription>Top zones by ticket volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {zoneDistribution.slice(0, 5).map((zone: any) => (
                <div key={zone.zoneId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{zone.zoneName}</span>
                  <div className="text-right">
                    <span className="font-bold text-blue-600">{zone.count}</span>
                    <span className="text-sm text-gray-500 ml-1">tickets</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Customers */}
      {customerDistribution && customerDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
            <CardDescription>Customers with highest ticket volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customerDistribution.slice(0, 5).map((customer: any) => (
                <div key={customer.customerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{customer.customerName}</span>
                  <div className="text-right">
                    <span className="font-bold text-green-600">{customer.count}</span>
                    <span className="text-sm text-gray-500 ml-1">tickets</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
