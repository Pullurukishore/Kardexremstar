// Server-side component - charts replaced with static summaries

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ReportData } from './types';

interface IndustrialDataReportProps {
  reportData: ReportData;
}

export function IndustrialDataReport({ reportData }: IndustrialDataReportProps) {
  if (!reportData) return null;

  // Group machines by customer for customer-wise display
  const machinesByCustomer = reportData.machineDowntime?.reduce((acc: any, machine: any) => {
    const customerName = machine.customer || 'Unknown Customer';
    if (!acc[customerName]) {
      acc[customerName] = [];
    }
    acc[customerName].push(machine);
    return acc;
  }, {}) || {};

  const customerNames = Object.keys(machinesByCustomer).sort();
  
  return (
    <div className="space-y-6">
      {/* Machine Downtime Summary - Always show summary cards */}
      <Card>
          <CardHeader>
            <CardTitle>Machine Downtime Summary</CardTitle>
            <CardDescription>Overview of machine downtime metrics grouped by customer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-900">
                    {reportData.summary?.totalMachinesWithDowntime || 0}
                  </div>
                  <div className="text-sm text-blue-700">Total Machines</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-green-50 to-green-100">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-900">
                    {Math.round(reportData.summary?.totalDowntimeHours * 10) / 10 || 0} hrs
                  </div>
                  <div className="text-sm text-green-700">Total Downtime</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-amber-50 to-amber-100">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-amber-900">
                    {reportData.summary?.averageDowntimePerMachine?.toFixed(1) || '0.0'} hrs
                  </div>
                  <div className="text-sm text-amber-700">Avg. Downtime/Machine</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-900">
                    {customerNames.length}
                  </div>
                  <div className="text-sm text-purple-700">Customers Affected</div>
                </CardContent>
              </Card>
            </div>
            
            {/* Customer-wise Machine Downtime - Only show if there's data */}
            {reportData.machineDowntime && reportData.machineDowntime.length > 0 ? (
              <div className="mt-6 space-y-6">
                <h3 className="text-lg font-medium">Machine Downtime by Customer</h3>
                
                {customerNames.map((customerName) => {
                const customerMachines = machinesByCustomer[customerName];
                const totalCustomerDowntime = customerMachines.reduce((sum: number, machine: any) => 
                  sum + (machine.totalDowntimeMinutes || 0), 0
                );
                const totalCustomerIncidents = customerMachines.reduce((sum: number, machine: any) => 
                  sum + (machine.incidents || 0), 0
                );

                return (
                  <Card key={customerName} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-lg">{customerName}</CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {customerMachines.length} Machine{customerMachines.length !== 1 ? 's' : ''}
                          </Badge>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            {(totalCustomerDowntime / 60).toFixed(1)} hrs downtime
                          </Badge>
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            {totalCustomerIncidents} incident{totalCustomerIncidents !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                          <Table>
                            <TableHeader className="sticky top-0 bg-white z-10">
                              <TableRow>
                                <TableHead className="min-w-[100px]">Model</TableHead>
                                <TableHead className="min-w-[120px]">Serial Number</TableHead>
                                <TableHead className="min-w-[120px]">Total Downtime</TableHead>
                                <TableHead className="min-w-[120px]">Avg Downtime</TableHead>
                                <TableHead className="min-w-[80px]">Incidents</TableHead>
                                <TableHead className="min-w-[80px]">Open</TableHead>
                                <TableHead className="min-w-[80px]">Resolved</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {customerMachines.map((machine: any, index: number) => (
                                <TableRow key={`${machine.machineId || machine.serialNo}-${index}`}>
                                  <TableCell>
                                    {machine.model || 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-mono text-sm">
                                      {machine.serialNo || 'N/A'}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {(machine.totalDowntimeMinutes / 60).toFixed(1)} hrs
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {machine.totalDowntimeMinutes} min
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="font-medium text-amber-700">
                                        {machine.incidents > 0 ? ((machine.totalDowntimeMinutes / machine.incidents) / 60).toFixed(1) : '0.0'} hrs
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {machine.incidents > 0 ? Math.round(machine.totalDowntimeMinutes / machine.incidents) : 0} min/incident
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-gray-50">
                                      {machine.incidents || 0}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="destructive" className={machine.openIncidents > 0 ? '' : 'bg-gray-200 text-gray-600'}>
                                      {machine.openIncidents || 0}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="default" className="bg-green-100 text-green-800">
                                      {machine.resolvedIncidents || 0}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
                })}
              </div>
            ) : (
              <div className="mt-6 text-center py-8">
                <div className="text-green-600 mb-2">
                  <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-green-800 mb-1">Excellent Performance!</h3>
                <p className="text-green-600 text-sm">
                  No machine downtime incidents found for the selected period. All machines are operating optimally.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

    </div>
  );
}
