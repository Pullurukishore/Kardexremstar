'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user.types';
import { 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  MapPin, 
  UserPlus, 
  Eye, 
  EyeOff,
  Sparkles,
  Users,
  Building2,
  Badge as BadgeIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { MobileContainer, MobilePageHeader } from '@/components/ui/mobile-responsive';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiClient } from '@/lib/api';

interface ServiceZone {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

const createZoneUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.enum(['ZONE_USER', 'ZONE_MANAGER'], {
    errorMap: () => ({ message: 'Please select a valid role' })
  }),
  serviceZoneIds: z.array(z.number()).min(1, 'Please select a service zone'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type CreateZoneUserForm = z.infer<typeof createZoneUserSchema>;

export default function NewZoneUserPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Protect this page - only ADMIN can access
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login?callbackUrl=' + encodeURIComponent('/admin/zone-users/new'));
        return;
      }
      if (user?.role !== UserRole.ADMIN) {
        router.push('/admin/dashboard');
        return;
      }
    }
  }, [authLoading, isAuthenticated, user?.role, router]);

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (!isAuthenticated || user?.role !== UserRole.ADMIN) {
    return null;
  }
  const [serviceZones, setServiceZones] = useState<ServiceZone[]>([]);
  const [selectedZones, setSelectedZones] = useState<number[]>([]);
  const [created, setCreated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateZoneUserForm>({
    resolver: zodResolver(createZoneUserSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'ZONE_USER',
      serviceZoneIds: [],
    },
  });

  const selectedRole = watch('role');

  // Fetch available service zones
  useEffect(() => {
    const fetchServiceZones = async () => {
      try {
        const response = await apiClient.get('/service-zones', {
          params: { 
            limit: 100,
            includeInactive: false
          }
        });
        
        if (response?.data) {
          const zones = Array.isArray(response.data) 
            ? response.data 
            : response.data.data || [];
          
          setServiceZones(zones);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch service zones',
          variant: 'destructive',
        });
      }
    };
    
    fetchServiceZones();
  }, [toast]);

  const handleZoneToggle = (zoneId: number) => {
    setSelectedZones((prevSelected) => {
      // Single selection: if clicking the same zone, deselect it; otherwise select only this zone
      const newSelectedZones = prevSelected.includes(zoneId) ? [] : [zoneId];
      
      setValue('serviceZoneIds', newSelectedZones, { shouldValidate: false, shouldDirty: true });
      return newSelectedZones;
    });
  };

  const onSubmit = async (data: CreateZoneUserForm) => {
    try {
      setLoading(true);

      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        password: data.password,
        serviceZoneIds: selectedZones,
        isActive: true,
        role: data.role,
      };

      const response = await apiClient.post('/zone-users/create-with-zones', payload);
      
      if (response && (response.success !== false)) {
        toast({
          title: 'Success',
          description: 'Zone user created successfully',
        });

        setCreated(true);
      } else {
        throw new Error(response?.error || 'Failed to create zone user');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create zone user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (created) {
      const timeoutId = setTimeout(() => {
        router.push('/admin/zone-users');
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [created, router]);

  const handleImmediateRedirect = () => {
    router.push('/admin/zone-users');
  };

  if (created) {
    return (
      <MobileContainer>
        <div className="max-w-lg mx-auto py-12">
          <Card className="text-center shadow-2xl border-0 bg-gradient-to-br from-green-50 to-emerald-100">
            <CardHeader className="pb-4">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-yellow-400 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-yellow-800" />
                  </div>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Zone User Created Successfully!</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                The new zone user has been added to the system and will be redirected automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button 
                  onClick={handleImmediateRedirect}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Go to Zone Users
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Another
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      {/* Desktop Header with Gradient */}
      <div className="hidden md:block relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 p-8 text-white mb-8 shadow-2xl">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <Link href="/admin/zone-users">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/20 hover:text-white border border-white/30"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Zone Users & Managers
              </Button>
            </Link>
            <Badge className="bg-white/20 text-white hover:bg-white/30 border-white/30">
              <UserPlus className="mr-1 h-3 w-3" />
              New User Creation
            </Badge>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg">
              <UserPlus className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Create New Zone User or Manager</h1>
              <p className="text-blue-100 flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                Add a new zone user or manager and assign service zones
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link href="/admin/zone-users">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <Badge className="bg-blue-100 text-blue-800">
            <UserPlus className="mr-1 h-3 w-3" />
            New User
          </Badge>
        </div>
        <MobilePageHeader
          title="Create Zone User or Manager"
          description="Add a new user and assign service zones"
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Enhanced User Profile Card */}
        <Card className="shadow-xl border-0 bg-gradient-to-br from-slate-50 to-gray-100 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-100 to-gray-200 border-b border-gray-300">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-800">User Profile Information</CardTitle>
                <CardDescription className="text-gray-600">
                  Enter the basic profile details for the new zone user
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {/* Name and Email Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <User className="h-4 w-4 text-blue-600" />
                  Full Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter user's full name"
                  {...register('name')}
                  className={`h-12 text-base transition-all duration-200 ${
                    errors.name 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <BadgeIcon className="h-3 w-3" />
                    {errors.name.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Mail className="h-4 w-4 text-green-600" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  {...register('email')}
                  className={`h-12 text-base transition-all duration-200 ${
                    errors.email 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                />
                {errors.email && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <BadgeIcon className="h-3 w-3" />
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-3">
              <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Phone className="h-4 w-4 text-purple-600" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter phone number (e.g., 9876543210)"
                {...register('phone')}
                className={`h-12 text-base transition-all duration-200 ${
                  errors.phone 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
              />
              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <Phone className="h-4 w-4 inline mr-2 text-blue-600" />
                Phone number is required for WhatsApp notifications and system alerts
              </p>
              {errors.phone && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <BadgeIcon className="h-3 w-3" />
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <Label htmlFor="role" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Shield className="h-4 w-4 text-indigo-600" />
                User Role *
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    type="radio"
                    id="role-zone-user"
                    value="ZONE_USER"
                    {...register('role')}
                    className="sr-only"
                  />
                  <label
                    htmlFor="role-zone-user"
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedRole === 'ZONE_USER'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      selectedRole === 'ZONE_USER'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedRole === 'ZONE_USER' && <div className="h-2 w-2 bg-white rounded-full" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Zone User</p>
                      <p className="text-xs text-gray-600">Can manage assigned zones</p>
                    </div>
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="radio"
                    id="role-zone-manager"
                    value="ZONE_MANAGER"
                    {...register('role')}
                    className="sr-only"
                  />
                  <label
                    htmlFor="role-zone-manager"
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedRole === 'ZONE_MANAGER'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-purple-300'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      selectedRole === 'ZONE_MANAGER'
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedRole === 'ZONE_MANAGER' && <div className="h-2 w-2 bg-white rounded-full" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Zone Manager</p>
                      <p className="text-xs text-gray-600">Can manage and oversee zones</p>
                    </div>
                  </label>
                </div>
              </div>
              {errors.role && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <BadgeIcon className="h-3 w-3" />
                  {errors.role.message}
                </p>
              )}
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="password" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Shield className="h-4 w-4 text-orange-600" />
                  Password *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter a strong password"
                    {...register('password')}
                    className={`h-12 text-base pr-12 transition-all duration-200 ${
                      errors.password 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                    }`}
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
                <p className="text-xs text-gray-600">
                  Password must be at least 6 characters long
                </p>
                {errors.password && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <BadgeIcon className="h-3 w-3" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Shield className="h-4 w-4 text-orange-600" />
                  Confirm Password *
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm the password"
                    {...register('confirmPassword')}
                    className={`h-12 text-base pr-12 transition-all duration-200 ${
                      errors.confirmPassword 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                    }`}
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
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <BadgeIcon className="h-3 w-3" />
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Zone Assignment Card */}
        <Card className="shadow-xl border-0 bg-gradient-to-br from-green-50 to-emerald-100 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-200 border-b border-green-300">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-800">Service Zone Assignments</CardTitle>
                <CardDescription className="text-gray-600">
                  Select the service zone that this user will manage and have access to
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {serviceZones.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center mb-6 shadow-lg">
                  <MapPin className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">No Service Zones Available</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  No active service zones are currently available for assignment. Please create service zones first before adding zone users.
                </p>
                <Link href="/admin/service-zones/new">
                  <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg">
                    <Building2 className="mr-2 h-4 w-4" />
                    Create Service Zone
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">Available Service Zones</h3>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {serviceZones.length} zones available
                    </Badge>
                  </div>
                  {selectedZones.length > 0 && (
                    <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                      {selectedZones.length} selected
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {serviceZones
                    .filter((zone) => zone.isActive)
                    .map((zone) => (
                    <div
                      key={zone.id}
                      className={`relative p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${
                        selectedZones.includes(zone.id)
                          ? 'border-green-500 bg-green-50 shadow-md ring-2 ring-green-200'
                          : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <Checkbox
                          id={`zone-${zone.id}`}
                          checked={selectedZones.includes(zone.id)}
                          onCheckedChange={(checked) => handleZoneToggle(zone.id)}
                          className="mt-1 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                          disabled={!zone.isActive}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                              {zone.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 text-base">{zone.name}</h4>
                              <Badge 
                                variant="outline" 
                                className="text-xs bg-green-50 text-green-700 border-green-200 mt-1"
                              >
                                <CheckCircle className="mr-1 h-2 w-2" />
                                Active Zone
                              </Badge>
                            </div>
                          </div>
                          {zone.description && (
                            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg">
                              {zone.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {selectedZones.includes(zone.id) && (
                        <div className="absolute top-3 right-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                            <CheckCircle className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {selectedZones.length > 0 && (
                  <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <h4 className="font-semibold text-green-900">
                        {selectedZones.length} Zone{selectedZones.length === 1 ? '' : 's'} Selected
                      </h4>
                    </div>
                    <p className="text-sm text-green-700 ml-11">
                      The zone user will be assigned to the selected zone and can manage tickets, activities, and service operations within this area.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-gray-200">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-gray-600" />
            </div>
            <span className="font-medium">
              {selectedZones.length === 0 
                ? 'No zones selected - please select at least one zone' 
                : `${selectedZones.length} zone${selectedZones.length === 1 ? '' : 's'} selected for assignment`
              }
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/admin/zone-users">
              <Button 
                type="button" 
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 h-12 px-6"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={loading || selectedZones.length === 0}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg h-12 px-8 min-w-[160px]"
            >
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Zone User
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </MobileContainer>
  );
}
