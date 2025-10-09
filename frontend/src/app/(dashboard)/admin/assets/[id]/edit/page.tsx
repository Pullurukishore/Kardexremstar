"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiClient } from '@/lib/api/api-client';
import api from '@/lib/api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const assetFormSchema = z.object({
  machineId: z.string().min(1, 'Machine ID is required'),
  model: z.string().min(1, 'Model is required'),
  serialNo: z.string().min(1, 'Serial number is required'),
  location: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DECOMMISSIONED']),
  notes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface Asset {
  id: number;
  machineId: string | null;
  model: string | null;
  serialNo: string | null;
  location?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'DECOMMISSIONED';
  notes?: string | null;
  customerId: number;
  customer: {
    id: number;
    companyName: string;
  };
}

export default function EditAssetPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAsset, setIsLoadingAsset] = useState(true);
  const [asset, setAsset] = useState<Asset | null>(null);

  const form = useForm<z.infer<typeof assetFormSchema>>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      machineId: '',
      model: '',
      serialNo: '',
      location: '',
      status: 'ACTIVE',
      notes: ''
    }
  });

  const loadAsset = async () => {
    try {
      setIsLoadingAsset(true);
      const response = await api.get<Asset>(`/assets/${id}`);
      
      // Backend returns asset directly in response.data
      const assetData = response.data;
      
      if (!assetData || !assetData.id) {
        throw new Error('No asset data received');
      }

      form.reset({
        machineId: assetData.machineId || '',
        model: assetData.model || '',
        serialNo: assetData.serialNo || '',
        location: assetData.location || '',
        status: assetData.status,
        notes: assetData.notes || ''
      });
      
      setAsset(assetData);
    } catch (error) {
      console.error('Error loading asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to load asset data',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAsset(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof assetFormSchema>) => {
    try {
      setIsLoading(true);
      await api.put(`/assets/${id}`, values);
      
      toast({
        title: 'Success',
        description: 'Asset updated successfully',
      });
      
      // Redirect back to customer assets page
      if (asset?.customer?.id) {
        router.push(`/admin/customers/${asset.customer.id}/assets`);
      } else {
        router.push(`/admin/assets/${id}`);
      }
      router.refresh();
    } catch (error) {
      console.error('Error updating asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to update asset',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadAsset();
    }
  }, [id]);

  if (isLoadingAsset) {
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
        <h3 className="mt-2 text-lg font-medium">Asset not found</h3>
        <p className="mt-1 text-muted-foreground">The asset you're looking for doesn't exist or was deleted.</p>
        <Button className="mt-4" onClick={() => router.push('/admin/customers')}>
          Back to Assets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href={`/admin/customers/${asset.customer.id}/assets`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customer Assets
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Asset</CardTitle>
          <CardDescription>
            Update asset details for {asset.customer.companyName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="machineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Machine ID *</FormLabel>
                      <FormControl>
                        <Input placeholder="MACH-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model *</FormLabel>
                      <FormControl>
                        <Input placeholder="Model XYZ-2000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serialNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="SN123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="DECOMMISSIONED">Decommissioned</option>
                      </select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Main Office, Warehouse A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this asset..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Redirect back to customer assets page for better navigation flow
                    if (asset?.customer?.id) {
                      router.push(`/admin/customers/${asset.customer.id}/assets`);
                    } else {
                      router.push(`/admin/assets/${id}`); // Fallback
                    }
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Asset'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
