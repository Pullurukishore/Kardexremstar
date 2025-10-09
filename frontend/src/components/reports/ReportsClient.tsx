'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/api-client';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ReportHeader } from '@/components/reports/ReportHeader';
import { SummaryCards } from '@/components/reports/SummaryCards';
import { ReportRenderer } from '@/components/reports/ReportRenderer';
import { REPORT_TYPES } from '@/components/reports/types';
import type { ReportFilters as ReportFiltersType } from '@/components/reports/types';

interface ReportsClientProps {
  initialFilters: ReportFiltersType;
  initialReportData: any;
  zones: any[];
  customers: any[];
  assets: any[];
  isZoneUser?: boolean;
}

export default function ReportsClient({ 
  initialFilters, 
  initialReportData, 
  zones, 
  customers, 
  assets,
  isZoneUser = false
}: ReportsClientProps) {
  const [filters, setFilters] = useState<ReportFiltersType>(initialFilters);
  const [reportData, setReportData] = useState(initialReportData);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dynamicCustomers, setDynamicCustomers] = useState(customers);
  const [dynamicAssets, setDynamicAssets] = useState(assets);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  const selectedReportType = REPORT_TYPES.find(type => type.value === filters.reportType);

  // Initialize customers and assets for industrial-data reports
  React.useEffect(() => {
    if (filters.reportType === 'industrial-data' && filters.zoneId) {
      fetchCustomersForZone(filters.zoneId);
    }
  }, [filters.reportType]);

  React.useEffect(() => {
    if (filters.reportType === 'industrial-data' && filters.customerId) {
      fetchAssetsForCustomer(filters.customerId);
    }
  }, [filters.customerId]);

  const handleFilterChange = async (newFilters: ReportFiltersType) => {
    console.log('Filters changed - no auto-generation');
    
    // Reset dynamic data when switching away from industrial-data reports
    if (filters.reportType === 'industrial-data' && newFilters.reportType !== 'industrial-data') {
      setDynamicCustomers([]);
      setDynamicAssets([]);
    }
    
    // Handle zone change for industrial-data reports
    if (newFilters.reportType === 'industrial-data') {
      // If zone changed, fetch customers for that zone
      if (newFilters.zoneId !== filters.zoneId) {
        await fetchCustomersForZone(newFilters.zoneId);
        // Clear customer and asset selection when zone changes
        newFilters = { ...newFilters, customerId: undefined, assetId: undefined };
        setDynamicAssets([]);
      }
      
      // If customer changed, fetch assets for that customer
      if (newFilters.customerId !== filters.customerId) {
        if (newFilters.customerId) {
          await fetchAssetsForCustomer(newFilters.customerId);
        } else {
          setDynamicAssets([]);
        }
        // Clear asset selection when customer changes
        if (!newFilters.customerId) {
          newFilters = { ...newFilters, assetId: undefined };
        }
      }
    }
    
    setFilters(newFilters);
  };

  // Function to fetch customers for a specific zone
  const fetchCustomersForZone = async (zoneId?: string) => {
    if (!zoneId) {
      setDynamicCustomers([]);
      return;
    }
    
    setIsLoadingCustomers(true);
    try {
      const params = new URLSearchParams({ isActive: 'true', serviceZoneId: zoneId });
      const response = await apiClient.get(`/customers?${params.toString()}`);
      const customersData = Array.isArray(response) ? response : (response.data || []);
      setDynamicCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers for zone:', error);
      setDynamicCustomers([]);
    } finally {
      setIsLoadingCustomers(false);
    }
  };
  
  // Function to fetch assets for a specific customer
  const fetchAssetsForCustomer = async (customerId: string) => {
    setIsLoadingAssets(true);
    try {
      const params = new URLSearchParams({ customerId });
      const response = await apiClient.get(`/assets?${params.toString()}`);
      // Handle the structured response format from asset controller
      const assetsData = response.data?.data || response.data || [];
      setDynamicAssets(assetsData);
    } catch (error) {
      console.error('Error fetching assets for customer:', error);
      setDynamicAssets([]);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const handleRefresh = async (customFilters?: ReportFiltersType) => {
    const activeFilters = customFilters || filters;
    setIsLoading(true);
    try {
      let response;
      
      if (activeFilters.reportType === 'service-person-reports' || activeFilters.reportType === 'service-person-attendance') {
        // Use backend service person reports endpoints (already include day-wise activities)
        const fromDate = activeFilters.dateRange?.from?.toISOString().split('T')[0];
        const toDate = activeFilters.dateRange?.to?.toISOString().split('T')[0];

        const [reportsResponse, summaryResponse] = await Promise.all([
          apiClient.get('/admin/service-person-reports', {
            params: {
              fromDate,
              toDate,
              // Temporarily remove zone filtering for service person reports to show all service persons
              // zoneId: activeFilters.zoneId,
              limit: 1000,
              page: 1,
            }
          }),
          apiClient.get('/admin/service-person-reports/summary', {
            params: {
              fromDate,
              toDate,
              zoneId: activeFilters.zoneId,
            }
          })
        ]);

        // Handle different response structures between api and apiClient
        const data = reportsResponse.data?.data || reportsResponse.data || {};
        const summaryData = summaryResponse.data?.data || summaryResponse.data || {};

        // Map backend response structure to expected frontend structure
        const mappedReports = (data.servicePersonReports || []).map((person: any) => ({
          ...person,
          zones: person.serviceZones?.map((sz: any) => sz.name) || [], // Map serviceZones to zones array
        }));

        setReportData({
          reports: mappedReports,
          total: data.total || 0,
          page: data.page || 1,
          limit: data.limit || 50,
          summary: summaryData,
          dateRange: {
            from: activeFilters.dateRange?.from?.toISOString().split('T')[0] || '',
            to: activeFilters.dateRange?.to?.toISOString().split('T')[0] || '',
            totalDays: activeFilters.dateRange?.from && activeFilters.dateRange?.to 
              ? Math.ceil((activeFilters.dateRange.to.getTime() - activeFilters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
              : 0
          }
        });
      } else {
        // Call regular reports API or zone reports API based on user type
        const endpoint = isZoneUser ? '/reports/zone' : '/reports/generate';
        response = await apiClient.get(endpoint, {
          params: {
            reportType: activeFilters.reportType,
            startDate: activeFilters.dateRange?.from?.toISOString(),
            endDate: activeFilters.dateRange?.to?.toISOString(),
            from: activeFilters.dateRange?.from?.toISOString().split('T')[0],
            to: activeFilters.dateRange?.to?.toISOString().split('T')[0],
            zoneId: activeFilters.zoneId,
            customerId: activeFilters.customerId,
            assetId: activeFilters.assetId
          }
        });
        // Handle different response structures
        console.log('Full API response:', response);
        console.log('response.data:', response.data);
        
        // Try multiple levels of nesting to find the actual data
        let data = response.data?.data?.data || response.data?.data || response.data || response || {};
        
        console.log('Extracted report data:', data);
        console.log('Data keys:', Object.keys(data));
        setReportData(data);
      }
      
      toast.success('Report refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh report:', error);
      toast.error('Failed to refresh report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setIsExporting(true);
    try {
      let response;
      // Get token from multiple sources (same as api-client)
      const getToken = () => {
        if (typeof window !== 'undefined') {
          const localStorageToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
          if (localStorageToken) return localStorageToken;
          
          // Check cookies as fallback
          const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return null;
          };
          
          return getCookie('accessToken') || getCookie('token') || localStorage.getItem('cookie_accessToken');
        }
        return null;
      };
      
      const token = getToken();
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api';
      
      console.log('Export token check:', { hasToken: !!token, tokenPrefix: token?.substring(0, 20) });
      
      if (!token) {
        console.error('No authentication token found');
        toast.error('Authentication required. Please log in again.');
        return;
      }
      
      if (filters.reportType === 'service-person-reports' || filters.reportType === 'service-person-attendance') {
        // Determine the correct export endpoint based on the report type
        const exportType = filters.reportType === 'service-person-attendance' ? 'attendance' : 'performance';
        const exportEndpoint = `${baseURL}/admin/service-person-reports/export/${exportType}`;

        // Export service person reports via dedicated endpoint
        const params = new URLSearchParams();
        if (filters.dateRange?.from) params.append('fromDate', filters.dateRange.from.toISOString().split('T')[0]);
        if (filters.dateRange?.to) params.append('toDate', filters.dateRange.to.toISOString().split('T')[0]);
        if (filters.zoneId) params.append('zoneId', filters.zoneId);
        params.append('format', format); // Pass the format (pdf/excel)

        // Use fetch for blob responses to avoid apiClient wrapper issues
        const fetchResponse = await fetch(`${exportEndpoint}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error(`Service person ${exportType} export failed:`, { status: fetchResponse.status, statusText: fetchResponse.statusText, body: errorText });
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || errorData.message || `Export failed: ${fetchResponse.status}`);
          } catch (e) {
            throw new Error(`Export failed: ${fetchResponse.status} ${fetchResponse.statusText}`);
          }
        }

        response = { data: await fetchResponse.blob() };
      } else {
        // Export regular reports or zone reports based on user type
        const params = new URLSearchParams();
        params.append('reportType', filters.reportType);
        params.append('format', format);
        if (filters.dateRange?.from) params.append('from', filters.dateRange.from.toISOString().split('T')[0]);
        if (filters.dateRange?.to) params.append('to', filters.dateRange.to.toISOString().split('T')[0]);
        if (filters.zoneId) params.append('zoneId', filters.zoneId);
        if (filters.customerId) params.append('customerId', filters.customerId);
        if (filters.assetId) params.append('assetId', filters.assetId);

        const exportEndpoint = isZoneUser ? '/reports/zone/export' : '/reports/general/export';
        
        // Use fetch for blob responses to avoid apiClient wrapper issues
        const fetchResponse = await fetch(`${baseURL}${exportEndpoint}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error('Report export failed:', { status: fetchResponse.status, statusText: fetchResponse.statusText, body: errorText });
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || errorData.message || `Export failed: ${fetchResponse.status}`);
          } catch (e) {
            throw new Error(`Export failed: ${fetchResponse.status} ${fetchResponse.statusText}`);
          }
        }

        response = { data: await fetchResponse.blob() };
      }

      // Check if the response is actually a blob (file) or an error (JSON/HTML)
      const blob = response.data;
      
      // Validate blob exists
      if (!blob) {
        console.error('Export error: No data received from server');
        toast.error('Failed to export report. No data received.');
        return;
      }

      // Check if it's a Blob object
      if (!(blob instanceof Blob)) {
        console.error('Export error: Response is not a Blob', blob);
        toast.error('Failed to export report. Invalid response format.');
        return;
      }
      
      // If blob is very small or has wrong content type, it might be an error
      if (blob.size < 100 || blob.type.includes('text/html') || blob.type.includes('application/json')) {
        // Try to read the blob as text to get error message
        const text = await blob.text();
        console.error('Export error response:', text);
        
        try {
          const errorData = JSON.parse(text);
          toast.error(errorData.error || errorData.message || 'Failed to export report');
        } catch {
          toast.error('Failed to export report. Server returned an error.');
        }
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileExtension = format === 'excel' ? 'xlsx' : format;
      link.download = `report-${filters.reportType}-${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Report exported as ${fileExtension.toUpperCase()}`);
    } catch (error: any) {
      console.error('Failed to export report:', error);
      
      // Try to extract error message from response
      if (error.response?.data) {
        try {
          const blob = error.response.data;
          if (blob instanceof Blob) {
            const text = await blob.text();
            const errorData = JSON.parse(text);
            toast.error(errorData.error || errorData.message || 'Failed to export report');
          } else {
            toast.error(error.response.data.error || error.response.data.message || 'Failed to export report');
          }
        } catch {
          toast.error('Failed to export report');
        }
      } else {
        toast.error(error.message || 'Failed to export report');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <ReportHeader 
        filters={filters}
        reportData={reportData}
      />

      {/* Business Hours Notice */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 text-blue-800">
          <Info className="h-4 w-4" />
          <span className="text-sm font-medium">
            Time metrics in reports (Resolution Time, Response Time, Downtime, Onsite Work) are calculated using business hours only (9 AM - 5 PM, Monday to Saturday). Travel times show actual elapsed time.
          </span>
        </div>
      </div>

      {/* Report Generation Controls */}
      <Card className="mb-6 card-mobile">
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
                onClick={() => handleRefresh()} 
                disabled={isLoading}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
              >
                <BarChart3 className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Generating...' : 'Generate Report'}
              </Button>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button 
                  onClick={() => handleExport('excel')} 
                  disabled={!reportData || isExporting}
                  variant="outline"
                  className="w-full sm:w-auto touch-manipulation min-h-[44px] border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export Excel'}
                </Button>
                <Button 
                  onClick={() => handleExport('pdf')} 
                  disabled={!reportData || isExporting}
                  variant="outline"
                  className="w-full sm:w-auto touch-manipulation min-h-[44px] border-red-600 text-red-600 hover:bg-red-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export PDF'}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ReportFilters 
            filters={filters} 
            zones={zones} 
            customers={dynamicCustomers} 
            assets={dynamicAssets} 
            onFiltersChange={handleFilterChange}
            isLoadingCustomers={isLoadingCustomers}
            isLoadingAssets={isLoadingAssets}
            isZoneUser={isZoneUser}
          />
          {selectedReportType && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900">{selectedReportType.label}</h4>
              <p className="text-sm text-blue-700 mt-1">{selectedReportType.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Report Results */}
      {reportData && (
        <div className="space-y-6">
          {/* Summary Cards - Skip for reports that have their own summary */}
          {!['ticket-summary', 'industrial-data'].includes(filters.reportType) && (
            <SummaryCards summary={reportData.summary || {}} />
          )}

          {/* Report Specific Content */}
          <ReportRenderer reportType={filters.reportType} reportData={reportData} />
        </div>
      )}

      {/* Empty State */}
      {!reportData && (
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
    </>
  );
}
