'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, Save, Loader2, Plus, Users, HardDrive, Search, X, Building2, MapPin, FileText, Calendar, DollarSign, Target, MessageSquare, Image } from 'lucide-react'
import { apiService } from '@/services/api'
import { toast } from 'sonner'


export default function NewOfferPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingZones, setLoadingZones] = useState(true)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [zones, setZones] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [spareParts, setSpareParts] = useState<any[]>([])
  const [loadingSpareParts, setLoadingSpareParts] = useState(false)
  const [sparePartSearch, setSparePartSearch] = useState('')
  const [sparePartCategories, setSparePartCategories] = useState<string[]>([])
  
  // Dialog states
  const [isAddContactOpen, setIsAddContactOpen] = useState(false)
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false)
  const [isCreatingContact, setIsCreatingContact] = useState(false)
  const [isCreatingAsset, setIsCreatingAsset] = useState(false)
  
  // New contact/asset form data
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [newAsset, setNewAsset] = useState({ assetName: '', machineSerialNumber: '', model: '' })
  
  // Search states for dropdowns
  const [customerSearch, setCustomerSearch] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [assetSearch, setAssetSearch] = useState('')
  
  
  // Filtered lists based on search
  const filteredCustomers = customers.filter(customer =>
    customer.companyName?.toLowerCase().includes(customerSearch.toLowerCase())
  )
  
  const filteredContacts = contacts.filter(contact =>
    (contact.name || contact.contactPersonName)?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    (contact.phone || contact.contactNumber)?.includes(contactSearch)
  )
  
  const filteredAssets = assets.filter(asset =>
    (asset.assetName || asset.machineId)?.toLowerCase().includes(assetSearch.toLowerCase()) ||
    (asset.machineSerialNumber || asset.serialNo)?.toLowerCase().includes(assetSearch.toLowerCase()) ||
    asset.model?.toLowerCase().includes(assetSearch.toLowerCase())
  )
  
  
  const [formData, setFormData] = useState({
    // Essential Information for Initial Stage
    productType: '',
    lead: '',
    
    // Relations
    customerId: '',
    contactId: '',
    assetIds: [] as string[], // Changed to array for multiple assets
    zoneId: '',
    
    // Spare Parts for SPP (only if productType is SPP)
    spareParts: [] as Array<{
      name: string;
      photo: string;
      price: string;
      quantity?: string;
      total?: string;
    }>,
  })

  // Fetch zones on mount
  useEffect(() => {
    fetchZones()
  }, [])

  // Fetch spare parts when product type changes to SPP
  useEffect(() => {
    if (formData.productType === 'SPP') {
      fetchSpareParts()
    }
  }, [formData.productType])

  // Fetch customers when zone changes
  useEffect(() => {
    if (formData.zoneId) {
      fetchCustomersByZone(parseInt(formData.zoneId))
    } else {
      setCustomers([])
      setContacts([])
      setAssets([])
      setFormData(prev => ({ ...prev, customerId: '', contactId: '', assetIds: [], spareParts: [] }))
    }
  }, [formData.zoneId])

  // Update contacts and assets when customer changes
  useEffect(() => {
    if (formData.customerId) {
      const customer = customers.find(c => c.id === parseInt(formData.customerId))
      setSelectedCustomer(customer)
      if (customer) {
        fetchCustomerData(customer.id)
      }
    } else {
      setSelectedCustomer(null)
      setContacts([])
      setAssets([])
      setFormData(prev => ({ ...prev, contactId: '', assetIds: [], spareParts: [] }))
    }
  }, [formData.customerId, customers])

  const fetchZones = async () => {
    try {
      setLoadingZones(true)
      const response = await apiService.getZones()
      console.log('🔍 Zones fetched:', response.data?.length || 0)
      setZones(response.data || [])
    } catch (error: any) {
      console.error('Failed to fetch zones:', error)
      toast.error('Failed to fetch zones')
    } finally {
      setLoadingZones(false)
    }
  }

  const fetchCustomersByZone = async (zoneId: number) => {
    try {
      setLoadingCustomers(true)
      // Request all customers for the zone (no pagination limit)
      const customers = await apiService.getCustomers({ 
        zoneId, 
        limit: 100, // Using the maximum allowed limit
        include: 'contacts,assets' // Request full data
      })
      
      console.log('🔍 Zone ID:', zoneId)
      console.log('🔍 API Response:', customers)
      console.log('🔍 Customers fetched:', Array.isArray(customers) ? customers.length : 0)
      
      if (Array.isArray(customers) && customers.length > 0) {
        console.log('🔍 Sample customer data:', customers[0])
        console.log('🔍 Sample customer contacts:', customers[0]?.contacts?.length || 0)
        console.log('🔍 Sample customer assets:', customers[0]?.assets?.length || 0)
      } else {
        console.log('🔍 No customers found or invalid response format')
      }
      
      setCustomers(Array.isArray(customers) ? customers : [])
      
      // Reset customer-dependent fields
      setFormData(prev => ({ ...prev, customerId: '', contactId: '', assetIds: [], spareParts: [] }))
      setContacts([])
      setAssets([])
    } catch (error: any) {
      console.error('❌ Failed to fetch customers:', error)
      console.error('❌ Error response:', error.response?.data)
      toast.error(`Failed to fetch customers: ${error.response?.data?.message || error.message}`)
      setCustomers([])
    } finally {
      setLoadingCustomers(false)
    }
  }

  const fetchCustomerData = async (customerId: number) => {
    try {
      const response = await apiService.getCustomer(customerId)
      const customerData = response.customer || response
      setContacts(customerData?.contacts || [])
      setAssets(customerData?.assets || [])
      
      // Auto-select if only one option
      if (customerData?.contacts?.length === 1) {
        setFormData(prev => ({ ...prev, contactId: customerData.contacts[0].id.toString() }))
      }
    } catch (error: any) {
      console.error('Failed to fetch customer data:', error)
      toast.error('Failed to load customer details')
    }
  }

  const fetchSpareParts = async () => {
    try {
      setLoadingSpareParts(true)
      // Fetch all spare parts without pagination limit
      const response = await apiService.getSpareParts({ status: 'ACTIVE', limit: 1000 })
      const parts = response.spareParts || []
      setSpareParts(parts)
      
      // Extract unique categories
      const categories = [...new Set(parts.map((p: any) => p.category).filter(Boolean))] as string[]
      setSparePartCategories(categories)
      
      console.log(`✓ Loaded ${parts.length} spare parts with ${categories.length} categories`)
    } catch (error: any) {
      console.error('Failed to fetch spare parts:', error)
      toast.error('Failed to fetch spare parts')
    } finally {
      setLoadingSpareParts(false)
    }
  }

  const handleCreateContact = async () => {
    if (!formData.customerId) {
      toast.error('Please select a customer first')
      return
    }
    
    if (!newContact.name || !newContact.phone) {
      toast.error('Contact name and phone are required')
      return
    }

    try {
      setIsCreatingContact(true)
      const response = await apiService.createCustomerContact(
        parseInt(formData.customerId),
        {
          name: newContact.name,
          phone: newContact.phone,
          email: newContact.email || undefined // Only include if not empty
        }
      )
      
      // The API returns the created contact directly in response.data
      const createdContact = response.data;
      
      if (!createdContact || !createdContact.id) {
        console.error('Invalid contact creation response:', response);
        throw new Error('Failed to create contact: Invalid server response');
      }
      
      setContacts(prev => [...prev, createdContact]);
      setFormData(prev => ({ ...prev, contactId: createdContact.id.toString() }));
      
      // Reset form and close dialog
      setNewContact({ name: '', email: '', phone: '' })
      setIsAddContactOpen(false)
      toast.success('Contact created successfully')
    } catch (error: any) {
      console.error('Failed to create contact:', error)
      toast.error(error.response?.data?.error || 'Failed to create contact')
    } finally {
      setIsCreatingContact(false)
    }
  }

  const handleCreateAsset = async () => {
    if (!formData.customerId) {
      toast.error('Please select a customer first')
      return
    }
    
    if (!newAsset.assetName || !newAsset.machineSerialNumber) {
      toast.error('Asset name and serial number are required')
      return
    }

    try {
      setIsCreatingAsset(true)
      const response = await apiService.createCustomerAsset(
        parseInt(formData.customerId),
        {
          ...newAsset,
          customerId: parseInt(formData.customerId)
        }
      )
      
      const createdAsset = response.asset || response
      setAssets(prev => [...prev, createdAsset])
      setFormData(prev => ({ ...prev, assetIds: [createdAsset.id.toString()] }))
      
      // Reset form and close dialog
      setNewAsset({ assetName: '', machineSerialNumber: '', model: '' })
      setIsAddAssetOpen(false)
      toast.success('Asset created successfully')
    } catch (error: any) {
      console.error('Failed to create asset:', error)
      toast.error(error.response?.data?.error || 'Failed to create asset')
    } finally {
      setIsCreatingAsset(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation - Only essential fields for initial stage
    if (!formData.zoneId) {
      toast.error('Service zone is required')
      return
    }
    if (!formData.customerId) {
      toast.error('Customer is required')
      return
    }
    if (!formData.contactId) {
      toast.error('Contact person is required')
      return
    }
    if (formData.assetIds.length === 0) {
      toast.error('At least one asset is required')
      return
    }
    if (!formData.productType) {
      toast.error('Product type is required')
      return
    }
    if (!formData.lead) {
      toast.error('Lead status is required')
      return
    }
    
    // Validate spare parts if product type is SPP
    if (formData.productType === 'SPP' && formData.spareParts.length === 0) {
      toast.error('At least one spare part is required for SPP product type')
      return
    }
    
    if (formData.productType === 'SPP') {
      for (const part of formData.spareParts) {
        if (!part.name.trim()) {
          toast.error('All spare parts must have a name')
          return
        }
        if (!part.price || parseFloat(part.price) <= 0) {
          toast.error('All spare parts must have a valid price')
          return
        }
      }
    }

    setLoading(true)
    try {
      // Prepare data for API - Initial stage only
      const payload: any = {
        // Essential fields only
        productType: formData.productType,
        lead: formData.lead,
        customerId: parseInt(formData.customerId),
        contactId: parseInt(formData.contactId),
        assetIds: formData.assetIds.map(id => parseInt(id)),
        zoneId: parseInt(formData.zoneId),
        
        // Auto-generate title based on customer and product type
        title: `${formData.productType} - ${selectedCustomer?.companyName}`,
        
        // Add customer/contact/asset info for easy access
        company: selectedCustomer?.companyName,
        location: selectedCustomer?.location,
        department: selectedCustomer?.department,
        contactPersonName: contacts.find(c => c.id === parseInt(formData.contactId))?.name,
        contactNumber: contacts.find(c => c.id === parseInt(formData.contactId))?.phone,
        email: contacts.find(c => c.id === parseInt(formData.contactId))?.email,
        machineSerialNumber: formData.assetIds.length > 0 ? 
          formData.assetIds.map(assetId => {
            const asset = assets.find(a => a.id === parseInt(assetId));
            // Asset model uses serialNo, not machineSerialNumber
            return asset?.serialNo || asset?.machineId || asset?.assetName;
          }).filter(Boolean).join(', ') : null,
          
        // Include spare parts if SPP
        ...(formData.productType === 'SPP' && {
          spareParts: formData.spareParts.map(part => ({
            ...part,
            price: parseFloat(part.price)
          }))
        }),
        
        // Mark as initial stage
        stage: 'INITIAL',
        status: 'DRAFT'
      }

      await apiService.createOffer(payload)
      toast.success('Initial offer created successfully! You can add more details later.')
      router.push('/admin/offers')
    } catch (error: any) {
      console.error('Failed to create offer:', error)
      toast.error(error.response?.data?.error || 'Failed to create offer')
    } finally {
      setLoading(false)
    }
  }

  if (loadingZones) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Form Data</h3>
            <p className="text-gray-500">Preparing offer creation form...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Premium Gradient Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="mb-4 hover:bg-white/80 backdrop-blur-sm transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 shadow-2xl mb-6 transform hover:scale-[1.01] transition-transform duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-lg">
                  <Plus className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1">Create New Offer</h1>
                  <p className="text-blue-100">Quick setup with essential details • Add more info later</p>
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
                <FileText className="h-5 w-5 text-white/80" />
                <span className="text-white font-medium">Initial Stage</span>
              </div>
            </div>
          </div>

          {/* Quick Info Card */}
          <div className="bg-white rounded-xl p-5 shadow-md border-l-4 border-blue-500 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg mb-1">Initial Offer Setup</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Start by selecting <span className="font-semibold text-blue-600">Zone → Customer → Contact → Asset(s) → Product Type</span>. 
                  You can add financial details, quotes, and documents after the offer is created.
                </p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer & Contact Information */}
        <Card className="shadow-xl border-0 bg-white backdrop-blur-sm hover:shadow-2xl transition-all duration-300 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-xl border-b border-green-100 pb-6">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/20">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              Customer & Contact Information
            </CardTitle>
            <CardDescription className="text-slate-600 ml-12 mt-1">Select customer and contact person for this offer</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Zone Selection - First */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="zoneId" className="text-sm font-semibold text-gray-700">Service Zone *</Label>
                <Select value={formData.zoneId} onValueChange={(value) => handleInputChange('zoneId', value)}>
                  <SelectTrigger className="h-11 border-2 hover:border-blue-300 focus:border-blue-500 transition-colors">
                    <SelectValue placeholder="Select service zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map(zone => (
                      <SelectItem key={zone.id} value={zone.id.toString()}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Selection */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="customerId" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Building2 className="h-4 w-4 text-green-500" />
                  Customer *
                  {loadingCustomers && <Loader2 className="h-4 w-4 animate-spin text-green-500" />}
                </Label>
                <Select 
                  value={formData.customerId} 
                  onValueChange={(value) => handleInputChange('customerId', value)}
                  disabled={!formData.zoneId || loadingCustomers}
                >
                  <SelectTrigger className="h-11 border-2 hover:border-green-300 focus:border-green-500 transition-colors">
                    <SelectValue placeholder={
                      !formData.zoneId 
                        ? "Select a service zone first" 
                        : loadingCustomers 
                          ? "Loading customers..." 
                          : customers.length === 0 
                            ? "No customers available in this zone" 
                            : "Select customer"
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    <div className="sticky top-0 bg-white border-b p-2 z-10">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search customers..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="pl-8 pr-8 h-8 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {customerSearch && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomerSearch('');
                            }}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            <div className="flex items-center space-x-2">
                              <Building2 className="h-3 w-3 text-green-500" />
                              <div className="flex flex-col">
                                <span className="font-medium">{customer.companyName}</span>
                                {customer.location && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {customer.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-gray-500 text-center">
                          {customerSearch ? 'No customers found matching your search' : 'No customers available'}
                        </div>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {/* Contact Selection with Add Button */}
              <div className="space-y-2">
                <Label htmlFor="contactId" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Users className="h-4 w-4 text-purple-500" />
                  Contact Person *
                </Label>
                <div className="flex gap-2">
                  <Select 
                    value={formData.contactId} 
                    onValueChange={(value) => handleInputChange('contactId', value)}
                    disabled={!formData.customerId || contacts.length === 0}
                  >
                    <SelectTrigger className="flex-1 h-11 border-2 hover:border-purple-300 focus:border-purple-500 transition-colors">
                      <SelectValue placeholder={
                        !formData.customerId 
                          ? 'Select a customer first' 
                          : contacts.length === 0 
                            ? 'No contacts available' 
                            : 'Select contact person'
                      } />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <div className="sticky top-0 bg-white border-b p-2 z-10">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Search contacts..."
                            value={contactSearch}
                            onChange={(e) => setContactSearch(e.target.value)}
                            className="pl-8 pr-8 h-8 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                          {contactSearch && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setContactSearch('');
                              }}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredContacts.length > 0 ? (
                          filteredContacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id.toString()}>
                              <div className="flex items-center space-x-2">
                                <Users className="h-3 w-3 text-purple-500" />
                                <div className="flex flex-col">
                                  <span className="font-medium">{contact.name}</span>
                                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                                    {contact.phone && (
                                      <span>{contact.phone}</span>
                                    )}
                                    {contact.email && <span>{contact.email}</span>}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-gray-500 text-center">
                            {contactSearch ? 'No contacts found matching your search' : 'No contacts available'}
                          </div>
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddContactOpen(true)}
                    disabled={!formData.customerId}
                    className="h-11 px-4 border-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add New
                  </Button>
                </div>
              </div>

              {/* Asset Selection with Add Button - Multiple Selection */}
              <div className="space-y-2">
                <Label htmlFor="assetIds" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <HardDrive className="h-4 w-4 text-indigo-500" />
                  Assets *
                </Label>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    {/* Selected Assets Display */}
                    {formData.assetIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        {formData.assetIds.map((assetId) => {
                          const asset = assets.find(a => a.id === parseInt(assetId));
                          return (
                            <div key={assetId} className="flex items-center gap-2 bg-white text-indigo-700 px-3 py-1.5 rounded-lg shadow-sm border border-indigo-200 hover:shadow-md transition-shadow">
                              <HardDrive className="h-3.5 w-3.5" />
                              <span className="text-sm font-medium">{asset?.assetName || asset?.machineId || asset?.serialNo || 'Unknown'}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newAssetIds = formData.assetIds.filter(id => id !== assetId);
                                  handleInputChange('assetIds', newAssetIds);
                                }}
                                className="ml-1 text-indigo-500 hover:text-indigo-700 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Asset Selection Dropdown */}
                    <Select 
                      value="" 
                      onValueChange={(value) => {
                        if (value && !formData.assetIds.includes(value)) {
                          handleInputChange('assetIds', [...formData.assetIds, value]);
                        }
                      }}
                      disabled={!formData.customerId}
                    >
                      <SelectTrigger className="h-11 border-2 hover:border-indigo-300 focus:border-indigo-500 transition-colors">
                        <SelectValue placeholder={
                          !formData.customerId 
                            ? 'Select a customer first' 
                            : assets.length === 0 
                              ? 'No assets available - Add one below' 
                              : formData.assetIds.length === 0
                                ? 'Select assets (required)'
                                : 'Add more assets'
                        } />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        <div className="sticky top-0 bg-white border-b p-2 z-10">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              placeholder="Search assets..."
                              value={assetSearch}
                              onChange={(e) => setAssetSearch(e.target.value)}
                              className="pl-8 pr-8 h-8 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                            {assetSearch && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAssetSearch('');
                                }}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {filteredAssets.length > 0 ? (
                            filteredAssets
                              .filter(asset => !formData.assetIds.includes(asset.id.toString()))
                              .map((asset) => (
                                <SelectItem key={asset.id} value={asset.id.toString()}>
                                  <div className="flex items-center space-x-2">
                                    <HardDrive className="h-3 w-3 text-indigo-500" />
                                    <div className="flex flex-col">
                                      <span className="font-medium">{asset.assetName || asset.machineId || 'Unknown'}</span>
                                      <span className="text-xs text-gray-500">
                                        {asset.model && `Model: ${asset.model} • `}
                                        SN: {asset.serialNo || 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))
                          ) : assets.length > 0 ? (
                            <div className="p-2 text-sm text-gray-500 text-center">
                              {formData.assetIds.length === assets.length 
                                ? 'All assets selected' 
                                : 'No assets found matching your search'}
                            </div>
                          ) : null}
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddAssetOpen(true)}
                    disabled={!formData.customerId}
                    className="h-11 px-4 border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add New
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Essential Information */}
        <Card className="shadow-xl border-0 bg-white backdrop-blur-sm hover:shadow-2xl transition-all duration-300 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl border-b border-blue-100 pb-6">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                <FileText className="h-6 w-6 text-white" />
              </div>
              Essential Information
            </CardTitle>
            <CardDescription className="text-slate-600 ml-12 mt-1">Basic details for initial offer stage</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="productType" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Product Type <span className="text-red-600">*</span>
                </Label>
                <Select value={formData.productType} onValueChange={(value) => handleInputChange('productType', value)}>
                  <SelectTrigger className="h-11 border-2 hover:border-blue-300 focus:border-blue-500 transition-colors">
                    <SelectValue placeholder="Select product type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RELOCATION">Relocation</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="SPP">SPP (Spare Parts)</SelectItem>
                    <SelectItem value="UPGRADE_KIT">Upgrade Kit</SelectItem>
                    <SelectItem value="SOFTWARE">Software</SelectItem>
                    <SelectItem value="BD_CHARGES">BD Charges</SelectItem>
                    <SelectItem value="BD_SPARE">BD Spare</SelectItem>
                    <SelectItem value="MIDLIFE_UPGRADE">Midlife Upgrade</SelectItem>
                    <SelectItem value="RETROFIT_KIT">Retrofit Kit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Lead Status <span className="text-red-600">*</span>
                </Label>
                <Select value={formData.lead} onValueChange={(value) => handleInputChange('lead', value)}>
                  <SelectTrigger className="h-11 border-2 hover:border-blue-300 focus:border-blue-500 transition-colors">
                    <SelectValue placeholder="Select lead status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">Yes</SelectItem>
                    <SelectItem value="NO">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spare Parts Section - Only for SPP */}
        {formData.productType === 'SPP' && (
          <Card className="shadow-lg border-0 bg-white overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-100 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Spare Parts</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {loadingSpareParts ? 'Loading...' : `${spareParts.length} available`}
                      {formData.spareParts.length > 0 && ` • ${formData.spareParts.length} selected`}
                    </CardDescription>
                  </div>
                </div>
                {formData.spareParts.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-lg">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-bold text-green-700">
                      ₹{formData.spareParts.reduce((sum, p) => sum + (parseFloat(p.total || '0') || 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Add Spare Part Dropdown */}
              <Select 
                value="" 
                onValueChange={(value) => {
                  if (value && !formData.spareParts.find(p => p.name === value)) {
                    const selectedPart = spareParts.find(sp => sp.id === parseInt(value));
                    if (selectedPart) {
                      const newPart = {
                        name: value,
                        photo: selectedPart.imageUrl || '',
                        price: selectedPart.basePrice?.toString() || '',
                        quantity: '1',
                        total: selectedPart.basePrice?.toString() || ''
                      };
                      handleInputChange('spareParts', [...formData.spareParts, newPart]);
                      setSparePartSearch('');
                    }
                  }
                }}
                disabled={loadingSpareParts}
              >
                <SelectTrigger className="h-10 border-2 border-orange-200 hover:border-orange-400 bg-orange-50/50">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-orange-500" />
                    <SelectValue placeholder={loadingSpareParts ? 'Loading...' : `Add spare part (${spareParts.length} available)`} />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-[350px]">
                  {/* Search */}
                  <div className="sticky top-0 bg-white border-b p-2 z-10">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search spare parts..."
                        value={sparePartSearch}
                        onChange={(e) => setSparePartSearch(e.target.value)}
                        className="pl-9 pr-8 h-9 text-sm"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        onFocus={(e) => e.stopPropagation()}
                      />
                      {sparePartSearch && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSparePartSearch(''); }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="max-h-[250px] overflow-y-auto">
                    {(() => {
                      const availableParts = spareParts
                        .filter(sp => !formData.spareParts.find(p => p.name === sp.id.toString()))
                        .filter(sp => {
                          if (!sparePartSearch) return true;
                          const s = sparePartSearch.toLowerCase();
                          return sp.name?.toLowerCase().includes(s) || sp.partNumber?.toLowerCase().includes(s) || sp.category?.toLowerCase().includes(s);
                        });

                      if (availableParts.length === 0) {
                        return (
                          <div className="p-4 text-center text-sm text-gray-500">
                            {sparePartSearch ? `No results for "${sparePartSearch}"` : 'No spare parts available'}
                          </div>
                        );
                      }

                      return availableParts.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id.toString()} className="py-2">
                          <div className="flex items-center gap-2">
                            {sp.imageUrl ? (
                              <img src={sp.imageUrl} alt="" className="w-8 h-8 rounded object-cover border" />
                            ) : (
                              <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                                <Image className="h-4 w-4 text-orange-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{sp.name}</p>
                              <p className="text-xs text-gray-500">#{sp.partNumber} • ₹{parseFloat(sp.basePrice).toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        </SelectItem>
                      ));
                    })()}
                  </div>
                </SelectContent>
              </Select>

              {/* Selected Parts - Compact Table Layout */}
              {formData.spareParts.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 border-b">
                    <div className="col-span-5">Part</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-center">Price</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-1"></div>
                  </div>
                  
                  {/* Table Rows */}
                  {formData.spareParts.map((part, index) => {
                    const sp = spareParts.find(s => s.id === parseInt(part.name)) || {};
                    return (
                      <div key={index} className="grid grid-cols-12 gap-2 px-3 py-2.5 items-center border-b last:border-b-0 hover:bg-orange-50/30 transition-colors">
                        <div className="col-span-5 flex items-center gap-2">
                          {sp.imageUrl ? (
                            <img src={sp.imageUrl} alt="" className="w-10 h-10 rounded object-cover border flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-orange-100 rounded flex items-center justify-center flex-shrink-0">
                              <Image className="h-4 w-4 text-orange-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{sp.name}</p>
                            <p className="text-xs text-gray-500">#{sp.partNumber}</p>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="1"
                            value={part.quantity || 1}
                            onChange={(e) => {
                              const newParts = [...formData.spareParts];
                              newParts[index].quantity = e.target.value;
                              const qty = parseInt(e.target.value) || 1;
                              const price = parseFloat(newParts[index].price) || 0;
                              newParts[index].total = (price * qty).toString();
                              handleInputChange('spareParts', newParts);
                            }}
                            className="h-8 text-center text-sm px-2"
                          />
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-sm font-medium text-gray-700">
                            ₹{parseFloat(part.price || '0').toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="font-semibold text-green-600 text-sm">
                            ₹{parseFloat(part.total || '0').toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const newParts = formData.spareParts.filter((_, i) => i !== index);
                              handleInputChange('spareParts', newParts);
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Grand Total Row */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                    <div className="col-span-5 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      <span className="font-semibold">Grand Total</span>
                      <span className="text-green-100 text-sm">
                        ({formData.spareParts.length} items, {formData.spareParts.reduce((s, p) => s + (parseInt(p.quantity || '1') || 1), 0)} units)
                      </span>
                    </div>
                    <div className="col-span-4"></div>
                    <div className="col-span-2 text-right">
                      <span className="text-xl font-bold">
                        ₹{formData.spareParts.reduce((sum, p) => sum + (parseFloat(p.total || '0') || 0), 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="col-span-1"></div>
                  </div>
                </div>
              )}
              
              {/* Empty State */}
              {formData.spareParts.length === 0 && !loadingSpareParts && (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <Target className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">No spare parts selected</p>
                  <p className="text-xs text-gray-400 mt-1">Use the dropdown above to add parts</p>
                </div>
              )}
              
              {/* Loading State */}
              {loadingSpareParts && formData.spareParts.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 text-orange-400 animate-spin" />
                  <p className="text-sm text-gray-500">Loading spare parts...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

          {/* Form Actions */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 p-8 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()} 
                disabled={loading}
                className="px-8 py-3 h-12 text-base font-medium border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="px-8 py-3 h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Initial Offer...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Create Initial Offer
                  </>
                )}
              </Button>
            </div>
          </div>
      </form>


      {/* Add Contact Dialog - Premium Design */}
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent className="p-0 gap-0 rounded-2xl border-0 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-xl">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Users className="h-6 w-6 text-white" />
                </div>
                Add New Contact
              </DialogTitle>
              <DialogDescription className="text-purple-100 mt-2 text-base">
                Create a new contact for <span className="font-semibold text-white">{selectedCustomer?.companyName}</span>
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-5 bg-gradient-to-b from-gray-50 to-white">
            <div className="space-y-2">
              <Label htmlFor="contactName" className="font-medium text-sm">Name <span className="text-red-500">*</span></Label>
              <Input
                id="contactName"
                value={newContact.name}
                onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter contact name"
                className="h-12 border-2 rounded-xl focus:border-purple-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="font-medium text-sm">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                placeholder="contact@example.com"
                className="h-12 border-2 rounded-xl focus:border-purple-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone" className="font-medium text-sm">Phone <span className="text-red-500">*</span></Label>
              <Input
                id="contactPhone"
                value={newContact.phone}
                onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="h-12 border-2 rounded-xl focus:border-purple-500 transition-colors"
              />
            </div>
          </div>
          <div className="p-5 bg-gray-50 border-t">
            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddContactOpen(false)
                  setNewContact({ name: '', email: '', phone: '' })
                }}
                disabled={isCreatingContact}
                className="px-6 h-12 rounded-xl border-2 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateContact}
                disabled={isCreatingContact}
                className="px-6 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isCreatingContact ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Contact
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Asset Dialog - Premium Design */}
      <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
        <DialogContent className="p-0 gap-0 rounded-2xl border-0 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-xl">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <HardDrive className="h-6 w-6 text-white" />
                </div>
                Add New Asset
              </DialogTitle>
              <DialogDescription className="text-cyan-100 mt-2 text-base">
                Create a new asset for <span className="font-semibold text-white">{selectedCustomer?.companyName}</span>
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-5 bg-gradient-to-b from-gray-50 to-white">
            <div className="space-y-2">
              <Label htmlFor="assetName" className="font-medium text-sm">Asset Name / Machine ID <span className="text-red-500">*</span></Label>
              <Input
                id="assetName"
                value={newAsset.assetName}
                onChange={(e) => setNewAsset({ ...newAsset, assetName: e.target.value })}
                placeholder="Enter machine ID or name"
                className="h-12 border-2 rounded-xl focus:border-cyan-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machineSerialNumber" className="font-medium text-sm">Serial Number <span className="text-red-500">*</span></Label>
              <Input
                id="machineSerialNumber"
                value={newAsset.machineSerialNumber}
                onChange={(e) => setNewAsset({ ...newAsset, machineSerialNumber: e.target.value })}
                placeholder="Enter serial number"
                className="h-12 border-2 rounded-xl focus:border-cyan-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assetModel" className="font-medium text-sm">Model</Label>
              <Input
                id="assetModel"
                value={newAsset.model}
                onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                placeholder="Enter model (optional)"
                className="h-12 border-2 rounded-xl focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>
          <div className="p-5 bg-gray-50 border-t">
            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddAssetOpen(false)
                  setNewAsset({ assetName: '', machineSerialNumber: '', model: '' })
                }}
                disabled={isCreatingAsset}
                className="px-6 h-12 rounded-xl border-2 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateAsset}
                disabled={isCreatingAsset}
                className="px-6 h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isCreatingAsset ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Asset
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
