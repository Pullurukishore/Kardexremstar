'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RefreshCw, FileText, Download, FileDown, BarChart3, Info, Trophy, CheckCircle2, DollarSign, Package } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/services/api';
import type { ReportFilters, ReportData, ReportType } from '@/types/reports';
import { REPORT_TYPES, TICKET_REPORT_TYPES, SALES_REPORT_TYPES } from '@/types/reports';
import ReportsTable from './ReportsTable';
import OfferDetailsDialog from './OfferDetailsDialog';
import ZoneTargetDetailsDialog from './ZoneTargetDetailsDialog';
import UserTargetDetailsDialog from './UserTargetDetailsDialog';
import ReportsFilters from './ReportsFilters';
// Dynamic imports for heavy report components (lazy loaded for better performance)
import {
  DynamicAdvancedTicketSummaryReport as AdvancedTicketSummaryReport,
  DynamicCustomerSatisfactionReport as CustomerSatisfactionReport,
  DynamicAdvancedMachineAnalyticsReport as AdvancedMachineAnalyticsReport,
  DynamicAdvancedZonePerformanceReport as AdvancedZonePerformanceReport,
  DynamicServicePersonPerformanceReport as ServicePersonPerformanceReport,
  DynamicServicePersonAttendanceReport as ServicePersonAttendanceReport,
  DynamicProductTypeAnalysisReport as ProductTypeAnalysisReport,
  DynamicCustomerPerformanceReport as CustomerPerformanceReport,
  DynamicTargetReportAnalytics as TargetReportAnalytics,
} from './DynamicReportComponents';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Target, TrendingUp, TrendingDown, Users, MapPin, Eye } from 'lucide-react';
 
import { formatCrLakh, formatINRFull } from '@/lib/format';

interface Offer {
  id: number;
  offerReferenceNumber: string;
  offerReferenceDate: string | null;
  title: string | null;
  description: string | null;
  productType: string | null;
  lead: string | null;
  company: string | null;
  location: string | null;
  department: string | null;
  registrationDate: string | null;
  contactPersonName: string | null;
  contactNumber: string | null;
  email: string | null;
  machineSerialNumber: string | null;
  status: string;
  stage: string;
  priority: string;
  offerValue: number | null;
  offerMonth: string | null;
  poExpectedMonth: string | null;
  probabilityPercentage: number | null;
  poNumber: string | null;
  poDate: string | null;
  poValue: number | null;
  poReceivedMonth: string | null;
  openFunnel: boolean;
  remarks: string | null;
  bookingDateInSap: string | null;
  offerEnteredInCrm: string | null;
  offerClosedInCrm: string | null;
  customer: {
    id: number;
    companyName: string;
    location: string | null;
    department: string | null;
  };
  contact?: {
    id: number;
    contactPersonName: string;
    contactNumber: string | null;
    email: string | null;
  } | null;
  zone: {
    id: number;
    name: string;
    shortForm: string;
  };
  assignedTo: {
    id: number;
    name: string;
    email: string;
  } | null;
  createdBy: {
    id: number;
    name: string;
    email: string;
  };
  updatedBy: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ReportsClientProps {
  initialFilters: ReportFilters;
  initialReportData: ReportData | null;
  zones: Array<{ id: number; name: string }>;
  customers: Array<{ id: number; companyName: string }>;
  isZoneUser: boolean;
  reportTypes?: ReportType[]; // Allow custom report types
}

const ReportsClient: React.FC<ReportsClientProps> = ({
  initialFilters,
  initialReportData,
  zones: initialZones,
  customers: initialCustomers,
  isZoneUser,
  reportTypes = REPORT_TYPES,
}) => {
  // State for zones and customers (fetched client-side)
  const [zones, setZones] = useState<Array<{ id: number; name: string }>>(initialZones || []);
  const [customers, setCustomers] = useState<Array<{ id: number; companyName: string }>>(initialCustomers || []);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Fetch zones and customers on mount
  useEffect(() => {
    // Skip if already fetched (React Strict Mode protection)
    if (hasInitialCustomersFetched.current) {
      return;
    }
    
    const fetchInitialData = async () => {
      // Fetch zones
      if (!zones || zones.length === 0) {
        setIsLoadingZones(true);
        try {
          const response = await apiService.getZones();
          const zonesData = Array.isArray(response) ? response : (response.data || []);
          setZones(zonesData);
        } catch (error) {
          console.error('Error fetching zones:', error);
          setZones([]);
        } finally {
          setIsLoadingZones(false);
        }
      }

      // Fetch customers (only if not already fetching)
      if ((!customers || customers.length === 0) && !isCustomersFetching.current) {
        isCustomersFetching.current = true;
        setIsLoadingCustomers(true);
        try {
          const response = await apiService.getCustomers({ isActive: 'true', limit: 1000 });
          const customersData = Array.isArray(response) ? response : (response.data || response.customers || []);
          setCustomers(customersData);
        } catch (error) {
          console.error('Error fetching customers:', error);
          setCustomers([]);
        } finally {
          setIsLoadingCustomers(false);
          isCustomersFetching.current = false;
          hasInitialCustomersFetched.current = true;
        }
      } else {
        hasInitialCustomersFetched.current = true;
      }
    };

    fetchInitialData();
  }, []);

  // Initialize zone for zone managers - ensure it's set from either initialFilters or first zone
  const getInitialZoneId = () => {
    if (initialFilters.zoneId) return initialFilters.zoneId;
    if (isZoneUser && zones && zones.length > 0) {
      return zones[0].id.toString();
    }
    return undefined;
  };

  const [filters, setFilters] = useState<ReportFilters>({
    ...initialFilters,
    zoneId: getInitialZoneId(),
    // Initialize target report filters if not present
    targetPeriod: initialFilters.targetPeriod || (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })(),
    periodType: initialFilters.periodType || 'MONTHLY',
  });
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(initialReportData);
  // Target report specific state
  const [zoneTargets, setZoneTargets] = useState<any[]>([]);
  const [userTargets, setUserTargets] = useState<any[]>([]);
  const [targetSummary, setTargetSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isZoneDetailsOpen, setIsZoneDetailsOpen] = useState(false);
  const [selectedZoneDetails, setSelectedZoneDetails] = useState<{ zoneId: number; targetPeriod: string; periodType: string } | null>(null);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<{ userId: number; targetPeriod: string; periodType: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOffers, setTotalOffers] = useState(0);
  
