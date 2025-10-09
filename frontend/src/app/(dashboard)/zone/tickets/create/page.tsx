'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { Form } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api/axios';
import { useAuth } from '@/contexts/AuthContext';
import {
  TicketFormHeader,
  TicketBasicInfoForm,
  CustomerSelectionForm,
  AddContactDialog,
  AddAssetDialog,
  TicketFormActions,
} from '@/components/tickets';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  customerId: z.string().min(1, 'Customer is required'),
  contactId: z.string().min(1, 'Contact person is required'),
  assetId: z.string().optional(),
  zoneId: z.number({
    required_error: 'Zone is required',
    invalid_type_error: 'Please select a zone'
  }),
  errorDetails: z.string().optional(),
  relatedMachineIds: z.string().optional(),
});

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
});

const assetSchema = z.object({
  model: z.string().min(2, 'Model must be at least 2 characters'),
  serialNo: z.string().min(3, 'Serial number must be at least 3 characters'),
});

type FormValues = z.infer<typeof formSchema>;
type ContactFormValues = z.infer<typeof contactSchema>;
type AssetFormValues = z.infer<typeof assetSchema>;

export default function ZoneCreateTicketPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isCreatingAsset, setIsCreatingAsset] = useState(false);
  const [customers, setCustomers] = useState<Array<{
    id: number;
    name: string;
    companyName: string;
    serviceZoneId: number;
    contacts: Array<{id: number, name: string, email: string, phone: string}>;
    assets: Array<{id: number, model?: string, serialNo?: string, serialNumber?: string}>;
  }>>([]);
  const [contacts, setContacts] = useState<Array<{id: number, name: string, email: string, phone: string}>>([]);
  const [assets, setAssets] = useState<Array<{id: number, model?: string, serialNo?: string, serialNumber?: string}>>([]);

  type ZoneType = {
    id: number;
    name: string;
    description?: string;
    isActive: boolean;
    servicePersons: Array<{
      id: number;
      user: {
        id: number;
        email: string;
      };
    }>;
  };

  const [zones, setZones] = useState<ZoneType[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      priority: 'MEDIUM',
    },
  });

  const contactForm = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      phone: '',
    },
  });

  const assetForm = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      model: '',
      serialNo: '',
    },
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        console.log('Current user:', user); // Debug log
        
        // Check if user has service zones assigned
        const hasServiceZones = user?.serviceZones && user.serviceZones.length > 0;
        const userZoneId = user?.zoneId || 
          (hasServiceZones && user?.serviceZones?.[0]?.serviceZoneId) || 
          null;
        
        // Fetch the zone that the zone user is assigned to
        if (userZoneId) {
          console.log('Fetching zone with ID:', userZoneId); // Debug log
          
          try {
            const response = await api.get(`/service-zones/${userZoneId}`);
            console.log('Zone API response:', response); // Debug log
            
            if (response.data) {
              const zoneData = response.data.data || response.data; // Handle both response formats
              console.log('Zone data:', zoneData); // Debug log
              
              if (zoneData) {
                setZones([zoneData]);
                // Auto-select the zone for zone user
                form.setValue('zoneId', zoneData.id, { shouldValidate: true });
                return; // Exit early on success
              } else {
                console.warn('No zone data found in response');
              }
            } else {
              console.warn('Unexpected API response format:', response);
            }
          } catch (apiError) {
            console.error('API Error fetching service zone:', apiError);
            // Don't throw here, we'll handle it below with a user-friendly message
          }
        } 
        
        // If we get here, either no zone ID or API call failed
        const errorMsg = hasServiceZones 
          ? 'Failed to load service zone details. Please try again.'
          : 'You are not assigned to any service zone. Please contact your administrator.';
          
        console.error(errorMsg);
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
        setZones([]);
      } catch (error: any) {
        console.error('Error in fetchInitialData:', error);
        const errorMessage = error.response?.data?.message || 'Failed to load service zone. Please try again.';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        setZones([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [user]);

  const zoneId = form.watch('zoneId');
  
  useEffect(() => {
    const fetchZoneCustomers = async () => {
      if (!zoneId) {
        setCustomers([]);
        setContacts([]);
        setAssets([]);
        form.setValue('customerId', '');
        form.setValue('contactId', '');
        form.setValue('assetId', '');
        return;
      }

      try {
        setIsLoadingCustomers(true);
        // Fetch customers for the zone user's zone only
        const customersRes = await api.get(`/customers?serviceZoneId=${zoneId}&include=contacts,assets`);
        const formattedCustomers = customersRes.data.map((customer: any) => ({
          ...customer,
          contacts: customer.contacts || [],
          assets: customer.assets || []
        }));
        setCustomers(formattedCustomers);
        form.setValue('customerId', '');
        form.setValue('contactId', '');
        form.setValue('assetId', '');
        setContacts([]);
        setAssets([]);
      } catch (error) {
        console.error('Error fetching zone customers:', error);
        toast({
          title: 'Error',
          description: 'Failed to load customers for your zone. Please try again.',
          variant: 'destructive',
        });
        setCustomers([]);
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    fetchZoneCustomers();
  }, [zoneId, form, toast]);

  const customerId = form.watch('customerId');
  
  useEffect(() => {
    const updateCustomerData = () => {
      if (!customerId) {
        setContacts([]);
        setAssets([]);
        form.setValue('contactId', '');
        form.setValue('assetId', '');
        return;
      }

      const selectedCustomer = customers.find(c => c.id.toString() === customerId);
      if (selectedCustomer) {
        setContacts(selectedCustomer.contacts || []);
        setAssets(selectedCustomer.assets || []);
        form.setValue('contactId', '');
        form.setValue('assetId', '');
        if (selectedCustomer.contacts?.length === 1) {
          form.setValue('contactId', selectedCustomer.contacts[0].id.toString());
        }
      }
    };

    try {
      updateCustomerData();
    } catch (error) {
      console.error('Error updating customer data:', error);
      toast({
        title: 'Error',
        description: 'Failed to update customer data. Please try again.',
        variant: 'destructive',
      });
    }
  }, [customerId, form, customers, toast]);

  const handleCreateAsset = async (values: AssetFormValues) => {
    if (!customerId) {
      toast({
        title: 'Error',
        description: 'Please select a customer first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreatingAsset(true);
      const payload = { ...values, customerId: parseInt(customerId) };
      const response = await api.post('/assets', payload);
      const newAsset = response.data;
      setAssets(prev => [...prev, newAsset]);
      setCustomers(prev => prev.map(customer => 
        customer.id.toString() === customerId 
          ? { ...customer, assets: [...customer.assets, newAsset] }
          : customer
      ));
      form.setValue('assetId', newAsset.id.toString());
      assetForm.reset();
      setIsAddAssetOpen(false);
      toast({ title: 'Success', description: `Asset "${newAsset.model}" has been created and selected.` });
    } catch (error: any) {
      console.error('Error creating asset:', error);
      let errorMessage = 'Failed to create asset. Please try again.';
      if (error.response?.data?.message) errorMessage = error.response.data.message;
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsCreatingAsset(false);
    }
  };

  const handleCreateContact = async (values: ContactFormValues) => {
    if (!customerId) {
      toast({
        title: 'Error',
        description: 'Please select a customer first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreatingContact(true);
      const payload = { ...values, customerId: parseInt(customerId) };
      const response = await api.post('/contacts', payload);
      const newContact = response.data;
      setContacts(prev => [...prev, newContact]);
      setCustomers(prev => prev.map(customer => 
        customer.id.toString() === customerId 
          ? { ...customer, contacts: [...customer.contacts, newContact] }
          : customer
      ));
      form.setValue('contactId', newContact.id.toString());
      contactForm.reset();
      setIsAddContactOpen(false);
      toast({ title: 'Success', description: `Contact "${newContact.name}" has been created and selected.` });
    } catch (error: any) {
      console.error('Error creating contact:', error);
      let errorMessage = 'Failed to create contact. Please try again.';
      if (error.response?.data?.message) errorMessage = error.response.data.message;
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsCreatingContact(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Verify the zone user is only creating tickets for their assigned zone
      if (user?.zoneId && values.zoneId !== user.zoneId) {
        throw new Error('You are not authorized to create tickets in this zone.');
      }
      
      const response = await api.post('/tickets', {
        ...values,
        customerId: parseInt(values.customerId),
        contactId: parseInt(values.contactId),
        assetId: values.assetId ? parseInt(values.assetId) : undefined,
        relatedMachineIds: values.relatedMachineIds 
          ? values.relatedMachineIds.split(',').map((id: string) => id.trim())
          : undefined,
      });

      const ticketData = response.data;
      const selectedCustomer = customers.find(c => c.id === parseInt(values.customerId));
      const selectedZone = zones.find(z => z.id === values.zoneId);

      toast({
        title: '🎉 Ticket Created Successfully!',
        description: `Ticket #${ticketData.id || 'New'} has been created for ${selectedCustomer?.companyName || 'customer'} in ${selectedZone?.name || 'your zone'}. Redirecting...`,
        duration: 3000,
      });

      form.reset({ priority: 'MEDIUM' });
      setTimeout(() => {
        router.push('/zone/tickets');
        router.refresh();
      }, 1500);
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      let errorMessage = 'Failed to create ticket. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: '❌ Error Creating Ticket',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Form Data</h3>
            <p className="text-gray-500">Preparing ticket creation form...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <TicketFormHeader 
        onBack={() => router.back()}
        isSubmitting={isSubmitting}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <TicketBasicInfoForm 
            control={form.control}
            zones={zones}
            isSubmitting={isSubmitting}
            hideZoneSelector={true} // Hide zone selector since it's auto-selected for zone users
          />

          <CustomerSelectionForm 
            control={form.control}
            customers={customers}
            contacts={contacts}
            assets={assets}
            zoneId={zoneId !== undefined ? Number(zoneId) : undefined}
            customerId={customerId}
            isSubmitting={isSubmitting}
            isLoadingCustomers={isLoadingCustomers}
            onAddContactClick={() => setIsAddContactOpen(true)}
            onAddAssetClick={() => setIsAddAssetOpen(true)}
          />

          <TicketFormActions 
            isSubmitting={isSubmitting}
            onCancel={() => router.back()}
          />
        </form>
      </Form>

      <AddContactDialog 
        open={isAddContactOpen}
        onOpenChange={setIsAddContactOpen}
        onSubmit={handleCreateContact}
        isCreating={isCreatingContact}
      />

      <AddAssetDialog 
        open={isAddAssetOpen}
        onOpenChange={setIsAddAssetOpen}
        onSubmit={handleCreateAsset}
        isCreating={isCreatingAsset}
      />
    </>
  );
}