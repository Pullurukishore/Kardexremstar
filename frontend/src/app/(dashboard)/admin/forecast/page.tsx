'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user.types';
import { useRouter } from 'next/navigation';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  RefreshCw,
  Loader2,
  Download,
  BarChart3,
  TrendingUp,
  TrendingDown,
  MapPin,
  Package,
  Users,
  Target,
  ChevronDown,
  ChevronRight,
  Building2,
  PieChart,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  AlertCircle,
  Info,
} from 'lucide-react';

// Types
interface ZoneHighlight {
  zoneId: number;
  zoneName: string;
  shortForm: string;
  numOffers: number;
  offersValue: number;
  ordersReceived: number;
  openFunnel: number;
  orderBooking: number;
  utForBooking: number;
  devPercent: number;
  balanceBu: number;
}

interface MonthlyData {
  month: number;
  monthName: string;
  offersValue: number;
  ordersReceived: number;
  ordersBooked: number;
  devOrVsBooked: number;
  ordersInHand: number;
  buMonthly: number;
  bookedVsBu: number;
  bookedVsBuPercent: number;
  offerBuMonthly: number;
  offerVsBuPercent: number;
}

interface ZoneMonthlyData {
  zoneId: number;
  zoneName: string;
  monthly: MonthlyData[];
  totals: {
    offersValue: number;
    ordersReceived: number;
    ordersBooked: number;
    buMonthly: number;
  };
  hitRate: number;
}

interface QuarterData {
  quarter: string;
  forecast: number;
  bu: number;
  devPercent: number;
}

interface ProductTypeUser {
  id: number;
  name: string;
}

interface ProductTypeSummaryZone {
  zoneId: number;
  zoneName: string;
  users: ProductTypeUser[];
  productTypes: { code: string; name: string }[];
  matrix: Record<string, Record<number, number>>;
  totals: {
    byUser: Record<number, number>;
    byProductType: Record<string, number>;
    zoneTotal: number;
  };
}

// Utility functions
const formatINR = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '₹0';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
};

const formatLargeNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  if (value >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
};

const getDeviationColor = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return 'text-slate-600 bg-slate-50';
  if (value <= -50) return 'text-rose-600 bg-rose-50';
  if (value < 0) return 'text-amber-600 bg-amber-50';
  if (value > 0) return 'text-emerald-600 bg-emerald-50';
  return 'text-slate-600 bg-slate-50';
};

const getZoneColor = (zoneName: string): string => {
  const colors: Record<string, string> = {
    WEST: 'from-yellow-400 to-amber-500',
    SOUTH: 'from-green-400 to-emerald-500',
    NORTH: 'from-cyan-400 to-blue-500',
    EAST: 'from-purple-400 to-violet-500',
  };
  return colors[zoneName] || 'from-gray-400 to-gray-500';
};

const getZoneBgColor = (zoneName: string): string => {
  const colors: Record<string, string> = {
    WEST: 'bg-yellow-50 border-yellow-200',
    SOUTH: 'bg-green-50 border-green-200',
    NORTH: 'bg-cyan-50 border-cyan-200',
    EAST: 'bg-purple-50 border-purple-200',
  };
  return colors[zoneName] || 'bg-gray-50 border-gray-200';
};

const ZONE_ORDER = ['WEST', 'SOUTH', 'NORTH', 'EAST'];

// Empty State Component
const EmptyState = ({ title, message, icon: Icon }: { title: string; message: string; icon?: any }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="p-4 bg-slate-100 rounded-full mb-4">
      {Icon ? <Icon className="h-8 w-8 text-slate-400" /> : <Info className="h-8 w-8 text-slate-400" />}
    </div>
    <h3 className="text-lg font-semibold text-slate-700 mb-2">{title}</h3>
    <p className="text-sm text-slate-500 max-w-md">{message}</p>
  </div>
);

