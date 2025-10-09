'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Users, UserCheck, UserX, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MobileCard, MobileTable } from '@/components/ui/mobile-responsive';
import Link from 'next/link';
import { ServicePersonFilters } from '@/components/admin/ServicePersonFilters';
import { ServicePersonPagination } from '@/components/admin/ServicePersonPagination';
import { ServicePersonActions } from '@/components/admin/ServicePersonActions';

interface ServicePerson {
  id: number;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  serviceZones: Array<{
    serviceZone: {
      id: number;
      name: string;
    };
  }>;
}

interface ServicePersonStats {
  total: number;
  active: number;
  inactive: number;
  totalZoneAssignments: number;
}

interface ServicePersonClientProps {
  initialServicePersons: ServicePerson[];
  initialStats: ServicePersonStats;
  initialPagination: any;
  searchParams: {
    search?: string;
    page?: string;
  };
}

// Mobile service person card component
const ServicePersonMobileCard = ({ person, onRefresh }: { person: ServicePerson; onRefresh: () => Promise<void> }) => {
  return (
    <MobileCard className="hover:shadow-md transition-shadow duration-200">
      <div className="space-y-4">
        {/* Header with avatar and email */}
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
            {person.email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/admin/service-person/${person.id}`} className="block hover:text-blue-600 transition-colors">
              <div className="font-semibold text-lg text-gray-900 break-all hover:text-blue-600">{person.email}</div>
              {(person.name || person.firstName || person.lastName) && (
                <div className="text-sm text-gray-600 mt-1 hover:text-blue-500">
                  {person.name || [person.firstName, person.lastName].filter(Boolean).join(' ')}
                </div>
              )}
            </Link>
          </div>
          <div className="flex-shrink-0">
            <Badge 
              variant={person.isActive ? 'default' : 'secondary'}
              className={person.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
              }
            >
              {person.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        {/* Contact Information */}
        {person.phone && (
          <div className="flex items-center text-sm text-gray-600">
            <Users className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{person.phone}</span>
          </div>
        )}

        {/* Assigned Zones */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Assigned Zones:</div>
          <div className="flex flex-wrap gap-2">
            {person.serviceZones.length > 0 ? (
              person.serviceZones.map((zone) => (
                <Badge 
                  key={zone.serviceZone.id} 
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  {zone.serviceZone.name}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-gray-400 italic">No zones assigned</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-gray-100">
          <ServicePersonActions person={person} onRefresh={onRefresh} />
        </div>
      </div>
    </MobileCard>
  );
};

export default function ServicePersonClient({
  initialServicePersons,
  initialStats,
  initialPagination,
  searchParams
}: ServicePersonClientProps) {
  const [servicePersons, setServicePersons] = useState<ServicePerson[]>(initialServicePersons);
  const [stats, setStats] = useState<ServicePersonStats>(initialStats);
  const [pagination, setPagination] = useState(initialPagination);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPage = parseInt(searchParams.page || '1');
  const search = searchParams.search || '';

  const fetchServicePersonData = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '30');
      if (search) params.append('search', search);

      const response = await api.get(`/service-persons?${params.toString()}`);
      const personData = response.data?.data || [];
      
      setServicePersons(personData);
      setPagination(response.data?.pagination || initialPagination);
      
      // Calculate stats
      const totalPersons = personData.length;
      const activePersons = personData.filter((p: ServicePerson) => p.isActive).length;
      const inactivePersons = totalPersons - activePersons;
      const totalZoneAssignments = personData.reduce((acc: number, person: ServicePerson) => acc + person.serviceZones.length, 0);
      
      const newStats = {
        total: totalPersons,
        active: activePersons,
        inactive: inactivePersons,
        totalZoneAssignments
      };
      setStats(newStats);
      
      return true;
    } catch (err) {
      console.error('Failed to fetch service person data:', err);
      setError('Failed to load service personnel. Please try again.');
      toast.error('Failed to refresh service personnel data');
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Fetch fresh data when component mounts or search params change
    fetchServicePersonData();
  }, [searchParams.search, searchParams.page]);

  const handleRefresh = async () => {
    await fetchServicePersonData();
  };

  // Function to refresh data (to be passed to child components)
  const refreshData = async () => {
    await fetchServicePersonData();
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">Failed to load service personnel</h3>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Personnel</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active</p>
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
                <p className="text-sm font-medium text-orange-600">Inactive</p>
                <p className="text-2xl font-bold text-orange-900">{stats.inactive}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center">
                <UserX className="h-6 w-6 text-white" />
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
      <ServicePersonFilters searchParams={searchParams} />

      {/* Desktop Table View */}
      <Card className="shadow-lg hidden md:block">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Service Personnel ({servicePersons.length})
          </CardTitle>
          <CardDescription>
            Manage service personnel and their zone assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {servicePersons.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4">
                <Users className="h-12 w-12 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No service personnel found</h3>
              <p className="text-gray-500 mb-6">
                Get started by adding your first service person to the system.
              </p>
              <Link href="/admin/service-person/new">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Service Person
                </Button>
              </Link>
            </div>
          ) : (
            <MobileTable>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 min-w-[250px]">Personnel</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 w-24">Status</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 min-w-[200px]">Assigned Zones</th>
                      <th className="text-right py-4 px-6 font-semibold text-gray-700 w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {servicePersons.map((person) => (
                      <tr key={person.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-200">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                              {person.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <Link href={`/admin/service-person/${person.id}`} className="block hover:text-blue-600 transition-colors">
                                <div className="font-semibold text-gray-900 break-all hover:text-blue-600">{person.email}</div>
                                {(person.name || person.firstName || person.lastName) && (
                                  <div className="text-sm text-gray-600 mt-1 hover:text-blue-500">
                                    {person.name || [person.firstName, person.lastName].filter(Boolean).join(' ')}
                                  </div>
                                )}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge 
                            variant={person.isActive ? 'default' : 'secondary'}
                            className={person.isActive 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }
                          >
                            {person.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1">
                            {person.serviceZones.length > 0 ? (
                              person.serviceZones.map((zone) => (
                                <Badge 
                                  key={zone.serviceZone.id} 
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                >
                                  {zone.serviceZone.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-gray-400 italic">No zones assigned</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <ServicePersonActions person={person} onRefresh={refreshData} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </MobileTable>
          )}
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">
            Service Personnel ({servicePersons.length})
          </h2>
        </div>
        {servicePersons.length === 0 ? (
          <MobileCard className="text-center py-8">
            <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4">
              <Users className="h-10 w-10 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No service personnel found</h3>
            <p className="text-gray-500 mb-6 text-sm">
              Get started by adding your first service person to the system.
            </p>
            <Link href="/admin/service-person/new">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Service Person
              </Button>
            </Link>
          </MobileCard>
        ) : (
          <div className="space-y-4">
            {servicePersons.map((person) => (
              <ServicePersonMobileCard key={person.id} person={person} onRefresh={refreshData} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <ServicePersonPagination 
        currentPage={currentPage}
        totalPages={pagination.totalPages}
        searchParams={searchParams}
      />
    </div>
  );
}
