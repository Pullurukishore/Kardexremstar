'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  ArrowLeft, 
  Save, 
  X, 
  User, 
  Mail, 
  Shield, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Eye,
  UserCheck,
  Building,
  Phone
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';
import { MobilePageHeader } from '@/components/ui/mobile-responsive';

type ServiceZone = { id: number; name: string; description?: string | null; isActive: boolean };
type ZoneUser = {
  id: number;
  email: string;
  name?: string | null;
  phone?: string | null;
  isActive: boolean;
  role: string;
  serviceZones: Array<{ serviceZone: { id: number; name: string } }>;
};

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  confirmPassword: z.string().optional(),
  serviceZoneIds: z.array(z.number()).min(1, 'Please select a service zone')
}).refine((data) => {
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

export default function EditZoneUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const userId = useMemo(() => Number(params?.id), [params?.id]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zoneUser, setZoneUser] = useState<ZoneUser | null>(null);
  const [serviceZones, setServiceZones] = useState<ServiceZone[]>([]);
  const [selectedZones, setSelectedZones] = useState<number[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      email: '',
      name: '',
      phone: '',
      password: '',
      confirmPassword: '',
      serviceZoneIds: [] 
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!userId || Number.isNaN(userId)) return;
      setLoading(true);
      try {
        console.log('Fetching zone user with ID:', userId);
        const [userRes, zonesRes] = await Promise.all([
          apiClient.get(`/zone-users/${userId}`),
          // fetch active zones
          apiClient.get('/service-zones', { params: { limit: 100, includeInactive: false } })
        ]);
        
        console.log('Raw userRes:', userRes);
        console.log('Raw zonesRes:', zonesRes);

        // Handle different response structures
        let userData = null;
        
        // Check if response has ApiResponse structure (userRes.data)
        if (userRes && typeof userRes === 'object' && 'data' in userRes && userRes.data) {
          console.log('Using ApiResponse structure - userRes.data:', userRes.data);
          userData = userRes.data;
        }
        // Check if response is the user data directly
        else if (userRes && typeof userRes === 'object' && 'id' in userRes) {
          console.log('Using direct response structure:', userRes);
          userData = userRes;
        }
        
        console.log('Final userData:', userData);
        
        if (!userData || typeof userData !== 'object' || !userData.id) {
          throw new Error('Invalid user data received from API');
        }
        
        const user: ZoneUser = userData;
        
        // Handle zones response structure
        let zonesData = null;
        if (zonesRes && typeof zonesRes === 'object' && 'data' in zonesRes) {
          if (Array.isArray(zonesRes.data)) {
            zonesData = zonesRes.data;
          } else if (zonesRes.data && zonesRes.data.data && Array.isArray(zonesRes.data.data)) {
            zonesData = zonesRes.data.data;
          }
        } else if (Array.isArray(zonesRes)) {
          zonesData = zonesRes;
        }
        
        console.log('Final zonesData:', zonesData);
        const zones = zonesData || [];

        setZoneUser(user);
        setServiceZones(zones);

        const assigned = (user.serviceZones || []).map((z) => z.serviceZone.id);
        setSelectedZones(assigned);
        form.reset({ 
          email: user.email || '',
          name: user.name || '',
          phone: user.phone || '',
          password: '',
          confirmPassword: '',
          serviceZoneIds: assigned 
        });
      } catch (error: any) {
        console.error('Failed to load zone user data:', error);
        toast({
          title: 'Error',
          description: error?.response?.data?.message || 'Failed to load zone user details',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const onSubmit = async (values: FormValues) => {
    if (!userId) return;
    
    // Validate required fields
    if (!values.email || !values.email.trim()) {
      toast({ title: 'Error', description: 'Email address is required', variant: 'destructive' });
      return;
    }
    
    if (!values.name || !values.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    
    // Validate password if provided
    if (values.password && values.password.length > 0) {
      if (values.password.length < 6) {
        toast({ title: 'Error', description: 'Password must be at least 6 characters long', variant: 'destructive' });
        return;
      }
      
      if (values.password !== values.confirmPassword) {
        toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
        return;
      }
    }
    
    setSaving(true);
    try {
      const promises = [];
      
      // 1. Update user profile (email, name, phone) via admin API
      const profileUpdateData = {
        email: values.email,
        name: values.name,
        phone: values.phone || undefined,
      };
      
      console.log('Updating user profile with data:', profileUpdateData);
      promises.push(apiClient.put(`/admin/users/${userId}`, profileUpdateData));
      
      // 2. Update password if provided via separate password reset API
      if (values.password && values.password.length > 0) {
        console.log('Updating user password');
        promises.push(apiClient.post(`/admin/users/${userId}/reset-password`, {
          newPassword: values.password
        }));
      }
      
      // 3. Update zone assignments via zone user API
      console.log('Updating zone assignments:', values.serviceZoneIds);
      promises.push(apiClient.put(`/zone-users/${userId}`, {
        serviceZoneIds: values.serviceZoneIds
      }));
      
      // Execute all API calls
      await Promise.all(promises);
      
      toast({ 
        title: 'Success', 
        description: 'Zone user updated successfully! Redirecting...' 
      });
      
      // Small delay to show success message before redirect
      setTimeout(() => {
        router.push('/admin/zone-users');
        router.refresh();
      }, 1000);
      
    } catch (error: any) {
      console.error('Failed to update zone user:', error);
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to update zone user',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 mb-4">
            <RefreshCw className="h-6 w-6 text-cyan-600 animate-spin" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Zone User</h3>
          <p className="text-sm text-gray-500">Please wait while we fetch the user details and service zones...</p>
        </div>
      </div>
    );
  }

  if (!zoneUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Zone User Not Found</h3>
          <p className="text-sm text-gray-500 mb-6">The zone user you're trying to edit doesn't exist or has been removed.</p>
          <Button onClick={() => router.push('/admin/zone-users')} className="bg-cyan-600 hover:bg-cyan-700">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Zone Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Desktop Header with Gradient */}
      <div className="hidden md:block relative overflow-hidden rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-800 p-6 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/admin/zone-users')}
              className="text-white hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Zone Users
            </Button>
            <Badge 
              variant={zoneUser.isActive ? 'default' : 'secondary'}
              className={zoneUser.isActive 
                ? 'bg-white/20 text-white hover:bg-white/30' 
                : 'bg-gray-600 text-gray-200 hover:bg-gray-700'
              }
            >
              {zoneUser.isActive ? (
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
              {(zoneUser.name || zoneUser.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Edit Zone User</h1>
              <p className="text-cyan-100 flex items-center gap-2">
                <User className="h-4 w-4" />
                {zoneUser.name || zoneUser.email} - Zone Assignment Management
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
            onClick={() => router.push('/admin/zone-users')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Badge 
            variant={zoneUser.isActive ? 'default' : 'secondary'}
            className={zoneUser.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
            }
          >
            {zoneUser.isActive ? (
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
          title="Edit Zone User"
          description={`${zoneUser.name || zoneUser.email} - Zone Assignment Management`}
        />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Enhanced User Profile Edit Card */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-slate-50 to-gray-100">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-100 rounded-t-lg border-b">
              <CardTitle className="text-gray-800 flex items-center gap-2">
                <User className="h-5 w-5 text-cyan-600" />
                User Profile Information
              </CardTitle>
              <CardDescription>
                Update the user's basic profile information
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
                        className="focus:ring-2 focus:ring-cyan-500"
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
                        <User className="h-4 w-4 text-cyan-600" />
                        Full Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter full name"
                          {...field}
                          className="focus:ring-2 focus:ring-cyan-500"
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
                          className="focus:ring-2 focus:ring-cyan-500"
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
                        <Input
                          type="password"
                          placeholder="Leave blank to keep current password"
                          {...field}
                          className="focus:ring-2 focus:ring-cyan-500"
                        />
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
                        <Input
                          type="password"
                          placeholder="Confirm new password"
                          {...field}
                          className="focus:ring-2 focus:ring-cyan-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Status Display */}
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm border">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Status</label>
                  <div className="mt-1">
                    <Badge 
                      variant={zoneUser.isActive ? 'default' : 'secondary'}
                      className={zoneUser.isActive 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    >
                      {zoneUser.isActive ? (
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
      <Card className="shadow-lg border-0 bg-gradient-to-br from-cyan-50 to-blue-100">
        <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-100 rounded-t-lg border-b">
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-cyan-600" />
            Service Zone Assignments
          </CardTitle>
          <CardDescription>
            Select the service zones that this user should be assigned to manage
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">

              {/* Enhanced Zone Selection */}
              <FormField
                control={form.control}
                name="serviceZoneIds"
                render={() => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-4">
                      <FormLabel className="text-lg font-semibold text-gray-900">Available Service Zones</FormLabel>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
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
                          Clear All
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {serviceZones.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center mb-4">
                            <MapPin className="h-8 w-8 text-cyan-500" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Service Zones Available</h3>
                          <p className="text-gray-500">
                            No active service zones are currently available for assignment.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {serviceZones
                            .filter((z) => z.isActive)
                            .map((zone) => (
                              <div 
                                key={zone.id} 
                                className={`relative p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                                  selectedZones.includes(zone.id)
                                    ? 'border-cyan-500 bg-cyan-50 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-cyan-300'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <FormControl>
                                    <Checkbox
                                      checked={selectedZones.includes(zone.id)}
                                      onCheckedChange={() => {
                                        setSelectedZones((prevSelected) => {
                                          // Single selection: if clicking the same zone, deselect it; otherwise select only this zone
                                          const updated = prevSelected.includes(zone.id) ? [] : [zone.id];
                                          form.setValue('serviceZoneIds', updated, { shouldValidate: false, shouldDirty: true });
                                          return updated;
                                        });
                                      }}
                                      className="mt-1"
                                    />
                                  </FormControl>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
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
                                    <div className="h-6 w-6 rounded-full bg-cyan-500 flex items-center justify-center">
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
                      Select one or more service zones to assign to this user. Users can only manage tickets and activities within their assigned zones.
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
                ? 'No zones selected' 
                : `${selectedZones.length} zone${selectedZones.length === 1 ? '' : 's'} selected`
              }
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/admin/zone-users">
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
              disabled={saving || selectedZones.length === 0}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg min-w-[120px]"
            >
              {saving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
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
