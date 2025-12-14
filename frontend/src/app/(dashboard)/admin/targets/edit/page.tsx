'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiService } from '@/services/api';
import { 
  ArrowLeft, Target, Save, Package, TrendingUp, AlertCircle, BarChart3,
  Building2, Users, CheckCircle, Sparkles, Zap, Crown, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

interface Target {
  id: number;
  serviceZoneId?: number;
  userId?: number;
  targetPeriod: string;
  periodType: 'MONTHLY' | 'YEARLY';
  productType?: string;
  targetValue: number;
  targetOfferCount?: number;
  actualValue?: number;
  achievement?: number;
  serviceZone?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

const PRODUCT_TYPE_LABELS: { [key: string]: { label: string; icon: string; color: string; gradient: string } } = {
  'RELOCATION': { label: 'Relocation', icon: '🚚', color: 'blue', gradient: 'from-blue-500 to-blue-600' },
  'CONTRACT': { label: 'Contract', icon: '📋', color: 'emerald', gradient: 'from-emerald-500 to-emerald-600' },
  'SPP': { label: 'SPP', icon: '🔧', color: 'purple', gradient: 'from-purple-500 to-purple-600' },
  'UPGRADE_KIT': { label: 'Upgrade Kit', icon: '⬆️', color: 'amber', gradient: 'from-amber-500 to-amber-600' },
  'SOFTWARE': { label: 'Software', icon: '💻', color: 'cyan', gradient: 'from-cyan-500 to-cyan-600' },
  'BD_CHARGES': { label: 'BD Charges', icon: '💰', color: 'rose', gradient: 'from-rose-500 to-rose-600' },
  'BD_SPARE': { label: 'BD Spare', icon: '🔩', color: 'indigo', gradient: 'from-indigo-500 to-indigo-600' },
  'MIDLIFE_UPGRADE': { label: 'Midlife Upgrade', icon: '🔄', color: 'teal', gradient: 'from-teal-500 to-teal-600' },
  'RETROFIT_KIT': { label: 'Retrofit Kit', icon: '🛠️', color: 'orange', gradient: 'from-orange-500 to-orange-600' },
};

export default function EditTargetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const targetType = (searchParams.get('type') || 'ZONE') as 'ZONE' | 'USER';
  const entityId = searchParams.get('id');
  const targetPeriod = searchParams.get('period') || '';
  const periodType = (searchParams.get('periodType') || 'YEARLY') as 'MONTHLY' | 'YEARLY';
  const targetId = searchParams.get('targetId');

  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entityName, setEntityName] = useState('');
  
  // For creating new targets
  const [newTargetValue, setNewTargetValue] = useState('');
  const [showProductTypes, setShowProductTypes] = useState(true);
  
  // Product types from backend enum
  const productTypes = ['RELOCATION', 'CONTRACT', 'SPP', 'UPGRADE_KIT', 'SOFTWARE', 'BD_CHARGES', 'BD_SPARE', 'MIDLIFE_UPGRADE', 'RETROFIT_KIT'];
  const [productTargets, setProductTargets] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (entityId && targetPeriod) {
      fetchTargets();
    }
  }, [entityId, targetPeriod, targetType]);

  const fetchTargets = async () => {
    setLoading(true);
    try {
      const params = { 
        targetPeriod, 
        periodType: 'YEARLY', // Always fetch yearly targets for editing
        grouped: 'false' // Get individual targets, not grouped
      };
      
      let response;
      if (targetType === 'ZONE') {
        response = await apiService.getZoneTargets(params);
      } else {
        response = await apiService.getUserTargets(params);
      }
      
      const allTargets = response.targets || [];
      
      // Filter targets for the specific entity
      const entityTargets = allTargets.filter((target: Target) => 
        targetType === 'ZONE' 
          ? target.serviceZoneId === parseInt(entityId!)
          : target.userId === parseInt(entityId!)
      );
      
      // Only include targets that actually exist (have an ID)
      const existingTargets = entityTargets.filter((target: Target) => target.id);
      
      setTargets(existingTargets);
      
      // Set entity name
      if (existingTargets.length > 0) {
        const firstTarget = existingTargets[0];
        if (targetType === 'ZONE') {
          setEntityName(firstTarget.serviceZone?.name || 'Unknown Zone');
        } else {
          setEntityName(firstTarget.user?.name || firstTarget.user?.email || 'Unknown User');
        }
      } else {
        // If no targets exist, get entity name from the full list
        const entityData = allTargets.find((target: Target) => 
          targetType === 'ZONE' 
            ? target.serviceZoneId === parseInt(entityId!)
            : target.userId === parseInt(entityId!)
        );
        if (entityData) {
          if (targetType === 'ZONE') {
            setEntityName(entityData.serviceZone?.name || 'Unknown Zone');
          } else {
            setEntityName(entityData.user?.name || entityData.user?.email || 'Unknown User');
          }
        } else {
          // Fallback - fetch entity details directly
          setEntityName(targetType === 'ZONE' ? 'Zone' : 'User');
        }
      }
      
    } catch (error: any) {
      console.error('Failed to fetch targets:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch targets');
    } finally {
      setLoading(false);
    }
  };

  const updateTarget = (index: number, field: 'targetValue', value: string) => {
    const updated = [...targets];
    updated[index].targetValue = parseFloat(value) || 0;
    setTargets(updated);
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    let successCount = 0;
    const errors: string[] = [];

    try {
      if (isCreatingNew) {
        // Create new targets
        const targetsToCreate = [];

        // Add overall target if specified
        if (newTargetValue) {
          targetsToCreate.push({
            targetPeriod,
            periodType: 'YEARLY',
            targetValue: parseFloat(newTargetValue),
            targetOfferCount: null,
            productType: null,
            label: 'Overall'
          });
        }

        // Add product-specific targets
        Object.entries(productTargets).forEach(([productType, value]) => {
          if (value) {
            targetsToCreate.push({
              targetPeriod,
              periodType: 'YEARLY',
              targetValue: parseFloat(value),
              targetOfferCount: null,
              productType,
              label: productType
            });
          }
        });

        if (targetsToCreate.length === 0) {
          toast.error('Please enter at least one target value');
          setSaving(false);
          return;
        }

        // Create all targets
        for (const targetData of targetsToCreate) {
          try {
            const createData = {
              targetPeriod: targetData.targetPeriod,
              periodType: targetData.periodType,
              targetValue: targetData.targetValue,
              targetOfferCount: targetData.targetOfferCount,
              productType: targetData.productType
            };

            if (targetType === 'ZONE') {
              await apiService.setZoneTarget({
                ...createData,
                serviceZoneId: parseInt(entityId!)
              });
            } else {
              await apiService.setUserTarget({
                ...createData,
                userId: parseInt(entityId!)
              });
            }
            
            successCount++;
          } catch (error: any) {
            errors.push(`${targetData.label}: ${error.response?.data?.message || 'Failed'}`);
          }
        }
      } else {
        // Update existing targets
        for (const target of targets) {
          try {
            const updateData = {
              targetValue: Number(target.targetValue),
              targetOfferCount: target.targetOfferCount ? Number(target.targetOfferCount) : null
            };

            if (targetType === 'ZONE') {
              await apiService.updateZoneTarget(target.id, updateData);
            } else {
              await apiService.updateUserTarget(target.id, updateData);
            }
            
            successCount++;
          } catch (error: any) {
            const productLabel = target.productType || 'Overall';
            errors.push(`${productLabel}: ${error.response?.data?.message || 'Failed'}`);
          }
        }
      }

      if (errors.length > 0) {
        toast.warning(`Updated ${successCount} targets. Some errors occurred: ${errors.join(', ')}`);
      } else {
        toast.success(`Successfully ${isCreatingNew ? 'created' : 'updated'} ${successCount} target(s)!`);
      }

      // Navigate back to targets page
      setTimeout(() => {
        router.push(`/admin/targets?type=${targetType}&period=${targetPeriod}&periodType=${periodType}`);
      }, 1500);
      
    } catch (error: any) {
      console.error('Failed to update targets:', error);
      toast.error('Failed to update targets: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-16 text-center border border-slate-100">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 w-20 h-20 border-4 border-blue-100 rounded-full"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-700 font-bold text-xl">Loading targets...</p>
          <p className="text-slate-500 text-sm mt-2">Please wait while we fetch the data</p>
        </div>
      </div>
    );
  }

  // If no targets exist, we'll create a form to set new targets
  const isCreatingNew = targets.length === 0;

  // Calculate summary for existing targets
  const totalTarget = targets.reduce((sum, t) => sum + t.targetValue, 0);
  const totalActual = targets.reduce((sum, t) => sum + (t.actualValue || 0), 0);
  const overallAchievement = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="p-6 max-w-5xl mx-auto">
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
          targetType === 'ZONE' 
            ? 'from-blue-600 via-indigo-600 to-purple-700' 
            : 'from-purple-600 via-pink-600 to-rose-600'
        }`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGM5Ljk0MSAwIDE4LTguMDU5IDE4LTE4cy04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-5 mb-5">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl"></div>
                <div className="relative bg-white/20 backdrop-blur-xl p-4 rounded-2xl border border-white/30">
                  {targetType === 'ZONE' ? <Building2 className="w-10 h-10" /> : <Users className="w-10 h-10" />}
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold flex items-center gap-3">
                  {isCreatingNew ? 'Create Targets' : 'Edit Targets'}
                  <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                </h1>
                <p className="text-white/80 mt-2 text-lg">
                  {isCreatingNew ? 'Set yearly targets for' : 'Update yearly targets for'} <span className="font-bold text-white">{entityName}</span>
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-6">
              <div className="bg-white/15 backdrop-blur-xl px-5 py-3 rounded-xl border border-white/20">
                <span className="text-white/70 text-sm">Type</span>
                <div className="font-bold flex items-center gap-2 mt-0.5">
                  {targetType === 'ZONE' ? <Building2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  {targetType === 'ZONE' ? 'Zone Target' : 'User Target'}
                </div>
              </div>
              <div className="bg-white/15 backdrop-blur-xl px-5 py-3 rounded-xl border border-white/20">
                <span className="text-white/70 text-sm">Period</span>
                <div className="font-bold mt-0.5">📆 {targetPeriod} (Yearly)</div>
              </div>
              <div className="bg-white/15 backdrop-blur-xl px-5 py-3 rounded-xl border border-white/20">
                <span className="text-white/70 text-sm">{isCreatingNew ? 'Action' : 'Targets'}</span>
                <div className="font-bold mt-0.5">{isCreatingNew ? '✨ Create New' : `📊 ${targets.length} Existing`}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {isCreatingNew ? (
            // Create new target form
            <>
              {/* Overall Target Card */}
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden hover:shadow-2xl transition-all">
                <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 px-6 py-5">
                  <div className="flex items-center gap-4 text-white">
                    <div className="p-3 bg-white/20 backdrop-blur-xl rounded-xl border border-white/30">
                      <TrendingUp className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Overall Yearly Target</h3>
                      <p className="text-emerald-100 text-sm mt-0.5">Set combined target for all product types</p>
                    </div>
                  </div>
                </div>
                <div className="p-8">
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    Target Value (₹) <span className="text-slate-400 font-normal">- Yearly total, will be divided by 12 for monthly view</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-2xl">₹</span>
                    <input
                      type="number"
                      value={newTargetValue}
                      onChange={(e) => setNewTargetValue(e.target.value)}
                      className="w-full pl-14 pr-6 py-5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 text-2xl font-bold transition-all hover:border-emerald-300"
                      min="0"
                      step="0.01"
                      placeholder="50,00,000"
                    />
                  </div>
                  {newTargetValue && (
                    <p className="text-sm text-slate-500 mt-3 flex items-center gap-2">
                      <span className="px-2 py-1 bg-emerald-50 rounded-lg text-emerald-600 font-medium">
                        📅 Monthly: {formatCurrency(parseFloat(newTargetValue) / 12)}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Product-Specific Targets Section */}
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 px-6 py-5">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 backdrop-blur-xl rounded-xl border border-white/30">
                        <Package className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Product-Specific Targets</h3>
                        <p className="text-violet-100 text-sm mt-0.5">Set individual targets for each product type</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProductTypes(!showProductTypes)}
                      className="px-5 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-xl rounded-xl transition-all font-semibold border border-white/30"
                    >
                      {showProductTypes ? '🙈 Hide' : '👁️ Show'}
                    </button>
                  </div>
                </div>
                
                {showProductTypes && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {productTypes.map((productType) => {
                        const config = PRODUCT_TYPE_LABELS[productType];
                        return (
                          <div 
                            key={productType} 
                            className={`group relative bg-white border-2 rounded-xl p-5 hover:shadow-lg transition-all ${
                              productTargets[productType] ? `border-${config.color}-300 bg-${config.color}-50/30` : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient} shadow-lg`}>
                                <Package className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900">{config.label}</h4>
                                <p className="text-xs text-slate-500">{config.icon} Product Type</p>
                              </div>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                              <input
                                type="number"
                                value={productTargets[productType] || ''}
                                onChange={(e) => setProductTargets({
                                  ...productTargets,
                                  [productType]: e.target.value
                                })}
                                className="w-full pl-8 pr-3 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-semibold transition-all hover:border-purple-300"
                                min="0"
                                step="0.01"
                                placeholder="Enter yearly target"
                              />
                            </div>
                            {productTargets[productType] && (
                              <p className="text-xs text-slate-500 mt-2">
                                📅 Monthly: {formatCurrency(parseFloat(productTargets[productType]) / 12)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Edit existing targets form
            <>
              {/* Summary Dashboard */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6 text-white">
                    <div className="p-3 bg-white/10 backdrop-blur-xl rounded-xl">
                      <BarChart3 className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-bold">Performance Summary</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/10">
                      <div className="text-slate-400 text-sm font-semibold mb-2">Total Target</div>
                      <div className="text-3xl font-bold text-white">{formatCurrency(totalTarget)}</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/10">
                      <div className="text-slate-400 text-sm font-semibold mb-2">Actual Value</div>
                      <div className="text-3xl font-bold text-emerald-400">{formatCurrency(totalActual)}</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/10">
                      <div className="text-slate-400 text-sm font-semibold mb-2">Achievement</div>
                      <div className={`text-3xl font-bold ${
                        overallAchievement >= 100 ? 'text-emerald-400' :
                        overallAchievement >= 75 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {overallAchievement.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/10">
                      <div className="text-slate-400 text-sm font-semibold mb-2">Monthly Target</div>
                      <div className="text-3xl font-bold text-blue-400">{formatCurrency(totalTarget / 12)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall Target Card */}
              {targets.filter(t => !t.productType).map((target) => {
                const actualIndex = targets.findIndex(t => t.id === target.id);
                return (
                  <div key={target.id} className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden hover:shadow-2xl transition-all">
                    <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 px-6 py-5">
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/20 backdrop-blur-xl rounded-xl border border-white/30">
                            <TrendingUp className="w-7 h-7" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">Overall Yearly Target</h3>
                            <p className="text-emerald-100 text-sm mt-0.5">Combined target for all products</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-emerald-100 text-sm">Current Achievement</div>
                          <div className="text-2xl font-bold">{target.achievement?.toFixed(1) || 0}%</div>
                        </div>
                      </div>
                    </div>
                    <div className="p-8">
                      <label className="block text-sm font-bold text-slate-700 mb-3">
                        Target Value (₹) <span className="text-red-500">*</span>
                        <span className="text-slate-400 font-normal ml-2">Yearly total</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-2xl">₹</span>
                        <input
                          type="number"
                          value={target.targetValue}
                          onChange={(e) => updateTarget(actualIndex, 'targetValue', e.target.value)}
                          className="w-full pl-14 pr-6 py-5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 text-2xl font-bold transition-all hover:border-emerald-300"
                          required
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="flex items-center gap-4 mt-4 text-sm">
                        <span className="px-3 py-1.5 bg-emerald-50 rounded-lg text-emerald-600 font-medium">
                          📅 Monthly: {formatCurrency(target.targetValue / 12)}
                        </span>
                        <span className="px-3 py-1.5 bg-blue-50 rounded-lg text-blue-600 font-medium">
                          💰 Actual: {formatCurrency(target.actualValue || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Product-Specific Targets */}
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 px-6 py-5">
                  <div className="flex items-center gap-4 text-white">
                    <div className="p-3 bg-white/20 backdrop-blur-xl rounded-xl border border-white/30">
                      <Package className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Product-Specific Targets</h3>
                      <p className="text-violet-100 text-sm mt-0.5">Update targets for individual product types</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {productTypes.map((productType) => {
                      const existingTarget = targets.find(t => t.productType === productType);
                      const actualIndex = existingTarget ? targets.findIndex(t => t.id === existingTarget.id) : -1;
                      const targetValue = existingTarget?.targetValue || 0;
                      const hasTarget = !!existingTarget;
                      const actualValue = existingTarget?.actualValue || 0;
                      const achievement = targetValue > 0 ? (actualValue / targetValue) * 100 : 0;
                      const config = PRODUCT_TYPE_LABELS[productType];
                      
                      return (
                        <div 
                          key={productType} 
                          className={`group relative rounded-xl p-5 transition-all ${
                            hasTarget 
                              ? 'bg-white border-2 border-purple-200 hover:border-purple-400 hover:shadow-xl' 
                              : 'bg-slate-50 border-2 border-dashed border-slate-200'
                          }`}
                        >
                          {/* Header Section */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${hasTarget ? `bg-gradient-to-br ${config.gradient}` : 'bg-slate-300'} shadow-md`}>
                                <Package className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900">{config.label}</h4>
                                {!hasTarget && (
                                  <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full font-medium">
                                    No Target
                                  </span>
                                )}
                              </div>
                            </div>
                            {hasTarget && (
                              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                achievement >= 100 ? 'bg-emerald-100 text-emerald-700' :
                                achievement >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {achievement.toFixed(0)}%
                              </span>
                            )}
                          </div>

                          {/* Input Section */}
                          <div className="space-y-2">
                            <label className="block text-xs font-semibold text-slate-600">
                              Yearly Target (₹) {hasTarget && <span className="text-red-500">*</span>}
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                              <input
                                type="number"
                                value={targetValue}
                                onChange={(e) => {
                                  if (hasTarget && actualIndex !== -1) {
                                    updateTarget(actualIndex, 'targetValue', e.target.value);
                                  }
                                }}
                                className={`w-full pl-8 pr-3 py-3 border-2 rounded-lg font-semibold text-sm transition-all ${
                                  hasTarget
                                    ? 'border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 hover:border-purple-300 bg-white'
                                    : 'border-slate-200 bg-slate-100 cursor-not-allowed text-slate-400'
                                }`}
                                required={hasTarget}
                                min="0"
                                step="0.01"
                                placeholder={hasTarget ? "Enter value" : "Not set"}
                                disabled={!hasTarget}
                              />
                            </div>
                            
                            {hasTarget ? (
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                                <span className="px-2 py-1 bg-purple-50 rounded text-purple-600">
                                  📅 Monthly: {formatCurrency(targetValue / 12)}
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 mt-2">
                                💡 Create this target from the main page
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 font-bold text-lg transition-all"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`flex-1 px-6 py-4 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl ${
                  targetType === 'ZONE' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' 
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                }`}
                disabled={saving || (isCreatingNew && !newTargetValue && Object.values(productTargets).every(v => !v))}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    {isCreatingNew ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    <Save className="w-6 h-6" />
                    {isCreatingNew ? 'Create Targets' : `Update ${targets.length} Target${targets.length > 1 ? 's' : ''}`}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
