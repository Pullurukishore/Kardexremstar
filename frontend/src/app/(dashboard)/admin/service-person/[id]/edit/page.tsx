'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  Wrench,
  X,
  Badge as BadgeIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { toast } from 'sonner';
import { MobilePageHeader } from '@/components/ui/mobile-responsive';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getServicePerson, updateServicePerson } from '@/services/servicePerson.service';
import { getServiceZones } from '@/services/zone.service';
import type { ServicePerson as ServicePersonType, ServiceZone as ServiceZoneType } from '@/types/service';
import type { ServiceZone as ZoneServiceZone } from '@/types/zone';
import type { ServicePerson as ServicePersonServiceType } from '@/services/servicePerson.service';
const updateServicePersonSchema = z.object({
  id: z.number(),
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  confirmPassword: z.string().optional(),
  serviceZoneIds: z.array(z.number()).optional(),
}).refine((data) => {
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UpdateServicePersonForm = z.infer<typeof updateServicePersonSchema>;

// Type conversion function to convert ZoneServiceZone to ServiceZoneType
const convertZoneServiceZoneToServiceZone = (zone: ZoneServiceZone): ServiceZoneType => ({
  id: zone.id,
  name: zone.name,
  description: zone.description || undefined,
  isActive: zone.isActive,
  createdAt: zone.createdAt,
  updatedAt: zone.updatedAt,
});

// Type conversion function to convert ServiceZone from servicePerson.service to ServiceZoneType
const convertServicePersonServiceZoneToServiceZone = (serviceZone: any): ServiceZoneType => ({
  id: serviceZone.id,
  name: serviceZone.name,
  description: serviceZone.description || undefined,
  isActive: serviceZone.isActive,
  createdAt: serviceZone.createdAt,
  updatedAt: serviceZone.updatedAt,
});

// Type conversion function to convert ServicePersonServiceType to ServicePersonType
const convertServicePersonServiceToType = (servicePerson: any): ServicePersonType => {
  console.log('Converting service person:', servicePerson);
  
  // Handle name field - API returns 'name' as null, but we need firstName and lastName
  let firstName = '';
  let lastName = '';
  if (servicePerson.name && typeof servicePerson.name === 'string') {
    const nameParts = servicePerson.name.split(' ');
    firstName = nameParts[0] || '';
    lastName = nameParts.slice(1).join(' ') || '';
  }
  
  return {
    id: servicePerson.id,
    email: servicePerson.email,
    firstName: firstName,
    lastName: lastName,
    phone: servicePerson.phone || undefined,
    isActive: servicePerson.isActive,
    serviceZones: servicePerson.serviceZones?.map((sz: any) => convertServicePersonServiceZoneToServiceZone(sz.serviceZone)) || [],
    createdAt: servicePerson.createdAt || new Date().toISOString(),
    updatedAt: servicePerson.updatedAt || new Date().toISOString(),
  };
};

export default function EditServicePersonPage() {
  const params = useParams();
  const router = useRouter();
  const servicePersonId = Number(params.id); // Convert to number
  
  const [servicePerson, setServicePerson] = useState<ServicePersonType | null>(null);
  const [zones, setZones] = useState<ServiceZoneType[]>([]);
  const [selectedZones, setSelectedZones] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<UpdateServicePersonForm>({
    resolver: zodResolver(updateServicePersonSchema),
    defaultValues: {
      id: servicePersonId,
      email: '',
      name: '',
      phone: '',
      password: '',
      confirmPassword: '',
      serviceZoneIds: [],
    },
  });

  // Debug: Log form errors
  console.log('Form errors:', form.formState.errors);

  const loadZones = async () => {
    try {
      const response = await getServiceZones(1, 100); // Get first 100 zones
      const convertedZones = response.data.map(convertZoneServiceZoneToServiceZone);
      setZones(convertedZones || []);
    } catch (error) {
      console.error('Error loading zones:', error);
      toast.error('Failed to load service zones');
    } finally {
      // Loading zones completed
    }
  };

  const loadServicePerson = async (id: number) => {
    try {
      console.log('Loading service person with ID:', id);
      const response = await getServicePerson(id);
      console.log('Service person response:', response);
      
      if (!response) {
        console.error('No response data received from API');
        setServicePerson(null);
        return;
      }
      
      try {
        const convertedServicePerson = convertServicePersonServiceToType(response);
        console.log('Converted service person:', convertedServicePerson);
        setServicePerson(convertedServicePerson);
        
        // Reset form with service person data
        form.reset({
          id: servicePersonId,
          email: convertedServicePerson.email || '',
          name: `${convertedServicePerson.firstName || ''} ${convertedServicePerson.lastName || ''}`.trim() || '',
          phone: convertedServicePerson.phone || '',
          password: '', // Password should be empty for security
          confirmPassword: '', // Password should be empty for security
          serviceZoneIds: convertedServicePerson.serviceZones?.map(sz => sz.id) || [],
        });
        console.log('Form reset with service person data');
      } catch (conversionError) {
        console.error('Error converting service person:', conversionError);
        // If conversion fails, try to set the raw response
        setServicePerson(response as any);
        
        // Still try to reset form with basic data
        form.reset({
          id: servicePersonId,
          email: response.email || '',
          name: (response as any).name || '',
          phone: (response as any).phone || '',
          password: '',
          confirmPassword: '',
          serviceZoneIds: response.serviceZones?.map((sz: any) => sz.serviceZone.id) || [],
        });
        return;
      }
      
      // Set selected zones based on the service person's zones
      if (response && response.serviceZones) {
        const zoneIds = response.serviceZones.map(sz => sz.serviceZone.id);
        console.log('Setting selected zones:', zoneIds);
        setSelectedZones(zoneIds);
        form.setValue('serviceZoneIds', zoneIds);
      }
    } catch (error) {
      console.error('Error loading service person:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        response: error && typeof error === 'object' && 'response' in error ? error.response : 'No response'
      });
      toast.error(`Failed to load service person: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setServicePerson(null); // Explicitly set to null to trigger the "not found" message
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([loadZones(), loadServicePerson(servicePersonId)]);
    };

    if (servicePersonId) {
      fetchData();
    }
  }, [servicePersonId]);

  const handleZoneToggle = (zoneId: number) => {
    setSelectedZones((prevSelected) => {
      // Single selection: if clicking the same zone, deselect it; otherwise select only this zone
      const newSelectedZones = prevSelected.includes(zoneId) ? [] : [zoneId];
      
      form.setValue('serviceZoneIds', newSelectedZones, { shouldValidate: false, shouldDirty: true });
      return newSelectedZones;
    });
  };

  const onSubmit = async (data: UpdateServicePersonForm) => {
    console.log('onSubmit function called with data:', data);
    
    // Validate required fields
    if (!data.email || !data.email.trim()) {
      toast.error('Email address is required');
      return;
    }
    
    if (!data.name || !data.name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    // Validate password if provided
    if (data.password && data.password.length > 0) {
      if (data.password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return;
      }
      
      if (data.password !== data.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }
    
    try {
      setLoading(true);
      console.log('Form submission data:', data);
      
      // Prepare update data (only include fields expected by UpdateServicePersonPayload)
      const updateData = {
        email: data.email,
        name: data.name,
        phone: data.phone,
        password: data.password && data.password.length > 0 ? data.password : undefined,
        serviceZoneIds: data.serviceZoneIds,
      };
      
      console.log('Cleaned update data:', updateData);
      
      console.log('Calling updateServicePerson API...');
      console.log('About to call updateServicePerson with:', servicePersonId, updateData);
      
      // Show loading toast and store the promise to dismiss it later
      const loadingToastId = toast.loading('Updating service person...');
      
      try {
        const result = await updateServicePerson(servicePersonId, updateData);
        console.log('updateServicePerson API call successful:', result);
        console.log('Continuing execution after API call...');
        
        // Dismiss loading toast and show success
        toast.dismiss(loadingToastId);
        toast.success('Service person updated successfully! Redirecting...');
        
        // Refresh the router cache and redirect back to service person list
        router.refresh();
        
        // Small delay to ensure success message is visible before redirect
        setTimeout(() => {
          router.push('/admin/service-person');
        }, 1000);
        
      } catch (apiError) {
        console.error('updateServicePerson API call failed:', apiError);
        // Dismiss loading toast before showing error
        toast.dismiss(loadingToastId);
        throw apiError; // Re-throw to be caught by the outer catch block
      }
      
    } catch (error: any) {
      console.error('Error updating service person:', error);
      
      // Handle specific error messages
      let errorMessage = 'Failed to update service person';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!servicePerson) {
    return (
      <div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">Service person not found</h2>
          <p className="text-gray-500 mt-2">The requested service person could not be loaded.</p>
          <Button className="mt-4" onClick={() => router.push('/admin/service-person')}>
            Back to Service Persons
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Desktop Header with Gradient */}
      <div className="hidden md:block relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-800 p-6 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/admin/service-person')}
              className="text-white hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Service Persons
            </Button>
            <Badge 
              variant={servicePerson.isActive ? 'default' : 'secondary'}
              className={servicePerson.isActive 
                ? 'bg-white/20 text-white hover:bg-white/30' 
                : 'bg-gray-600 text-gray-200 hover:bg-gray-700'
              }
            >
              {servicePerson.isActive ? (
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
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl">
              {(servicePerson.firstName || servicePerson.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Edit Service Person</h1>
              <p className="text-blue-100 flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                {servicePerson.firstName} {servicePerson.lastName} - Service Management
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
            onClick={() => router.push('/admin/service-person')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Badge 
            variant={servicePerson.isActive ? 'default' : 'secondary'}
            className={servicePerson.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
            }
          >
            {servicePerson.isActive ? (
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
        <MobilePageHeader
          title="Edit Service Person"
          description={`${servicePerson.firstName} ${servicePerson.lastName} - Service Management`}
        />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Enhanced Service Person Profile Edit Card */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-slate-50 to-gray-100">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-100 rounded-t-lg border-b">
              <CardTitle className="text-gray-800 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-indigo-600" />
                Service Person Profile
              </CardTitle>
              <CardDescription>
                Update the service person's profile information and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      Email Address *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        {...field}
                        className="focus:ring-2 focus:ring-indigo-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name and Phone Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4 text-indigo-600" />
                        Full Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter full name"
                          {...field}
                          className="focus:ring-2 focus:ring-indigo-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-purple-600" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="Enter phone number"
                          {...field}
                          className="focus:ring-2 focus:ring-indigo-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-orange-600" />
                        New Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Leave blank to keep current password"
                            {...field}
                            className="focus:ring-2 focus:ring-indigo-500 pr-12"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs text-gray-600">
                        Leave blank to keep the current password
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-orange-600" />
                        Confirm New Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm new password"
                            {...field}
                            className="focus:ring-2 focus:ring-indigo-500 pr-12"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Status Display */}
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm border">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Status</label>
                  <div className="mt-1">
                    <Badge 
                      variant={servicePerson.isActive ? 'default' : 'secondary'}
                      className={servicePerson.isActive 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    >
                      {servicePerson.isActive ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Active User
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1 h-3 w-3" />
                          Inactive User
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Zone Assignment Form */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-indigo-50 to-blue-100">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-100 rounded-t-lg border-b">
              <CardTitle className="text-gray-800 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-indigo-600" />
                Service Zone Assignment
              </CardTitle>
              <CardDescription>
                Select the service zone that this person should be assigned to manage (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <FormField
                control={form.control}
                name="serviceZoneIds"
                render={() => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-4">
                      <FormLabel className="text-lg font-semibold text-gray-900">Available Service Zones</FormLabel>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                          {selectedZones.length} selected
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedZones((prevSelected) => {
                              form.setValue('serviceZoneIds', [], { shouldValidate: false, shouldDirty: true });
                              return [];
                            });
                          }}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <X className="mr-1 h-3 w-3" />
                          Clear
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {zones.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mb-4">
                            <MapPin className="h-8 w-8 text-indigo-500" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Service Zones Available</h3>
                          <p className="text-gray-500">
                            No active service zones are currently available for assignment.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {zones
                            .filter((z) => z.isActive)
                            .map((zone) => (
                              <div 
                                key={zone.id} 
                                className={`relative p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                                  selectedZones.includes(zone.id)
                                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-indigo-300'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <FormControl>
                                    <Checkbox
                                      checked={selectedZones.includes(zone.id)}
                                      onCheckedChange={() => handleZoneToggle(zone.id)}
                                      className="mt-1"
                                    />
                                  </FormControl>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                                        {zone.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-gray-900">{zone.name}</h4>
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs bg-green-50 text-green-700 border-green-200"
                                        >
                                          <CheckCircle className="mr-1 h-2 w-2" />
                                          Active
                                        </Badge>
                                      </div>
                                    </div>
                                    {zone.description && (
                                      <p className="text-sm text-gray-600 leading-relaxed">
                                        {zone.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                {selectedZones.includes(zone.id) && (
                                  <div className="absolute top-2 right-2">
                                    <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center">
                                      <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    
                    <FormDescription className="text-sm text-gray-600 mt-4">
                      Select a service zone to assign to this person. Service persons can manage tickets and activities within their assigned zone.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Enhanced Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>
                {selectedZones.length === 0 
                  ? 'No zone selected (can be assigned later)' 
                  : `${selectedZones.length} zone selected`
                }
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Link href="/admin/service-person">
                <Button 
                  type="button" 
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg min-w-[120px]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
