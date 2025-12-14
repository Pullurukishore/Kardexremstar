'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user.types';
import { useRouter } from 'next/navigation';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw, Loader2, Download, BarChart3, TrendingUp, Package, Activity, Users } from 'lucide-react';
import { MonthlyTrendChart } from '@/components/forecast/MonthlyTrendChart';
import { ProductTypeAnalytics } from '@/components/forecast/ProductTypeAnalytics';
import { UserPerformanceAnalytics } from '@/components/forecast/UserPerformanceAnalytics';

const inr = (n: number) => `₹${(n / 10000000).toFixed(2)}Cr`;

export default function ZoneManagerForecastPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Protect this page - only ZONE_MANAGER can access
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login?callbackUrl=' + encodeURIComponent('/zone-manager/forecast'))
        return
      }
      if (user?.role !== UserRole.ZONE_MANAGER) {
        router.push('/zone-manager/dashboard')
        return
      }
    }
  }, [authLoading, isAuthenticated, user?.role, router])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || user?.role !== UserRole.ZONE_MANAGER) {
    return null
  }
  
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (y: number) => {
    try {
      setLoading(true);
      setError(null);
      const summaryRes = await apiService.getForecastSummary({ year: y });
      
      if (summaryRes.success && summaryRes.data) {
        setMonthly(summaryRes.data.monthly || []);
        setAnalytics(summaryRes.data.analytics || null);
      } else {
        setError('Failed to load forecast data');
      }
    } catch (err: any) {
      console.error('Forecast load error:', err);
      setError(err?.message || 'Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(year);
  }, [year]);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return [now - 1, now, now + 1];
  }, []);

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const blob = await apiService.exportForecastExcel({ year });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Forecast_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-4 space-y-6 relative bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-blue-600" />
            Zone Forecast Report {year}
          </h1>
          <p className="text-sm text-gray-600 mt-1">Sales forecasting and performance analytics for your zone</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-xl border-2 border-gray-200 px-4 py-3 shadow-sm">
            <Calendar className="w-5 h-5 text-blue-600" />
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="bg-transparent text-sm font-semibold outline-none text-gray-700"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <Button onClick={() => load(year)} className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={downloadExcel} className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg">
            <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
            {downloading ? 'Downloading…' : 'Download Excel'}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
          <span className="text-lg font-medium text-gray-700">Loading forecast data...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl">
          <p className="font-medium">Error: {error}</p>
        </div>
      )}

      {/* Success State */}
      {!loading && !error && analytics && (
        <div className="space-y-8">
          {/* Executive Summary Dashboard */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Zone Performance Summary</h2>
            </div>
            
            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-bold text-blue-800">Total Offers</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {analytics.zonePerformance?.[0]?.forecastOffers || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">Forecast offers</div>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-800">Total Value</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {inr(analytics.zonePerformance?.[0]?.forecastValue || 0)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Forecast value</div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-bold text-purple-800">Achievement</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {analytics.zonePerformance?.[0]?.achievement?.toFixed(1) || '0.0'}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Zone achievement</div>
              </div>
              
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <Package className="h-5 w-5 text-amber-600" />
                  <span className="text-sm font-bold text-amber-800">Balance BU</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {inr(Math.max(0, (analytics.zonePerformance?.[0]?.forecastValue || 0) * 1.2 - (analytics.zonePerformance?.[0]?.actualValue || 0)))}
                </div>
                <div className="text-sm text-gray-600 mt-1">Remaining to target</div>
              </div>
            </div>
          </div>

          {/* Advanced Analytics Charts */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Advanced Analytics</h2>
            </div>
            
            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                {analytics.userPerformance && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">User Performance Analysis</h3>
                    <UserPerformanceAnalytics userPerformance={analytics.userPerformance} />
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                {analytics && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Product Type Analytics</h3>
                    <ProductTypeAnalytics analytics={analytics} />
                  </div>
                )}
              </div>
            </div>
            
            {/* Monthly Trends */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Trend Analysis</h3>
              <MonthlyTrendChart monthlyData={monthly} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