  // New report types state
  const [productTypeAnalysisData, setProductTypeAnalysisData] = useState<any>(null);
  const [customerPerformanceData, setCustomerPerformanceData] = useState<any>(null);
  
  // Core Reports state
  const [ticketSummaryData, setTicketSummaryData] = useState<any>(null);
  const [customerSatisfactionData, setCustomerSatisfactionData] = useState<any>(null);
  const [industrialDataReport, setIndustrialDataReport] = useState<any>(null);
  const [zonePerformanceData, setZonePerformanceData] = useState<any>(null);
  const [servicePersonPerformanceData, setServicePersonPerformanceData] = useState<any>(null);
  const [servicePersonAttendanceData, setServicePersonAttendanceData] = useState<any>(null);
  
  // Refs for preventing duplicate fetches and handling retries
  const isFetching = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 2;
  const hasInitialCustomersFetched = useRef(false);
  const isCustomersFetching = useRef(false);

  // Function to fetch customers for a specific zone
  const fetchCustomersForZone = useCallback(async (zoneId?: string, isZoneChange: boolean = false) => {
    // Prevent duplicate concurrent fetches
    if (isCustomersFetching.current) {
      console.log('Customers fetch already in progress, skipping...');
      return;
    }
    
    // Skip if this is from zone change effect but initial customers already fetched
    if (isZoneChange && !hasInitialCustomersFetched.current) {
      // Don't run zone change effect until initial fetch is done
      return;
    }
    
    try {
      isCustomersFetching.current = true;
      
      if (!zoneId) {
        // Reset to all customers
        const response = await apiService.getCustomers({ isActive: 'true', limit: 1000 });
        const customersData = Array.isArray(response) ? response : (response.data || response.customers || []);
        setCustomers(customersData);
        return;
      }
      
      setIsLoadingCustomers(true);
      const response = await apiService.getCustomers({ isActive: 'true', zoneId, limit: 1000 });
      const customersData = Array.isArray(response) ? response : (response.data || response.customers || []);
      setCustomers(customersData);
      // Clear customer filter when zone changes
      setFilters(prev => ({ ...prev, customerId: undefined }));
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      isCustomersFetching.current = false;
      setIsLoadingCustomers(false);
    }
  }, []);

