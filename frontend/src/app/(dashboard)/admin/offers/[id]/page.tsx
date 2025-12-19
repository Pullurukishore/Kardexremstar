'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ArrowLeft, 
  Pencil as Edit, 
  CheckCircle, 
  Clock, 
  FileText, 
  DollarSign,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package,
  TrendingUp,
  AlertCircle,
  Loader2,
  Wrench,
  IndianRupee,
  Image as ImageIcon
} from 'lucide-react'
import { apiService } from '@/services/api'
import { toast } from 'sonner'

// Main progression stages (excludes LOST as it's a separate outcome)
// Note: PO_RECEIVED leads directly to WON (ORDER_BOOKED stage removed)
const STAGES = [
  { key: 'INITIAL', label: 'Initial', icon: FileText },
  { key: 'PROPOSAL_SENT', label: 'Proposal Sent', icon: FileText },
  { key: 'NEGOTIATION', label: 'Negotiation', icon: TrendingUp },
  { key: 'PO_RECEIVED', label: 'PO Received', icon: Package },
  { key: 'WON', label: 'Won', icon: CheckCircle }
]

// LOST is a separate outcome, not part of linear progression
const LOST_STAGE = { key: 'LOST', label: 'Lost', icon: AlertCircle }

// All stages for selection dropdown
const ALL_STAGES = [...STAGES, LOST_STAGE]

// Stage-specific context and requirements
const STAGE_INFO: Record<string, { description: string; color: string; icon: string; requiresAllFields: boolean }> = {
  'INITIAL': {
    description: 'Initial stage - Basic offer information setup',
    color: 'blue',
    icon: '📝',
    requiresAllFields: false
  },
  'PROPOSAL_SENT': {
    description: 'Proposal has been sent to customer - Ensure all offer details are finalized before sending',
    color: 'indigo',
    icon: '📨',
    requiresAllFields: true
  },
  'NEGOTIATION': {
    description: 'In active negotiations - Document key discussion points, pricing changes, objections, and customer concerns',
    color: 'amber',
    icon: '💬',
    requiresAllFields: true
  },
  'PO_RECEIVED': {
    description: 'Purchase Order received - Capture PO details and complete the order. PO received means WON!',
    color: 'green',
    icon: '📄',
    requiresAllFields: true
  },
  'WON': {
    description: 'Deal successfully closed! Ensure all PO and order details are complete',
    color: 'green',
    icon: '🎉',
    requiresAllFields: true
  },
  'LOST': {
    description: 'Deal lost - Document the reason for loss to improve future proposals',
    color: 'red',
    icon: '❌',
    requiresAllFields: false
  }
}

