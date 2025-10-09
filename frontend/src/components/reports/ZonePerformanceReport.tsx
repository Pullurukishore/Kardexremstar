// Server-side component - charts replaced with static summaries

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReportData } from './types';

interface ZonePerformanceReportProps {
  reportData: ReportData;
}

export function ZonePerformanceReport({ reportData }: ZonePerformanceReportProps) {
  return (
    <div className="space-y-6">
      {/* Zone Performance Metrics */}
      {reportData?.zones && (
        <Card>
          <CardHeader>
            <CardTitle>Zone Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone</TableHead>
                  <TableHead>Total Tickets</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Open</TableHead>
                  <TableHead>Resolution Rate</TableHead>
                  <TableHead>Avg. Resolution Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.zones.map((zone: any) => (
                  <TableRow key={zone.zoneId}>
                    <TableCell className="font-medium">{zone.zoneName}</TableCell>
                    <TableCell>{zone.totalTickets}</TableCell>
                    <TableCell>{zone.resolvedTickets}</TableCell>
                    <TableCell>{zone.openTickets}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="w-12">{zone.resolutionRate.toFixed(1)}%</span>
                        <Progress value={zone.resolutionRate} className="w-20 ml-2 h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {zone.averageResolutionTime > 60
                        ? `${Math.floor(zone.averageResolutionTime / 60)}h ${zone.averageResolutionTime % 60}m`
                        : `${zone.averageResolutionTime}m`
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
