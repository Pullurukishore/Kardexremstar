'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  RefreshCw, 
  UserCheck, 
  UserX, 
  Shield, 
  Mail, 
  Calendar,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { toast } from 'sonner';
import api from '@/lib/api/axios';
import { ZoneUserFilters } from '@/components/admin/ZoneUserFilters';
import { ZoneUserPagination } from '@/components/admin/ZoneUserPagination';
import { ZoneUserActions } from '@/components/admin/ZoneUserActions';

interface ZoneUserWithStringId {
  id: string;
  email: string;
  name?: string;
  role: string;
  isActive: boolean;
  serviceZones: Array<{
    serviceZone: {
      id: string;
      name: string;
    };
  }>;
}

interface ZoneUserStats {
  total: number;
  active: number;
  admin: number;
  totalZoneAssignments: number;
}

interface ZoneUserClientProps {
  initialZoneUsers: ZoneUserWithStringId[];
  initialStats: ZoneUserStats;
  initialPagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  searchParams: {
    search?: string;
    page?: string;
  };
}

export default function ZoneUserClient({ 
  initialZoneUsers, 
  initialStats, 
  initialPagination, 
  searchParams 
}: ZoneUserClientProps) {
  const [zoneUsers, setZoneUsers] = useState<ZoneUserWithStringId[]>(initialZoneUsers);
  const [stats, setStats] = useState<ZoneUserStats>(initialStats);
  const [pagination, setPagination] = useState(initialPagination);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentPage = parseInt(searchParams.page || '1');
  const search = searchParams.search || '';

  // Force initial client-side API call on component mount
  useEffect(() => {
    fetchZoneUsers();
  }, [currentPage, search]);

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages || isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await api.get('/zone-users', {
        params: {
          page: newPage,
          search: search,
          limit: pagination.itemsPerPage
        }
      });

      if (response.data.data) {
        setZoneUsers(response.data.data.map((user: any) => ({
          ...user,
          id: user.id.toString()
        })));
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error('Failed to load zone users');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply client-side filtering for search
  const filteredZoneUsers = search
    ? (Array.isArray(zoneUsers) ? zoneUsers.filter((user) => 
        user.email?.toLowerCase().includes(search.toLowerCase()) ||
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.id.toString().includes(search)
      ) : [])
    : (Array.isArray(zoneUsers) ? zoneUsers : []);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'default';
      case 'ZONE_MANAGER':
        return 'default';
      case 'ZONE_USER':
        return 'secondary';
      case 'SERVICE_PERSON':
        return 'secondary';
      case 'CUSTOMER':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const fetchZoneUsers = async () => {
    try {
      setIsRefreshing(true);
      const response = await api.get('/zone-users', {
        params: {
          page: currentPage,
          limit: 20,
          search: search || undefined
        }
      });

      if (response.data.data) {
        const newZoneUsers = response.data.data || [];
        setZoneUsers(newZoneUsers);
        setPagination(response.data.pagination);

        // Calculate stats
        const newStats = {
          total: newZoneUsers.length,
          active: newZoneUsers.filter((user: ZoneUserWithStringId) => user.isActive).length,
          admin: newZoneUsers.filter((user: ZoneUserWithStringId) => user.role === 'ADMIN').length,
          totalZoneAssignments: newZoneUsers.reduce((acc: number, user: ZoneUserWithStringId) => acc + user.serviceZones.length, 0)
        };
        setStats(newStats);
      }
    } catch (error) {
      toast.error('Failed to fetch zone users');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchZoneUsers();
  };

  const handleDeleteSuccess = () => {
    // Refetch the zone users to update the client-side state
    fetchZoneUsers();
  };

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-600">Total Users</p>
                <p className="text-2xl font-bold text-cyan-900">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-cyan-500 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active Users</p>
                <p className="text-2xl font-bold text-green-900">{stats.active}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Admin Users</p>
                <p className="text-2xl font-bold text-orange-900">{stats.admin}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Zone Assignments</p>
                <p className="text-2xl font-bold text-purple-900">{stats.totalZoneAssignments}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Search and Filters */}
      <ZoneUserFilters searchParams={searchParams} />

      {/* Enhanced Zone Users Table */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-600" />
                Zone Users & Managers ({filteredZoneUsers.length})
              </CardTitle>
              <CardDescription>
                Manage zone users and zone managers assigned to service zones and their permissions
              </CardDescription>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredZoneUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center mb-4">
                <Users className="h-12 w-12 text-cyan-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No zone users or managers found</h3>
              <p className="text-gray-500 mb-6">
                Get started by assigning zone users and managers to service zones.
              </p>
              <Link href="/admin/zone-users/new">
                <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Zone User
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700 py-4 px-6">User Details</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4 px-6">Role & Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4 px-6">Assigned Zones</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4 px-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {filteredZoneUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gradient-to-r hover:from-cyan-50/50 hover:to-blue-50/50 transition-all duration-200">
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                            {(user.name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            {user.name && (
                              <Link href={`/admin/zone-users/${user.id}`}>
                                <div className="font-semibold text-gray-900 hover:text-cyan-600 transition-colors cursor-pointer">
                                  {user.name}
                                </div>
                              </Link>
                            )}
                            <Link href={`/admin/zone-users/${user.id}`}>
                              <div className={`text-gray-600 hover:text-cyan-600 transition-colors cursor-pointer ${user.name ? 'text-sm' : 'font-semibold text-gray-900'}`}>
                                {user.email}
                              </div>
                            </Link>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="space-y-2">
                          <Badge 
                            variant={getRoleBadgeVariant(user.role)}
                            className={
                              user.role === 'ADMIN' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                              user.role === 'ZONE_MANAGER' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' :
                              user.role === 'ZONE_USER' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                              'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }
                          >
                            {user.role.replace('_', ' ')}
                          </Badge>
                          <div>
                            <Badge 
                              variant={user.isActive ? 'default' : 'secondary'}
                              className={user.isActive 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }
                            >
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.serviceZones.length > 0 ? (
                            user.serviceZones.map((zone) => (
                              <Badge 
                                key={zone.serviceZone.id} 
                                variant="outline"
                                className="bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100"
                              >
                                {zone.serviceZone.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400 italic">No zones assigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right">
                        <ZoneUserActions 
                          user={{ id: parseInt(user.id), email: user.email }} 
                          onDeleteSuccess={handleDeleteSuccess}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client-side Pagination */}
      {pagination.totalPages > 1 && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || isLoading}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <span className="text-sm font-medium px-3 py-1 bg-gray-100 rounded">
                  Page {currentPage} of {pagination.totalPages}
                </span>
                
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= pagination.totalPages || isLoading}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