export default function OfferDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [offer, setOffer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updateData, setUpdateData] = useState({
    offerReferenceDate: '',
    title: '',
    offerValue: '',
    offerMonth: '',
    probabilityPercentage: '',
    poExpectedMonth: '',
    stage: '',
    remarks: '',
    poNumber: '',
    poDate: '',
    poValue: '',
    bookingDateInSap: ''
  })

  useEffect(() => {
    if (params.id) {
      fetchOffer()
    }
  }, [params.id])

  const fetchOffer = async () => {
    try {
      setLoading(true)
      const response = await apiService.getOffer(parseInt(params.id as string))
      setOffer(response.offer)
      // Initialize update data
      setUpdateData({
        offerReferenceDate: response.offer.offerReferenceDate ? new Date(response.offer.offerReferenceDate).toISOString().split('T')[0] : '',
        title: response.offer.title || '',
        offerValue: response.offer.offerValue || '',
        offerMonth: response.offer.offerMonth || '',
        probabilityPercentage: response.offer.probabilityPercentage || '',
        poExpectedMonth: response.offer.poExpectedMonth || '',
        stage: response.offer.stage,
        remarks: '', // Always start with empty remarks field - stage remarks are shown separately
        poNumber: response.offer.poNumber || '',
        poDate: response.offer.poDate ? new Date(response.offer.poDate).toISOString().split('T')[0] : '',
        poValue: response.offer.poValue || '',
        bookingDateInSap: response.offer.bookingDateInSap ? new Date(response.offer.bookingDateInSap).toISOString().split('T')[0] : ''
      })
    } catch (error: any) {
      console.error('Failed to fetch offer:', error)
      toast.error('Failed to load offer details')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateOffer = async () => {
    try {
      // Validation
      if (!updateData.stage) {
        toast.error('Stage is required')
        return
      }

      if (!updateData.title || !updateData.title.trim()) {
        toast.error('Offer title is required')
        return
      }

      if (updateData.probabilityPercentage) {
        const prob = parseInt(updateData.probabilityPercentage)
        if (prob < 1 || prob > 100) {
          toast.error('Win probability must be between 1 and 100')
          return
        }
      }

      if (updateData.offerValue && parseFloat(updateData.offerValue) < 0) {
        toast.error('Offer value cannot be negative')
        return
      }

      // Check if stage requires all fields
      const stageInfo = STAGE_INFO[updateData.stage]
      if (stageInfo && stageInfo.requiresAllFields) {
        const fieldLabels: Record<string, string> = {
          offerReferenceDate: 'Offer Reference Date',
          offerValue: 'Offer Value',
          offerMonth: 'Offer Month',
          probabilityPercentage: 'Win Probability',
          poExpectedMonth: 'PO Expected Month'
        }
        
        const requiredFields = ['offerReferenceDate', 'offerValue', 'offerMonth', 'probabilityPercentage', 'poExpectedMonth']
        
        for (const field of requiredFields) {
          const value = updateData[field as keyof typeof updateData]
          if (!value || (typeof value === 'string' && !value.trim())) {
            toast.error(`${fieldLabels[field]} is required for ${ALL_STAGES.find(s => s.key === updateData.stage)?.label} stage`)
            return
          }
        }
      }

      // PO_RECEIVED stage specific validations (PO_RECEIVED = deal won!)
      if ((updateData.stage === 'PO_RECEIVED' || updateData.stage === 'WON')) {
        if (!updateData.poNumber || !updateData.poNumber.trim()) {
          toast.error('PO Number is required for this stage')
          return
        }
        if (!updateData.poDate) {
          toast.error('PO Date is required for this stage')
          return
        }
        if (!updateData.poValue) {
          toast.error('PO Value is required for this stage')
          return
        }
        if (parseFloat(updateData.poValue) <= 0) {
          toast.error('PO Value must be greater than zero')
          return
        }
      }

      // LOST stage specific validation - require reason for loss
      if (updateData.stage === 'LOST') {
        if (!updateData.remarks || !updateData.remarks.trim()) {
          toast.error('Please provide a reason for losing this deal')
          return
        }
      }

      setUpdating(true)
      const payload: any = {
        offerReferenceDate: updateData.offerReferenceDate ? new Date(updateData.offerReferenceDate).toISOString() : null,
        title: updateData.title.trim(),
        offerValue: updateData.offerValue ? parseFloat(updateData.offerValue) : null,
        offerMonth: updateData.offerMonth || null,
        probabilityPercentage: updateData.probabilityPercentage ? parseInt(updateData.probabilityPercentage) : null,
        poExpectedMonth: updateData.poExpectedMonth || null,
        stage: updateData.stage,
        remarks: updateData.remarks?.trim() || null,
        poNumber: updateData.poNumber?.trim() || null,
        poDate: updateData.poDate ? new Date(updateData.poDate).toISOString() : null,
        poValue: updateData.poValue ? parseFloat(updateData.poValue) : null,
        bookingDateInSap: updateData.bookingDateInSap ? new Date(updateData.bookingDateInSap).toISOString() : null
      }

      await apiService.updateOffer(offer.id, payload)
      toast.success('Offer updated successfully')
      setShowUpdateDialog(false)
      
      // Clear remarks field after successful update since it's now saved in StageRemark
      setUpdateData(prev => ({ ...prev, remarks: '' }))
      
      fetchOffer()
    } catch (error: any) {
      console.error('Failed to update offer:', error)
      toast.error(error.response?.data?.message || 'Failed to update offer')
    } finally {
      setUpdating(false)
    }
  }

  const handleMoveToStage = (stage: string) => {
    setUpdateData(prev => ({ ...prev, stage }))
    setShowUpdateDialog(true)
  }

  const getCurrentStageIndex = () => {
    return STAGES.findIndex(s => s.key === offer?.stage)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading offer details...</p>
        </div>
      </div>
    )
  }

  if (!offer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Offer not found</p>
          <Button onClick={() => router.push('/admin/offers')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const currentStageIndex = getCurrentStageIndex()

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/admin/offers')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{offer.offerReferenceNumber}</h1>
            <p className="text-gray-600 mt-1">{offer.title || offer.customer?.companyName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => router.push(`/admin/offers/${offer.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Offer
          </Button>
        </div>
      </div>

      {/* Stage Progress - Modern Design */}
      <Card className="shadow-xl overflow-hidden border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-b-0 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-white mb-2">Offer Progress Journey</CardTitle>
              <CardDescription className="text-blue-100">
                Track your offer through each milestone - WON or LOST outcomes after Negotiation
              </CardDescription>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
              <p className="text-sm font-semibold text-white">
                Stage {currentStageIndex + 1} of {STAGES.length}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-10 pb-10 bg-gradient-to-br from-gray-50 to-white">
          {/* Check if current stage is LOST */}
          {offer.stage === 'LOST' ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-red-100 to-red-200 border-4 border-red-500 flex items-center justify-center mb-6 shadow-2xl">
                  <AlertCircle className="h-14 w-14 text-red-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl">❌</span>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-red-600 mb-3">Deal Lost</h3>
              <p className="text-gray-600 text-center max-w-md mb-6 text-lg">
                This offer did not convert into a sale
              </p>
              <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 text-base px-6 py-3 shadow-lg">
                Status: Lost
              </Badge>
            </div>
          ) : (
            <div className="relative px-4">
              {/* Progress Line Background */}
              <div className="absolute top-8 left-0 right-0 h-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" style={{ zIndex: 0 }}></div>
              
              {/* Progress Line Active */}
              <div 
                className={`absolute top-8 left-0 h-2 transition-all duration-700 ease-out rounded-full ${
                  offer.stage === 'WON' 
                    ? 'bg-gradient-to-r from-green-400 via-green-500 to-green-600 shadow-lg shadow-green-500/50' 
                    : 'bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 shadow-lg shadow-blue-500/50'
                }`}
                style={{ 
                  width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%`,
                  zIndex: 0 
                }}
              ></div>
              
              {/* Stage Steps */}
              <div className="relative flex justify-between" style={{ zIndex: 1 }}>
                {STAGES.map((stage, index) => {
                  const isPast = index < currentStageIndex
                  const isCurrent = index === currentStageIndex
                  const isWon = stage.key === 'WON' && offer.stage === 'WON'
                  const Icon = stage.icon
                  const stageInfo = STAGE_INFO[stage.key] || {}
                  
                  // Color mapping for each stage
                  const stageColors = {
                    blue: { 
                      bg: 'from-blue-500 to-blue-600', 
                      border: 'border-blue-500', 
                      ring: 'ring-blue-200', 
                      shadow: 'shadow-blue-500/50',
                      text: 'text-blue-700',
                      badge: 'bg-blue-100 text-blue-700 border-blue-300'
                    },
                    indigo: { 
                      bg: 'from-indigo-500 to-indigo-600', 
                      border: 'border-indigo-500', 
                      ring: 'ring-indigo-200', 
                      shadow: 'shadow-indigo-500/50',
                      text: 'text-indigo-700',
                      badge: 'bg-indigo-100 text-indigo-700 border-indigo-300'
                    },
                    amber: { 
                      bg: 'from-amber-500 to-amber-600', 
                      border: 'border-amber-500', 
                      ring: 'ring-amber-200', 
                      shadow: 'shadow-amber-500/50',
                      text: 'text-amber-700',
                      badge: 'bg-amber-100 text-amber-700 border-amber-300'
                    },
                    purple: { 
                      bg: 'from-purple-500 to-purple-600', 
                      border: 'border-purple-500', 
                      ring: 'ring-purple-200', 
                      shadow: 'shadow-purple-500/50',
                      text: 'text-purple-700',
                      badge: 'bg-purple-100 text-purple-700 border-purple-300'
                    },
                    green: { 
                      bg: 'from-green-500 to-green-600', 
                      border: 'border-green-500', 
                      ring: 'ring-green-200', 
                      shadow: 'shadow-green-500/50',
                      text: 'text-green-700',
                      badge: 'bg-green-100 text-green-700 border-green-300'
                    },
                    teal: { 
                      bg: 'from-teal-500 to-teal-600', 
                      border: 'border-teal-500', 
                      ring: 'ring-teal-200', 
                      shadow: 'shadow-teal-500/50',
                      text: 'text-teal-700',
                      badge: 'bg-teal-100 text-teal-700 border-teal-300'
                    },
                    red: { 
                      bg: 'from-red-500 to-red-600', 
                      border: 'border-red-500', 
                      ring: 'ring-red-200', 
                      shadow: 'shadow-red-500/50',
                      text: 'text-red-700',
                      badge: 'bg-red-100 text-red-700 border-red-300'
                    }
                  }
                  
                  const color = stageColors[stageInfo.color as keyof typeof stageColors] || stageColors.blue
                  
                  return (
                    <div key={stage.key} className="flex flex-col items-center group" style={{ flex: 1 }}>
                      {/* Stage Circle */}
                      <div className="relative">
                        <div 
                          className={`
                            relative w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all duration-300 transform
                            ${(isPast || isCurrent) && !isWon ? `${color.border} bg-gradient-to-br ${color.bg} shadow-lg ${color.shadow}` : ''}
                            ${isCurrent && !isWon ? `ring-8 ${color.ring} shadow-2xl scale-110 animate-pulse` : ''}
                            ${isWon ? 'border-green-500 bg-gradient-to-br from-green-500 to-emerald-600 ring-8 ring-green-200 shadow-2xl shadow-green-500/50 scale-110' : ''}
                            ${!isPast && !isCurrent && !isWon ? 'border-gray-300 bg-white shadow-md hover:scale-105' : ''}
                            ${isPast && !isCurrent && !isWon ? 'scale-100' : ''}
                            group-hover:scale-110
                          `}
                        >
                          <Icon 
                            className={`h-7 w-7 transition-all ${(isPast || isCurrent || isWon) ? 'text-white' : 'text-gray-400'}`} 
                          />
                        </div>
                        
                        {/* Checkmark for completed stages */}
                        {isPast && !isCurrent && !isWon && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        )}
                        
                        {/* Success icon for WON */}
                        {isWon && (
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                            <span className="text-lg">🎉</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Stage Label */}
                      <p className={`
                        mt-4 text-sm font-bold text-center max-w-[100px] transition-all
                        ${isCurrent && !isWon ? `${color.text} scale-105` : ''}
                        ${isWon ? 'text-green-700 scale-105' : ''}
                        ${isPast && !isCurrent && !isWon ? color.text : ''}
                        ${!isPast && !isCurrent && !isWon ? 'text-gray-500' : ''}
                      `}>
                        {stage.label}
                      </p>
                      
                      {/* Current Badge */}
                      {isCurrent && !isWon && (
                        <Badge className={`mt-2 bg-gradient-to-r ${color.bg} text-white border-0 shadow-lg px-3 py-1 animate-pulse`}>
                          ⚡ Current
                        </Badge>
                      )}
                      
                      {/* Success Badge */}
                      {isWon && (
                        <Badge className="mt-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg px-3 py-1">
                          ✨ Success!
                        </Badge>
                      )}
                      
                      {/* Completed Badge */}
                      {isPast && !isCurrent && !isWon && (
                        <Badge className={`mt-2 ${color.badge} border px-2 py-0.5 text-xs`}>
                          ✓ Done
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* Alternative outcome indicator */}
              {currentStageIndex >= 3 && offer.stage !== 'WON' && offer.stage !== 'LOST' && (
                <div className="mt-10 pt-6 border-t-2 border-dashed border-gray-300">
                  <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-gray-700 font-medium">
                      Deal can be marked as <span className="font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">LOST</span> at any stage if it doesn't close
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Contact Info */}
          <Card className="shadow-xl overflow-hidden border-0">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white border-b-0">
              <CardTitle className="flex items-center gap-2 text-white">
                <Building2 className="h-6 w-6" />
                Customer & Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 bg-gradient-to-br from-gray-50 to-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-5 shadow-md border border-emerald-100 hover:shadow-lg transition-shadow">
                  <h4 className="font-bold text-emerald-700 mb-4 flex items-center gap-2 text-lg">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    Company Details
                  </h4>
                  <dl className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Company Name</dt>
                        <dd className="text-base font-bold text-gray-900 mt-1">{offer.customer?.companyName || offer.company}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Location</dt>
                        <dd className="text-base font-medium text-gray-700 mt-1 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-emerald-600" />
                          {offer.location || offer.customer?.city}
                        </dd>
                      </div>
                    </div>
                    {offer.department && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Department</dt>
                          <dd className="text-base font-medium text-gray-700 mt-1">{offer.department}</dd>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Zone</dt>
                        <dd className="text-base font-medium text-gray-700 mt-1">
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 border">
                            {offer.zone?.name}
                          </Badge>
                        </dd>
                      </div>
                    </div>
                  </dl>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-md border border-blue-100 hover:shadow-lg transition-shadow">
                  <h4 className="font-bold text-blue-700 mb-4 flex items-center gap-2 text-lg">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    Contact Person
                  </h4>
                  <dl className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Name</dt>
                        <dd className="text-base font-bold text-gray-900 mt-1">{offer.contactPersonName || offer.contact?.contactPersonName}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Phone</dt>
                        <dd className="text-base font-medium text-gray-700 mt-1 flex items-center gap-2">
                          <Phone className="h-4 w-4 text-blue-600" />
                          {offer.contactNumber || offer.contact?.contactNumber}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Email</dt>
                        <dd className="text-base font-medium text-gray-700 mt-1 flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-600" />
                          {offer.email || offer.contact?.email}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card className="shadow-xl overflow-hidden border-0">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-b-0">
              <CardTitle className="flex items-center gap-2 text-white">
                <IndianRupee className="h-6 w-6" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 bg-gradient-to-br from-gray-50 to-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative overflow-hidden p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-5 w-5 text-blue-100" />
                      <p className="text-sm text-blue-100 font-semibold">Offer Value</p>
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {offer.offerValue ? formatCurrency(Number(offer.offerValue)) : 'TBD'}
                    </p>
                  </div>
                </div>
                <div className="relative overflow-hidden p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-5 w-5 text-green-100" />
                      <p className="text-sm text-green-100 font-semibold">PO Value</p>
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {offer.poValue ? formatCurrency(Number(offer.poValue)) : '-'}
                    </p>
                  </div>
                </div>
                <div className="relative overflow-hidden p-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-purple-100" />
                      <p className="text-sm text-purple-100 font-semibold">Win Probability</p>
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {offer.probabilityPercentage ? `${offer.probabilityPercentage}%` : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                  <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Offer Month</dt>
                  <dd className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    {offer.offerMonth || '-'}
                  </dd>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                  <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">PO Expected Month</dt>
                  <dd className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    {offer.poExpectedMonth || '-'}
                  </dd>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                  <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">PO Number</dt>
                  <dd className="text-base font-bold text-gray-900">{offer.poNumber || '-'}</dd>
                </div>
              </div>

              {offer.poDate && (
                <div className="mt-4 bg-white rounded-lg p-4 shadow-md border border-gray-200">
                  <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">PO Date</dt>
                  <dd className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    {new Date(offer.poDate).toLocaleDateString('en-IN')}
                  </dd>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product & Assets */}
          <Card className="shadow-xl overflow-hidden border-0">
            <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white border-b-0">
              <CardTitle className="flex items-center gap-2 text-white">
                <Package className="h-6 w-6" />
                Product & Asset Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 bg-gradient-to-br from-gray-50 to-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-md border border-orange-100 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Product Type</dt>
                  </div>
                  <dd>
                    <Badge className={`
                      text-sm px-3 py-1.5 font-bold
                      ${offer.productType === 'SPP' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg' : ''}
                      ${offer.productType === 'CONTRACT' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg' : ''}
                      ${offer.productType === 'RELOCATION' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg' : ''}
                      ${offer.productType === 'UPGRADE_KIT' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg' : ''}
                      ${offer.productType === 'SOFTWARE' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-0 shadow-lg' : ''}
                      ${offer.productType === 'MIDLIFE_UPGRADE' ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white border-0 shadow-lg' : ''}
                      ${offer.productType === 'RETROFIT_KIT' ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white border-0 shadow-lg' : ''}
                      ${offer.productType === 'BD_CHARGES' ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white border-0 shadow-lg' : ''}
                      ${offer.productType === 'BD_SPARE' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg' : ''}
                    `}>
                      {offer.productType?.replace(/_/g, ' ')}
                    </Badge>
                  </dd>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-md border border-blue-100 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Wrench className="h-5 w-5 text-blue-600" />
                    </div>
                    <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Machine Serial Number</dt>
                  </div>
                  <dd className="text-base font-bold text-gray-900">
                    {offer.machineSerialNumber || 
                      (offer.offerAssets && offer.offerAssets.length > 0 
                        ? offer.offerAssets.map((oa: any) => oa.asset?.serialNo || oa.asset?.machineId).filter(Boolean).join(', ')
                        : '-'
                      )
                    }
                  </dd>
                </div>
                {offer.title && (
                  <div className="md:col-span-2 bg-white rounded-xl p-5 shadow-md border border-purple-100 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                      <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Offer Title</dt>
                    </div>
                    <dd className="text-base font-bold text-gray-900">{offer.title}</dd>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Spare Parts - Show for SPP or if parts exist */}
          {(offer.productType === 'SPP' || (offer.offerSpareParts && offer.offerSpareParts.length > 0)) && (
            <Card className={`shadow-lg ${offer.productType === 'SPP' ? 'ring-2 ring-amber-200' : ''}`}>
              <CardHeader className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-amber-600" />
                      Spare Parts
                      {offer.offerSpareParts && offer.offerSpareParts.length > 0 && (
                        <Badge className="bg-amber-600 text-white">
                          {offer.offerSpareParts.length} {offer.offerSpareParts.length === 1 ? 'Item' : 'Items'}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {offer.productType === 'SPP' 
                        ? 'Spare parts configured for this SPP offer' 
                        : 'Items included in this offer'}
                    </CardDescription>
                  </div>
                  {offer.productType === 'SPP' && (
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                      SPP Product
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {(!offer.offerSpareParts || offer.offerSpareParts.length === 0) && offer.productType === 'SPP' ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
                      <Wrench className="h-8 w-8 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Spare Parts Added Yet</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      This is an SPP (Spare Parts) offer. Add spare parts to complete the offer details.
                    </p>
                    <Button 
                      onClick={() => router.push(`/admin/offers/${offer.id}/edit`)}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Add Spare Parts
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {offer.offerSpareParts?.map((offerPart: any, index: number) => {
                        const part = offerPart.sparePart;
                        return (
                          <div 
                            key={offerPart.id || index} 
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                          >
                        {/* Image */}
                        <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                          {part?.imageUrl ? (
                            <img 
                              src={part.imageUrl} 
                              alt={part.name || 'Spare Part'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={part?.imageUrl ? 'hidden' : 'flex flex-col items-center justify-center text-gray-400'}>
                            <ImageIcon className="h-12 w-12 mb-2" />
                            <span className="text-xs">No Image</span>
                          </div>
                        </div>

                        {/* Part Details */}
                        <div className="space-y-2">
                          {/* Part Name */}
                          <h4 className="font-semibold text-gray-900 text-base line-clamp-2">
                            {part?.name || 'Unnamed Part'}
                          </h4>

                          {/* Part Number */}
                          {part?.partNumber && (
                            <p className="text-xs text-gray-500">
                              Part #: {part.partNumber}
                            </p>
                          )}

                          {/* Category */}
                          {part?.category && (
                            <Badge variant="outline" className="text-xs">
                              {part.category}
                            </Badge>
                          )}

                          {/* Quantity */}
                          {offerPart.quantity && (
                            <p className="text-sm text-gray-600">
                              Qty: <span className="font-medium">{offerPart.quantity}</span>
                            </p>
                          )}

                          {/* Price */}
                          <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Unit Price</span>
                              <div className="flex items-center gap-1">
                                <IndianRupee className="h-4 w-4 text-green-600" />
                                <span className="text-lg font-bold text-green-600">
                                  {offerPart.unitPrice ? 
                                    formatCurrency(Number(offerPart.unitPrice)) : 
                                    <span className="text-sm text-gray-400">TBD</span>
                                  }
                                </span>
                              </div>
                            </div>
                            
                            {/* Total Price */}
                            {offerPart.totalPrice && (
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-gray-500">Total</span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(Number(offerPart.totalPrice))}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Notes if available */}
                          {offerPart.notes && (
                            <p className="text-xs text-gray-600 line-clamp-2 pt-2">
                              {offerPart.notes}
                            </p>
                          )}

                          {/* Description if available */}
                          {part?.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 pt-1">
                              {part.description}
                            </p>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>

                    {/* Total Summary */}
                    {offer.offerSpareParts && offer.offerSpareParts.some((op: any) => op.totalPrice) && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Total Parts Value</span>
                          <span className="text-xl font-bold text-green-700">
                            {formatCurrency(
                              offer.offerSpareParts.reduce((sum: number, offerPart: any) => {
                                return sum + Number(offerPart.totalPrice || 0);
                              }, 0)
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stage-wise Remarks History - Timeline Design */}
          {offer.stageRemarks && offer.stageRemarks.filter((r: any) => {
            // Filter out JSON quoteData entries - only show human-readable remarks
            try {
              const parsed = JSON.parse(r.remarks);
              if (parsed.quoteData) return false; // Skip quoteData JSON
            } catch (e) {
              // Not JSON, include it
            }
            return true;
          }).length > 0 && (
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-b border-indigo-100">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  Stage Activity Timeline
                </CardTitle>
                <CardDescription>
                  Complete history of remarks and notes across all stages
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 pb-8">
                <div className="relative">
                  {/* Timeline vertical line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200"></div>
                  
                  <div className="space-y-6">
                    {offer.stageRemarks.filter((r: any) => {
                      // Filter out JSON quoteData entries
                      try {
                        const parsed = JSON.parse(r.remarks);
                        if (parsed.quoteData) return false;
                      } catch (e) {
                        // Not JSON, include it
                      }
                      return true;
                    }).map((remark: any, index: number) => {
                      const stageInfo = STAGE_INFO[remark.stage] || {};
                      const stageName = ALL_STAGES.find(s => s.key === remark.stage)?.label || remark.stage;
                      
                      // Color mapping for stages
                      const colorClasses = {
                        blue: 'bg-blue-500 ring-blue-200',
                        indigo: 'bg-indigo-500 ring-indigo-200',
                        amber: 'bg-amber-500 ring-amber-200',
                        purple: 'bg-purple-500 ring-purple-200',
                        green: 'bg-green-500 ring-green-200',
                        teal: 'bg-teal-500 ring-teal-200',
                        red: 'bg-red-500 ring-red-200'
                      };
                      
                      const bgClasses = {
                        blue: 'from-blue-50 to-blue-100/50',
                        indigo: 'from-indigo-50 to-indigo-100/50',
                        amber: 'from-amber-50 to-amber-100/50',
                        purple: 'from-purple-50 to-purple-100/50',
                        green: 'from-green-50 to-green-100/50',
                        teal: 'from-teal-50 to-teal-100/50',
                        red: 'from-red-50 to-red-100/50'
                      };
                      
                      const textClasses = {
                        blue: 'text-blue-700',
                        indigo: 'text-indigo-700',
                        amber: 'text-amber-700',
                        purple: 'text-purple-700',
                        green: 'text-green-700',
                        teal: 'text-teal-700',
                        red: 'text-red-700'
                      };
                      
                      const color = stageInfo.color || 'blue';
                      
                      return (
                        <div key={remark.id} className="relative pl-16">
                          {/* Timeline dot */}
                          <div className={`absolute left-3.5 top-3 w-5 h-5 rounded-full ${colorClasses[color as keyof typeof colorClasses] || 'bg-gray-500 ring-gray-200'} ring-4 shadow-md`}></div>
                          
                          {/* Content card */}
                          <div className={`bg-gradient-to-br ${bgClasses[color as keyof typeof bgClasses] || 'from-gray-50 to-gray-100/50'} rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow`}>
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{stageInfo.icon || '📝'}</span>
                                <div>
                                  <h4 className={`font-bold text-base ${textClasses[color as keyof typeof textClasses] || 'text-gray-700'}`}>
                                    {stageName}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Calendar className="h-3 w-3 text-gray-500" />
                                    <p className="text-xs text-gray-600 font-medium">
                                      {new Date(remark.createdAt).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {remark.createdBy?.name && (
                                <div className="flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-full border border-gray-200">
                                  <User className="h-3 w-3 text-gray-500" />
                                  <span className="text-xs font-medium text-gray-700">
                                    {remark.createdBy.name}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Remarks content */}
                            <div className="bg-white rounded-md p-4 shadow-sm border border-gray-200">
                              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {remark.remarks}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Legacy Remarks - Show if no stage remarks but has old remarks field */}
          {(!offer.stageRemarks || offer.stageRemarks.length === 0) && offer.remarks && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Remarks & Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-sm">
                  {offer.remarks}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Summary & Actions */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="shadow-xl overflow-hidden border-0">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-b-0">
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3 bg-gradient-to-br from-gray-50 to-white">
              <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Priority</p>
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                </div>
                <Badge className={`
                  text-sm px-3 py-1.5 font-bold
                  ${offer.priority === 'CRITICAL' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-lg' : ''}
                  ${offer.priority === 'HIGH' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg' : ''}
                  ${offer.priority === 'MEDIUM' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0 shadow-lg' : ''}
                  ${offer.priority === 'LOW' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg' : ''}
                `}>
                  {offer.priority}
                </Badge>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Lead Status</p>
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <Badge className={`text-sm px-3 py-1.5 font-bold ${
                  offer.lead === 'YES' 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg' 
                    : 'bg-gray-200 text-gray-700 border border-gray-300'
                }`}>
                  {offer.lead === 'YES' ? '✓ Yes' : 'No'}
                </Badge>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Open Funnel</p>
                  <Package className="h-4 w-4 text-gray-400" />
                </div>
                <Badge className={`text-sm px-3 py-1.5 font-bold ${
                  offer.openFunnel 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-lg' 
                    : 'bg-gray-200 text-gray-700 border border-gray-300'
                }`}>
                  {offer.openFunnel ? '✓ Active' : 'Closed'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="shadow-xl overflow-hidden border-0">
            <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-b-0">
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3 bg-gradient-to-br from-gray-50 to-white">
              <div className="bg-white rounded-lg p-4 shadow-md border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-blue-100 rounded-full">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Created</p>
                </div>
                <p className="text-base font-bold text-gray-900">
                  {new Date(offer.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
                {offer.createdBy?.name && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <User className="h-3 w-3 text-gray-400" />
                    <p className="text-xs text-gray-600 font-medium">{offer.createdBy.name}</p>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-lg p-4 shadow-md border-l-4 border-green-500 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-green-100 rounded-full">
                    <Clock className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Last Updated</p>
                </div>
                <p className="text-base font-bold text-gray-900">
                  {new Date(offer.updatedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
              {offer.offerReferenceDate && (
                <div className="bg-white rounded-lg p-4 shadow-md border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-purple-100 rounded-full">
                      <FileText className="h-3.5 w-3.5 text-purple-600" />
                    </div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Offer Reference</p>
                  </div>
                  <p className="text-base font-bold text-gray-900">
                    {new Date(offer.offerReferenceDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
              )}
              {offer.registrationDate && (
                <div className="bg-white rounded-lg p-4 shadow-md border-l-4 border-orange-500 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-orange-100 rounded-full">
                      <Building2 className="h-3.5 w-3.5 text-orange-600" />
                    </div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Registration</p>
                  </div>
                  <p className="text-base font-bold text-gray-900">
                    {new Date(offer.registrationDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="shadow-xl overflow-hidden border-0">
            <CardHeader className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-b-0">
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6 bg-gradient-to-br from-gray-50 to-white">
              <Button 
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 font-semibold py-6" 
                onClick={() => {
                  const nextStageIndex = currentStageIndex + 1
                  if (nextStageIndex < STAGES.length) {
                    handleMoveToStage(STAGES[nextStageIndex].key)
                  }
                }}
                disabled={currentStageIndex >= STAGES.length - 1}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Move to Next Stage
              </Button>
              <Button 
                className="w-full bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 hover:border-blue-500 shadow-md hover:shadow-lg transition-all font-semibold py-5" 
                onClick={() => setShowUpdateDialog(true)}
              >
                <Edit className="h-4 w-4 mr-2 text-blue-600" />
                Update Stage Details
              </Button>
              <Button 
                className="w-full bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 hover:border-purple-500 shadow-md hover:shadow-lg transition-all font-semibold py-5"
                onClick={() => router.push(`/admin/offers/${params.id}/quote`)}
              >
                <FileText className="h-4 w-4 mr-2 text-purple-600" />
                Generate Quote
              </Button>
              <Button 
                className="w-full bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 hover:border-indigo-500 shadow-md hover:shadow-lg transition-all font-semibold py-5"
                onClick={() => router.push(`/admin/offers/${params.id}/activity`)}
              >
                <Clock className="h-4 w-4 mr-2 text-indigo-600" />
                View Activity History
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Update Dialog - Premium Design */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-0 shadow-2xl">
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 rounded-t-2xl">
            <DialogHeader>
              <DialogTitle className="text-white text-xl font-bold flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Edit className="h-5 w-5 text-white" />
                </div>
                Update Offer Details
              </DialogTitle>
              <DialogDescription className="text-blue-100 mt-1">
                Update offer information for <span className="font-semibold text-white">{offer?.offerReferenceNumber}</span>
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-6 bg-gradient-to-b from-gray-50 to-white">
            {/* Stage-specific context banner */}
            {updateData.stage && STAGE_INFO[updateData.stage] && (
              <div className={`
                p-4 rounded-xl border-l-4 shadow-sm
                ${STAGE_INFO[updateData.stage].color === 'blue' ? 'bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-500' : ''}
                ${STAGE_INFO[updateData.stage].color === 'indigo' ? 'bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-indigo-500' : ''}
                ${STAGE_INFO[updateData.stage].color === 'amber' ? 'bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-500' : ''}
                ${STAGE_INFO[updateData.stage].color === 'purple' ? 'bg-gradient-to-r from-purple-50 to-purple-100/50 border-purple-500' : ''}
                ${STAGE_INFO[updateData.stage].color === 'green' ? 'bg-gradient-to-r from-green-50 to-green-100/50 border-green-500' : ''}
                ${STAGE_INFO[updateData.stage].color === 'teal' ? 'bg-gradient-to-r from-teal-50 to-teal-100/50 border-teal-500' : ''}
                ${STAGE_INFO[updateData.stage].color === 'red' ? 'bg-gradient-to-r from-red-50 to-red-100/50 border-red-500' : ''}
              `}>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <span className="text-3xl">{STAGE_INFO[updateData.stage].icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-lg">
                      {STAGES.find(s => s.key === updateData.stage)?.label || updateData.stage} Stage
                    </h4>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                      {STAGE_INFO[updateData.stage].description}
                    </p>
                    {STAGE_INFO[updateData.stage].requiresAllFields && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-red-600 font-medium bg-red-50 px-3 py-1.5 rounded-lg w-fit">
                        <AlertCircle className="h-3.5 w-3.5" />
                        All fields marked with * are required
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Stage Selection Card */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                </div>
                <Label className="text-gray-900 font-semibold">Stage <span className="text-red-500">*</span></Label>
              </div>
              <Select 
                value={updateData.stage} 
                onValueChange={(value) => setUpdateData(prev => ({ ...prev, stage: value }))}
              >
                <SelectTrigger className="h-12 text-base font-medium border-2 border-gray-200 hover:border-indigo-300 focus:border-indigo-500 transition-colors rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.map(stage => (
                    <SelectItem key={stage.key} value={stage.key} className="py-3">
                      <div className="flex items-center gap-2">
                        <span>{STAGE_INFO[stage.key]?.icon || '📄'}</span>
                        <span className="font-medium">{stage.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Offer Title Card */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <Label className="text-gray-900 font-semibold">Offer Title <span className="text-red-500">*</span></Label>
              </div>
              <Input 
                value={updateData.title}
                onChange={(e) => setUpdateData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter offer title"
                className="h-12 text-base border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-colors rounded-xl"
              />
            </div>

            {/* Offer Reference Date */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
                <Label className={`text-gray-900 font-semibold ${updateData.stage && STAGE_INFO[updateData.stage]?.requiresAllFields ? '' : ''}`}>
                  Offer Reference Date {updateData.stage && STAGE_INFO[updateData.stage]?.requiresAllFields && <span className="text-red-500">*</span>}
                </Label>
              </div>
              <Input 
                type="date"
                value={updateData.offerReferenceDate}
                onChange={(e) => setUpdateData(prev => ({ ...prev, offerReferenceDate: e.target.value }))}
                className={`h-12 text-base border-2 transition-colors rounded-xl ${
                  updateData.stage && STAGE_INFO[updateData.stage]?.requiresAllFields && !updateData.offerReferenceDate 
                    ? 'border-red-300 hover:border-red-400' 
                    : 'border-gray-200 hover:border-purple-300 focus:border-purple-500'
                }`}
              />
            </div>

            {/* Financial Details Grid */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <IndianRupee className="h-4 w-4 text-green-600" />
                </div>
                <Label className="text-gray-900 font-semibold">Financial Details</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Offer Value */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">
                    Offer Value (₹) {updateData.stage && STAGE_INFO[updateData.stage]?.requiresAllFields && <span className="text-red-500">*</span>}
                  </Label>
                  <Input 
                    type="number"
                    value={updateData.offerValue}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, offerValue: e.target.value }))}
                    placeholder="Enter amount"
                    className={`h-11 border-2 transition-colors rounded-lg ${
                      updateData.stage && STAGE_INFO[updateData.stage]?.requiresAllFields && !updateData.offerValue 
                        ? 'border-red-300' 
                        : 'border-gray-200 hover:border-green-300 focus:border-green-500'
                    }`}
                  />
                </div>

                {/* Win Probability */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">
                    Win Probability (%) {updateData.stage && STAGE_INFO[updateData.stage]?.requiresAllFields && <span className="text-red-500">*</span>}
                  </Label>
                  <Input 
                    type="number"
                    min="1"
                    max="100"
                    value={updateData.probabilityPercentage}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, probabilityPercentage: e.target.value }))}
                    placeholder="1-100"
                    className={`h-11 border-2 transition-colors rounded-lg ${
                      updateData.stage && STAGE_INFO[updateData.stage]?.requiresAllFields && !updateData.probabilityPercentage 
                        ? 'border-red-300' 
                        : 'border-gray-200 hover:border-green-300 focus:border-green-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Timeline Details Grid */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <Label className="text-gray-900 font-semibold">Timeline</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Offer Month */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">
                    Offer Month {updateData.stage && STAGE_INFO[updateData.stage]?.requiresAllFields && <span className="text-red-500">*</span>}
                  </Label>
                  <Input 
                    type="month"
                    value={updateData.offerMonth}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, offerMonth: e.target.value }))}
                    className={`h-11 border-2 transition-colors rounded-lg ${
                      updateData.stage && STAGE_INFO[updateData.stage]?.requiresAllFields && !updateData.offerMonth 
                        ? 'border-red-300' 
                        : 'border-gray-200 hover:border-amber-300 focus:border-amber-500'
                    }`}
                  />
                </div>

                {/* PO Expected Month */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">
                    PO Expected Month {updateData.stage && STAGE_INFO[updateData.stage]?.requiresAllFields && <span className="text-red-500">*</span>}
                  </Label>
                  <Input 
                    type="month"
                    value={updateData.poExpectedMonth}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, poExpectedMonth: e.target.value }))}
                    className={`h-11 border-2 transition-colors rounded-lg ${
                      updateData.stage && STAGE_INFO[updateData.stage]?.requiresAllFields && !updateData.poExpectedMonth 
                        ? 'border-red-300' 
                        : 'border-gray-200 hover:border-amber-300 focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>
            </div>
            
            {/* PO Details Section - For PO_RECEIVED and WON stages */}
            {(updateData.stage === 'PO_RECEIVED' || updateData.stage === 'WON') && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-green-500 rounded-lg shadow-sm">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-900 text-lg">Purchase Order Details</h3>
                    <p className="text-xs text-green-700">Complete PO information to close this deal</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* PO Number */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-green-800">PO Number <span className="text-red-500">*</span></Label>
                    <Input 
                      value={updateData.poNumber}
                      onChange={(e) => setUpdateData(prev => ({ ...prev, poNumber: e.target.value }))}
                      placeholder="Enter PO number"
                      className={`h-11 bg-white border-2 transition-colors rounded-lg ${
                        !updateData.poNumber ? 'border-red-300' : 'border-green-200 hover:border-green-400 focus:border-green-500'
                      }`}
                    />
                  </div>

                  {/* PO Date */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-green-800">PO Date <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date"
                      value={updateData.poDate}
                      onChange={(e) => setUpdateData(prev => ({ ...prev, poDate: e.target.value }))}
                      className={`h-11 bg-white border-2 transition-colors rounded-lg ${
                        !updateData.poDate ? 'border-red-300' : 'border-green-200 hover:border-green-400 focus:border-green-500'
                      }`}
                    />
                  </div>
                </div>

                {/* PO Value */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-green-800">PO Value (₹) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    value={updateData.poValue}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, poValue: e.target.value }))}
                    placeholder="Enter PO value"
                    className={`h-11 bg-white border-2 transition-colors rounded-lg ${
                      !updateData.poValue ? 'border-red-300' : 'border-green-200 hover:border-green-400 focus:border-green-500'
                    }`}
                  />
                  <p className="text-xs text-green-700 flex items-center gap-1.5 mt-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Actual purchase order value received from customer
                  </p>
                </div>
              </div>
            )}

            {/* Loss Reason Section - For LOST stage */}
            {updateData.stage === 'LOST' && (
              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-5 border-2 border-red-200 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2.5 bg-red-500 rounded-lg shadow-sm">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-900 text-lg">Reason for Loss <span className="text-red-500">*</span></h3>
                    <p className="text-xs text-red-600 mt-1">
                      Document why this deal was lost to improve future proposals
                    </p>
                  </div>
                </div>
                <Textarea
                  value={updateData.remarks}
                  onChange={(e) => setUpdateData(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Document why the deal was lost: competitor won, pricing issues, customer delayed, requirements changed, budget constraints, etc."
                  rows={5}
                  className="resize-none bg-white border-2 border-red-200 hover:border-red-300 focus:border-red-400 rounded-xl"
                />
                <div className="flex items-start gap-2 mt-3 p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700 font-medium leading-relaxed">
                    Documenting loss reasons helps improve future proposals and understand customer objections
                  </p>
                </div>
              </div>
            )}
            
            {/* Remarks/Notes Section - For Negotiation */}
            {(updateData.stage === 'NEGOTIATION' || updateData.stage === 'FINAL_APPROVAL' || updateData.stage === 'PROPOSAL_SENT') && (
              <div className="space-y-4">
                {/* Show previous stage remarks if any */}
                {offer.stageRemarks && offer.stageRemarks.filter((r: any) => {
                  if (r.stage !== updateData.stage) return false;
                  try {
                    const parsed = JSON.parse(r.remarks);
                    if (parsed.quoteData) return false;
                  } catch (e) {}
                  return true;
                }).length > 0 && (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 border-2 border-indigo-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-indigo-500 rounded-lg">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-sm font-bold text-indigo-900">Previous Activity for {ALL_STAGES.find(s => s.key === updateData.stage)?.label}</p>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {offer.stageRemarks
                        .filter((r: any) => {
                          if (r.stage !== updateData.stage) return false;
                          try {
                            const parsed = JSON.parse(r.remarks);
                            if (parsed.quoteData) return false;
                          } catch (e) {}
                          return true;
                        })
                        .slice(0, 3)
                        .map((r: any) => (
                          <div key={r.id} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-indigo-500" />
                                <p className="text-xs text-indigo-700 font-semibold">
                                  {new Date(r.createdAt).toLocaleDateString('en-IN', { 
                                    day: 'numeric', 
                                    month: 'short',
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                              </div>
                              {r.createdBy?.name && (
                                <div className="flex items-center gap-1 bg-indigo-100 px-2 py-0.5 rounded-full">
                                  <User className="h-3 w-3 text-indigo-600" />
                                  <span className="text-xs font-medium text-indigo-700">{r.createdBy.name}</span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{r.remarks}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
                      {updateData.stage === 'NEGOTIATION' && <span className="text-lg">💬</span>}
                      {updateData.stage === 'FINAL_APPROVAL' && <span className="text-lg">✅</span>}
                      {updateData.stage === 'PROPOSAL_SENT' && <span className="text-lg">📋</span>}
                    </div>
                    <Label className="text-blue-900 font-bold text-base">
                      {updateData.stage === 'NEGOTIATION' && 'Add Negotiation Notes'}
                      {updateData.stage === 'FINAL_APPROVAL' && 'Add Approval Notes'}
                      {updateData.stage === 'PROPOSAL_SENT' && 'Add Proposal Notes'}
                    </Label>
                  </div>
                  <Textarea
                    value={updateData.remarks}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder={
                      updateData.stage === 'NEGOTIATION' 
                        ? 'Document discussion points, pricing negotiations, customer objections, competitor info, etc.'
                        : updateData.stage === 'FINAL_APPROVAL'
                        ? 'Document decision makers, approval timeline, final terms, conditions, commitments, etc.'
                        : 'Add any notes about this stage...'
                    }
                    rows={4}
                    className="resize-none bg-white border-2 border-blue-200 hover:border-blue-300 focus:border-blue-400 rounded-xl shadow-sm"
                  />
                  <div className="flex items-start gap-2 mt-3 p-2.5 bg-blue-100 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Each update creates a new timeline entry. All notes are preserved in the activity history.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
            <DialogFooter className="gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowUpdateDialog(false)} 
                disabled={updating}
                className="px-6 h-11 text-base font-medium border-2 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateOffer} 
                disabled={updating}
                className="px-8 h-11 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all rounded-xl"
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Offer
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
