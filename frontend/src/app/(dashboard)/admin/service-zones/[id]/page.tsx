"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Pencil, 
  Users, 
  MapPin, 
  BarChart3, 
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Building,
  Calendar,
  Activity,
  RefreshCw,
  Eye,
  UserCheck,
  Ticket
} from 'lucide-react';
import { getServiceZone, getServiceZoneStats } from '@/services/zone.service';
import { useToast } from '@/components/ui/use-toast';
import type { ServiceZone } from '@/types/zone';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MobilePageHeader } from '@/components/ui/mobile-responsive';
import Link from 'next/link';

interface ServiceZoneStats {
  id: number;
  name: string;
  counts: {
    servicePersons: number;
    customers: number;
    tickets: number;
    activeTickets: number;
  };
  recentTickets: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    customer: {
      id: number;
      companyName: string | null;
    };
  }>;
}

export default function ServiceZoneDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [zone, setZone] = useState<ServiceZone | null>(null);
  const [stats, setStats] = useState<ServiceZoneStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const zoneId = params?.id ? parseInt(params.id as string) : null;

  useEffect(() => {
    const fetchZoneData = async () => {
      if (!zoneId) return;
      
      setIsLoading(true);
      try {
        const [zoneData, statsData] = await Promise.all([
          getServiceZone(zoneId),
          getServiceZoneStats(zoneId)
        ]);
        
        setZone(zoneData);
        setStats(statsData);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.response?.data?.error || 'Failed to fetch service zone details',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchZoneData();
  }, [zoneId, toast]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
      case 'in_progress':
      case 'pending_parts':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
            <RefreshCw className="h-6 w-6 text-green-600 animate-spin" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Service Zone</h3>
          <p className="text-sm text-gray-500">Please wait while we fetch the zone details...</p>
        </div>
      </div>
    );
  }

  if (!zone || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Service Zone Not Found</h3>
          <p className="text-sm text-gray-500 mb-6">The service zone you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push('/admin/service-zones')} className="bg-green-600 hover:bg-green-700">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Service Zones
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Desktop Header with Gradient */}
      <div className="hidden md:block relative overflow-hidden rounded-lg bg-gradient-to-r from-green-600 via-teal-600 to-green-800 p-6 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/admin/service-zones')}
              className="text-white hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Service Zones
            </Button>
            <div className="flex items-center space-x-3">
              <Badge 
                variant={zone.isActive ? 'default' : 'secondary'}
                className={zone.isActive 
                  ? 'bg-white/20 text-white hover:bg-white/30' 
                  : 'bg-gray-600 text-gray-200 hover:bg-gray-700'
                }
              >
                {zone.isActive ? (
                  <>
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircle className="mr-1 h-3 w-3" />
                    Inactive
                  </>
                )}
              </Badge>
              <Button 
                onClick={() => router.push(`/admin/service-zones/${zone.id}/edit`)}
                className="bg-white text-green-600 hover:bg-green-50 shadow-lg"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Zone
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl">
              {zone.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{zone.name}</h1>
              <p className="text-green-100 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Service Zone Details & Management
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/admin/service-zones')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={() => router.push(`/admin/service-zones/${zone.id}/edit`)}
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
          >
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        </div>
        <MobilePageHeader
          title={zone.name}
          description="Service Zone Details & Management"
        />
        <div className="mt-4 flex justify-center">
          <Badge 
            variant={zone.isActive ? 'default' : 'secondary'}
            className={zone.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
            }
          >
            {zone.isActive ? (
              <>
                <CheckCircle className="mr-1 h-3 w-3" />
                Active
              </>
            ) : (
              <>
                <XCircle className="mr-1 h-3 w-3" />
                Inactive
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Service Personnel</p>
                <p className="text-3xl font-bold text-purple-900">{stats.counts.servicePersons}</p>
                <p className="text-xs text-purple-700 mt-1">Assigned to zone</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-purple-500 flex items-center justify-center shadow-lg">
                <Users className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Customers</p>
                <p className="text-3xl font-bold text-orange-900">{stats.counts.customers}</p>
                <p className="text-xs text-orange-700 mt-1">In this zone</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
                <Building className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Tickets</p>
                <p className="text-3xl font-bold text-blue-900">{stats.counts.tickets}</p>
                <p className="text-xs text-blue-700 mt-1">All time</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                <Ticket className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active Tickets</p>
                <p className="text-3xl font-bold text-green-900">{stats.counts.activeTickets}</p>
                <p className="text-xs text-green-700 mt-1">Currently open</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                <Activity className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Zone Information */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-slate-50 to-gray-100">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-100 rounded-t-lg border-b">
            <CardTitle className="text-gray-800 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              Zone Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Zone Name</label>
                <p className="text-lg font-semibold text-gray-900">{zone.name}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-white rounded-lg shadow-sm">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mt-1">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
                <p className="text-sm text-gray-700 leading-relaxed mt-1">
                  {zone.description || 'No description provided for this service zone.'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                <div className="mt-2">
                  <Badge 
                    variant={zone.isActive ? 'default' : 'secondary'}
                    className={zone.isActive 
                      ? 'bg-green-100 text-green-800 hover:bg-green-200 px-3 py-1' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1'
                    }
                  >
                    {zone.isActive ? (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Active Zone
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" />
                        Inactive Zone
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created Date</label>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {new Date(zone.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(zone.createdAt).toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Service Persons */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-indigo-100">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-100 rounded-t-lg border-b">
            <CardTitle className="text-gray-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Assigned Service Personnel ({zone.servicePersons?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {zone.servicePersons && zone.servicePersons.length > 0 ? (
              <div className="space-y-4">
                {zone.servicePersons.map((person, index) => (
                  <div key={person.id} className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {(person.user.name || person.user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {person.user.name || 'Service Person'}
                        </p>
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          SP-{person.id.toString().padStart(3, '0')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <Users className="h-3 w-3" />
                        {person.user.email}
                      </p>
                    </div>
                    <Link href={`/admin/service-person/${person.id}`}>
                      <Button variant="outline" size="sm" className="hover:bg-purple-50 hover:border-purple-300">
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Service Personnel</h3>
                <p className="text-gray-500 mb-4">
                  No service personnel are currently assigned to this zone.
                </p>
                <Link href="/admin/service-person/new">
                  <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg">
                    <Users className="mr-2 h-4 w-4" />
                    Assign Personnel
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Recent Tickets */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-cyan-100">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-100 rounded-t-lg border-b">
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <Ticket className="h-5 w-5 text-blue-600" />
            Recent Tickets ({stats.recentTickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recentTickets.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-semibold text-gray-700 py-4 px-6">Ticket Details</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-4 px-6">Customer</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-4 px-6">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-4 px-6">Priority</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-4 px-6">Created</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-4 px-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100">
                    {stats.recentTickets.map((ticket) => (
                      <TableRow key={ticket.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-cyan-50/50 transition-all duration-200">
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-semibold">
                              #{ticket.id.toString().slice(-2)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">Ticket #{ticket.id}</p>
                              <p className="text-sm text-gray-500 max-w-xs truncate">
                                {ticket.title}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                              <Building className="h-4 w-4 text-orange-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-900">
                              {ticket.customer.companyName || `Customer #${ticket.customer.id}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(ticket.status)}
                            <span className="text-sm font-medium capitalize">
                              {ticket.status.replace('_', ' ').toLowerCase()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <Badge 
                            variant="secondary" 
                            className={`${getPriorityColor(ticket.priority)} font-medium`}
                          >
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span className="text-sm">
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-right">
                          <Link href={`/admin/tickets/${ticket.id}`}>
                            <Button variant="outline" size="sm" className="hover:bg-blue-50 hover:border-blue-300">
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-4">
                {stats.recentTickets.map((ticket) => (
                  <div key={ticket.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-semibold">
                          #{ticket.id.toString().slice(-2)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Ticket #{ticket.id}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Link href={`/admin/tickets/${ticket.id}`}>
                        <Button variant="outline" size="sm" className="hover:bg-blue-50">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {ticket.title}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(ticket.status)}
                        <span className="text-xs font-medium capitalize">
                          {ticket.status.replace('_', ' ').toLowerCase()}
                        </span>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={`${getPriorityColor(ticket.priority)} text-xs`}
                      >
                        {ticket.priority}
                      </Badge>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {ticket.customer.companyName || `Customer #${ticket.customer.id}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mb-4">
                <Ticket className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recent Tickets</h3>
              <p className="text-gray-500 mb-4">
                No tickets have been created for this service zone yet.
              </p>
              <Link href="/admin/tickets/new">
                <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg">
                  <Ticket className="mr-2 h-4 w-4" />
                  Create Ticket
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
