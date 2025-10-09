// Server-side component - charts replaced with static summaries

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReportData } from './types';

interface AgentProductivityReportProps {
  reportData: ReportData;
}

export function AgentProductivityReport({ reportData }: AgentProductivityReportProps) {
  return (
    <div className="space-y-6">
      {/* Service Personnel Performance */}
      {reportData?.agents && (
        <Card>
          <CardHeader>
            <CardTitle>Service Personnel Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Person / Zone User</TableHead>
                  <TableHead>Total Tickets</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Resolution Rate</TableHead>
                  <TableHead>Avg. Resolution Time</TableHead>
                  <TableHead>Avg. Response Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.agents.map((agent: any) => (
                  <TableRow key={agent.agentId}>
                    <TableCell className="font-medium">{agent.agentName}</TableCell>
                    <TableCell>{agent.totalTickets}</TableCell>
                    <TableCell>{agent.resolvedTickets}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="w-12">{agent.resolutionRate.toFixed(1)}%</span>
                        <Progress value={agent.resolutionRate} className="w-20 ml-2 h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {agent.averageResolutionTime > 60
                        ? `${Math.floor(agent.averageResolutionTime / 60)}h ${agent.averageResolutionTime % 60}m`
                        : `${agent.averageResolutionTime}m`
                      }
                    </TableCell>
                    <TableCell>
                      {agent.averageFirstResponseTime > 60
                        ? `${Math.floor(agent.averageFirstResponseTime / 60)}h ${agent.averageFirstResponseTime % 60}m`
                        : `${agent.averageFirstResponseTime}m`
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
