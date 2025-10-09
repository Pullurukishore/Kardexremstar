"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import { getServiceZone, updateServiceZone } from '@/services/zone.service';
import type { ServiceZone } from '@/types/zone';

const serviceZoneFormSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type ServiceZoneFormValues = z.infer<typeof serviceZoneFormSchema>;

export default function EditServiceZonePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [zone, setZone] = useState<ServiceZone | null>(null);

  const zoneId = params?.id ? parseInt(params.id as string) : null;


  const form = useForm<ServiceZoneFormValues>({
    resolver: zodResolver(serviceZoneFormSchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    const loadData = async () => {
      if (!zoneId) return;
      
      setIsLoading(true);
      try {
        const zoneData = await getServiceZone(zoneId);
        
        setZone(zoneData);
        
        // Populate form with existing data
        form.reset({
          name: zoneData.name,
          description: zoneData.description || '',
          isActive: zoneData.isActive,
        });
      } catch (error) {
        console.error('Failed to load data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load service zone data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [zoneId, toast, form]);

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: ServiceZoneFormValues) => {
    if (!zoneId) return;
    
    try {
      const payload = values;
      
      await updateServiceZone(zoneId, payload);
      
      toast({
        title: 'Success',
        description: 'Service zone updated successfully',
      });
      
      router.push(`/admin/service-zones/${zoneId}`);
    } catch (error: any) {
      console.error('Error updating service zone:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update service zone',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading service zone...</p>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground mb-4">Service zone not found</p>
        <Button onClick={() => router.push('/admin/service-zones')}>
          Back to Service Zones
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.push(`/admin/service-zones/${zoneId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Service Zone</h1>
          <p className="text-muted-foreground">
            Update the details for "{zone.name}"
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Zone Information</CardTitle>
              <CardDescription>Update the service zone details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Service zone name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Whether this service zone is active and available for assignment
                        </p>
                      </div>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Description of the service zone" 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/admin/service-zones/${zoneId}`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Service Zone'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
