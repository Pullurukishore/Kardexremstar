'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiService } from '@/services/api';
import { 
  ArrowLeft, Target, TrendingUp, Package, Building2, Users, 
  Award, BarChart3, Sparkles, Zap, ArrowUpRight, ArrowDownRight,
  CheckCircle, AlertCircle, Crown
} from 'lucide-react';

interface TargetDetail {
  id: number;
  productType: string | null;
  targetValue: number;
  actualValue: number;
  achievement: number;
}

const PRODUCT_TYPE_CONFIG: { [key: string]: { label: string; icon: string; gradient: string; bg: string; border: string } } = {
  'RELOCATION': { label: 'Relocation', icon: '🚚', gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  'CONTRACT': { label: 'Contract', icon: '📋', gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'SPP': { label: 'SPP', icon: '🔧', gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  'UPGRADE_KIT': { label: 'Upgrade Kit', icon: '⬆️', gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  'SOFTWARE': { label: 'Software', icon: '💻', gradient: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  'BD_CHARGES': { label: 'BD Charges', icon: '💰', gradient: 'from-rose-500 to-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  'BD_SPARE': { label: 'BD Spare', icon: '🔩', gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  'MIDLIFE_UPGRADE': { label: 'Midlife Upgrade', icon: '🔄', gradient: 'from-teal-500 to-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  'RETROFIT_KIT': { label: 'Retrofit Kit', icon: '🛠️', gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  'Overall': { label: 'Overall', icon: '🎯', gradient: 'from-slate-600 to-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
};

export default function TargetViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const type = (searchParams.get('type') || 'ZONE') as 'ZONE' | 'USER';
  const entityId = searchParams.get('id') || '';
  const period = searchParams.get('period') || '';
  const periodType = searchParams.get('periodType') || 'YEARLY';

  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<TargetDetail[]>([]);
  const [entityName, setEntityName] = useState('');

  // Product types from backend enum
  const productTypes = ['RELOCATION', 'CONTRACT', 'SPP', 'UPGRADE_KIT', 'SOFTWARE', 'BD_CHARGES', 'BD_SPARE', 'MIDLIFE_UPGRADE', 'RETROFIT_KIT'];

  useEffect(() => {
    if (entityId && period) {
      fetchTargets();
    }
  }, [entityId, period, periodType, type]);

  const fetchTargets = async () => {
    setLoading(true);
    try {
      const params = { targetPeriod: period, periodType };
      
      if (type === 'ZONE') {
        const response = await apiService.getZoneTargets(params);
        const zoneTargets = response.targets.filter((t: any) => t.serviceZoneId === parseInt(entityId));
        setTargets(zoneTargets.map((t: any) => ({
          id: t.id,
          productType: t.productType,
          targetValue: t.targetValue,
          actualValue: t.actualValue,
          achievement: t.achievement
        })));
        if (zoneTargets.length > 0) {
          setEntityName(zoneTargets[0].serviceZone.name);
        }
      } else {
        const response = await apiService.getUserTargets(params);
        const userTargets = response.targets.filter((t: any) => t.userId === parseInt(entityId));
        setTargets(userTargets.map((t: any) => ({
          id: t.id,
          productType: t.productType,
          targetValue: t.targetValue,
          actualValue: t.actualValue,
          achievement: t.achievement
        })));
        if (userTargets.length > 0) {
          setEntityName(userTargets[0].user.name || userTargets[0].user.email);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch targets:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString()}`;
  };

  const getAchievementColor = (achievement: number) => {
    if (achievement >= 100) return 'from-emerald-500 to-green-600';
    if (achievement >= 75) return 'from-amber-500 to-yellow-600';
    if (achievement >= 50) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-rose-600';
  };

  const getAchievementBadge = (achievement: number) => {
    if (achievement >= 100) return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: '🏆' };
    if (achievement >= 75) return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: '📈' };
    if (achievement >= 50) return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: '📊' };
    return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: '⚠️' };
  };

  const overallTarget = targets.find(t => !t.productType);
  const productTargets = targets.filter(t => t.productType);
  const totalTarget = targets.reduce((sum, t) => sum + t.targetValue, 0);
  const totalActual = targets.reduce((sum, t) => sum + t.actualValue, 0);
  const overallAchievement = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
  const variance = totalActual - totalTarget;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-all group"
        >
          <div className="p-2 rounded-lg bg-white shadow-sm group-hover:shadow-md transition-all">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="font-medium">Back to Targets</span>
        </button>
        
        {/* Hero Header */}
        <div className={`relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl mb-8 bg-gradient-to-r ${
          type === 'ZONE' 
            ? 'from-blue-600 via-indigo-600 to-purple-700' 
            : 'from-purple-600 via-pink-600 to-rose-600'
        }`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGM5Ljk0MSAwIDE4LTguMDU5IDE4LTE4cy04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-5 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl"></div>
                <div className="relative bg-white/20 backdrop-blur-xl p-4 rounded-2xl border border-white/30">
                  {type === 'ZONE' ? <Building2 className="w-12 h-12" /> : <Users className="w-12 h-12" />}
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold flex items-center gap-3">
                  {entityName}
                  <Crown className="w-8 h-8 text-yellow-300 animate-pulse" />
                </h1>
                <p className="text-white/80 mt-2 text-lg">
                  {type === 'ZONE' ? 'Zone' : 'User'} Target Breakdown • {period} ({periodType === 'YEARLY' ? 'Yearly' : 'Monthly'})
                </p>
              </div>
            </div>
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/15 backdrop-blur-xl rounded-xl p-5 border border-white/20">
                <div className="flex items-center gap-2 text-white/70 text-sm font-semibold mb-2">
                  <Target className="w-4 h-4" />
                  Total Target
                </div>
                <div className="text-3xl font-bold">{formatCurrency(totalTarget)}</div>
                <div className="text-white/60 text-sm mt-1">📅 Monthly: {formatCurrency(totalTarget / 12)}</div>
              </div>
              <div className="bg-white/15 backdrop-blur-xl rounded-xl p-5 border border-white/20">
                <div className="flex items-center gap-2 text-white/70 text-sm font-semibold mb-2">
                  <TrendingUp className="w-4 h-4" />
                  Actual Value
                </div>
                <div className="text-3xl font-bold">{formatCurrency(totalActual)}</div>
                <div className="text-white/60 text-sm mt-1">Won Orders</div>
              </div>
              <div className="bg-white/15 backdrop-blur-xl rounded-xl p-5 border border-white/20">
                <div className="flex items-center gap-2 text-white/70 text-sm font-semibold mb-2">
                  <Award className="w-4 h-4" />
                  Achievement
                </div>
                <div className={`text-3xl font-bold ${
                  overallAchievement >= 100 ? 'text-emerald-300' :
                  overallAchievement >= 75 ? 'text-amber-300' : 'text-red-300'
                }`}>
                  {overallAchievement.toFixed(1)}%
                </div>
                <div className="w-full bg-white/20 rounded-full h-2 mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full bg-gradient-to-r ${getAchievementColor(overallAchievement)}`}
                    style={{ width: `${Math.min(100, overallAchievement)}%` }}
                  />
                </div>
              </div>
              <div className="bg-white/15 backdrop-blur-xl rounded-xl p-5 border border-white/20">
                <div className="flex items-center gap-2 text-white/70 text-sm font-semibold mb-2">
                  <BarChart3 className="w-4 h-4" />
                  Variance
                </div>
                <div className={`text-3xl font-bold flex items-center gap-2 ${
                  variance >= 0 ? 'text-emerald-300' : 'text-red-300'
                }`}>
                  {variance >= 0 ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                  {formatCurrency(Math.abs(variance))}
                </div>
                <div className="text-white/60 text-sm mt-1">
                  {variance >= 0 ? '🎉 Above Target' : '📉 Below Target'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-16 text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 w-20 h-20 border-4 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-700 font-bold text-xl">Loading target details...</p>
            <p className="text-slate-500 text-sm mt-2">Please wait</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Target */}
            {overallTarget && (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 px-6 py-5">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 backdrop-blur-xl rounded-xl border border-white/30">
                        <TrendingUp className="w-7 h-7" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Overall Target (All Products)</h2>
                        <p className="text-emerald-100 text-sm mt-0.5">Combined performance across all product types</p>
                      </div>
                    </div>
                    <div className={`px-6 py-3 rounded-xl text-xl font-bold bg-white/20 backdrop-blur-xl border border-white/30`}>
                      {overallTarget.achievement.toFixed(1)}% Achievement
                    </div>
                  </div>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                      <div className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Yearly Target
                      </div>
                      <div className="text-3xl font-bold text-slate-900">{formatCurrency(overallTarget.targetValue)}</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                      <div className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                        📅 Monthly Target
                      </div>
                      <div className="text-3xl font-bold text-blue-600">{formatCurrency(overallTarget.targetValue / 12)}</div>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
                      <div className="text-sm font-semibold text-emerald-600 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Actual Value
                      </div>
                      <div className="text-3xl font-bold text-emerald-700">{formatCurrency(overallTarget.actualValue)}</div>
                    </div>
                    <div className={`rounded-xl p-5 border ${
                      overallTarget.actualValue >= overallTarget.targetValue 
                        ? 'bg-emerald-50 border-emerald-100' 
                        : 'bg-red-50 border-red-100'
                    }`}>
                      <div className={`text-sm font-semibold mb-2 flex items-center gap-2 ${
                        overallTarget.actualValue >= overallTarget.targetValue ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {overallTarget.actualValue >= overallTarget.targetValue ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        Gap / Surplus
                      </div>
                      <div className={`text-3xl font-bold ${
                        overallTarget.actualValue >= overallTarget.targetValue ? 'text-emerald-700' : 'text-red-700'
                      }`}>
                        {formatCurrency(Math.abs(overallTarget.actualValue - overallTarget.targetValue))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-semibold text-slate-600">Progress to Target</span>
                      <span className={`font-bold ${
                        overallTarget.achievement >= 100 ? 'text-emerald-600' :
                        overallTarget.achievement >= 75 ? 'text-amber-600' : 'text-red-600'
                      }`}>{overallTarget.achievement.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r ${getAchievementColor(overallTarget.achievement)} transition-all duration-1000`}
                        style={{ width: `${Math.min(100, overallTarget.achievement)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Product-Specific Targets */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 px-6 py-5">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 backdrop-blur-xl rounded-xl border border-white/30">
                      <Package className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Product-Specific Targets</h2>
                      <p className="text-violet-100 text-sm mt-0.5">Performance breakdown by product category</p>
                    </div>
                  </div>
                  <div className="px-5 py-2 bg-white/20 backdrop-blur-xl rounded-xl border border-white/30 font-bold">
                    {productTargets.length} / {productTypes.length} Products Have Targets
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {productTypes.map((productType) => {
                    const target = productTargets.find(t => t.productType === productType);
                    const hasTarget = !!target;
                    const targetValue = target?.targetValue || 0;
                    const actualValue = target?.actualValue || 0;
                    const achievement = target?.achievement || 0;
                    const config = PRODUCT_TYPE_CONFIG[productType];
                    const badge = getAchievementBadge(achievement);
                    
                    return (
                      <div 
                        key={productType} 
                        className={`relative rounded-2xl p-6 transition-all duration-300 ${
                          hasTarget 
                            ? `${config.bg} border-2 ${config.border} hover:shadow-xl` 
                            : 'border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl shadow-lg bg-gradient-to-br ${hasTarget ? config.gradient : 'from-slate-400 to-slate-500'}`}>
                              <Package className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">{config.label}</h3>
                              <p className="text-xs text-slate-500">{config.icon} Product Type</p>
                            </div>
                          </div>
                          {hasTarget ? (
                            <div className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                              {badge.icon} {achievement.toFixed(0)}%
                            </div>
                          ) : (
                            <div className="px-3 py-1.5 rounded-xl text-sm font-medium bg-orange-50 text-orange-600 border border-orange-200">
                              ⚠️ No Target
                            </div>
                          )}
                        </div>
                        
                        {hasTarget ? (
                          <>
                            {/* Stats */}
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/60 rounded-lg p-3">
                                  <div className="text-xs font-semibold text-slate-500 mb-1">Yearly Target</div>
                                  <div className="text-lg font-bold text-slate-900">{formatCurrency(targetValue)}</div>
                                </div>
                                <div className="bg-white/60 rounded-lg p-3">
                                  <div className="text-xs font-semibold text-slate-500 mb-1">Monthly Target</div>
                                  <div className="text-lg font-bold text-blue-600">{formatCurrency(targetValue / 12)}</div>
                                </div>
                              </div>
                              
                              <div className="bg-white/60 rounded-lg p-3">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-semibold text-slate-500">Actual Value</span>
                                  <span className="text-lg font-bold text-emerald-600">{formatCurrency(actualValue)}</span>
                                </div>
                                <div className="w-full bg-white rounded-full h-2.5 overflow-hidden shadow-inner">
                                  <div 
                                    className={`h-full rounded-full bg-gradient-to-r ${getAchievementColor(achievement)} transition-all duration-700`}
                                    style={{ width: `${Math.min(100, achievement)}%` }}
                                  />
                                </div>
                              </div>
                              
                              <div className={`rounded-lg p-3 ${
                                actualValue >= targetValue ? 'bg-emerald-100/60' : 'bg-red-100/60'
                              }`}>
                                <div className="flex justify-between items-center">
                                  <span className={`text-xs font-semibold ${
                                    actualValue >= targetValue ? 'text-emerald-600' : 'text-red-600'
                                  }`}>
                                    {actualValue >= targetValue ? '🎉 Surplus' : '📉 Gap'}
                                  </span>
                                  <span className={`text-lg font-bold ${
                                    actualValue >= targetValue ? 'text-emerald-700' : 'text-red-700'
                                  }`}>
                                    {formatCurrency(Math.abs(actualValue - targetValue))}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                              <AlertCircle className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 font-medium">No target set for this product</p>
                            <p className="text-slate-400 text-sm mt-1">Set a target in edit mode to track performance</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* No Targets */}
            {targets.length === 0 && (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-16 text-center">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center shadow-lg">
                    <Target className="w-12 h-12 text-blue-500" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-lg">⚠️</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-6 mb-2">No Targets Found</p>
                <p className="text-slate-500 text-lg max-w-md mx-auto">
                  No targets have been set for this {type.toLowerCase()} in the selected period.
                </p>
                <button
                  onClick={() => router.push(`/admin/targets/edit?type=${type}&id=${entityId}&period=${period}&periodType=${periodType}`)}
                  className={`mt-6 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-xl bg-gradient-to-r ${
                    type === 'ZONE' ? 'from-blue-600 to-indigo-600' : 'from-purple-600 to-pink-600'
                  }`}
                >
                  ✨ Create Target Now
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
