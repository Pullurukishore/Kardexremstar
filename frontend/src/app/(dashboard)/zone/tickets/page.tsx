'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types/user.types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Search, 
  MoreHorizontal, 
  Plus,
  RefreshCw,
  Loader2,
  Eye,
  Building2,
  TrendingUp,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  AlertCircle,
  Clock,
  CheckCircle,
  Users,
  Wrench,
  Calendar,
  XCircle,
  Flag,
  Ticket,
} from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api/axios'
import { toast } from 'sonner'
import { format } from 'date-fns'

// Ticket statuses
const statuses = [
  'All Status',
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'ONSITE_VISIT_PLANNED',
  'ONSITE_VISIT',
  'CLOSED_PENDING',
  'CLOSED',
  'SPARE_PARTS_NEEDED',
  'SPARE_PARTS_BOOKED',
  'SPARE_PARTS_DELIVERED',
  'PO_NEEDED',
  'PO_RECEIVED'
]

const priorities = ['All Priority', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function ZoneTicketsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  
  // Protect this page - only ZONE_USER or ZONE_MANAGER can access
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login?callbackUrl=' + encodeURIComponent('/zone/tickets'))
        return
      }
      if (user?.role !== UserRole.ZONE_USER && user?.role !== UserRole.ZONE_MANAGER) {
        router.push('/zone/dashboard')
        return
      }
    }
  }, [authLoading, isAuthenticated, user?.role, router])

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 opacity-20 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            <p className="text-gray-600 font-medium mt-4">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated or not ZONE_USER/ZONE_MANAGER
  if (!isAuthenticated || (user?.role !== UserRole.ZONE_USER && user?.role !== UserRole.ZONE_MANAGER)) {
    return null
  }
  
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, totalPages: 0 })

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [selectedPriority, setSelectedPriority] = useState('All Priority')
  const [sortField, setSortField] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Debounce search to prevent excessive API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchTickets()
    }, searchTerm ? 500 : 0)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedStatus, selectedPriority, pagination.page])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      }
      
      if (searchTerm) params.search = searchTerm
      if (selectedStatus !== 'All Status') params.status = selectedStatus
      if (selectedPriority !== 'All Priority') params.priority = selectedPriority
      // Backend now automatically filters by assignedToId for zone users

      const response = await api.get('/tickets', { params })
      setTickets(response.data?.data || [])
      setPagination(response.data?.pagination || { page: 1, limit: 100, total: 0, totalPages: 0 })
    } catch (error: any) {
      console.error('Failed to fetch tickets:', error)
      toast.error(error.response?.data?.error || 'Failed to fetch tickets')
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedStatus('All Status')
    setSelectedPriority('All Priority')
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const hasActiveFilters = searchTerm || selectedStatus !== 'All Status' || selectedPriority !== 'All Priority'

  // Sort tickets
  const sortedTickets = useMemo(() => {
    if (!sortField) return tickets
    
    return [...tickets].sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]
      
      // Handle nested properties
      if (sortField === 'customer') {
        aValue = a.customer?.companyName || ''
        bValue = b.customer?.companyName || ''
      } else if (sortField === 'zone') {
        aValue = a.zone?.name || ''
        bValue = b.zone?.name || ''
      } else if (sortField === 'assignedTo') {
        aValue = a.assignedTo?.name || ''
        bValue = b.assignedTo?.name || ''
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [tickets, sortField, sortDirection])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Calculate statistics
  const stats = {
    total: pagination.total,
    open: tickets.filter(t => t.status === 'OPEN').length,
    inProgress: tickets.filter(t => ['ASSIGNED', 'IN_PROGRESS', 'ONSITE_VISIT_PLANNED', 'ONSITE_VISIT'].includes(t.status)).length,
    closed: tickets.filter(t => ['CLOSED', 'CLOSED_PENDING'].includes(t.status)).length,
    critical: tickets.filter(t => t.priority === 'CRITICAL').length,
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      // Open/New
      case 'OPEN':
        return 'bg-blue-500 text-white'
      // Assignment
      case 'ASSIGNED':
        return 'bg-teal-500 text-white'
      // In Progress
      case 'IN_PROGRESS':
        return 'bg-indigo-500 text-white'
      // Onsite Visit stages
      case 'ONSITE_VISIT_PLANNED':
        return 'bg-cyan-500 text-white'
      case 'ONSITE_VISIT':
        return 'bg-emerald-500 text-white'
      case 'ONSITE_VISIT_STARTED':
        return 'bg-sky-500 text-white'
      case 'ONSITE_VISIT_REACHED':
        return 'bg-violet-500 text-white'
      case 'ONSITE_VISIT_IN_PROGRESS':
        return 'bg-amber-500 text-white'
      case 'ONSITE_VISIT_RESOLVED':
        return 'bg-lime-500 text-white'
      case 'ONSITE_VISIT_PENDING':
        return 'bg-orange-400 text-white'
      case 'ONSITE_VISIT_COMPLETED':
        return 'bg-green-600 text-white'
      // Spare Parts stages
      case 'SPARE_PARTS_NEEDED':
        return 'bg-rose-500 text-white'
      case 'SPARE_PARTS_BOOKED':
        return 'bg-fuchsia-500 text-white'
      case 'SPARE_PARTS_DELIVERED':
        return 'bg-emerald-600 text-white'
      // PO stages
      case 'PO_NEEDED':
        return 'bg-orange-600 text-white'
      case 'PO_REACHED':
        return 'bg-purple-500 text-white'
      case 'PO_RECEIVED':
        return 'bg-teal-600 text-white'
      // Closure stages
      case 'CLOSED_PENDING':
        return 'bg-yellow-500 text-white'
      case 'CLOSED':
        return 'bg-slate-500 text-white'
      case 'CANCELLED':
        return 'bg-red-500 text-white'
      case 'RESOLVED':
        return 'bg-green-500 text-white'
      // Other
      case 'REOPENED':
        return 'bg-purple-600 text-white'
      case 'ON_HOLD':
        return 'bg-gray-500 text-white'
      case 'ESCALATED':
        return 'bg-red-600 text-white'
      case 'WAITING_CUSTOMER':
        return 'bg-amber-400 text-white'
      case 'PENDING':
        return 'bg-yellow-400 text-white'
      default:
        return 'bg-slate-400 text-white'
    }
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'HIGH':
        return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'LOW':
        return 'bg-green-100 text-green-700 border-green-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20">
      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Premium Header with Glassmorphism */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl shadow-2xl shadow-emerald-500/20 p-6 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          <div className="relative z-10 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl ring-2 ring-white/30">
                <Ticket className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">My Assigned Tickets</h1>
                <p className="text-emerald-100 mt-1">Tickets assigned to you in your service zone</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="grid grid-cols-5 gap-3">
                <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-2 border border-white/20 text-center">
                  <p className="text-emerald-100 text-xs font-medium">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-2 border border-white/20 text-center">
                  <p className="text-emerald-100 text-xs font-medium">Open</p>
                  <p className="text-2xl font-bold">{stats.open}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-2 border border-white/20 text-center">
                  <p className="text-emerald-100 text-xs font-medium">In Progress</p>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-2 border border-white/20 text-center">
                  <p className="text-emerald-100 text-xs font-medium">Closed</p>
                  <p className="text-2xl font-bold">{stats.closed}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-2 border border-white/20 text-center">
                  <p className="text-emerald-100 text-xs font-medium">Critical</p>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                </div>
              </div>
              <Button onClick={() => router.push('/zone/tickets/create')} className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-lg hover:shadow-xl transition-all">
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </div>
          </div>
        </div>

        {/* No view tabs needed - users only see their assigned tickets */}

        {/* Filters */}
        <Card className="border-0 shadow-lg bg-white" style={{backgroundColor: 'white'}}>
          <CardHeader className="bg-white border-b border-slate-200" style={{backgroundColor: 'white'}}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg">Search & Filter</CardTitle>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">Active</Badge>
                )}
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6 bg-white" style={{backgroundColor: 'white'}}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Search className="h-4 w-4 text-emerald-600" />
                  Search Tickets
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by ticket #, title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={loading}
                    className="pl-10 h-11 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  Status
                </Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus} disabled={loading}>
                  <SelectTrigger className="h-11 border-gray-200 focus:border-purple-500 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {statuses.map(status => (
                      <SelectItem key={status} value={status}>{status.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Flag className="h-4 w-4 text-pink-600" />
                  Priority
                </Label>
                <Select value={selectedPriority} onValueChange={setSelectedPriority} disabled={loading}>
                  <SelectTrigger className="h-11 border-gray-200 focus:border-pink-500 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {priorities.map(priority => (
                      <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table - Premium Design */}
        <Card className="border-0 shadow-2xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-emerald-600/50 transition-colors" onClick={() => handleSort('id')}>
                    <div className="flex items-center gap-1.5">
                      Ticket #
                      {sortField === 'id' && (
                        <span className="text-cyan-300">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-emerald-600/50 transition-colors" onClick={() => handleSort('title')}>
                    <div className="flex items-center gap-1.5">
                      <Ticket className="h-3.5 w-3.5 text-cyan-300" />
                      Title
                      {sortField === 'title' && (
                        <span className="text-cyan-300">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-emerald-600/50 transition-colors" onClick={() => handleSort('customer')}>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-emerald-300" />
                      Customer
                      {sortField === 'customer' && (
                        <span className="text-cyan-300">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-emerald-600/50 transition-colors" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-purple-300" />
                      Status
                      {sortField === 'status' && (
                        <span className="text-cyan-300">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-emerald-600/50 transition-colors" onClick={() => handleSort('priority')}>
                    <div className="flex items-center gap-1.5">
                      <Flag className="h-3.5 w-3.5 text-amber-300" />
                      Priority
                      {sortField === 'priority' && (
                        <span className="text-cyan-300">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-emerald-600/50 transition-colors" onClick={() => handleSort('assignedTo')}>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-cyan-300" />
                      Assigned
                      {sortField === 'assignedTo' && (
                        <span className="text-cyan-300">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-300" />
                      Response
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-emerald-600/50 transition-colors" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-pink-300" />
                      Created
                      {sortField === 'createdAt' && (
                        <span className="text-cyan-300">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center bg-gradient-to-br from-slate-50 to-emerald-50/30">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="relative">
                          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                          </div>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-900">Loading tickets...</p>
                          <p className="text-sm text-gray-500 mt-1">Please wait while we fetch the data</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center bg-gradient-to-br from-slate-50 to-emerald-50/30">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <Ticket className="h-8 w-8 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-900">No tickets found</p>
                          <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or create a new ticket</p>
                        </div>
                        <Button onClick={() => router.push('/zone/tickets/create')} className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-600">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Ticket
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedTickets.map((ticket: any, index: number) => (
                  <tr 
                    key={ticket.id} 
                    className={`
                      ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                      hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50/50 
                      transition-all duration-200 group
                    `}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/zone/tickets/${ticket.id}`} className="font-mono font-bold text-emerald-600 hover:text-emerald-700 text-sm hover:underline">
                          #{ticket.id}
                        </Link>
                        {ticket.status === 'OPEN' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded">NEW</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <Link href={`/zone/tickets/${ticket.id}`} className="font-semibold text-gray-900 hover:text-emerald-600 text-sm truncate max-w-[200px] block hover:underline">
                          {ticket.title}
                        </Link>
                        {ticket.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{ticket.description}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                          {(ticket.customer?.companyName || 'U')?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate max-w-[120px]">{ticket.customer?.companyName || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <span className={`
                        inline-flex px-2.5 py-1 text-xs font-bold rounded-full shadow-sm
                        ${getStatusStyle(ticket.status)}
                      `}>
                        {ticket.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <span className={`
                        inline-flex px-2 py-1 text-xs font-bold rounded-md border
                        ${getPriorityStyle(ticket.priority)}
                      `}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {ticket.assignedTo ? (
                          <>
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-700 font-semibold text-[10px] flex-shrink-0">
                              {ticket.assignedTo?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="text-gray-700 text-sm truncate max-w-[80px]">{ticket.assignedTo?.name?.split(' ')[0]}</span>
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm italic">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {ticket.assignedTo ? (
                        ticket.assignmentStatus === 'PENDING' ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] px-2 py-0.5 animate-pulse">
                            Pending
                          </Badge>
                        ) : ticket.assignmentStatus === 'ACCEPTED' ? (
                          <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px] px-2 py-0.5">
                            ✓ Accepted
                          </Badge>
                        ) : ticket.assignmentStatus === 'REJECTED' ? (
                          <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px] px-2 py-0.5">
                            ✗ Rejected
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-500 text-sm">{ticket.createdAt ? format(new Date(ticket.createdAt), 'dd MMM') : '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-200 rounded-lg">
                            <MoreHorizontal className="h-4 w-4 text-gray-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl border-slate-200">
                          <DropdownMenuItem 
                            onClick={() => router.push(`/zone/tickets/${ticket.id}`)}
                            className="cursor-pointer rounded-lg"
                          >
                            <Eye className="h-4 w-4 mr-2 text-blue-600" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {!loading && tickets.length > 0 && (
            <div className="bg-gradient-to-r from-slate-50 via-emerald-50 to-teal-50/30 px-6 py-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 font-medium">
                  Showing <span className="font-bold text-slate-900">{((pagination.page - 1) * pagination.limit) + 1}</span> to <span className="font-semibold">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-semibold">{pagination.total}</span> results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-50 rounded-xl transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-700 font-medium px-3">
                    Page <span className="font-bold text-slate-900">{pagination.page}</span> of <span className="font-semibold">{pagination.totalPages}</span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-50 rounded-xl transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}