export default function AdminForecastPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // State
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeZoneTab, setActiveZoneTab] = useState<string>('WEST');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    highlights: true,
    zoneMonthly: true,
    quarterly: true,
    productType: true,
    personWise: false,
    productForecast: false,
  });

  // Data state
  const [highlights, setHighlights] = useState<{ rows: ZoneHighlight[]; total: any; hitRate: number } | null>(null);
  const [zoneMonthly, setZoneMonthly] = useState<{ zones: ZoneMonthlyData[] } | null>(null);
  const [quarterly, setQuarterly] = useState<{ monthly: any[]; quarters: QuarterData[]; zones: string[] } | null>(null);
  const [productTypeSummary, setProductTypeSummary] = useState<{ zones: ProductTypeSummaryZone[]; grandTotals: Record<string, number> } | null>(null);
  const [personWise, setPersonWise] = useState<any>(null);
  const [productForecast, setProductForecast] = useState<any>(null);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);

  // Auth protection
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login?callbackUrl=' + encodeURIComponent('/admin/forecast'));
        return;
      }
      if (user?.role !== UserRole.ADMIN) {
        router.push('/admin/dashboard');
        return;
      }
    }
  }, [authLoading, isAuthenticated, user?.role, router]);

  // Load data
  const loadData = useCallback(async (selectedYear: number) => {
    try {
      setLoading(true);
      setError(null);
      setDataLoaded(false);

      // Try to load all data, handling errors gracefully
      const results = await Promise.allSettled([
        apiService.getForstOffersHighlights({ year: selectedYear }),
        apiService.getForstZoneMonthly({ year: selectedYear }),
        apiService.getForstForecastQuarterly({ year: selectedYear }),
        apiService.getForstProductTypeSummary({ year: selectedYear }),
        apiService.getForstPersonWise({ year: selectedYear }),
        apiService.getForstProductForecast({ year: selectedYear }),
      ]);

      // Process results
      const [highlightsRes, zoneMonthlyRes, quarterlyRes, productTypeSummaryRes, personWiseRes, productForecastRes] = results;

      if (highlightsRes.status === 'fulfilled' && highlightsRes.value?.success) {
        setHighlights(highlightsRes.value.data);
      } else {
        setHighlights({ rows: [], total: { numOffers: 0, offersValue: 0, ordersReceived: 0, openFunnel: 0, orderBooking: 0, utForBooking: 0, balanceBu: 0, devPercent: 0 }, hitRate: 0 });
      }

      if (zoneMonthlyRes.status === 'fulfilled' && zoneMonthlyRes.value?.success) {
        setZoneMonthly(zoneMonthlyRes.value.data);
        // Set first available zone as active
        if (zoneMonthlyRes.value.data?.zones?.length > 0) {
          const firstZone = ZONE_ORDER.find(z => zoneMonthlyRes.value.data.zones.some((zd: any) => zd.zoneName === z));
          if (firstZone) setActiveZoneTab(firstZone);
        }
      } else {
        setZoneMonthly({ zones: [] });
      }

      if (quarterlyRes.status === 'fulfilled' && quarterlyRes.value?.success) {
        setQuarterly(quarterlyRes.value.data);
      } else {
        setQuarterly({ monthly: [], quarters: [], zones: [] });
      }

      if (productTypeSummaryRes.status === 'fulfilled' && productTypeSummaryRes.value?.success) {
        setProductTypeSummary(productTypeSummaryRes.value.data);
      } else {
        setProductTypeSummary({ zones: [], grandTotals: {} });
      }

      if (personWiseRes.status === 'fulfilled' && personWiseRes.value?.success) {
        setPersonWise(personWiseRes.value.data);
      } else {
        setPersonWise({ persons: [], months: [], productTypes: [] });
      }

      if (productForecastRes.status === 'fulfilled' && productForecastRes.value?.success) {
        setProductForecast(productForecastRes.value.data);
      } else {
        setProductForecast({ zones: [], grandTotals: {} });
      }

      setDataLoaded(true);
    } catch (err: any) {
      console.error('FORST load error:', err);
      setError(err?.message || 'Failed to load FORST data. Please try again.');
      setDataLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === UserRole.ADMIN) {
      loadData(year);
    }
  }, [year, isAuthenticated, user?.role, loadData]);

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Download Excel
  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const blob = await apiService.exportForstExcel({ year });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FORST_Report_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export Excel. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Computed values
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return [now - 1, now, now + 1];
  }, []);

  const sortedZones = useMemo(() => {
    if (!highlights?.rows || highlights.rows.length === 0) return [];
    return [...highlights.rows].sort((a, b) => {
      const aIdx = ZONE_ORDER.indexOf(a.zoneName);
      const bIdx = ZONE_ORDER.indexOf(b.zoneName);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
  }, [highlights]);

  const activeZoneMonthlyData = useMemo(() => {
    if (!zoneMonthly?.zones || zoneMonthly.zones.length === 0) return null;
    return zoneMonthly.zones.find(z => z.zoneName === activeZoneTab) || zoneMonthly.zones[0];
  }, [zoneMonthly, activeZoneTab]);

  const hasData = useMemo(() => {
    return (
      (highlights?.rows && highlights.rows.length > 0) ||
      (zoneMonthly?.zones && zoneMonthly.zones.length > 0) ||
      (quarterly?.quarters && quarterly.quarters.length > 0)
    );
  }, [highlights, zoneMonthly, quarterly]);

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-medium text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth check
  if (!isAuthenticated || user?.role !== UserRole.ADMIN) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6 space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  KARDEX LCS: FORST Report
                </h1>
                <p className="text-blue-100 text-sm md:text-base">
                  Live Offer Funnel, Actuals, Deviations - {year}
                </p>
              </div>
            </div>
            {dataLoaded && (
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Target className="h-4 w-4 text-yellow-300" />
                  <span className="text-white font-semibold text-sm">Hit Rate: {highlights?.hitRate || 0}%</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Building2 className="h-4 w-4 text-green-300" />
                  <span className="text-white font-semibold text-sm">
                    {sortedZones.length} Zones | {highlights?.total?.numOffers || 0} Offers
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                  <TrendingUp className="h-4 w-4 text-emerald-300" />
                  <span className="text-white font-semibold text-sm">
                    Total: {formatINR(highlights?.total?.offersValue || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/30">
              <Calendar className="w-5 h-5 text-white" />
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="bg-transparent text-white font-semibold outline-none cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y} className="text-gray-900">{y}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => loadData(year)}
              disabled={loading}
              className="gap-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={downloadExcel}
              disabled={downloading || !hasData}
              className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg disabled:opacity-50"
            >
              <FileSpreadsheet className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
              {downloading ? 'Exporting...' : 'Export Excel'}
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <span className="text-lg font-medium text-gray-700">Loading FORST data...</span>
            <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-rose-50 border-2 border-rose-200 text-rose-800 px-6 py-4 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-rose-100 rounded-lg">
            <AlertCircle className="h-5 w-5 text-rose-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Error Loading Data</p>
            <p className="text-sm text-rose-600">{error}</p>
          </div>
          <Button onClick={() => loadData(year)} variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-100">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {/* No Data State */}
      {!loading && !error && dataLoaded && !hasData && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <EmptyState
            title="No Forecast Data Available"
            message={`No offers or forecast data found for ${year}. Please add offers with PO Expected Month set to ${year} or try selecting a different year.`}
            icon={BarChart3}
          />
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && dataLoaded && hasData && (
        <div className="space-y-6">
          {/* Section 1: Offers Highlights (Image 1 - Top) */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('highlights')}
              className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <PieChart className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Offers Highlights</h2>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {sortedZones.length} Zones
                </span>
              </div>
              {expandedSections.highlights ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500" />
              )}
            </button>

            {expandedSections.highlights && (
              <div className="p-5">
                {sortedZones.length === 0 ? (
                  <EmptyState
                    title="No Zone Data"
                    message="No zone-wise data available for the selected year."
                    icon={MapPin}
                  />
                ) : (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Building2 className="h-5 w-5 text-blue-200" />
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Total</span>
                        </div>
                        <div className="text-2xl font-bold">{highlights?.total?.numOffers || 0}</div>
                        <div className="text-blue-100 text-sm">Total Offers</div>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                          <TrendingUp className="h-5 w-5 text-emerald-200" />
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Value</span>
                        </div>
                        <div className="text-2xl font-bold">{formatINR(highlights?.total?.offersValue || 0)}</div>
                        <div className="text-emerald-100 text-sm">Offers Value</div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Target className="h-5 w-5 text-purple-200" />
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Orders</span>
                        </div>
                        <div className="text-2xl font-bold">{formatINR(highlights?.total?.ordersReceived || 0)}</div>
                        <div className="text-purple-100 text-sm">Orders Received</div>
                      </div>

                      <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Activity className="h-5 w-5 text-amber-200" />
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Balance</span>
                        </div>
                        <div className="text-2xl font-bold">{formatINR(highlights?.total?.balanceBu || 0)}</div>
                        <div className="text-amber-100 text-sm">Balance BU</div>
                      </div>
                    </div>

                    {/* Zone-wise Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                            <th className="text-left py-3 px-4 font-semibold rounded-tl-lg">Zone</th>
                            <th className="text-right py-3 px-4 font-semibold">No. of Offers</th>
                            <th className="text-right py-3 px-4 font-semibold">Offers Value</th>
                            <th className="text-right py-3 px-4 font-semibold">Orders Received</th>
                            <th className="text-right py-3 px-4 font-semibold">Open Funnel</th>
                            <th className="text-right py-3 px-4 font-semibold">Order Booking</th>
                            <th className="text-right py-3 px-4 font-semibold">UT for Booking</th>
                            <th className="text-center py-3 px-4 font-semibold">%</th>
                            <th className="text-right py-3 px-4 font-semibold rounded-tr-lg">Balance BU</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedZones.map((zone, idx) => (
                            <tr
                              key={zone.zoneId}
                              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                              }`}
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getZoneColor(zone.zoneName)}`}></div>
                                  <span className="font-semibold text-gray-900">{zone.zoneName}</span>
                                </div>
                              </td>
                              <td className="text-right py-3 px-4 font-medium text-blue-600">{zone.numOffers || 0}</td>
                              <td className="text-right py-3 px-4 font-medium text-gray-900">{formatINR(zone.offersValue)}</td>
                              <td className="text-right py-3 px-4 font-medium text-emerald-600">{formatINR(zone.ordersReceived)}</td>
                              <td className="text-right py-3 px-4 font-medium text-amber-600">{formatINR(zone.openFunnel)}</td>
                              <td className="text-right py-3 px-4 font-medium text-purple-600">{formatINR(zone.orderBooking)}</td>
                              <td className="text-right py-3 px-4 font-medium text-gray-700">{formatINR(zone.utForBooking)}</td>
                              <td className="text-center py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getDeviationColor(zone.devPercent)}`}>
                                  {(zone.devPercent || 0) > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                  {(zone.devPercent || 0).toFixed(0)}%
                                </span>
                              </td>
                              <td className="text-right py-3 px-4 font-bold text-indigo-600">{formatINR(zone.balanceBu)}</td>
                            </tr>
                          ))}
                          {/* Total Row */}
                          <tr className="bg-gradient-to-r from-slate-100 to-slate-200 font-bold border-t-2 border-slate-300">
                            <td className="py-3 px-4 text-gray-900">Total</td>
                            <td className="text-right py-3 px-4 text-blue-700">{highlights?.total?.numOffers || 0}</td>
                            <td className="text-right py-3 px-4 text-gray-900">{formatINR(highlights?.total?.offersValue || 0)}</td>
                            <td className="text-right py-3 px-4 text-emerald-700">{formatINR(highlights?.total?.ordersReceived || 0)}</td>
                            <td className="text-right py-3 px-4 text-amber-700">{formatINR(highlights?.total?.openFunnel || 0)}</td>
                            <td className="text-right py-3 px-4 text-purple-700">{formatINR(highlights?.total?.orderBooking || 0)}</td>
                            <td className="text-right py-3 px-4 text-gray-700">{formatINR(highlights?.total?.utForBooking || 0)}</td>
                            <td className="text-center py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getDeviationColor(highlights?.total?.devPercent || 0)}`}>
                                {(highlights?.total?.devPercent || 0) > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {(highlights?.total?.devPercent || 0).toFixed(0)}%
                              </span>
                            </td>
                            <td className="text-right py-3 px-4 text-indigo-700">{formatINR(highlights?.total?.balanceBu || 0)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Zone-wise Monthly Breakdown */}
          {zoneMonthly && zoneMonthly.zones && zoneMonthly.zones.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('zoneMonthly')}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 rounded-lg">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Zone-wise Monthly Breakdown</h2>
                </div>
                {expandedSections.zoneMonthly ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {expandedSections.zoneMonthly && (
                <div className="p-5">
                  {/* Zone Tabs */}
                  <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                    {ZONE_ORDER.map(zoneName => {
                      const zoneData = zoneMonthly.zones.find(z => z.zoneName === zoneName);
                      if (!zoneData) return null;
                      return (
                        <button
                          key={zoneName}
                          onClick={() => setActiveZoneTab(zoneName)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
                            activeZoneTab === zoneName
                              ? `bg-gradient-to-r ${getZoneColor(zoneName)} text-white shadow-lg scale-105`
                              : `${getZoneBgColor(zoneName)} text-gray-700 hover:shadow-md border`
                          }`}
                        >
                          <span>{zoneName}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            activeZoneTab === zoneName ? 'bg-white/30' : 'bg-gray-200'
                          }`}>
                            Hit: {zoneData.hitRate || 0}%
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Monthly Table for Active Zone */}
                  {activeZoneMonthlyData ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={`bg-gradient-to-r ${getZoneColor(activeZoneTab)} text-white`}>
                            <th className="text-left py-3 px-4 font-semibold rounded-tl-lg">Month</th>
                            <th className="text-right py-3 px-4 font-semibold">Offers/Value</th>
                            <th className="text-right py-3 px-4 font-semibold">Order Received</th>
                            <th className="text-right py-3 px-4 font-semibold">Orders Booked</th>
                            <th className="text-right py-3 px-4 font-semibold">Dev OR vs Booked</th>
                            <th className="text-right py-3 px-4 font-semibold">Orders In-Hand</th>
                            <th className="text-right py-3 px-4 font-semibold">BU/Monthly</th>
                            <th className="text-right py-3 px-4 font-semibold">Booked vs BU</th>
                            <th className="text-center py-3 px-4 font-semibold rounded-tr-lg">% Dev</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeZoneMonthlyData.monthly?.map((month, idx) => (
                            <tr
                              key={month.month}
                              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                              }`}
                            >
                              <td className="py-3 px-4 font-semibold text-gray-900">{month.monthName}</td>
                              <td className="text-right py-3 px-4 font-medium text-blue-600">{formatINR(month.offersValue)}</td>
                              <td className="text-right py-3 px-4 font-medium text-emerald-600">{formatINR(month.ordersReceived)}</td>
                              <td className="text-right py-3 px-4 font-medium text-purple-600">{formatINR(month.ordersBooked)}</td>
                              <td className="text-right py-3 px-4 font-medium text-gray-600">{formatINR(month.devOrVsBooked)}</td>
                              <td className="text-right py-3 px-4 font-medium text-amber-600">{formatINR(month.ordersInHand)}</td>
                              <td className="text-right py-3 px-4 font-medium text-gray-700">{formatINR(month.buMonthly)}</td>
                              <td className="text-right py-3 px-4 font-medium text-indigo-600">{formatINR(month.bookedVsBu)}</td>
                              <td className="text-center py-3 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getDeviationColor(month.bookedVsBuPercent)}`}>
                                  {(month.bookedVsBuPercent || 0).toFixed(0)}%
                                </span>
                              </td>
                            </tr>
                          )) || (
                            <tr>
                              <td colSpan={9} className="text-center py-8 text-gray-500">No monthly data available</td>
                            </tr>
                          )}
                          {/* Total Row */}
                          {activeZoneMonthlyData.totals && (
                            <tr className="bg-gradient-to-r from-slate-100 to-slate-200 font-bold border-t-2 border-slate-300">
                              <td className="py-3 px-4 text-gray-900">Total</td>
                              <td className="text-right py-3 px-4 text-blue-700">{formatINR(activeZoneMonthlyData.totals.offersValue)}</td>
                              <td className="text-right py-3 px-4 text-emerald-700">{formatINR(activeZoneMonthlyData.totals.ordersReceived)}</td>
                              <td className="text-right py-3 px-4 text-purple-700">{formatINR(activeZoneMonthlyData.totals.ordersBooked)}</td>
                              <td className="text-right py-3 px-4 text-gray-600">-</td>
                              <td className="text-right py-3 px-4 text-amber-700">-</td>
                              <td className="text-right py-3 px-4 text-gray-700">{formatINR(activeZoneMonthlyData.totals.buMonthly)}</td>
                              <td className="text-right py-3 px-4 text-indigo-700">-</td>
                              <td className="text-center py-3 px-4">-</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      title="No Monthly Data"
                      message="No monthly breakdown data available for the selected zone."
                      icon={Calendar}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Quarterly Forecast */}
          {quarterly && quarterly.quarters && quarterly.quarters.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('quarterly')}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Quarterly Forecast vs BU</h2>
                </div>
                {expandedSections.quarterly ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {expandedSections.quarterly && (
                <div className="p-5">
                  {/* Quarter Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {quarterly.quarters.map((q, idx) => {
                      const colors = [
                        'from-blue-500 to-cyan-500',
                        'from-emerald-500 to-teal-500',
                        'from-amber-500 to-orange-500',
                        'from-purple-500 to-pink-500',
                      ];
                      return (
                        <div key={q.quarter} className={`bg-gradient-to-br ${colors[idx]} rounded-xl p-5 text-white shadow-lg`}>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold">{q.quarter}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              (q.devPercent || 0) >= 0 ? 'bg-white/30' : 'bg-rose-400/50'
                            }`}>
                              {(q.devPercent || 0) >= 0 ? '+' : ''}{(q.devPercent || 0).toFixed(0)}%
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-white/80">Forecast</span>
                              <span className="font-semibold">{formatINR(q.forecast)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-white/80">BU Target</span>
                              <span className="font-semibold">{formatINR(q.bu)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Monthly Forecast Table */}
                  {quarterly.monthly && quarterly.monthly.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                            <th className="text-left py-3 px-4 font-semibold rounded-tl-lg">Month</th>
                            <th className="text-right py-3 px-4 font-semibold">Forecast</th>
                            {quarterly.zones?.map(zone => (
                              <th key={zone} className="text-right py-3 px-4 font-semibold">{zone}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {quarterly.monthly.slice(0, 12).map((month: any, idx: number) => (
                            <tr
                              key={month.month}
                              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                              }`}
                            >
                              <td className="py-3 px-4 font-semibold text-gray-900">{month.monthName}</td>
                              <td className="text-right py-3 px-4 font-bold text-purple-600">{formatLargeNumber(month.forecast)}</td>
                              {quarterly.zones?.map((zone: string) => (
                                <td key={zone} className="text-right py-3 px-4 font-medium text-gray-700">
                                  {month.byZone?.[zone] ? formatLargeNumber(month.byZone[zone]) : '0'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      title="No Monthly Forecast Data"
                      message="No monthly forecast breakdown available."
                      icon={TrendingUp}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Product Type Summary */}
          {productTypeSummary && productTypeSummary.zones && productTypeSummary.zones.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('productType')}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 rounded-lg">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Product Type Summary by Zone</h2>
                </div>
                {expandedSections.productType ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {expandedSections.productType && (
                <div className="p-5 space-y-6">
                  {productTypeSummary.zones.map(zone => (
                    <div key={zone.zoneId} className={`rounded-xl border-2 overflow-hidden ${getZoneBgColor(zone.zoneName)}`}>
                      <div className={`bg-gradient-to-r ${getZoneColor(zone.zoneName)} px-4 py-3 text-white`}>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold">{zone.zoneName}</h3>
                          <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                            Total: {formatINR(zone.totals?.zoneTotal || 0)}
                          </span>
                        </div>
                      </div>
                      <div className="overflow-x-auto p-4">
                        {zone.users && zone.users.length > 0 ? (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b-2 border-gray-300">
                                <th className="text-left py-2 px-3 font-semibold text-gray-700">Product Type</th>
                                {zone.users.map(user => (
                                  <th key={user.id} className="text-right py-2 px-3 font-semibold text-gray-700">{user.name}</th>
                                ))}
                                <th className="text-right py-2 px-3 font-bold text-gray-900 bg-gray-100">{zone.zoneName}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {zone.productTypes?.map((pt, idx) => {
                                const productTotal = zone.totals?.byProductType?.[pt.code] || 0;
                                return (
                                  <tr key={pt.code} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                    <td className="py-2 px-3 font-medium text-gray-800">{pt.name}</td>
                                    {zone.users.map(user => (
                                      <td key={user.id} className="text-right py-2 px-3 text-gray-600">
                                        {zone.matrix?.[pt.code]?.[user.id] ? formatLargeNumber(zone.matrix[pt.code][user.id]) : '0'}
                                      </td>
                                    ))}
                                    <td className="text-right py-2 px-3 font-bold text-emerald-700 bg-gray-100">
                                      {formatLargeNumber(productTotal)}
                                    </td>
                                  </tr>
                                );
                              })}
                              {/* Total Row */}
                              <tr className="bg-gray-200 font-bold border-t-2 border-gray-400">
                                <td className="py-2 px-3 text-gray-900">Total</td>
                                {zone.users.map(user => (
                                  <td key={user.id} className="text-right py-2 px-3 text-gray-900">
                                    {zone.totals?.byUser?.[user.id] ? formatLargeNumber(zone.totals.byUser[user.id]) : '0'}
                                  </td>
                                ))}
                                <td className="text-right py-2 px-3 text-emerald-800 bg-emerald-100">
                                  {formatLargeNumber(zone.totals?.zoneTotal || 0)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        ) : (
                          <div className="text-center py-4 text-gray-500">No users with offers in this zone</div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Grand Totals */}
                  {productTypeSummary.grandTotals && Object.keys(productTypeSummary.grandTotals).length > 0 && (
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 text-white">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-400" />
                        Product Type Totals (All Zones)
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {Object.entries(productTypeSummary.grandTotals)
                          .sort(([, a], [, b]) => (b || 0) - (a || 0))
                          .slice(0, 10)
                          .map(([pt, value]) => (
                            <div key={pt} className="bg-white/10 rounded-lg p-3">
                              <div className="text-xs text-slate-300 uppercase tracking-wide">{pt.replace(/_/g, ' ')}</div>
                              <div className="text-lg font-bold text-white">{formatINR(value || 0)}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 5: Person-wise Performance */}
          {personWise && personWise.persons && personWise.persons.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('personWise')}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-cyan-50 to-sky-50 hover:from-cyan-100 hover:to-sky-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500 rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Person-wise Forecast</h2>
                  <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium">
                    {personWise.persons?.length || 0} Persons
                  </span>
                </div>
                {expandedSections.personWise ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {expandedSections.personWise && (
                <div className="p-5 space-y-4">
                  {personWise.persons?.slice(0, 10).map((person: any) => (
                    <div key={person.userId} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3 text-white flex items-center justify-between">
                        <div>
                          <h4 className="font-bold">{person.userName || 'Unknown'}</h4>
                          <span className="text-xs text-slate-300">{person.zoneName || 'N/A'}</span>
                        </div>
                        <span className="text-lg font-bold">{formatINR(person.grandTotal || 0)}</span>
                      </div>
                      <div className="overflow-x-auto p-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-300">
                              <th className="text-left py-2 px-2 font-semibold text-gray-700">Product</th>
                              {personWise.months?.map((m: string) => (
                                <th key={m} className="text-right py-2 px-2 font-semibold text-gray-600">{m}</th>
                              ))}
                              <th className="text-right py-2 px-2 font-bold text-gray-900 bg-slate-200">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {personWise.productTypes?.map((pt: any) => {
                              const total = person.totals?.[pt.code] || 0;
                              return (
                                <tr key={pt.code} className="border-b border-slate-100">
                                  <td className="py-1.5 px-2 font-medium text-gray-700">{pt.name}</td>
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <td key={m} className="text-right py-1.5 px-2 text-gray-600">
                                      {person.monthly?.[m]?.[pt.code] ? formatLargeNumber(person.monthly[m][pt.code]) : '0'}
                                    </td>
                                  ))}
                                  <td className="text-right py-1.5 px-2 font-bold text-cyan-700 bg-slate-100">
                                    {formatLargeNumber(total)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
