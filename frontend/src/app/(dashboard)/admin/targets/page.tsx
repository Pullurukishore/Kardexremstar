'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user.types';
import { apiService } from '@/services/api';
import { 
  Plus, Target, TrendingUp, Users, Package, Building2, Edit2, Eye, RefreshCw, 
  Filter, Award, BarChart3, Calendar, ChevronRight, Sparkles, ChevronDown,
  TrendingDown, Percent, ArrowUpRight, ArrowDownRight, Zap, Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ZoneTarget {
  id: number;
  serviceZoneId: number;
  targetPeriod: string;
  periodType: 'MONTHLY' | 'YEARLY';
  productType?: string;
  targetValue: number;
  targetOfferCount?: number;
  actualValue: number;
  actualOfferCount: number;
  achievement: number;
  serviceZone: {
    id: number;
    name: string;
  };
  targetCount?: number;
  isDerived?: boolean;
}

interface UserTarget {
  id: number;
  userId: number;
  targetPeriod: string;
  periodType: 'MONTHLY' | 'YEARLY';
  targetValue: number;
  targetOfferCount?: number;
  productType?: string;
  actualValue: number;
  actualOfferCount: number;
  achievement: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  targetCount?: number;
  isDerived?: boolean;
}

interface ProductTypeBreakdown {
  productType: string;
  targetValue: number;
  actualValue: number;
  achievement: number;
  count: number;
}

type TargetType = 'ZONE' | 'USER';

const PRODUCT_TYPES = [
  'RELOCATION', 'CONTRACT', 'SPP', 'UPGRADE_KIT', 'SOFTWARE', 
  'BD_CHARGES', 'BD_SPARE', 'MIDLIFE_UPGRADE', 'RETROFIT_KIT'
];

const PRODUCT_TYPE_COLORS: { [key: string]: { bg: string; text: string; border: string; gradient: string } } = {
  'RELOCATION': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', gradient: 'from-blue-500 to-blue-600' },
  'CONTRACT': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', gradient: 'from-emerald-500 to-emerald-600' },
  'SPP': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', gradient: 'from-purple-500 to-purple-600' },
  'UPGRADE_KIT': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', gradient: 'from-amber-500 to-amber-600' },
  'SOFTWARE': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', gradient: 'from-cyan-500 to-cyan-600' },
  'BD_CHARGES': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', gradient: 'from-rose-500 to-rose-600' },
  'BD_SPARE': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', gradient: 'from-indigo-500 to-indigo-600' },
  'MIDLIFE_UPGRADE': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', gradient: 'from-teal-500 to-teal-600' },
  'RETROFIT_KIT': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', gradient: 'from-orange-500 to-orange-600' },
  'Overall': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', gradient: 'from-slate-500 to-slate-600' },
};

export default function TargetsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Protect this page - only ADMIN can access
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login?callbackUrl=' + encodeURIComponent('/admin/targets'))
        return
      }
      if (user?.role !== UserRole.ADMIN) {
        router.push('/admin/dashboard')
        return
      }
    }
  }, [authLoading, isAuthenticated, user?.role, router])

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-400/30 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-blue-400 rounded-full animate-spin"></div>
          </div>
          <p className="text-blue-200 font-medium mt-6 text-lg">Loading Target Management...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated or not ADMIN
  if (!isAuthenticated || user?.role !== UserRole.ADMIN) {
    return null
  }
  
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<TargetType>(
    (searchParams.get('type') as TargetType) || 'ZONE'
  );
  const [periodType, setPeriodType] = useState<'MONTHLY' | 'YEARLY'>(
    (searchParams.get('periodType') as 'MONTHLY' | 'YEARLY') || 'YEARLY'
  );
  const [targetPeriod, setTargetPeriod] = useState<string>(
    searchParams.get('period') || ''
  );
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const [zoneTargets, setZoneTargets] = useState<ZoneTarget[]>([]);
  const [userTargets, setUserTargets] = useState<UserTarget[]>([]);
  const [productTypeData, setProductTypeData] = useState<ProductTypeBreakdown[]>([]);

  // Initialize with current period
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentPeriod = periodType === 'MONTHLY' ? `${year}-${month}` : `${year}`;
    setTargetPeriod(currentPeriod);
  }, [periodType]);

  // Fetch data
  useEffect(() => {
    if (targetPeriod) {
      fetchTargets();
    }
  }, [activeTab, targetPeriod, periodType]);

  const fetchTargets = async () => {
    setLoading(true);
    try {
      // Always fetch yearly targets and calculate monthly values
      const fetchTargetPeriod = periodType === 'MONTHLY' ? targetPeriod.split('-')[0] : targetPeriod;
      
      const params = { 
        targetPeriod: fetchTargetPeriod, 
        periodType: 'YEARLY', 
        grouped: 'true',
        // For monthly view, we need actual values for the specific month
        ...(periodType === 'MONTHLY' && { actualValuePeriod: targetPeriod })
      };
      
      if (activeTab === 'ZONE') {
        const response = await apiService.getZoneTargets(params);
        let targets = response.targets || [];
        
        // If monthly view, divide target values by 12
        if (periodType === 'MONTHLY') {
          targets = targets.map((t: ZoneTarget) => ({
            ...t,
            targetValue: t.targetValue / 12,
            isDerived: true
          }));
        }
        
        setZoneTargets(targets);
        calculateProductTypeBreakdown(targets);
      } else if (activeTab === 'USER') {
        const response = await apiService.getUserTargets(params);
        let targets = response.targets || [];
        
        // If monthly view, divide target values by 12
        if (periodType === 'MONTHLY') {
          targets = targets.map((t: UserTarget) => ({
            ...t,
            targetValue: t.targetValue / 12,
            isDerived: true
          }));
        }
        
        setUserTargets(targets);
        calculateProductTypeBreakdown(targets);
      }
    } catch (error: any) {
      console.error('Failed to fetch targets:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch targets');
    } finally {
      setLoading(false);
    }
  };

  const calculateProductTypeBreakdown = (targets: any[]) => {
    const breakdown: { [key: string]: ProductTypeBreakdown } = {};
    
    // Initialize all product types
    PRODUCT_TYPES.forEach(pt => {
      breakdown[pt] = { productType: pt, targetValue: 0, actualValue: 0, achievement: 0, count: 0 };
    });
    
    // Aggregate data
    targets.forEach(target => {
      const pt = target.productType || 'Overall';
      if (!breakdown[pt]) {
        breakdown[pt] = { productType: pt, targetValue: 0, actualValue: 0, achievement: 0, count: 0 };
      }
      breakdown[pt].targetValue += target.targetValue || 0;
      breakdown[pt].actualValue += target.actualValue || 0;
      breakdown[pt].count += 1;
    });
    
    // Calculate achievements
    Object.values(breakdown).forEach(item => {
      item.achievement = item.targetValue > 0 ? (item.actualValue / item.targetValue) * 100 : 0;
    });
    
    setProductTypeData(Object.values(breakdown).filter(item => item.targetValue > 0 || item.actualValue > 0));
  };

  const getAchievementColor = (achievement: number) => {
    if (achievement >= 100) return 'from-emerald-500 to-green-600';
    if (achievement >= 75) return 'from-amber-500 to-yellow-600';
    if (achievement >= 50) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-rose-600';
  };

  const getAchievementBadgeClass = (achievement: number) => {
    if (achievement >= 100) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (achievement >= 75) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (achievement >= 50) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const toggleRowExpand = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Summary calculations
  const currentTargets = activeTab === 'ZONE' ? zoneTargets : userTargets;
  const totalTargetValue = currentTargets.reduce((sum, t) => sum + t.targetValue, 0);
  const totalActualValue = currentTargets.reduce((sum, t) => sum + t.actualValue, 0);
  const overallAchievement = totalTargetValue > 0 ? (totalActualValue / totalTargetValue) * 100 : 0;
  const variance = totalActualValue - totalTargetValue;

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        
        {/* Premium Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGM5Ljk0MSAwIDE4LTguMDU5IDE4LTE4cy04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl"></div>
                <div className="relative bg-white/20 backdrop-blur-xl p-4 rounded-2xl border border-white/30 shadow-xl">
                  <Target className="w-12 h-12 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                  Target Management
                  <Crown className="w-8 h-8 text-yellow-300 animate-pulse" />
                </h1>
                <p className="text-blue-100 text-lg max-w-xl">
                  Monitor and manage performance targets across zones and users with real-time tracking
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={fetchTargets}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-xl border border-white/30 text-white px-6 py-6 rounded-xl font-semibold transition-all hover:scale-105 shadow-lg"
                disabled={loading}
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Stats Cards */}
        {currentTargets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Entities Card */}
            <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-100 hover:border-blue-200">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">
                      {activeTab === 'ZONE' ? 'Total Zones' : 'Total Users'}
                    </p>
                    <p className="text-4xl font-black text-slate-900">{currentTargets.length}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                    {activeTab === 'ZONE' ? <Building2 className="h-6 w-6 text-white" /> : <Users className="h-6 w-6 text-white" />}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full text-blue-600 font-medium">
                    <Zap className="w-3 h-3" /> Active
                  </span>
                </div>
              </div>
            </div>

            {/* Target Value Card */}
            <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-100 hover:border-indigo-200">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">
                      {periodType === 'MONTHLY' ? 'Monthly Target' : 'Yearly Target'}
                    </p>
                    <p className="text-4xl font-black text-slate-900">{formatCurrency(totalTargetValue)}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                </div>
                {periodType === 'MONTHLY' && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded-full text-indigo-600 font-medium">
                      📅 Yearly ÷ 12
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actual Value Card */}
            <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-100 hover:border-emerald-200">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Actual Value</p>
                    <p className="text-4xl font-black text-slate-900">{formatCurrency(totalActualValue)}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-full font-medium ${
                    variance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {variance >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {formatCurrency(Math.abs(variance))}
                  </span>
                </div>
              </div>
            </div>

            {/* Achievement Card */}
            <div className={`group relative overflow-hidden rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border ${
              overallAchievement >= 100 ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200' :
              overallAchievement >= 75 ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200' :
              overallAchievement >= 50 ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200' :
              'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
            }`}>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${
                      overallAchievement >= 100 ? 'text-emerald-600' :
                      overallAchievement >= 75 ? 'text-amber-600' :
                      overallAchievement >= 50 ? 'text-orange-600' : 'text-red-600'
                    }`}>Achievement</p>
                    <p className="text-4xl font-black text-slate-900">{overallAchievement.toFixed(1)}%</p>
                  </div>
                  <div className={`p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform bg-gradient-to-br ${getAchievementColor(overallAchievement)}`}>
                    <Award className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden shadow-inner">
                  <div 
                    className={`h-full rounded-full bg-gradient-to-r ${getAchievementColor(overallAchievement)} transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.min(100, overallAchievement)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Type Performance Overview */}
        {productTypeData.length > 0 && (
          <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Product Type Performance</CardTitle>
                    <p className="text-slate-300 text-sm mt-1">Target vs Actual breakdown by product category</p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-white/10 rounded-xl text-sm font-semibold backdrop-blur-sm">
                  {productTypeData.length} Product Types
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {productTypeData.map((item) => {
                  const colors = PRODUCT_TYPE_COLORS[item.productType] || PRODUCT_TYPE_COLORS['Overall'];
                  return (
                    <div 
                      key={item.productType}
                      className={`relative overflow-hidden rounded-xl p-5 border-2 ${colors.border} ${colors.bg} hover:shadow-lg transition-all duration-300 group`}
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${colors.gradient}`}>
                            <Package className="w-4 h-4 text-white" />
                          </div>
                          <span className={`font-bold text-sm ${colors.text}`}>
                            {item.productType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getAchievementBadgeClass(item.achievement)} border`}>
                          {item.achievement.toFixed(0)}%
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Target</span>
                          <span className="font-bold text-slate-700">{formatCurrency(item.targetValue)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Actual</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(item.actualValue)}</span>
                        </div>
                        <div className="w-full bg-white rounded-full h-2 overflow-hidden shadow-inner">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${getAchievementColor(item.achievement)} transition-all duration-700`}
                            style={{ width: `${Math.min(100, item.achievement)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter & Tabs Section */}
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Filter className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Filter & View Options</CardTitle>
                  <p className="text-sm text-slate-500">Select period and view type</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as 'MONTHLY' | 'YEARLY')}
                    className="px-4 py-2 border-0 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 shadow-sm"
                  >
                    <option value="MONTHLY">📅 Monthly View</option>
                    <option value="YEARLY">📆 Yearly View</option>
                  </select>
                  <input
                    type={periodType === 'MONTHLY' ? 'month' : 'number'}
                    value={targetPeriod}
                    onChange={(e) => setTargetPeriod(e.target.value)}
                    className="px-4 py-2 border-0 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 shadow-sm"
                    min={periodType === 'YEARLY' ? '2020' : undefined}
                    max={periodType === 'YEARLY' ? '2030' : undefined}
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          {/* Tabs */}
          <div className="bg-slate-50 px-6 py-4 flex gap-3 border-b border-slate-100">
            <Button
              onClick={() => setActiveTab('ZONE')}
              className={`px-8 py-4 font-bold rounded-xl transition-all flex items-center gap-3 ${
                activeTab === 'ZONE'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm'
              }`}
            >
              <Building2 className="w-5 h-5" />
              Zone Targets
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                activeTab === 'ZONE' ? 'bg-white/20' : 'bg-blue-50 text-blue-600'
              }`}>
                {zoneTargets.length}
              </span>
            </Button>
            <Button
              onClick={() => setActiveTab('USER')}
              className={`px-8 py-4 font-bold rounded-xl transition-all flex items-center gap-3 ${
                activeTab === 'USER'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm'
              }`}
            >
              <Users className="w-5 h-5" />
              User Targets
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                activeTab === 'USER' ? 'bg-white/20' : 'bg-purple-50 text-purple-600'
              }`}>
                {userTargets.length}
              </span>
            </Button>
          </div>
        </Card>

        {/* Main Data Table */}
        {loading ? (
          <Card className="shadow-xl border-0 rounded-2xl">
            <CardContent className="py-20">
              <div className="flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-blue-100 rounded-full"></div>
                  <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-700 font-bold text-xl mt-6">Loading targets...</p>
                <p className="text-slate-500 text-sm mt-2">Please wait while we fetch the data</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl border-0 overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="sticky top-0 z-20">
                  <tr className={`bg-gradient-to-r ${activeTab === 'ZONE' ? 'from-blue-600 via-blue-500 to-indigo-600' : 'from-purple-600 via-purple-500 to-pink-600'} text-white`}>
                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        {activeTab === 'ZONE' ? <Building2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        {activeTab === 'ZONE' ? 'Zone' : 'User'}
                      </div>
                    </th>
                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Target Value
                      </div>
                    </th>
                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Actual Value
                      </div>
                    </th>
                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Achievement
                      </div>
                    </th>
                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Actions
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {activeTab === 'ZONE' && zoneTargets.map((target: any, index: number) => {
                    const achievement = target.targetValue > 0 ? (target.actualValue / target.targetValue) * 100 : 0;
                    return (
                      <tr 
                        key={target.serviceZoneId} 
                        className={`group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all duration-300 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        }`}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-gradient-to-br ${target.id ? 'from-blue-500 to-indigo-600' : 'from-slate-400 to-slate-500'} shadow-lg`}>
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-base">{target.serviceZone?.name}</div>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {target.targetCount > 1 && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium border border-blue-100">
                                    📊 {target.targetCount} Combined
                                  </span>
                                )}
                                {target.isDerived && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium border border-amber-100">
                                    📅 Monthly (Yearly ÷ 12)
                                  </span>
                                )}
                                {!target.id && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium border border-orange-100">
                                    ⚠️ No Target Set
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-bold text-slate-900 text-lg">{formatCurrency(target.targetValue || 0)}</div>
                          <p className="text-xs text-slate-500 mt-0.5">Target</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-bold text-emerald-600 text-lg">{formatCurrency(target.actualValue || 0)}</div>
                          <p className="text-xs text-slate-500 mt-0.5">Won Orders</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-2">
                            <span className={`px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${getAchievementColor(achievement)} shadow-md w-fit`}>
                              {achievement.toFixed(1)}%
                            </span>
                            <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${getAchievementColor(achievement)} transition-all duration-700`}
                                style={{ width: `${Math.min(100, achievement)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => router.push(`/admin/targets/view?type=ZONE&id=${target.serviceZoneId}&period=${periodType === 'MONTHLY' ? targetPeriod.split('-')[0] : targetPeriod}&periodType=YEARLY`)}
                              size="sm"
                              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg"
                              title="View all targets"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            {target.id ? (
                              <Button
                                onClick={() => router.push(`/admin/targets/edit?type=ZONE&id=${target.serviceZoneId}&period=${periodType === 'MONTHLY' ? targetPeriod.split('-')[0] : targetPeriod}&periodType=YEARLY&targetId=${target.id}`)}
                                size="sm"
                                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg"
                                title="Edit target"
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            ) : (
                              <Button
                                onClick={() => router.push(`/admin/targets/edit?type=ZONE&id=${target.serviceZoneId}&period=${periodType === 'MONTHLY' ? targetPeriod.split('-')[0] : targetPeriod}&periodType=YEARLY`)}
                                size="sm"
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg"
                                title="Create target"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Create
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {activeTab === 'USER' && userTargets.map((target: any, index: number) => {
                    const achievement = target.targetValue > 0 ? (target.actualValue / target.targetValue) * 100 : 0;
                    return (
                      <tr 
                        key={target.userId} 
                        className={`group hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/30 transition-all duration-300 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        }`}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-gradient-to-br ${target.id ? 'from-purple-500 to-pink-600' : 'from-slate-400 to-slate-500'} shadow-lg`}>
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-base">{target.user?.name || 'N/A'}</div>
                              <div className="text-sm text-slate-500">{target.user?.email}</div>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {target.targetCount > 1 && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium border border-purple-100">
                                    📊 {target.targetCount} Combined
                                  </span>
                                )}
                                {target.isDerived && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium border border-amber-100">
                                    📅 Monthly (Yearly ÷ 12)
                                  </span>
                                )}
                                {!target.id && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium border border-orange-100">
                                    ⚠️ No Target Set
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-bold text-slate-900 text-lg">{formatCurrency(target.targetValue || 0)}</div>
                          <p className="text-xs text-slate-500 mt-0.5">Target</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-bold text-emerald-600 text-lg">{formatCurrency(target.actualValue || 0)}</div>
                          <p className="text-xs text-slate-500 mt-0.5">Won Orders</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-2">
                            <span className={`px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${getAchievementColor(achievement)} shadow-md w-fit`}>
                              {achievement.toFixed(1)}%
                            </span>
                            <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${getAchievementColor(achievement)} transition-all duration-700`}
                                style={{ width: `${Math.min(100, achievement)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => router.push(`/admin/targets/view?type=USER&id=${target.userId}&period=${periodType === 'MONTHLY' ? targetPeriod.split('-')[0] : targetPeriod}&periodType=YEARLY`)}
                              size="sm"
                              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg"
                              title="View all targets"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            {target.id ? (
                              <Button
                                onClick={() => router.push(`/admin/targets/edit?type=USER&id=${target.userId}&period=${periodType === 'MONTHLY' ? targetPeriod.split('-')[0] : targetPeriod}&periodType=YEARLY&targetId=${target.id}`)}
                                size="sm"
                                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg"
                                title="Edit target"
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            ) : (
                              <Button
                                onClick={() => router.push(`/admin/targets/edit?type=USER&id=${target.userId}&period=${periodType === 'MONTHLY' ? targetPeriod.split('-')[0] : targetPeriod}&periodType=YEARLY`)}
                                size="sm"
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg"
                                title="Create target"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Create
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {((activeTab === 'ZONE' && zoneTargets.length === 0) ||
                    (activeTab === 'USER' && userTargets.length === 0)) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-6">
                          <div className="relative">
                            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center shadow-lg">
                              <Target className="w-12 h-12 text-blue-500" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-lg">⚠️</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-slate-900 mb-2">No Targets Found</p>
                            <p className="text-slate-600 text-lg max-w-md">
                              {activeTab === 'ZONE' ? 'No zone targets set for this period' : 'No user targets set for this period'}
                            </p>
                            <p className="text-slate-500 text-sm mt-3">
                              Create targets by clicking on the "Create" button for each {activeTab === 'ZONE' ? 'zone' : 'user'}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