  const fetchReport = useCallback(async (isRetry: boolean = false) => {
    // Prevent duplicate concurrent fetches (but allow retries)
    if (isFetching.current && !isRetry) {
      console.log('Fetch already in progress, skipping...');
      return;
    }
    
    try {
      isFetching.current = true;
      setLoading(true);
      
      // Handle target report differently
      if (filters.reportType === 'target-report') {
        const params: any = {
          targetPeriod: filters.targetPeriod,
          periodType: filters.periodType || 'MONTHLY',
          grouped: 'true'
        };

        if (filters.zoneId && filters.zoneId !== 'all') {
          params.zoneId = filters.zoneId;
        }

        try {
          // Fetch zone targets and user targets from actual endpoints
          const [zoneResponse, userResponse] = await Promise.all([
            apiService.getZoneTargets(params),
            apiService.getUserTargets(params)
          ]);
          
          console.log('Zone targets response:', zoneResponse);
          console.log('User targets response:', userResponse);
          
          let zt = (zoneResponse?.success && zoneResponse?.data) ? zoneResponse.data : (zoneResponse?.targets || []);
          let ut = (userResponse?.success && userResponse?.data) ? userResponse.data : (userResponse?.targets || []);
          
          const forcedZoneId = isZoneUser ? (filters.zoneId ? parseInt(filters.zoneId) : (zones?.[0]?.id)) : undefined;
          if (forcedZoneId) {
            zt = (zt || []).filter((t: any) => t?.serviceZoneId === forcedZoneId);
            ut = (ut || []).filter((t: any) => t?.user?.serviceZones?.some?.((sz: any) => sz?.serviceZone?.id === forcedZoneId));
          }
          
          setZoneTargets(zt);
          setUserTargets(ut);
          
          // Calculate summary
          const totalTargets = (zt?.length || 0) + (ut?.length || 0);
          const totalTargetValue = (zt || []).reduce((sum: number, t: any) => sum + (Number(t.targetValue) || 0), 0) + 
                                  (ut || []).reduce((sum: number, t: any) => sum + (Number(t.targetValue) || 0), 0);
          const totalActualValue = (zt || []).reduce((sum: number, t: any) => sum + (Number(t.actualValue) || 0), 0) + 
                                  (ut || []).reduce((sum: number, t: any) => sum + (Number(t.actualValue) || 0), 0);
          const overallAchievement = totalTargetValue > 0 ? (totalActualValue / totalTargetValue) * 100 : 0;
          
          setTargetSummary({
            totalTargets,
            totalTargetValue,
            totalActualValue,
            overallAchievement
          });
          
          // Clear offer report data
          setOffers([]);
          setReportData(null);
        } catch (error) {
          console.error('Failed to fetch target report:', error);
          toast.error('Failed to load target report');
        }
        return;
      }

      // Handle offer summary report
      const reportType = filters.reportType || 'offer-summary';
      
      // Handle Product Type Analysis Report
      if (reportType === 'product-type-analysis') {
        const params: any = {};
        if (filters.dateRange?.from) {
          params.from = format(filters.dateRange.from, 'yyyy-MM-dd');
        }
        if (filters.dateRange?.to) {
          params.to = format(filters.dateRange.to, 'yyyy-MM-dd');
        }
        if (filters.zoneId) {
          params.zoneId = filters.zoneId;
        }
        
        const response = await apiService.getProductTypeAnalysis(params);
        console.log('Product type analysis response:', response);
        let analysisData = (response.success && response.data) ? response.data : (response.analysis ? response : null);
        // Additional check: if data exists but doesn't have required fields, try to extract from response
        if (!analysisData && response && (response.analysis || response.totals)) {
          analysisData = response;
        }
        console.log('Product type analysis data to display:', analysisData);
        if (analysisData) {
          setProductTypeAnalysisData(analysisData);
          setOffers([]);
          setReportData(null);
          setZoneTargets([]);
          setUserTargets([]);
          setTargetSummary(null);
        } else {
          console.error('Failed to parse product type analysis response');
        }
      }
      // Handle Customer Performance Report
      else if (reportType === 'customer-performance') {
        const params: any = {};
        if (filters.dateRange?.from) {
          params.from = format(filters.dateRange.from, 'yyyy-MM-dd');
        }
        if (filters.dateRange?.to) {
          params.to = format(filters.dateRange.to, 'yyyy-MM-dd');
        }
        if (filters.zoneId) {
          params.zoneId = filters.zoneId;
        }
        
        const response = await apiService.getCustomerPerformance(params);
        console.log('Customer performance response:', response);
        let data = (response.success && response.data) ? response.data : (response.topCustomers ? response : null);
        // Additional check: if data exists but doesn't have required fields, try to extract from response
        if (!data && response && (response.topCustomers || response.allCustomers || response.totals)) {
          data = response;
        }
        console.log('Customer performance data to display:', data);
        if (data) {
          const forcedZoneId = isZoneUser ? (filters.zoneId ? parseInt(filters.zoneId) : (zones?.[0]?.id)) : undefined;
          if (forcedZoneId) {
            const filterByZone = (arr: any[]) => (arr || []).filter((c: any) => c?.zone?.id === forcedZoneId);
            data = {
              ...data,
              topCustomers: filterByZone(data.topCustomers),
              allCustomers: filterByZone(data.allCustomers),
              // totals remain as server-reported; optional: recompute if needed
            };
          }
          setCustomerPerformanceData(data);
          setOffers([]);
          setReportData(null);
          setZoneTargets([]);
          setUserTargets([]);
          setTargetSummary(null);
        } else {
          console.error('Failed to parse customer performance response');
        }
      }
      // Handle Core Reports
      else if (reportType === 'ticket-summary') {
        const params: any = {
          reportType: 'ticket-summary'
        };
        if (filters.dateRange?.from) {
          params.from = format(filters.dateRange.from, 'yyyy-MM-dd');
        }
        if (filters.dateRange?.to) {
          params.to = format(filters.dateRange.to, 'yyyy-MM-dd');
        }
        if (filters.zoneId) {
          params.zoneId = filters.zoneId;
        }
        if (filters.customerId) {
          params.customerId = filters.customerId;
        }
        if (filters.reportType) {
          params.reportType = filters.reportType;
        }
        
        console.log('Fetching ticket-summary report with params:', params);
        // Use zone report endpoint for zone users, generate for admins
        const response = isZoneUser 
          ? await apiService.generateZoneReport(params)
          : await apiService.generateReport(params);
        console.log('Ticket-summary response:', response);
        
        // Handle both response formats:
        // 1. New format: { success: true, data: { summary, statusDistribution, ... } }
        // 2. Old format: { summary, statusDistribution, ... }
        let reportData = null;
        if (response.success && response.data) {
          reportData = response.data;
        } else if (response.summary || response.statusDistribution) {
          // Old format - data is at root level
          reportData = response;
        }
        
        if (reportData) {
          console.log('Setting ticketSummaryData:', reportData);
          setTicketSummaryData(reportData);
          setOffers([]);
          setReportData(null);
          setZoneTargets([]);
          setUserTargets([]);
          setTargetSummary(null);
        } else {
          console.error('Ticket-summary report failed:', { success: response.success, data: response.data, response });
          toast.error('Failed to load ticket summary report');
        }
      }
      else if (reportType === 'customer-satisfaction') {
        const params: any = {
          reportType: 'customer-satisfaction'
        };
        if (filters.dateRange?.from) {
          params.from = format(filters.dateRange.from, 'yyyy-MM-dd');
        }
        if (filters.dateRange?.to) {
          params.to = format(filters.dateRange.to, 'yyyy-MM-dd');
        }
        if (filters.zoneId) {
          params.zoneId = filters.zoneId;
        }
        
        const response = isZoneUser 
          ? await apiService.generateZoneReport(params)
          : await apiService.generateReport(params);
        const satisfactionData = (response.success && response.data) ? response.data : (response.summary ? response : null);
        if (satisfactionData) {
          setCustomerSatisfactionData(satisfactionData);
          setOffers([]);
          setReportData(null);
          setZoneTargets([]);
          setUserTargets([]);
          setTargetSummary(null);
        }
      }
      else if (reportType === 'industrial-data') {
        const params: any = {
          reportType: 'industrial-data'
        };
        if (filters.dateRange?.from) {
          params.from = format(filters.dateRange.from, 'yyyy-MM-dd');
        }
        if (filters.dateRange?.to) {
          params.to = format(filters.dateRange.to, 'yyyy-MM-dd');
        }
        if (filters.zoneId) {
          params.zoneId = filters.zoneId;
        }
        if (filters.customerId) {
          params.customerId = filters.customerId;
        }
        if (filters.assetId) {
          params.assetId = filters.assetId;
        }
        if (filters.reportType) {
          params.reportType = filters.reportType;
        }
        
        const response = isZoneUser 
          ? await apiService.generateZoneReport(params)
          : await apiService.generateReport(params);
        console.log('Industrial data response:', response);
        const industrialData = (response.success && response.data) ? response.data : (response.machineDowntime ? response : null);
        console.log('Industrial data to display:', industrialData);
        if (industrialData) {
          setIndustrialDataReport(industrialData);
          setOffers([]);
          setReportData(null);
          setZoneTargets([]);
          setUserTargets([]);
          setTargetSummary(null);
        } else {
          console.error('Failed to parse industrial data response');
        }
      }
      else if (reportType === 'zone-performance') {
        const params: any = {
          reportType: 'zone-performance'
        };
        if (filters.dateRange?.from) {
          params.from = format(filters.dateRange.from, 'yyyy-MM-dd');
        }
        if (filters.dateRange?.to) {
          params.to = format(filters.dateRange.to, 'yyyy-MM-dd');
        }
        
        const response = isZoneUser 
          ? await apiService.generateZoneReport(params)
          : await apiService.generateReport(params);
        const zoneData = (response.success && response.data) ? response.data : (response.zones ? response : null);
        if (zoneData) {
          setZonePerformanceData(zoneData);
          setOffers([]);
          setReportData(null);
          setZoneTargets([]);
          setUserTargets([]);
          setTargetSummary(null);
        }
      }
      else if (reportType === 'agent-productivity') {
        const params: any = {};
        
        // For zone users, we'll use the zone report endpoint which has the correct permissions
        if (isZoneUser) {
          // Zone users can only see their own zone's data
          if (filters.zoneId) {
            params.zoneId = filters.zoneId;
          }
          
          // Add report type and date range if specified
          if (filters.reportType) {
            params.reportType = filters.reportType;
          }
          if (filters.dateRange?.from) {
            params.from = format(filters.dateRange.from, 'yyyy-MM-dd');
          }
          if (filters.dateRange?.to) {
            params.to = format(filters.dateRange.to, 'yyyy-MM-dd');
          }
          
          console.log('Fetching agent-productivity report for zone user with params:', params);
          const response = await apiService.generateZoneReport(params);
          console.log('Agent-productivity zone response:', response);
          
          // Handle the response format from the zone report endpoint
          const backendData = response.success ? response.data : response;
          if (backendData) {
            // Transform backend data structure to match frontend expectations
            const transformedData = {
              reports: (backendData.agents || []).map((agent: any) => ({
                id: agent.agentId,
                name: agent.agentName,
                email: agent.email,
                phone: agent.phone || '',
                zones: (agent.zones || []).map((zone: string, index: number) => ({ id: index + 1, name: zone })),
                summary: {
                  totalWorkingDays: 0, // Not available in agent-productivity report
                  presentDays: 0, // Not available in agent-productivity report
                  totalHours: 0, // Not available in agent-productivity report
                  absentDays: 0, // Not available in agent-productivity report
                  autoCheckouts: 0, // Not available in agent-productivity report
                  activitiesLogged: 0, // Not available in agent-productivity report
                  totalActivities: 0, // Not available in agent-productivity report
                  averageHoursPerDay: 0, // Not available in agent-productivity report
                  // Performance metrics from agent data
                  totalTickets: agent.totalTickets || 0,
                  ticketsResolved: agent.resolvedTickets || 0,
                  averageResolutionTimeHours: agent.averageResolutionTime || 0,
                  averageTravelTimeHours: agent.averageTravelTime || 0,
                  averageOnsiteTimeHours: agent.averageOnsiteTime || 0,
                  performanceScore: agent.performanceScore || 0
                },
                flags: agent.flags || [],
                dayWiseBreakdown: agent.dayWiseBreakdown || []
              })),
              summary: {
                totalServicePersons: backendData.totalAgents || 0,
                totalCheckIns: 0, // Not available in agent-productivity report
                averageHoursPerDay: 0, // Not available in agent-productivity report
                totalAbsentees: 0, // Not available in agent-productivity report
                totalActivitiesLogged: 0, // Not available in agent-productivity report
                mostActiveUser: backendData.performanceMetrics?.topPerformer ? {
                  name: backendData.performanceMetrics.topPerformer.agentName,
                  email: backendData.performanceMetrics.topPerformer.email,
                  activityCount: backendData.performanceMetrics.topPerformer.totalTickets
                } : null
              },
              dateRange: {
                from: filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : '',
                to: filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : '',
                totalDays: 0
              }
            };
            
            setServicePersonPerformanceData(transformedData);
            setOffers([]);
            setReportData(null);
            setZoneTargets([]);
            setUserTargets([]);
            setTargetSummary(null);
          }
        }
        // All users (including admin) use the dedicated service person reports endpoint
        else {
          // For all users, use the dedicated service person reports endpoint
          if (filters.dateRange?.from) {
            params.from = format(filters.dateRange.from, 'yyyy-MM-dd');
          }
          if (filters.dateRange?.to) {
            params.to = format(filters.dateRange.to, 'yyyy-MM-dd');
          }
          if (filters.zoneId) {
            params.zoneId = filters.zoneId;
          }
          
          console.log('Fetching agent-productivity report with params:', params);
          // Use dedicated service person reports endpoint
          const response = await apiService.getServicePersonReports(params);
          console.log('Agent-productivity response:', response);
          
          // Handle the response format from the service person reports endpoint
          const agentData = (response.success && response.data) ? response.data : (response.servicePersonReports ? response : response);
          if (agentData) {
            // Transform the data structure to match what the component expects
            const transformedReports = (agentData.servicePersonReports || []).map((person: any) => ({
              ...person,
              zones: person.serviceZones || [] // Transform serviceZones to zones
            }));
            
            const transformedData = {
              reports: transformedReports,
              summary: {
                totalServicePersons: agentData.servicePersonReports?.length || 0,
                totalCheckIns: agentData.servicePersonReports?.reduce((sum: number, person: any) => sum + (person.summary?.presentDays || 0), 0),
                averageHoursPerDay: agentData.servicePersonReports?.reduce((sum: number, person: any) => sum + (person.summary?.averageHoursPerDay || 0), 0) / (agentData.servicePersonReports?.length || 1),
                totalAbsentees: agentData.servicePersonReports?.reduce((sum: number, person: any) => sum + (person.summary?.absentDays || 0), 0),
                totalActivitiesLogged: agentData.servicePersonReports?.reduce((sum: number, person: any) => sum + (person.summary?.totalActivities || 0), 0),
                mostActiveUser: agentData.servicePersonReports?.reduce((max: any, person: any) => 
                  (person.summary?.totalActivities || 0) > (max?.summary?.totalActivities || 0) ? person : max, null)
              },
              dateRange: {
                from: filters.dateRange?.from || '',
                to: filters.dateRange?.to || '',
                totalDays: agentData.servicePersonReports?.[0]?.summary?.totalDays || 0
              }
            };
            
            setServicePersonPerformanceData(transformedData);
            setOffers([]);
            setReportData(null);
            setZoneTargets([]);
            setUserTargets([]);
            setTargetSummary(null);
          }
        }
      }
      else if (reportType === 'sla-performance') {
        const params: any = {};
        if (filters.dateRange?.from) {
          params.from = format(filters.dateRange.from, 'yyyy-MM-dd');
        }
        if (filters.dateRange?.to) {
          params.to = format(filters.dateRange.to, 'yyyy-MM-dd');
        }
        if (filters.zoneId) {
          params.zoneId = filters.zoneId;
        }
        
        // Use dedicated service person reports endpoint for attendance data
        const response = await apiService.getServicePersonReports(params);
        console.log('Service person attendance response:', response);
        
        // Handle the response format from the service person reports endpoint
        const attendanceData = (response.success && response.data) ? response.data : (response.reports ? response : response);
        if (attendanceData) {
          // Transform the data structure to match what the component expects
          const transformedReports = (attendanceData.servicePersonReports || []).map((person: any) => ({
            ...person,
            zones: person.serviceZones || [] // Transform serviceZones to zones
          }));
          
          const transformedData = {
            reports: transformedReports,
            summary: {
              totalServicePersons: attendanceData.servicePersonReports?.length || 0,
              totalCheckIns: attendanceData.servicePersonReports?.reduce((sum: number, person: any) => sum + (person.summary?.presentDays || 0), 0),
              averageHoursPerDay: attendanceData.servicePersonReports?.reduce((sum: number, person: any) => sum + (person.summary?.averageHoursPerDay || 0), 0) / (attendanceData.servicePersonReports?.length || 1),
              totalAbsentees: attendanceData.servicePersonReports?.reduce((sum: number, person: any) => sum + (person.summary?.absentDays || 0), 0),
              totalActivitiesLogged: attendanceData.servicePersonReports?.reduce((sum: number, person: any) => sum + (person.summary?.totalActivities || 0), 0),
              mostActiveUser: attendanceData.servicePersonReports?.reduce((max: any, person: any) => 
                (person.summary?.totalActivities || 0) > (max?.summary?.totalActivities || 0) ? person : max, null)
            },
            dateRange: {
              from: filters.dateRange?.from || '',
              to: filters.dateRange?.to || '',
              totalDays: attendanceData.servicePersonReports?.[0]?.summary?.totalDays || 0
            }
          };
          
          setServicePersonAttendanceData(transformedData);
          setOffers([]);
          setReportData(null);
          setZoneTargets([]);
          setUserTargets([]);
          setTargetSummary(null);
        }
      }
      // Handle standard Offer Summary Report
      else {
        const params: any = {
          reportType: reportType,
          page: currentPage,
          limit: 500,
        };

        if (filters.dateRange?.from) {
          params.from = format(filters.dateRange.from, 'yyyy-MM-dd');
        }
        if (filters.dateRange?.to) {
          params.to = format(filters.dateRange.to, 'yyyy-MM-dd');
        }
        if (filters.zoneId) {
          params.zoneId = filters.zoneId;
        }
        if (filters.customerId) {
          params.customerId = filters.customerId;
        }
        if (filters.productType) {
          params.productType = filters.productType;
        }
        if (filters.stage) {
          params.stage = filters.stage;
        }
        if (filters.search) {
          params.search = filters.search;
        }
        if (filters.reportType) {
          params.reportType = filters.reportType;
        }

        // Use zone report endpoint for zone users, generate for admins
        const response = isZoneUser 
          ? await apiService.generateZoneReport(params)
          : await apiService.generateReport(params);
        
        if (response.success && response.data) {
          const forcedZoneId = isZoneUser ? (filters.zoneId ? parseInt(filters.zoneId) : (zones?.[0]?.id)) : undefined;
          let offersData = response.data.offers || [];
          if (forcedZoneId) {
            offersData = (offersData || []).filter((o: any) => o?.zone?.id === forcedZoneId);
          }
          setOffers(offersData);
          setTotalOffers(response.data.pagination?.total || 0);
          setTotalPages(response.data.pagination?.pages || 1);
          
          setReportData({
            summary: response.data.summary || {},
            statusDistribution: response.data.statusDistribution || {},
            stageDistribution: response.data.stageDistribution || {},
            productTypeDistribution: response.data.productTypeDistribution || {},
          });
          // Clear other report data
          setZoneTargets([]);
          setUserTargets([]);
          setTargetSummary(null);
          setProductTypeAnalysisData(null);
          setCustomerPerformanceData(null);
          // Clear Core Reports data
          setTicketSummaryData(null);
          setCustomerSatisfactionData(null);
          setIndustrialDataReport(null);
          setZonePerformanceData(null);
          setServicePersonPerformanceData(null);
          setServicePersonAttendanceData(null);
        } else {
          // Error will be handled by catch block if it's not a 401
        }
      }
    } catch (error: any) {
      console.error('Error fetching report:', error);
      
      // Handle 401 with automatic retry logic (token refresh case)
      if (error?.response?.status === 401) {
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`Token refresh detected, retrying (attempt ${retryCountRef.current}/${maxRetries})...`);
          
          // Wait for token refresh to complete (the axios interceptor handles this)
          // and then retry the request
          setTimeout(() => {
            fetchReport(true); // Pass true to indicate this is a retry
          }, 1000 * retryCountRef.current); // Exponential backoff: 1s, 2s
          return;
        }
        // Max retries reached, let user know
        toast.error('Session expired. Please refresh the page or log in again.');
        retryCountRef.current = 0;
        return;
      }
      
      toast.error(error?.response?.data?.error || 'Failed to load report');
    } finally {
      isFetching.current = false;
      setLoading(false);
      // Reset retry count on successful completion
      if (retryCountRef.current > 0) {
        retryCountRef.current = 0;
      }
    }
  }, [filters, currentPage]);

  // Don't auto-fetch on mount - wait for Generate Report button
  // useEffect(() => {
  //   fetchReport();
  // }, [fetchReport]);

  // Fetch customers when zone changes (but not on initial mount - that's handled separately)
  useEffect(() => {
    // Only fetch if initial customers were already loaded (prevents duplicate on mount)
    if (hasInitialCustomersFetched.current) {
      fetchCustomersForZone(filters.zoneId, true);
    }
  }, [filters.zoneId, fetchCustomersForZone]);

  // Client-side filtering for search and stage (live filter without API call)
  const filteredOffers = useMemo(() => {
    if (!offers.length) return [];

    return offers.filter((offer) => {
      // Filter by stage
      if (filters.stage && offer.stage !== filters.stage) {
        return false;
      }

      // Filter by search term
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchableText = [
          offer.offerReferenceNumber,
          offer.title,
          offer.company,
          offer.contactPersonName,
          offer.contact?.contactPersonName,
          offer.poNumber,
          offer.machineSerialNumber,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  }, [offers, filters.search, filters.stage]);


  const handleFilterChange = useCallback((newFilters: Partial<ReportFilters>) => {
    const prevReportType = filters.reportType;
    const newReportType = newFilters.reportType || filters.reportType;
    
    // Clear report data when switching report types
    if (prevReportType !== newReportType) {
      setReportData(null);
      setOffers([]);
      setTotalOffers(0);
      setTotalPages(1);
      setCurrentPage(1);
      setZoneTargets([]);
      setUserTargets([]);
      setTargetSummary(null);
      setProductTypeAnalysisData(null);
      setCustomerPerformanceData(null);
      // Clear Core Reports data
      setTicketSummaryData(null);
      setCustomerSatisfactionData(null);
      setIndustrialDataReport(null);
      setZonePerformanceData(null);
      setServicePersonPerformanceData(null);
      setServicePersonAttendanceData(null);
      
      // Initialize target report filters if switching to target-report
      if (newReportType === 'target-report') {
        const now = new Date();
        newFilters.targetPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        newFilters.periodType = 'MONTHLY';
      }
    }
    
    // Clear target report data when target filters change
    if (newReportType === 'target-report' && (
      newFilters.targetPeriod !== undefined || 
      newFilters.periodType !== undefined || 
      newFilters.zoneId !== undefined
    )) {
      setZoneTargets([]);
      setUserTargets([]);
      setTargetSummary(null);
    }
    
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  }, [filters.reportType]);

  const handleViewOffer = useCallback((offerId: number) => {
    setSelectedOfferId(offerId);
    setIsDetailsOpen(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setIsDetailsOpen(false);
    setSelectedOfferId(null);
  }, []);

  const handleOpenZoneDetails = useCallback((target: any) => {
    setSelectedZoneDetails({
      zoneId: target.serviceZoneId,
      targetPeriod: target.targetPeriod,
      periodType: target.periodType,
    });
    setIsZoneDetailsOpen(true);
  }, []);

  const handleOpenUserDetails = useCallback((target: any) => {
    setSelectedUserDetails({
      userId: target.userId,
      targetPeriod: target.targetPeriod,
      periodType: target.periodType,
    });
    setIsUserDetailsOpen(true);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleExport = useCallback(async (exportFormat: 'pdf' | 'excel') => {
    try {
      const params: any = {
        reportType: filters.reportType || 'offer-summary',
        format: exportFormat,
      };

      if (filters.dateRange?.from) {
        params.from = format(filters.dateRange.from, 'yyyy-MM-dd');
      }
      if (filters.dateRange?.to) {
        params.to = format(filters.dateRange.to, 'yyyy-MM-dd');
      }
      if (filters.zoneId) {
        params.zoneId = filters.zoneId;
      }
      if (filters.customerId) {
        params.customerId = filters.customerId;
      }
      if (filters.productType) {
        params.productType = filters.productType;
      }

      // Build query string
      const queryString = new URLSearchParams(params).toString();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
      const exportUrl = `${apiUrl}/reports/export?${queryString}`;

      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = `offer-report-${exportFormat === 'pdf' ? 'pdf' : 'xlsx'}`;
      
      // Add authorization header via fetch
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('accessToken') || row.startsWith('token'))
        ?.split('=')[1] || localStorage.getItem('dev_accessToken') || '';

      // Use fetch to download with auth
      const response = await fetch(exportUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success(`${exportFormat.toUpperCase()} export started`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error?.message || 'Failed to export report');
    }
  }, [filters]);

  const summary = useMemo(() => reportData?.summary || {}, [reportData]);
  const selectedReportType = REPORT_TYPES.find(type => type.value === filters.reportType);

  // Check if any report data is available for enabling export buttons
  const hasReportData = useMemo(() => {
    return !!(
      reportData ||
      targetSummary ||
      ticketSummaryData ||
      customerSatisfactionData ||
      industrialDataReport ||
      zonePerformanceData ||
      servicePersonPerformanceData ||
      servicePersonAttendanceData ||
      productTypeAnalysisData ||
      customerPerformanceData ||
      offers.length > 0
    );
  }, [
    reportData,
    targetSummary,
    ticketSummaryData,
    customerSatisfactionData,
    industrialDataReport,
    zonePerformanceData,
    servicePersonPerformanceData,
    servicePersonAttendanceData,
    productTypeAnalysisData,
    customerPerformanceData,
    offers
  ]);

  // Helper function for achievement color
  const getAchievementColor = (achievement: number) => {
    if (achievement >= 100) return 'bg-green-100 text-green-800';
    if (achievement >= 80) return 'bg-blue-100 text-blue-800';
    if (achievement >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Reports</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Generate and view detailed reports for your offer operations
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="text-xs sm:text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
              Report Type: <span className="font-medium">{selectedReportType?.label || filters.reportType}</span>
            </div>
            {reportData && (
              <div className="text-xs sm:text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                ✓ Generated
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Generation Controls */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">Report Filters</CardTitle>
              <CardDescription className="text-sm sm:text-base mt-1">
                Configure your report parameters
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button 
                onClick={() => fetchReport()} 
                disabled={loading}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                <BarChart3 className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button 
                  onClick={() => handleExport('excel')} 
                  disabled={!hasReportData || loading}
                  variant="outline"
                  className="w-full sm:w-auto min-h-[44px] border-green-600 text-green-600 hover:bg-green-50"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  {loading ? 'Exporting...' : 'Export Excel'}
                </Button>
                <Button 
                  onClick={() => handleExport('pdf')} 
                  disabled={!hasReportData || loading}
                  variant="outline"
                  className="w-full sm:w-auto min-h-[44px] border-red-600 text-red-600 hover:bg-red-50"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {loading ? 'Exporting...' : 'Export PDF'}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ReportsFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            zones={zones}
            customers={customers}
            isZoneUser={isZoneUser}
            isLoadingCustomers={isLoadingCustomers}
            reportTypes={reportTypes}
          />
          {selectedReportType && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900">{selectedReportType.label}</h4>
              <p className="text-sm text-blue-700 mt-1">{selectedReportType.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Target Report Results */}
      {filters.reportType === 'target-report' && targetSummary && (zoneTargets.length > 0 || userTargets.length > 0) && (
        <div className="space-y-6">
          <TargetReportAnalytics
            zoneTargets={zoneTargets as any}
            userTargets={userTargets as any}
            summary={targetSummary}
            targetPeriod={(filters.targetPeriod || '') as string}
            periodType={(filters.periodType || 'MONTHLY') as 'MONTHLY' | 'YEARLY'}
            zones={zones}
            isZoneUser={isZoneUser}
            onOpenZoneDetails={(zoneId, tp, pt) => {
              setSelectedZoneDetails({ zoneId, targetPeriod: tp, periodType: pt });
              setIsZoneDetailsOpen(true);
            }}
            onOpenUserDetails={(userId, tp, pt) => {
              setSelectedUserDetails({ userId, targetPeriod: tp, periodType: pt });
              setIsUserDetailsOpen(true);
            }}
          />
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-blue-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-indigo-700">Zone Targets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-indigo-800">{targetSummary.totalZoneTargets || 0}</div>
                <div className="text-sm text-indigo-600 mt-2 font-medium">
                  Achievement: {targetSummary.totalZoneAchievement?.toFixed(2) || 0}%
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-700">Zone Target Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-800" title={formatINRFull(targetSummary.totalZoneTargetValue || 0)}>
                  {formatCrLakh(targetSummary.totalZoneTargetValue || 0)}
                </div>
                <div className="text-sm text-blue-600 mt-2 font-medium">
                  <span title={formatINRFull(targetSummary.totalZoneActualValue || 0)}>Actual: {formatCrLakh(targetSummary.totalZoneActualValue || 0)}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-purple-700">User Targets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-purple-800">{targetSummary.totalUserTargets || 0}</div>
                <div className="text-sm text-purple-600 mt-2 font-medium">
                  Achievement: {targetSummary.totalUserAchievement?.toFixed(2) || 0}%
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-emerald-700">User Target Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-800" title={formatINRFull(targetSummary.totalUserTargetValue || 0)}>
                  {formatCrLakh(targetSummary.totalUserTargetValue || 0)}
                </div>
                <div className="text-sm text-emerald-600 mt-2 font-medium">
                  <span title={formatINRFull(targetSummary.totalUserActualValue || 0)}>Actual: {formatCrLakh(targetSummary.totalUserActualValue || 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Zone Targets Table */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Zone Targets ({zoneTargets.length})</h2>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Zone</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">No. Offers</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="Sum of all offer values in the period">
                        Offers Value
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="Sum of WON stage offer values">
                        Orders Received
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="Sum of (Offer Value × Probability %) for offers with probability > 50%">
                        Expected Offers
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="Offers Value - Orders Received (pending opportunities)">
                        Open Funnel
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="Count of WON/PO_RECEIVED stage offers in current year">
                        Order Booking
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Target BU</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="(Orders Received / Target BU) × 100">
                        Achievement
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="(Expected Offers / Target BU) × 100">
                        Expected Ach %
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="Target BU - Orders Received (remaining to achieve)">
                        Balance BU
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {zoneTargets.map((target: any, idx: number) => (
                      <tr key={`zone-${target.serviceZoneId}-${idx}`} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                            <span className="font-semibold text-gray-900">{target.serviceZone.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{target.metrics?.noOfOffers || 0}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">{formatCrLakh(target.metrics?.offersValue || 0)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-green-700">{formatCrLakh(target.metrics?.ordersReceived || 0)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-indigo-700">{formatCrLakh(target.metrics?.expectedOffers || 0)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-amber-700">{formatCrLakh(target.metrics?.openFunnel || 0)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-cyan-700">{target.metrics?.orderBooking || 0}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCrLakh(target.targetValue)}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge className={`${getAchievementColor(target.achievement)} text-xs font-bold`}>
                            {target.achievement.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge className={`${getAchievementColor(target.expectedAchievement)} text-xs font-bold`}>
                            {target.expectedAchievement.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-semibold ${
                          (target.metrics?.balanceBU || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}>
                          {formatCrLakh(target.metrics?.balanceBU || 0)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenZoneDetails(target)}
                            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {zoneTargets.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No zone targets found</p>
                </div>
              )}
            </div>
          </div>

          {/* Zone User Targets Table */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">Zone User Targets ({userTargets.length})</h2>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-50 to-pink-100 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Zone</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">No. Offers</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="Sum of all offer values in the period">
                        Offers Value
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="Sum of WON stage offer values">
                        Orders Received
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="Sum of (Offer Value × Probability %) for offers with probability > 50%">
                        Expected Offers
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="Offers Value - Orders Received (pending opportunities)">
                        Open Funnel
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="Count of WON/PO_RECEIVED stage offers in current year">
                        Order Booking
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Target BU</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="(Orders Received / Target BU) × 100">
                        Achievement
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="(Expected Offers / Target BU) × 100">
                        Expected Ach %
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-help" title="Target BU - Orders Received (remaining to achieve)">
                        Balance BU
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {userTargets.map((target: any, idx: number) => (
                      <tr key={`user-${target.userId}-${idx}`} className="hover:bg-purple-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-purple-600"></div>
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900 truncate">{target.user?.name || target.user?.email}</div>
                              <div className="text-xs text-gray-500 truncate">{target.user?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {target.user?.serviceZones && target.user?.serviceZones.length > 0 
                            ? target.user.serviceZones.map((sz: any) => sz.serviceZone?.name || 'Unknown').join(', ')
                            : 'N/A'
                          }
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{target.metrics?.noOfOffers || 0}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">{formatCrLakh(target.metrics?.offersValue || 0)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-green-700">{formatCrLakh(target.metrics?.ordersReceived || 0)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-indigo-700">{formatCrLakh(target.metrics?.expectedOffers || 0)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-amber-700">{formatCrLakh(target.metrics?.openFunnel || 0)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-cyan-700">{target.metrics?.orderBooking || 0}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCrLakh(target.targetValue)}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge className={`${getAchievementColor(target.achievement)} text-xs font-bold`}>
                            {target.achievement?.toFixed(1) || 0}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge className={`${getAchievementColor(target.expectedAchievement)} text-xs font-bold`}>
                            {target.expectedAchievement?.toFixed(1) || 0}%
                          </Badge>
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-semibold ${
                          (target.metrics?.balanceBU || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}>
                          {formatCrLakh(target.metrics?.balanceBU || 0)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenUserDetails(target)}
                            className="h-8 w-8 p-0 text-purple-600 hover:bg-purple-100 hover:text-purple-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {userTargets.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No user targets found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Offer Report Results */}
      {filters.reportType === 'offer-summary' && reportData && offers.length > 0 && (
        <div className="space-y-6">
          {/* Summary Cards - Enhanced Design */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Offers Card */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Offers</CardTitle>
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">
                    {filteredOffers.length}
                  </div>
                  {filters.search || filters.stage ? (
                    <p className="text-xs text-gray-500">
                      Filtered from <span className="font-semibold text-gray-700">{totalOffers}</span> total
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Out of <span className="font-semibold text-gray-700">{totalOffers || 0}</span> total offers
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Total Offer Value Card */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Offer Value</CardTitle>
                  <DollarSign className="h-5 w-5 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-amber-600" title={formatINRFull(summary.totalOfferValue || 0)}>
                    {formatCrLakh(summary.totalOfferValue || 0)}
                  </div>
                  <p className="text-xs text-gray-500">
                    Avg: <span className="font-semibold text-gray-700">
                      {formatCrLakh((summary.totalOfferValue || 0) / Math.max(filteredOffers.length, 1))}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Total PO Value Card */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">Total PO Value</CardTitle>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-green-600" title={formatINRFull(summary.totalPoValue || 0)}>
                    {formatCrLakh(summary.totalPoValue || 0)}
                  </div>
                  <p className="text-xs text-gray-500">
                    Conversion: <span className="font-semibold text-gray-700">
                      {((summary.totalPoValue || 0) / Math.max(summary.totalOfferValue || 1) * 100).toFixed(1)}%
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Won Offers Card */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">Won Offers</CardTitle>
                  <Trophy className="h-5 w-5 text-yellow-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-green-700">
                    {offers.filter(o => o.stage === 'WON').length}
                  </div>
                  <p className="text-xs text-gray-600">
                    Success Rate: <span className="font-semibold text-green-700">
                      {((offers.filter(o => o.stage === 'WON').length / Math.max(filteredOffers.length, 1)) * 100).toFixed(1)}%
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Won Offers Details Section */}
          {offers.filter(o => o.stage === 'WON').length > 0 && (
            <Card className="border-0 shadow-md bg-gradient-to-r from-green-50 to-emerald-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    <div>
                      <CardTitle className="text-lg">Won Offers Summary</CardTitle>
                      <CardDescription>Detailed breakdown of successfully won offers</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600 font-medium">Won Offers Count</p>
                    <p className="text-2xl font-bold text-green-700 mt-2">
                      {offers.filter(o => o.stage === 'WON').length}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600 font-medium">Won Offer Value</p>
                    <p className="text-2xl font-bold text-green-700 mt-2" title={formatINRFull(summary.wonOfferValue || 0)}>
                      {formatCrLakh(summary.wonOfferValue || 0)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600 font-medium">Won PO Value</p>
                    <p className="text-2xl font-bold text-green-700 mt-2" title={formatINRFull(summary.wonPoValue || 0)}>
                      {formatCrLakh(summary.wonPoValue || 0)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600 font-medium">Success Rate</p>
                    <p className="text-2xl font-bold text-green-700 mt-2">
                      {(summary.successRate || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search Bar Above Table */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Search & Filter Offers</Label>
                <Input
                  type="text"
                  placeholder="Search by offer #, title, company, contact, PO #, serial number... (instant filter)"
                  value={filters.search || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange({ search: e.target.value || undefined })}
                  className="w-full"
                />
                {filters.search && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Showing {filteredOffers.length} result{filteredOffers.length !== 1 ? 's' : ''} for "{filters.search}"
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Offers Table */}
          <ReportsTable
            offers={filteredOffers}
            loading={loading}
            onViewOffer={handleViewOffer}
            currentPage={currentPage}
            totalPages={totalPages}
            totalOffers={filteredOffers.length}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Product Type Analysis Report */}
      {filters.reportType === 'product-type-analysis' && productTypeAnalysisData && (
        <ProductTypeAnalysisReport data={productTypeAnalysisData} />
      )}

      {/* Customer Performance Report */}
      {filters.reportType === 'customer-performance' && customerPerformanceData && (
        <CustomerPerformanceReport data={customerPerformanceData} />
      )}

      {/* Advanced/New Reports */}
      {/* Advanced Ticket Summary Report */}
      {filters.reportType === 'ticket-summary' && ticketSummaryData && (
        <AdvancedTicketSummaryReport reportData={ticketSummaryData} />
      )}

      {/* Customer Satisfaction Report */}
      {filters.reportType === 'customer-satisfaction' && customerSatisfactionData && (
        <CustomerSatisfactionReport reportData={customerSatisfactionData} />
      )}

      {/* Advanced Machine Analytics Report */}
      {filters.reportType === 'industrial-data' && industrialDataReport && (
        <AdvancedMachineAnalyticsReport reportData={industrialDataReport} />
      )}

      {/* Advanced Zone Performance Report */}
      {filters.reportType === 'zone-performance' && zonePerformanceData && (
        <AdvancedZonePerformanceReport reportData={zonePerformanceData} />
      )}

      {/* Service Person Performance Report */}
      {filters.reportType === 'agent-productivity' && servicePersonPerformanceData && (
        <ServicePersonPerformanceReport reportData={servicePersonPerformanceData} />
      )}

      {/* Service Person Attendance Report */}
      {filters.reportType === 'sla-performance' && servicePersonAttendanceData && (
        <ServicePersonAttendanceReport reportData={servicePersonAttendanceData} />
      )}

      {/* Empty State */}
      {((filters.reportType === 'offer-summary' && !reportData) || 
        (filters.reportType === 'target-report' && !targetSummary) ||
        (filters.reportType === 'product-type-analysis' && !productTypeAnalysisData) ||
        (filters.reportType === 'customer-performance' && !customerPerformanceData) ||
        (filters.reportType === 'ticket-summary' && !ticketSummaryData) ||
        (filters.reportType === 'customer-satisfaction' && !customerSatisfactionData) ||
        (filters.reportType === 'industrial-data' && !industrialDataReport) ||
        (filters.reportType === 'zone-performance' && !zonePerformanceData) ||
        (filters.reportType === 'agent-productivity' && !servicePersonPerformanceData) ||
        (filters.reportType === 'sla-performance' && !servicePersonAttendanceData)) && (
        <Card className="text-center py-12">
          <CardContent>
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
            <p className="text-gray-500 mb-4">
              Select your report parameters and click "Generate Report" to view analytics
            </p>
          </CardContent>
        </Card>
      )}

      {/* Offer Details Dialog */}
      {selectedOfferId && (
        <OfferDetailsDialog
          offerId={selectedOfferId}
          open={isDetailsOpen}
          onClose={handleCloseDetails}
        />
      )}

      {/* Zone Target Details Dialog */}
      {selectedZoneDetails && (
        <ZoneTargetDetailsDialog
          open={isZoneDetailsOpen}
          onClose={() => {
            setIsZoneDetailsOpen(false);
            setSelectedZoneDetails(null);
          }}
          zoneId={selectedZoneDetails.zoneId}
          targetPeriod={selectedZoneDetails.targetPeriod}
          periodType={selectedZoneDetails.periodType as 'MONTHLY' | 'YEARLY'}
        />
      )}

      {/* User Target Details Dialog */}
      {selectedUserDetails && (
        <UserTargetDetailsDialog
          open={isUserDetailsOpen}
          onClose={() => {
            setIsUserDetailsOpen(false);
            setSelectedUserDetails(null);
          }}
          userId={selectedUserDetails.userId}
          targetPeriod={selectedUserDetails.targetPeriod}
          periodType={selectedUserDetails.periodType as 'MONTHLY' | 'YEARLY'}
        />
      )}

    </>
  );
};

export default ReportsClient;

