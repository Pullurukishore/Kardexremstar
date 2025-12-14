'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// Removed apiClient usage to avoid auth/shape mismatch for zones fetch
import { toast } from 'sonner';
import { Form } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api/axios';
import { Priority } from '@/types';
import { Customer, Contact } from '@/types/customer';
import { Asset } from '@/types/asset';
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
  callType: z.enum(['UNDER_MAINTENANCE_CONTRACT', 'NOT_UNDER_CONTRACT'], {
    required_error: 'Call type is required',
  }),
  customerId: z.string().min(1, 'Customer is required'),
  contactId: z.string().min(1, 'Contact person is required'),
  assetId: z.string().min(1, 'Asset is required'),
  zoneId: z.union([
    z.number({
      required_error: 'Zone is required',
      invalid_type_error: 'Please select a zone'
    }),
    z.literal('all')
  ]),
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

export default function CreateTicketPage() {
  const router = useRouter();
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
  // Define the zone type with proper servicePersons structure
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

  // Fetch zones on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        // Use the shared axios instance that carries cookies and handles refresh
        const response = await api.get('/service-zones', {
          params: {
            limit: 100
          }
        });

        // Backend returns { data: ZoneType[], pagination: {...} }
        const zonesData: ZoneType[] = response.data?.data || [];
        setZones(zonesData);
      } catch (error) {
        toast.error('Failed to load service zones. Please try again.');
        setZones([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch customers when zone changes
  const zoneId = form.watch('zoneId');
  useEffect(() => {
    const fetchZoneCustomers = async () => {
      if (zoneId === undefined || zoneId === null) {
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
        
        let customersRes;
        if (zoneId === 'all') {
          // Fetch all customers from all zones
          customersRes = await api.get('/customers?include=contacts,assets');
        } else {
          // Use the customers endpoint with zone filter
          customersRes = await api.get(`/customers?serviceZoneId=${zoneId}&include=contacts,assets`);
        }
        
        // Map the API response to match our expected format
        const formattedCustomers = customersRes.data.map((customer: any) => ({
          ...customer,
          contacts: customer.contacts || [],
          assets: customer.assets || []
        }));
        
        setCustomers(formattedCustomers);
        
        // Reset customer-dependent fields
        form.setValue('customerId', '');
        form.setValue('contactId', '');
        form.setValue('assetId', '');
        setContacts([]);
        setAssets([]);
      } catch (error) {
        toast.error(zoneId === 'all' 
          ? 'Failed to load customers from all zones. Please try again.'
          : 'Failed to load customers for selected zone. Please try again.');
        setCustomers([]);
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    fetchZoneCustomers();
  }, [zoneId, form, toast]);

  // Watch additional required fields for validation
  const title = form.watch('title');
  const description = form.watch('description');
  const callType = form.watch('callType');
  const priority = form.watch('priority');
  const customerId = form.watch('customerId');
  const contactId = form.watch('contactId');
  const assetId = form.watch('assetId');

  // Check if all required fields are filled
  const isFormValid = Boolean(
    title && title.length >= 3 &&
    description && description.length >= 10 &&
    callType &&
    priority &&
    zoneId &&
    customerId &&
    contactId &&
    assetId
  );

  // Update contacts and assets when customer changes
  useEffect(() => {
    const updateCustomerData = () => {
      if (!customerId) {
        setContacts([]);
        setAssets([]);
        form.setValue('contactId', '');
        form.setValue('assetId', '');
        return;
      }
      
      // Find the selected customer
      const selectedCustomer = customers.find(c => c.id.toString() === customerId);
      if (selectedCustomer) {
        setContacts(selectedCustomer.contacts || []);
        setAssets(selectedCustomer.assets || []);
        form.setValue('contactId', '');
        form.setValue('assetId', '');
        
        // If there's only one contact, auto-select it
        if (selectedCustomer.contacts?.length === 1) {
          form.setValue('contactId', selectedCustomer.contacts[0].id.toString());
        }
        
        // If there's only one asset, auto-select it (since asset is now required)
        if (selectedCustomer.assets?.length === 1) {
          form.setValue('assetId', selectedCustomer.assets[0].id.toString());
        }
      }
    };

    try {
      updateCustomerData();
    } catch (error) {
      toast.error('Failed to update customer data. Please try again.');
    }
  }, [customerId, form, customers]);

  // Handle asset creation
  const handleCreateAsset = async (values: AssetFormValues) => {
    if (!customerId) {
      toast.error('Please select a customer first');
      return;
    }

    try {
      setIsCreatingAsset(true);
      
      const payload = {
        ...values,
        customerId: parseInt(customerId),
      };

      const response = await api.post('/assets', payload);
      const newAsset = response.data;
      
      // Update the assets list
      setAssets(prev => [...prev, newAsset]);
      
      // Update the customers array to include the new asset
      setCustomers(prev => prev.map(customer => 
        customer.id.toString() === customerId 
          ? { ...customer, assets: [...customer.assets, newAsset] }
          : customer
      ));
      
      // Auto-select the newly created asset
      form.setValue('assetId', newAsset.id.toString());
      
      // Reset the asset form and close dialog
      assetForm.reset();
      setIsAddAssetOpen(false);
      
      toast.success(`Asset "${newAsset.model}" has been created and selected.`);
    } catch (error: any) {
      let errorMessage = 'Failed to create asset. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsCreatingAsset(false);
    }
  };

  // Handle contact creation
  const handleCreateContact = async (values: ContactFormValues) => {
    if (!customerId) {
      toast.error('Please select a customer first');
      return;
    }

    try {
      setIsCreatingContact(true);
      
      const payload = {
        ...values,
        customerId: parseInt(customerId),
      };

      const response = await api.post('/contacts', payload);
      const newContact = response.data;
      
      // Update the contacts list
      setContacts(prev => [...prev, newContact]);
      
      // Update the customers array to include the new contact
      setCustomers(prev => prev.map(customer => 
        customer.id.toString() === customerId 
          ? { ...customer, contacts: [...customer.contacts, newContact] }
          : customer
      ));
      
      // Auto-select the newly created contact
      form.setValue('contactId', newContact.id.toString());
      
      // Reset the contact form and close dialog
      contactForm.reset();
      setIsAddContactOpen(false);
      
      toast.success(`Contact "${newContact.name}" has been created and selected.`);
    } catch (error: any) {
      let errorMessage = 'Failed to create contact. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsCreatingContact(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      // If "All Zones" is selected, use the customer's actual zone ID
      let actualZoneId = values.zoneId;
      if (values.zoneId === 'all') {
        const selectedCustomer = customers.find(c => c.id === parseInt(values.customerId));
        if (selectedCustomer) {
          actualZoneId = selectedCustomer.serviceZoneId;
        } else {
          throw new Error('Customer not found. Please select a valid customer.');
        }
      }
      
      const response = await api.post('/tickets', {
        ...values,
        // Convert string IDs to numbers for the API
        customerId: parseInt(values.customerId),
        contactId: parseInt(values.contactId),
        assetId: parseInt(values.assetId),
        // Use the actual zone ID (either selected zone or customer's zone)
        zoneId: actualZoneId,
        relatedMachineIds: values.relatedMachineIds 
          ? values.relatedMachineIds.split(',').map((id: string) => id.trim())
          : undefined,
      });

      const ticketData = response.data;
      
      // Log the response for debugging
      console.log('Ticket creation response:', ticketData);
      
      // Get customer and zone names for better success message
      const selectedCustomer = customers.find(c => c.id === parseInt(values.customerId));
      let zoneName = 'selected zone';
      if (values.zoneId === 'all') {
        const customerZone = zones.find(z => z.id === selectedCustomer?.serviceZoneId);
        zoneName = customerZone?.name || 'customer\'s zone';
      } else {
        const selectedZone = zones.find(z => z.id === values.zoneId);
        zoneName = selectedZone?.name || 'selected zone';
      }
      
      // Extract ticket details from response
      const ticketId = ticketData?.id;
      const ticketTitle = ticketData?.title;
      const customerName = ticketData?.customer?.companyName || selectedCustomer?.companyName || 'customer';
      const ticketZone = ticketData?.zone?.name || zoneName;
      
      console.log('Showing success toast with:', { ticketId, ticketTitle, customerName, ticketZone });
      
      // Show success message
      const successMessage = `✅ Ticket Created Successfully!\n\nTicket #${ticketId}: ${ticketTitle}\nCustomer: ${customerName}\nZone: ${ticketZone}\n\nRedirecting to tickets page...`;
      console.log('Success message:', successMessage);
      
      // Show toast notification (like login)
      toast.success('🎉 Ticket Created Successfully!\nWelcome! Redirecting to tickets page...');
      
      // Reset form to allow creating another ticket if needed
      form.reset({
        priority: 'MEDIUM',
      });
      
      // Wait longer for user to see the success message, then redirect
      setTimeout(() => {
        console.log('Redirecting to /admin/tickets');
        router.push('/admin/tickets');
        router.refresh(); // Ensure the page updates with the new data
      }, 3000);
    } catch (error: any) {
      let errorMessage = 'Failed to create ticket. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(`❌ Error Creating Ticket: ${errorMessage}`);
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
          />
          
          <CustomerSelectionForm 
            control={form.control}
            customers={customers}
            contacts={contacts}
            assets={assets}
            zoneId={zoneId === 'all' ? 'all' : (zoneId !== undefined ? Number(zoneId) : undefined)}
            customerId={customerId}
            isSubmitting={isSubmitting}
            isLoadingCustomers={isLoadingCustomers}
            onAddContactClick={() => setIsAddContactOpen(true)}
            onAddAssetClick={() => setIsAddAssetOpen(true)}
          />
          
          <TicketFormActions 
            isSubmitting={isSubmitting}
            onCancel={() => router.back()}
            isFormValid={isFormValid}
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