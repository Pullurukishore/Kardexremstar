import axios from 'axios';
import api from '@/lib/api/axios';

// Ensure this matches backend server (Express app mounts routes under /api)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Auth methods
  async login(credentials: { email: string; password: string }) {
    const response = await api.post(`${this.baseURL}/auth/login`, credentials);
    return response.data;
  }

  async logout() {
    const response = await api.post(`${this.baseURL}/auth/logout`);
    return response.data;
  }

  async getMe() {
    const response = await api.get(`${this.baseURL}/auth/me`);
    return response.data;
  }

  // Offer methods
  async getOffers(params?: any) {
    const response = await api.get(`${this.baseURL}/offers`, { params });
    return response.data;
  }

  async getOffer(id: number) {
    const response = await api.get(`${this.baseURL}/offers/${id}`);
    return response.data;
  }

  async createOffer(offerData: any) {
    const response = await api.post(`${this.baseURL}/offers`, offerData);
    return response.data;
  }

  async updateOffer(id: number, offerData: any) {
    const response = await api.put(`${this.baseURL}/offers/${id}`, offerData);
    return response.data;
  }

  async deleteOffer(id: number) {
    const response = await api.delete(`${this.baseURL}/offers/${id}`);
    return response.data;
  }

  async getNextOfferReference(params: { zoneId: number; productType: string }) {
    const response = await api.get(`${this.baseURL}/offers/next-reference`, { params });
    return response.data;
  }

  async getOfferForQuoteAdmin(id: number) {
    const response = await api.get(`${this.baseURL}/offers/quote/admin/${id}`);
    return response.data;
  }

  async getOfferForQuote(id: number) {
    const response = await api.get(`${this.baseURL}/offers/quote/zone/${id}`);
    return response.data;
  }

  async getOfferForQuoteZone(id: number) {
    const response = await api.get(`${this.baseURL}/offers/quote/zone/${id}`);
    return response.data;
  }

  // Target methods
  async getTargets(params?: any) {
    const response = await api.get(`${this.baseURL}/targets`, { params });
    return response.data;
  }

  async createTarget(targetData: any) {
    const response = await api.post(`${this.baseURL}/targets`, targetData);
    return response.data;
  }

  async updateTarget(id: number, targetData: any) {
    const response = await api.put(`${this.baseURL}/targets/${id}`, targetData);
    return response.data;
  }

  async deleteTarget(id: number) {
    const response = await api.delete(`${this.baseURL}/targets/${id}`);
    return response.data;
  }

  async getTargetSummary(params?: any) {
    const response = await api.get(`${this.baseURL}/targets/summary`, { params });
    return response.data;
  }

  async getTargetsSummary(params?: any) {
    return this.getTargetSummary(params);
  }

  // Spare Part methods
  async getSpareParts(params?: any) {
    const response = await api.get(`${this.baseURL}/spare-parts`, { params });
    return response.data;
  }

  async createSparePart(partData: any) {
    const response = await api.post(`${this.baseURL}/spare-parts`, partData);
    return response.data;
  }

  async updateSparePart(id: number, partData: any) {
    const response = await api.put(`${this.baseURL}/spare-parts/${id}`, partData);
    return response.data;
  }

  async deleteSparePart(id: number) {
    const response = await api.delete(`${this.baseURL}/spare-parts/${id}`);
    return response.data;
  }

  async bulkUpdatePrices(updates: any[]) {
    const response = await api.put(`${this.baseURL}/spare-parts/bulk-update-prices`, { updates });
    return response.data;
  }

  async bulkUpdateSparePartPrices(updates: any[]) {
    return this.bulkUpdatePrices(updates);
  }

  // Forecast methods
  async getForecastSummary(params?: any) {
    const response = await api.get(`${this.baseURL}/forecast/summary`, { params });
    return response.data;
  }

  async getForecastBreakdown(params?: any) {
    const response = await api.get(`${this.baseURL}/forecast/zone-user-breakdown`, { params });
    return response.data;
  }

  async getPoExpected(params?: any) {
    const response = await api.get(`${this.baseURL}/forecast/po-expected`, { params });
    return response.data;
  }

  async getForecastHighlights(params?: any) {
    const response = await api.get(`${this.baseURL}/forecast/highlights`, { params });
    return response.data;
  }

  async exportForecast(params?: any) {
    const response = await api.get(`${this.baseURL}/forecast/export`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  async exportForecastExcel(params?: any) {
    const response = await api.get(`${this.baseURL}/forecast/export`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  // ============================================================================
  // FORST (Field Operations Report Summary Tracking) - NEW REDESIGNED API
  // ============================================================================

  // New Dashboard API - Main KPI overview
  async getForstDashboard(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/dashboard`, { params });
    return response.data;
  }

  // Zone Performance API
  async getForstZonePerformance(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/zones`, { params });
    return response.data;
  }

  // Quarterly Analysis API
  async getForstQuarterly(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/quarterly`, { params });
    return response.data;
  }

  // Product Type Analysis API
  async getForstProducts(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/products`, { params });
    return response.data;
  }

  // Team Performance API
  async getForstTeam(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/team`, { params });
    return response.data;
  }

  // Pipeline Analysis API
  async getForstPipeline(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/pipeline`, { params });
    return response.data;
  }

  // Complete Report API
  async getForstReport(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/report`, { params });
    return response.data;
  }

  // Export Excel
  async exportForstExcel(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/export`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  // ============================================================================
  // COMPREHENSIVE FORECAST API - Zone, User, Product, Funnel, Hit Rate
  // ============================================================================

  // Forecast Summary - Executive KPIs
  async getForstForecastSummary(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/forecast/summary`, { params });
    return response.data;
  }

  // Zone-wise Forecast - Monthly breakdown with targets
  async getForstZoneForecast(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/forecast/zones`, { params });
    return response.data;
  }

  // User-wise Forecast - Individual performance with ranking
  async getForstUserForecast(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/forecast/users`, { params });
    return response.data;
  }

  // Product-wise Forecast - By product type
  async getForstProductForecastDetail(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/forecast/products`, { params });
    return response.data;
  }

  // Funnel Analysis - Pipeline stages with conversion
  async getForstFunnelAnalysis(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/forecast/funnel`, { params });
    return response.data;
  }

  // Hit Rate Analysis - By zone, user, product
  async getForstHitRateAnalysis(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/forecast/hitrate`, { params });
    return response.data;
  }

  // ----- LEGACY FORST METHODS (Backward Compatibility) -----


  async getForstCompleteReport(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/complete-report`, { params });
    return response.data;
  }

  async getForstOffersHighlights(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/offers-highlights`, { params });
    return response.data;
  }

  async getForstZoneMonthly(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/zone-monthly`, { params });
    return response.data;
  }

  async getForstForecastQuarterly(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/forecast-quarterly`, { params });
    return response.data;
  }

  async getForstProductTypeSummary(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/product-type-summary`, { params });
    return response.data;
  }

  async getForstPersonWise(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/person-wise`, { params });
    return response.data;
  }

  async getForstProductForecast(params?: any) {
    const response = await api.get(`${this.baseURL}/forst/product-forecast`, { params });
    return response.data;
  }


  // Target methods
  async getZoneTargets(params?: any) {
    const response = await api.get(`${this.baseURL}/targets/zones`, { params });
    return response.data;
  }

  async getUserTargets(params?: any) {
    const response = await api.get(`${this.baseURL}/targets/users`, { params });
    return response.data;
  }

  async setZoneTarget(targetData: any) {
    const response = await api.post(`${this.baseURL}/targets/zones`, targetData);
    return response.data;
  }

  async updateZoneTarget(targetId: number, targetData: any) {
    const response = await api.put(`${this.baseURL}/targets/zones/${targetId}`, targetData);
    return response.data;
  }

  async deleteZoneTarget(targetId: number) {
    const response = await api.delete(`${this.baseURL}/targets/zones/${targetId}`);
    return response.data;
  }

  async getZoneTargetDetails(zoneId: number, params?: any) {
    const response = await api.get(`${this.baseURL}/targets/zones/${zoneId}/details`, { params });
    return response.data;
  }

  async setUserTarget(targetData: any) {
    const response = await api.post(`${this.baseURL}/targets/users`, targetData);
    return response.data;
  }

  async updateUserTarget(targetId: number, targetData: any) {
    const response = await api.put(`${this.baseURL}/targets/users/${targetId}`, targetData);
    return response.data;
  }

  async deleteUserTarget(targetId: number) {
    const response = await api.delete(`${this.baseURL}/targets/users/${targetId}`);
    return response.data;
  }

  async getUserTargetDetails(userId: number, params?: any) {
    const response = await api.get(`${this.baseURL}/targets/users/${userId}/details`, { params });
    return response.data;
  }

  // Activity methods
  async getActivities(params?: any) {
    const response = await api.get(`${this.baseURL}/activities`, { params });
    return response.data;
  }

  async getActivityStats(params?: any) {
    const response = await api.get(`${this.baseURL}/activities/stats`, { params });
    return response.data;
  }

  async getZoneActivities(params?: any) {
    const response = await api.get(`${this.baseURL}/activities/zone`, { params });
    return response.data;
  }

  async getUserActivities(params?: any) {
    const response = await api.get(`${this.baseURL}/activities/user`, { params });
    return response.data;
  }

  async getActivityHeatmap(params?: any) {
    const response = await api.get(`${this.baseURL}/activities/heatmap`, { params });
    return response.data;
  }

  async getRealtimeActivities(params?: any) {
    const response = await api.get(`${this.baseURL}/activities/realtime`, { params });
    return response.data;
  }

  async getOfferActivities(offerReferenceNumber: string, params?: any) {
    const response = await api.get(`${this.baseURL}/activities/offer`, {
      params: { ...params, offerReferenceNumber },
    });
    return response.data;
  }

  async getActivityComparison(params?: any) {
    const response = await api.get(`${this.baseURL}/activities/comparison`, { params });
    return response.data;
  }

  async getActivityByEntity(entityType: string, entityId: number, params?: any) {
    const response = await api.get(`${this.baseURL}/activities/entity/${entityType}/${entityId}`, { params });
    return response.data;
  }

  async getUserLeaderboard(params?: any) {
    const response = await api.get(`${this.baseURL}/activities/leaderboard`, { params });
    return response.data;
  }

  async exportActivities(params?: any) {
    const response = await api.get(`${this.baseURL}/tickets/export`, { params });
    return response.data;
  }

  async getSecurityAlerts(params?: any) {
    const response = await api.get(`${this.baseURL}/activities/security`, { params });
    return response.data;
  }

  async getWorkflowAnalysis(params?: any) {
    const response = await api.get(`${this.baseURL}/activities/workflow`, { params });
    return response.data;
  }

  async getComplianceReport(params?: any) {
    const response = await api.get(`${this.baseURL}/activities/compliance`, { params });
    return response.data;
  }

  // Customer methods
  async getCustomers(params?: { zoneId?: number | string;[key: string]: any }) {
    const { include, zoneId, limit = 100, ...queryParams } = params || {};

    // Map zoneId to serviceZoneId for the backend
    if (zoneId) {
      queryParams.serviceZoneId = zoneId;
    }

    // Ensure limit doesn't exceed the maximum allowed by the backend (100)
    const safeLimit = Math.min(Number(limit) || 100, 100);

    // Add include parameter to the request if provided
    if (include) {
      queryParams.include = include;
    }

    console.log('Fetching customers with params:', { ...queryParams, limit: safeLimit });

    const response = await api.get(`${this.baseURL}/customers`, {
      params: {
        ...queryParams,
        limit: safeLimit
      }
    });

    // Log the response to debug
    console.log('Customers API response:', response.data);

    // Return the data - backend already includes contacts/assets if requested
    const customers = response.data?.data || response.data || [];
    console.log(`Fetched ${customers.length} customers`);

    return customers;
  }

  async getCustomer(id: number) {
    const response = await api.get(`${this.baseURL}/customers/${id}`);
    return response.data;
  }

  async createCustomer(customerData: any) {
    const response = await api.post(`${this.baseURL}/customers`, customerData);
    return response.data;
  }

  async createCustomerContact(customerId: number, contactData: any) {
    const response = await api.post(`${this.baseURL}/customers/${customerId}/contacts`, contactData);
    return response.data;
  }

  async createCustomerAsset(customerId: number, assetData: any) {
    const response = await api.post(`${this.baseURL}/customers/${customerId}/assets`, assetData);
    return response.data;
  }

  async updateCustomer(id: number, customerData: any) {
    const response = await api.put(`${this.baseURL}/customers/${id}`, customerData);
    return response.data;
  }

  async deleteCustomer(id: number) {
    const response = await api.delete(`${this.baseURL}/customers/${id}`);
    return response.data;
  }

  // User methods
  async getUsers(params?: any) {
    const response = await api.get(`${this.baseURL}/admin/users`, { params });
    return response.data;
  }

  async getUser(id: number) {
    const response = await api.get(`${this.baseURL}/admin/users/${id}`);
    return response.data;
  }

  async createUser(userData: any) {
    const response = await api.post(`${this.baseURL}/admin/users`, userData);
    return response.data;
  }

  async updateUser(id: number, userData: any) {
    const response = await api.put(`${this.baseURL}/admin/users/${id}`, userData);
    return response.data;
  }

  async deleteUser(id: number) {
    const response = await api.delete(`${this.baseURL}/admin/users/${id}`);
    return response.data;
  }

  // Zone methods
  async getZones() {
    const response = await api.get(`${this.baseURL}/service-zones`);
    return response.data;
  }

  async getZone(id: number) {
    const response = await api.get(`${this.baseURL}/service-zones/${id}`);
    return response.data;
  }

  async createZone(zoneData: any) {
    const response = await api.post(`${this.baseURL}/service-zones`, zoneData);
    return response.data;
  }

  async updateZone(id: number, zoneData: any) {
    const response = await api.put(`${this.baseURL}/service-zones/${id}`, zoneData);
    return response.data;
  }

  async deleteZone(id: number) {
    const response = await api.delete(`${this.baseURL}/service-zones/${id}`);
    return response.data;
  }

  // Ticket methods
  async getTickets(params?: any) {
    const response = await api.get(`${this.baseURL}/tickets`, { params });
    return response.data;
  }

  async getTicket(id: number) {
    const response = await api.get(`${this.baseURL}/tickets/${id}`);
    return response.data;
  }

  async createTicket(ticketData: any) {
    const response = await api.post(`${this.baseURL}/tickets`, ticketData);
    return response.data;
  }

  async updateTicket(id: number, ticketData: any) {
    const response = await api.put(`${this.baseURL}/tickets/${id}`, ticketData);
    return response.data;
  }

  async deleteTicket(id: number) {
    const response = await api.delete(`${this.baseURL}/tickets/${id}`);
    return response.data;
  }

  async updateTicketStatus(id: number, status: string, location?: any) {
    const response = await api.post(`${this.baseURL}/tickets/${id}/status`, { status, location });
    return response.data;
  }

  async getTicketHistory(id: number) {
    const response = await api.get(`${this.baseURL}/tickets/${id}/history`);
    return response.data;
  }

  async getTicketStats(params?: any) {
    const response = await api.get(`${this.baseURL}/tickets/stats`, { params });
    return response.data;
  }

  async exportTickets(params?: any) {
    const response = await api.get(`${this.baseURL}/tickets/export`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  // Dashboard methods
  async getAdminDashboard(params?: any) {
    const response = await api.get(`${this.baseURL}/offer-dashboard/admin`, { params });
    return response.data;
  }

  async getZoneDashboard(params?: any) {
    const response = await api.get(`${this.baseURL}/offer-dashboard/zone`, { params });
    return response.data;
  }

  async getZoneManagerDashboard(params?: any) {
    const response = await api.get(`${this.baseURL}/offer-dashboard/zone-manager`, { params });
    return response.data;
  }

  async getDashboardStats(params?: any) {
    const response = await api.get(`${this.baseURL}/dashboard/stats`, { params });
    return response.data;
  }

  async getDashboardCharts(params?: any) {
    const response = await api.get(`${this.baseURL}/dashboard/charts`, { params });
    return response.data;
  }

  async getDashboardRecent(params?: any) {
    const response = await api.get(`${this.baseURL}/dashboard/recent`, { params });
    return response.data;
  }

  // Reports methods
  async generateReport(params?: any) {
    const response = await api.get(`${this.baseURL}/reports/generate`, { params });
    return response.data;
  }

  async generateZoneReport(params?: any) {
    const response = await api.get(`${this.baseURL}/reports/zone`, { params });
    return response.data;
  }

  async getServicePersonReports(params?: any) {
    const response = await api.get(`${this.baseURL}/service-person-reports`, { params });
    return response.data;
  }

  async exportReport(params?: any) {
    const response = await api.get(`${this.baseURL}/reports/export`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  async getProductTypeAnalysis(params?: any) {
    // Call the KardexCare backend for product type analysis
    const response = await api.get(`${this.baseURL}/reports/product-type-analysis`, { params });
    return response.data;
  }

  async getCustomerPerformance(params?: any) {
    // Call the KardexCare backend for customer performance
    const response = await api.get(`${this.baseURL}/reports/customer-performance`, { params });
    return response.data;
  }

  // Zone Manager specific methods
  async getZoneManagerOfferDashboard(params?: any) {
    const response = await api.get(`${this.baseURL}/offer-dashboard/zone-manager`, { params });
    return response.data;
  }

  async getZoneManagerTargets(params?: any) {
    const response = await api.get(`${this.baseURL}/targets/zone-manager`, { params });
    return response.data;
  }

  async getZoneManagerForecast(period?: string) {
    const params = period ? { period } : {};
    const response = await api.get(`${this.baseURL}/forecast/zone-manager`, { params });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;

// Export individual methods for direct imports
export const getZoneManagerOfferDashboard = (params?: any) => apiService.getZoneManagerOfferDashboard(params);
export const getZoneManagerTargets = (params?: any) => apiService.getZoneManagerTargets(params);
export const getZoneManagerForecast = (period?: string) => apiService.getZoneManagerForecast(period);
