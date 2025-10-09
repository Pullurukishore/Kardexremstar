"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { createServiceZone } from '@/services/zone.service';

const serviceZoneFormSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type ServiceZoneFormValues = z.infer<typeof serviceZoneFormSchema>;

export default function NewServiceZonePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ServiceZoneFormValues>({
    resolver: zodResolver(serviceZoneFormSchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: ServiceZoneFormValues) => {
    try {
      const response = await createServiceZone(values);
      
      toast({
        title: 'Success',
        description: 'Service zone created successfully',
      });
      
      router.push('/admin/service-zones');
      router.refresh();
    } catch (error: any) {
      console.error('Error creating service zone:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create service zone',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create New Service Zone</h1>
        <p className="text-muted-foreground">
          Fill in the details to create a new service zone
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Zone Information</CardTitle>
              <CardDescription>Enter the service zone details</CardDescription>
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
                        <FormLabel className="text-base">Active Zone</FormLabel>
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
                      <FormDescription>
                        General information about this service zone. Users can be assigned to this zone when creating service persons or zone users.
                      </FormDescription>
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
              onClick={() => router.push('/admin/service-zones')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Service Zone'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
