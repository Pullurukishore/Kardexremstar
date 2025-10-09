// src/app/(dashboard)/admin/assets/[id]/page.tsx
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  HardDrive, 
  Pencil, 
  MapPin, 
  Calendar,
  AlertCircle,
  Loader2,
  Trash2,
  Building2,
  Ticket,
  Clock,
  Shield,
  Activity,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface Asset {
  id: number;
  machineId: string;
  model: string | null;
  serialNo: string | null;
  purchaseDate: string | null;
  warrantyStart: string | null;
  warrantyEnd: string | null;
  amcEnd: string | null;
  location: string | null;
  status: string;
  customer: {
    id: number;
    companyName: string;
  };
  tickets: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    assignedTo: {
      id: number;
      email: string;
      name: string | null;
    } | null;
  }>;
  serviceHistory: Array<{
    id: number;
    serviceType: string;
    description: string;
    performedAt: string;
    duration: number | null;
    notes: string | null;
    performedBy: {
      id: number;
      email: string;
      name: string | null;
    };
    ticket: {
      id: number;
      title: string;
    };
  }>;
  _count: {
    tickets: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function AssetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadAsset = async () => {
    try {
      setLoading(true);
      console.log('Fetching asset with ID:', id);
      
      const response = await fetch(`/api/assets/${id}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('Response status:', response.status);
      
      // Get the response text first to see what we're dealing with
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (e) {
        console.error('Error parsing JSON:', e);
        throw new Error('Invalid response from server');
      }
      
      console.log('Parsed data:', data);
      
      // Handle 304 Not Modified
      if (response.status === 304) {
        if (!data) {
          console.log('No data in 304 response, trying to load again...');
          // If no data in 304 response, try a fresh request without cache
          return loadAsset();
        }
        setAsset(data);
        return;
      }
      
      // Handle other status codes
      if (!response.ok) {
        console.error('API error:', response.status, response.statusText, data);
        if (response.status === 404) {
          throw new Error('Asset not found');
        }
        throw new Error(data?.message || 'Failed to load asset details');
      }
      
      if (!data) {
        throw new Error('No data received from server');
      }
      
      setAsset(data);
    } catch (error) {
      console.error('Error in loadAsset:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load asset details',
        variant: 'destructive',
      });
      router.push('/admin/assets');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!asset) return;
    
    try {
      setDeleting(true);
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete asset');
      }
      
      toast({
        title: 'Success',
        description: `Asset ${asset.machineId} has been deleted successfully`,
      });
      
      router.push(`/admin/customers/${asset.customer.id}`);
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete asset. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadAsset();
    }
  }, [id]);

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const getPriorityBadgeStyles = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTicketStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'CLOSED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading asset details...</span>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-lg font-medium">Asset not found</h3>
        <p className="mt-1 text-muted-foreground">The asset you're looking for doesn't exist or was deleted.</p>
        <Button className="mt-4" onClick={() => router.push('/admin/assets')}>
          Back to Assets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => {
              // Redirect back to customer assets page for better navigation flow
              if (asset?.customer?.id) {
                router.push(`/admin/customers/${asset.customer.id}/assets`);
              } else {
                router.push('/admin/assets'); // Fallback to general assets page
              }
            }} 
            className="p-2"
            title="Back to Customer Assets"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{asset.machineId}</h1>
            <p className="text-sm text-muted-foreground">
              Asset Details • ID: {asset.id}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/admin/assets/${id}/edit`)}
            className="bg-white hover:bg-gray-50"
          >
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>

      <div className={`rounded-lg border p-4 ${asset.status === 'ACTIVE' ? 'bg-green-50 border-green-200' : asset.status === 'MAINTENANCE' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${asset.status === 'ACTIVE' ? 'bg-green-100' : asset.status === 'MAINTENANCE' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
              <Activity className={`h-5 w-5 ${asset.status === 'ACTIVE' ? 'text-green-600' : asset.status === 'MAINTENANCE' ? 'text-yellow-600' : 'text-gray-600'}`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                Asset Status: {asset.status}
              </h3>
              <p className="text-sm text-muted-foreground">
                {asset.status === 'ACTIVE' ? 'This asset is currently active and operational' : 
                 asset.status === 'MAINTENANCE' ? 'This asset is under maintenance' : 
                 'This asset is inactive'}
              </p>
            </div>
          </div>
          <Badge className={getStatusBadgeStyles(asset.status)} variant="outline">
            {asset.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Asset Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
                    <HardDrive className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-gray-900">{asset.machineId}</CardTitle>
                    <CardDescription className="mt-1 flex items-center text-base">
                      <Building2 className="h-4 w-4 mr-1" />
                      <Link 
                        href={`/admin/customers/${asset.customer.id}`}
                        className="hover:underline hover:text-blue-600"
                      >
                        {asset.customer.companyName}
                      </Link>
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <HardDrive className="h-4 w-4 mr-2 text-blue-600" />
                      Asset Information
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Machine ID:</span>
                        <span className="font-medium text-gray-900">{asset.machineId}</span>
                      </div>
                      {asset.model && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Model:</span>
                          <span className="font-medium text-gray-900">{asset.model}</span>
                        </div>
                      )}
                      {asset.serialNo && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Serial Number:</span>
                          <span className="font-medium text-gray-900">{asset.serialNo}</span>
                        </div>
                      )}
                      {asset.location && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Location:</span>
                          <span className="font-medium text-gray-900">{asset.location}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <Badge className={getStatusBadgeStyles(asset.status)}>
                          {asset.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-green-600" />
                      Dates & Warranty
                    </h3>
                    <div className="space-y-3 text-sm">
                      {asset.purchaseDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Purchase Date:</span>
                          <span className="font-medium text-gray-900">{format(new Date(asset.purchaseDate), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                      {asset.warrantyStart && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Warranty Start:</span>
                          <span className="font-medium text-gray-900">{format(new Date(asset.warrantyStart), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                      {asset.warrantyEnd && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Warranty End:</span>
                          <span className="font-medium text-gray-900">{format(new Date(asset.warrantyEnd), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                      {asset.amcEnd && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">AMC End:</span>
                          <span className="font-medium text-gray-900">{format(new Date(asset.amcEnd), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium text-gray-900">{format(new Date(asset.createdAt), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Updated:</span>
                        <span className="font-medium text-gray-900">{format(new Date(asset.updatedAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-red-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-lg">
                  <Ticket className="h-5 w-5 mr-2 text-orange-600" />
                  Recent Tickets
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-orange-100 text-orange-800">
                    {asset._count.tickets} total
                  </Badge>
                  <Button 
                    size="sm" 
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => router.push(`/admin/tickets/create?assetId=${asset.id}`)}
                  >
                    <Ticket className="h-4 w-4 mr-1" />
                    New Ticket
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {asset.tickets?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {asset.tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          <Link 
                            href={`/admin/tickets/${ticket.id}`}
                            className="font-medium hover:underline hover:text-primary"
                          >
                            {ticket.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTicketStatusBadgeStyles(ticket.status)}>
                            {ticket.status.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityBadgeStyles(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ticket.assignedTo ? ticket.assignedTo.name || ticket.assignedTo.email : 'Unassigned'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6">
                  <Ticket className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium">No tickets found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No support tickets have been created for this asset yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Ticket className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">Total Tickets</span>
                      <p className="text-xs text-gray-600">All time</p>
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800 text-lg font-bold px-3 py-1">
                    {asset._count.tickets}
                  </Badge>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">Service History</span>
                      <p className="text-xs text-gray-600">Records</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 text-lg font-bold px-3 py-1">
                    {asset.serviceHistory?.length || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service History */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center text-lg">
                <Shield className="h-5 w-5 mr-2 text-green-600" />
                Service History
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {asset.serviceHistory && asset.serviceHistory.length > 0 ? (
                <div className="space-y-4">
                  {asset.serviceHistory.slice(0, 5).map((service) => (
                    <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{service.serviceType}</h4>
                        <span className="text-xs text-gray-500">
                          {format(new Date(service.performedAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>By: {service.performedBy.name || service.performedBy.email}</span>
                        {service.duration && <span>{service.duration} min</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium">No service history</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Service records will appear here once work is performed on this asset.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
