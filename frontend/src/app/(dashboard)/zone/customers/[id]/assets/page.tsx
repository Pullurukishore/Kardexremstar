"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  HardDrive, 
  Search,
  MapPin,
  Calendar,
  Loader2,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  Wrench
} from 'lucide-react';
import { fetchCustomer } from '@/services/customer.service';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Customer } from '@/types/customer';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'INACTIVE':
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
    case 'MAINTENANCE':
      return <Wrench className="h-4 w-4 text-yellow-600" />;
    default:
      return <Clock className="h-4 w-4 text-red-600" />;
  }
};

const getStatusBadgeStyles = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'INACTIVE':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'MAINTENANCE':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-red-100 text-red-800 border-red-200';
  }
};

export default function ZoneCustomerAssetsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('serialNo');

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const data = await fetchCustomer(Number(id));
      setCustomer(data);
    } catch (error) {
      console.error('Error loading customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer assets',
        variant: 'destructive',
      });
      router.push('/zone/customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Customer not found</h2>
          <p className="text-gray-600 mt-2">The customer you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Filter and sort assets
  const filteredAssets = customer.assets
    ?.filter((asset: any) => {
      const matchesSearch = 
        asset.serialNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case 'serialNo':
          return (a.serialNo || '').localeCompare(b.serialNo || '');
        case 'model':
          return (a.model || '').localeCompare(b.model || '');
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        case 'purchaseDate':
          return new Date(b.purchaseDate || 0).getTime() - new Date(a.purchaseDate || 0).getTime();
        default:
          return 0;
      }
    }) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/zone/customers/${customer.id}`)}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Customer
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {customer.companyName} - Assets
                </h1>
                <p className="text-gray-600 mt-1">
                  View all assets for this customer
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
                {filteredAssets.length} of {customer._count.assets} assets
              </Badge>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by serial number, model, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="serialNo">Serial Number</SelectItem>
                    <SelectItem value="model">Model</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="purchaseDate">Purchase Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assets Grid */}
        {filteredAssets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset: any) => (
              <Card key={asset.id} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <HardDrive className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-lg truncate" title={asset.serialNo}>
                          {asset.serialNo || 'N/A'}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">Asset ID: {asset.id}</p>
                      </div>
                    </div>
                    <Badge className={`${getStatusBadgeStyles(asset.status)} flex items-center gap-1`}>
                      {getStatusIcon(asset.status)}
                      {asset.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Model</p>
                      <p className="text-sm text-gray-900 break-words" title={asset.model}>
                        {asset.model || 'No model specified'}
                      </p>
                    </div>
                    
                    {asset.location && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Location</p>
                        <p className="text-sm text-gray-900 flex items-center">
                          <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                          {asset.location}
                        </p>
                      </div>
                    )}
                    
                    {asset.purchaseDate && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Purchase Date</p>
                        <p className="text-sm text-gray-900 flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                          {format(new Date(asset.purchaseDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    )}
                    
                    {asset.warrantyEnd && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Warranty</p>
                        <p className={`text-sm flex items-center ${
                          new Date(asset.warrantyEnd) > new Date() 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          <Calendar className="h-3 w-3 mr-1" />
                          Until {format(new Date(asset.warrantyEnd), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-xs text-gray-500">
                      Asset ID: {asset.id}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <HardDrive className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No assets found' : 'No assets yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No assets available for this customer.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
