'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Users, MapPin, BarChart3, Building, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ServiceZoneFilters } from '@/components/admin/ServiceZoneFilters';
import { ServiceZonePagination } from '@/components/admin/ServiceZonePagination';
import { ServiceZoneActions } from '@/components/admin/ServiceZoneActions';
import { ServiceZone as BaseServiceZone } from '@/types/service';

interface ServiceZoneWithCounts {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  _count?: {
    servicePersons?: number;
    customers?: number;
    tickets?: number;
  };
}

interface ServiceZoneStats {
  total: number;
  active: number;
  totalServicePersons: number;
  totalCustomers: number;
}

interface ServiceZoneClientProps {
  initialZones: ServiceZoneWithCounts[];
  initialStats: ServiceZoneStats;
  initialPagination: any;
  searchParams: {
    search?: string;
    page?: string;
  };
}

export default function ServiceZoneClient({
  initialZones,
  initialStats,
  initialPagination,
  searchParams
}: ServiceZoneClientProps) {
  const [zones, setZones] = useState<ServiceZoneWithCounts[]>(initialZones);
  const [stats, setStats] = useState<ServiceZoneStats>(initialStats);
  const [pagination, setPagination] = useState(initialPagination);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPage = parseInt(searchParams.page || '1');
  const search = searchParams.search || '';

  // Apply client-side filtering for search
  const filteredZones = search
    ? zones.filter((zone) => 
        zone.name?.toLowerCase().includes(search.toLowerCase()) ||
        (zone.description?.toLowerCase() || '').includes(search.toLowerCase())
      )
    : zones;

  const fetchServiceZoneData = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '20');
      if (search) params.append('search', search);

      const response = await api.get(`/service-zones?${params.toString()}`);
      const zoneData = response.data?.data || [];
      
      setZones(zoneData);
      setPagination(response.data?.pagination || initialPagination);
      
      // Calculate stats
      const newStats = {
        total: zoneData.length,
        active: zoneData.filter((z: ServiceZoneWithCounts) => z.isActive).length,
        totalServicePersons: zoneData.reduce((sum: number, z: ServiceZoneWithCounts) => sum + (z._count?.servicePersons || 0), 0),
        totalCustomers: zoneData.reduce((sum: number, z: ServiceZoneWithCounts) => sum + (z._count?.customers || 0), 0)
      };
      setStats(newStats);
      
      return true;
    } catch (err) {
      console.error('Failed to fetch service zone data:', err);
      setError('Failed to load service zones. Please try again.');
      toast.error('Failed to refresh service zone data');
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Fetch fresh data when component mounts or search params change
    fetchServiceZoneData();
  }, [searchParams.search, searchParams.page]);

  const handleRefresh = async () => {
    await fetchServiceZoneData();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Failed to load service zones</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md ${
            isRefreshing 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Zones</p>
                <p className="text-2xl font-bold text-green-900">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Active Zones</p>
                <p className="text-2xl font-bold text-blue-900">{stats.active}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Service Personnel</p>
                <p className="text-2xl font-bold text-purple-900">{stats.totalServicePersons}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Total Customers</p>
                <p className="text-2xl font-bold text-orange-900">{stats.totalCustomers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center">
                <Building className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Search and Filters */}
      <ServiceZoneFilters searchParams={searchParams} />

      {/* Enhanced Service Zones Table */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 rounded-t-lg">
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            Service Zones ({filteredZones.length})
          </CardTitle>
          <CardDescription>
            Manage and monitor your service zones
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredZones.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-green-100 to-teal-100 flex items-center justify-center mb-4">
                <MapPin className="h-12 w-12 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No service zones found</h3>
              <p className="text-gray-500 mb-6">
                Get started by creating your first service zone.
              </p>
              <Link href="/admin/service-zones/new">
                <Button className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 shadow-lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Service Zone
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700 py-4 px-6">Zone Details</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4 px-6">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4 px-6">Personnel</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4 px-6">Customers</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4 px-6">Tickets</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4 px-6">Created</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4 px-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {filteredZones.map((zone) => (
                    <TableRow key={zone.id} className="hover:bg-gradient-to-r hover:from-green-50/50 hover:to-teal-50/50 transition-all duration-200">
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-semibold">
                            {zone.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <Link href={`/admin/service-zones/${zone.id}`}>
                              <div className="font-semibold text-gray-900 hover:text-green-600 transition-colors cursor-pointer">
                                {zone.name}
                              </div>
                            </Link>
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {zone.description || 'No description'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge 
                          variant={zone.isActive ? 'default' : 'secondary'}
                          className={zone.isActive 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }
                        >
                          {zone.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-md">
                            <Users className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-700">{zone._count?.servicePersons || 0}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-md">
                          <Building className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-700">{zone._count?.customers || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md">
                          <BarChart3 className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-700">{zone._count?.tickets || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-gray-600">
                        {new Date(zone.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right">
                        <ServiceZoneActions zone={zone} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <ServiceZonePagination 
        currentPage={currentPage}
        totalPages={pagination.totalPages}
        searchParams={searchParams}
      />
    </div>
  );
}
