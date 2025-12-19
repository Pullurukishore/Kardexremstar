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
  BarChart3,
  TrendingUp,
  TrendingDown,
  MapPin,
  Package,
  Users,
  Target,
  ChevronDown,
  ChevronRight,
  PieChart,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  AlertCircle,
  Info,
  Layers,
  Award,
  Trophy,
  Medal,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Percent,
  DollarSign,
  Hash,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
  ComposedChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
} from 'recharts';

// ============================================================================
// TYPES
// ============================================================================

interface ZoneMonthlyData {
  month: number;
  monthName: string;
  monthKey: string;
  rawForecast: number;
  weightedForecast: number;
  actualOrders: number;
  offersCount: number;
  wonCount: number;
  avgProbability: number;
  target: number;
  achievement: number;
  hitRate: number;
}

interface ZoneForecast {
  zoneId: number;
  zoneName: string;
  shortForm: string;
  monthly: ZoneMonthlyData[];
  quarterly: any[];
  totals: {
    rawForecast: number;
    weightedForecast: number;
    actualOrders: number;
    target: number;
    achievement: number;
    deviation: number;
    balanceToTarget: number;
    offersCount: number;
    wonCount: number;
    hitRate: number;
  };
  productBreakdown: any[];
}

interface UserData {
  rank: number;
  userId: number;
  userName: string;
  zoneName: string;
  monthly: any[];
  totals: {
    rawForecast: number;
    actualOrders: number;
    target: number;
    achievement: number;
    offersCount: number;
    wonCount: number;
    hitRate: number;
  };
}

interface FunnelStage {
  stage: string;
  count: number;
  value: number;
  rate: number;
}

interface ProductData {
  productType: string;
  label: string;
  totals: {
    forecast: number;
    actualOrders: number;
    contribution: number;
    offersCount: number;
    wonCount: number;
    hitRate: number;
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

const formatINR = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '₹0';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
};

const formatCompact = (value: number): string => {
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toFixed(0);
};

const ZONE_COLORS: Record<string, { gradient: string; primary: string; bg: string }> = {
  WEST: { gradient: 'from-amber-500 to-orange-600', primary: '#f59e0b', bg: 'bg-amber-50' },
  SOUTH: { gradient: 'from-emerald-500 to-teal-600', primary: '#10b981', bg: 'bg-emerald-50' },
  NORTH: { gradient: 'from-blue-500 to-indigo-600', primary: '#3b82f6', bg: 'bg-blue-50' },
  EAST: { gradient: 'from-purple-500 to-pink-600', primary: '#8b5cf6', bg: 'bg-purple-50' },
};

const PRODUCT_COLORS: Record<string, string> = {
  CONTRACT: '#3b82f6',
  BD_SPARE: '#10b981',
  SPP: '#f59e0b',
  RELOCATION: '#8b5cf6',
  SOFTWARE: '#ec4899',
  BD_CHARGES: '#14b8a6',
  RETROFIT_KIT: '#f97316',
  UPGRADE_KIT: '#6366f1',
  MIDLIFE_UPGRADE: '#06b6d4',
};

const ZONE_ORDER = ['WEST', 'SOUTH', 'NORTH', 'EAST'];

// ============================================================================
// COMPONENTS
// ============================================================================

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 p-4 min-w-[220px]">
        <p className="font-bold text-gray-900 mb-2 border-b pb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm text-gray-600">{entry.name}</span>
            </div>
            <span className="font-semibold text-gray-900">{formatINR(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const EmptyState = ({ title, message, icon: Icon }: { title: string; message: string; icon?: any }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mb-4">
      {Icon ? <Icon className="h-10 w-10 text-slate-400" /> : <Info className="h-10 w-10 text-slate-400" />}
    </div>
    <h3 className="text-xl font-bold text-slate-700 mb-2">{title}</h3>
    <p className="text-sm text-slate-500 max-w-md">{message}</p>
  </div>
);

// KPI Card
const KPICard = ({
  title, value, subtitle, icon: Icon, trend, gradient, subValue
}: {
  title: string; value: string; subtitle?: string; icon: any; trend?: number; gradient: string; subValue?: string;
}) => (
  <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-xl transform hover:scale-[1.02] transition-all duration-300`}>
    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
          <Icon className="h-5 w-5" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${trend >= 0 ? 'bg-white/20' : 'bg-rose-500/30'}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {subValue && <div className="text-sm opacity-80 mb-1">{subValue}</div>}
      <div className="text-xs opacity-70">{subtitle || title}</div>
    </div>
  </div>
);

// Section Header
const SectionHeader = ({
  icon: Icon, title, subtitle, isExpanded, onToggle, gradient
}: {
  icon: any; title: string; subtitle: string; isExpanded: boolean; onToggle: () => void; gradient: string;
}) => (
  <button onClick={onToggle} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`p-2.5 bg-gradient-to-br ${gradient} rounded-xl shadow-lg`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="text-left">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
    {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
  </button>
);

// Zone Forecast Table Row
const ZoneTableRow = ({ zone, months, showWeighted }: { zone: ZoneForecast; months: string[]; showWeighted: boolean }) => {
  const colors = ZONE_COLORS[zone.zoneName] || ZONE_COLORS.WEST;
  
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50/50">
        <td className="py-3 px-4 sticky left-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: colors.primary }} />
            <span className="font-bold text-gray-900">{zone.zoneName}</span>
          </div>
        </td>
        {zone.monthly.map((m, idx) => (
          <td key={idx} className="py-3 px-2 text-center text-sm">
            <div className="font-semibold text-gray-900">
              {formatCompact(showWeighted ? m.weightedForecast : m.rawForecast)}
            </div>
            <div className="text-xs text-gray-400">
              {m.offersCount} offers
            </div>
          </td>
        ))}
        <td className="py-3 px-3 text-center bg-blue-50/50">
          <div className="font-bold text-blue-700">{formatCompact(showWeighted ? zone.totals.weightedForecast : zone.totals.rawForecast)}</div>
        </td>
        <td className="py-3 px-3 text-center bg-emerald-50/50">
          <div className="font-bold text-emerald-700">{formatCompact(zone.totals.actualOrders)}</div>
        </td>
        <td className="py-3 px-3 text-center bg-amber-50/50">
          <div className="font-bold text-amber-700">{formatCompact(zone.totals.target)}</div>
        </td>
        <td className="py-3 px-3 text-center">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
            zone.totals.achievement >= 100 ? 'bg-emerald-100 text-emerald-700' :
            zone.totals.achievement >= 75 ? 'bg-amber-100 text-amber-700' :
            'bg-rose-100 text-rose-700'
          }`}>
            {zone.totals.achievement >= 100 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {zone.totals.achievement.toFixed(1)}%
          </span>
        </td>
        <td className="py-3 px-3 text-center">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
            <Target className="h-3 w-3" />
            {zone.totals.hitRate.toFixed(1)}%
          </span>
        </td>
      </tr>
    </>
  );
};

// User Leaderboard Card
const UserCard = ({ user }: { user: UserData }) => {
  const getRankBadge = () => {
    if (user.rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (user.rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (user.rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-gray-400">#{user.rank}</span>;
  };
  
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-md ${
      user.rank === 1 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' :
      user.rank === 2 ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200' :
      user.rank === 3 ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-orange-200' :
      'bg-white border-gray-200'
    }`}>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white">
        {getRankBadge()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-gray-900 truncate">{user.userName}</div>
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span>{user.zoneName}</span>
          <span>•</span>
          <span>{user.totals.offersCount} offers</span>
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold text-lg text-gray-900">{formatINR(user.totals.rawForecast)}</div>
        <div className="text-xs flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded ${user.totals.achievement >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {user.totals.achievement.toFixed(0)}% Ach
          </span>
          <span className="text-gray-500">{user.totals.hitRate.toFixed(0)}% Hit</span>
        </div>
      </div>
    </div>
  );
};

// Funnel Visualization
const FunnelVisualization = ({ funnel }: { funnel: FunnelStage[] }) => {
  const maxValue = funnel[0]?.value || 1;
  
  return (
    <div className="space-y-3">
      {funnel.map((stage, idx) => {
        const widthPercent = (stage.value / maxValue) * 100;
        const colors = [
          'from-blue-500 to-blue-600',
          'from-cyan-500 to-cyan-600',
          'from-amber-500 to-amber-600',
          'from-emerald-500 to-emerald-600',
          'from-green-500 to-green-600',
        ];
        
        return (
          <div key={stage.stage} className="relative">
            <div className="flex items-center gap-3">
              <div className="w-32 text-right text-sm font-medium text-gray-600">{stage.stage}</div>
              <div className="flex-1 relative h-10">
                <div
                  className={`h-full bg-gradient-to-r ${colors[idx % colors.length]} rounded-lg shadow-md transition-all duration-500 flex items-center px-4`}
                  style={{ width: `${Math.max(widthPercent, 15)}%` }}
                >
                  <span className="text-white font-bold text-sm">{stage.count}</span>
                </div>
              </div>
              <div className="w-24 text-right">
                <div className="font-bold text-gray-900">{formatINR(stage.value)}</div>
                <div className="text-xs text-gray-500">{stage.rate.toFixed(1)}%</div>
              </div>
            </div>
            {idx < funnel.length - 1 && (
              <div className="ml-36 pl-6 py-1 flex items-center gap-2 text-xs text-gray-400">
                <ArrowDownRight className="h-3 w-3" />
                <span>{((funnel[idx + 1]?.count / stage.count) * 100 || 0).toFixed(0)}% conversion</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Product Distribution Chart
const ProductChart = ({ products }: { products: ProductData[] }) => {
  const data = products.slice(0, 8).map(p => ({
    name: p.label,
    value: p.totals.forecast,
    contribution: p.totals.contribution,
    fill: PRODUCT_COLORS[p.productType] || '#6b7280',
  }));

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => formatCompact(v)} tick={{ fill: '#6b7280', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#374151', fontSize: 12 }} width={75} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Forecast">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Hit Rate Card
const HitRateCard = ({ title, hitRate, total, won, color }: { title: string; hitRate: number; total: number; won: number; color: string }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-3">
      <span className="font-medium text-gray-700">{title}</span>
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
    </div>
    <div className="flex items-end justify-between">
      <div>
        <div className="text-3xl font-bold text-gray-900">{hitRate.toFixed(1)}%</div>
        <div className="text-xs text-gray-500">{won} won / {total} total</div>
      </div>
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 transform -rotate-90">
          <circle cx="32" cy="32" r="28" stroke="#e5e7eb" strokeWidth="6" fill="none" />
          <circle
            cx="32" cy="32" r="28"
            stroke={color} strokeWidth="6" fill="none"
            strokeDasharray={`${(hitRate / 100) * 176} 176`}
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ForecastPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // State
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showWeighted, setShowWeighted] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    zones: true,
    users: true,
    products: true,
    funnel: true,
    hitRate: true,
  });

  // Data
  const [zoneData, setZoneData] = useState<{ zones: ZoneForecast[]; grandTotal: any } | null>(null);
  const [userData, setUserData] = useState<{ users: UserData[]; leaderboard: any[] } | null>(null);
  const [productData, setProductData] = useState<{ products: ProductData[]; distribution: any[] } | null>(null);
  const [funnelData, setFunnelData] = useState<{ funnel: FunnelStage[]; conversionRates: any; summary: any } | null>(null);
  const [hitRateData, setHitRateData] = useState<{ overall: any; byZone: any[]; byProduct: any[] } | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Auth check
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

      const results = await Promise.allSettled([
        apiService.getForstZoneForecast({ year: selectedYear }),
        apiService.getForstUserForecast({ year: selectedYear }),
        apiService.getForstProductForecastDetail({ year: selectedYear }),
        apiService.getForstFunnelAnalysis({ year: selectedYear }),
        apiService.getForstHitRateAnalysis({ year: selectedYear }),
      ]);

      const [zoneRes, userRes, productRes, funnelRes, hitRateRes] = results;

      if (zoneRes.status === 'fulfilled' && zoneRes.value?.success) {
        setZoneData(zoneRes.value.data);
      }
      if (userRes.status === 'fulfilled' && userRes.value?.success) {
        setUserData(userRes.value.data);
      }
      if (productRes.status === 'fulfilled' && productRes.value?.success) {
        setProductData(productRes.value.data);
      }
      if (funnelRes.status === 'fulfilled' && funnelRes.value?.success) {
        setFunnelData(funnelRes.value.data);
      }
      if (hitRateRes.status === 'fulfilled' && hitRateRes.value?.success) {
        setHitRateData(hitRateRes.value.data);
      }

      setLastRefresh(new Date());
    } catch (err: any) {
      console.error('Forecast load error:', err);
      setError(err?.message || 'Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === UserRole.ADMIN) {
      loadData(year);
    }
  }, [year, isAuthenticated, user?.role, loadData]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const downloadExcel = async () => {
    try {
      const blob = await apiService.exportForstExcel({ year });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Forecast_Report_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export. Please try again.');
    }
  };

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return [now - 1, now, now + 1];
  }, []);

  const sortedZones = useMemo(() => {
    if (!zoneData?.zones) return [];
    return [...zoneData.zones].sort((a, b) => {
      const aIdx = ZONE_ORDER.indexOf(a.zoneName);
      const bIdx = ZONE_ORDER.indexOf(b.zoneName);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
  }, [zoneData]);

  const hasData = zoneData && zoneData.zones && zoneData.zones.length > 0;

  // Loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-white mx-auto" />
          <p className="text-white font-medium text-lg mt-4">Loading Forecast...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== UserRole.ADMIN) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200/50 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-600/20">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                  FORST Forecast
                </h1>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <span>Zone • User • Product Analysis</span>
                  {lastRefresh && <span className="text-xs">• {lastRefresh.toLocaleTimeString()}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Weighted Toggle */}
              <button
                onClick={() => setShowWeighted(!showWeighted)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  showWeighted ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                {showWeighted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="text-sm font-medium">{showWeighted ? 'Weighted' : 'Raw'}</span>
              </button>

              {/* Year Selector */}
              <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-gray-200 shadow-sm">
                <Calendar className="w-5 h-5 text-gray-500" />
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="bg-transparent text-gray-900 font-semibold outline-none cursor-pointer"
                >
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <Button onClick={() => loadData(year)} disabled={loading} variant="outline" className="gap-2 rounded-xl">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Button
                onClick={downloadExcel}
                disabled={!hasData}
                className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-lg"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-6 flex items-center gap-4">
            <AlertCircle className="h-8 w-8 text-rose-600" />
            <div className="flex-1">
              <h3 className="font-bold text-rose-800">Error Loading Data</h3>
              <p className="text-sm text-rose-600">{error}</p>
            </div>
            <Button onClick={() => loadData(year)} variant="outline" className="border-rose-300">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* No Data */}
        {!loading && !error && !hasData && (
          <div className="bg-white rounded-2xl shadow-xl border p-8">
            <EmptyState title="No Forecast Data" message={`No offers found for ${year}.`} icon={BarChart3} />
          </div>
        )}

        {/* Data Content */}
        {!loading && !error && hasData && (
          <>
            {/* KPI Summary */}
            {zoneData?.grandTotal && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <KPICard
                  title="Total Forecast"
                  value={formatINR(showWeighted ? zoneData.grandTotal.weightedForecast : zoneData.grandTotal.rawForecast)}
                  subValue={`${zoneData.grandTotal.offersCount} Offers`}
                  icon={Layers}
                  gradient="from-blue-600 to-indigo-700"
                />
                <KPICard
                  title="Orders Won"
                  value={formatINR(zoneData.grandTotal.actualOrders)}
                  subValue={`${zoneData.grandTotal.wonCount} Orders`}
                  icon={Trophy}
                  trend={zoneData.grandTotal.achievement - 100}
                  gradient="from-emerald-600 to-teal-700"
                />
                <KPICard
                  title="Target"
                  value={formatINR(zoneData.grandTotal.target)}
                  subtitle="Business Unit Target"
                  icon={Target}
                  gradient="from-amber-500 to-orange-600"
                />
                <KPICard
                  title="Achievement"
                  value={`${zoneData.grandTotal.achievement.toFixed(1)}%`}
                  subtitle="vs Target"
                  icon={Activity}
                  trend={zoneData.grandTotal.achievement - 100}
                  gradient="from-purple-600 to-pink-600"
                />
                <KPICard
                  title="Hit Rate"
                  value={`${zoneData.grandTotal.hitRate.toFixed(1)}%`}
                  subtitle="Won / Total Offers"
                  icon={Zap}
                  gradient="from-rose-500 to-red-600"
                />
              </div>
            )}

            {/* Zone-wise Forecast Table */}
            <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <SectionHeader
                icon={MapPin}
                title="Zone-wise Forecast"
                subtitle={`Monthly breakdown by zone • ${showWeighted ? 'Weighted' : 'Raw'} values`}
                isExpanded={expandedSections.zones}
                onToggle={() => toggleSection('zones')}
                gradient="from-blue-500 to-indigo-600"
              />
              {expandedSections.zones && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px]">
                    <thead className="bg-gray-50 border-y border-gray-200">
                      <tr>
                        <th className="py-3 px-4 text-left text-xs font-bold text-gray-600 uppercase sticky left-0 bg-gray-50 z-10">Zone</th>
                        {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map(m => (
                          <th key={m} className="py-3 px-2 text-center text-xs font-bold text-gray-600 uppercase">{m}</th>
                        ))}
                        <th className="py-3 px-3 text-center text-xs font-bold text-blue-700 uppercase bg-blue-50/50">Forecast</th>
                        <th className="py-3 px-3 text-center text-xs font-bold text-emerald-700 uppercase bg-emerald-50/50">Orders</th>
                        <th className="py-3 px-3 text-center text-xs font-bold text-amber-700 uppercase bg-amber-50/50">Target</th>
                        <th className="py-3 px-3 text-center text-xs font-bold text-gray-600 uppercase">Ach %</th>
                        <th className="py-3 px-3 text-center text-xs font-bold text-gray-600 uppercase">Hit Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedZones.map(zone => (
                        <ZoneTableRow key={zone.zoneId} zone={zone} months={[]} showWeighted={showWeighted} />
                      ))}
                      {/* Total Row */}
                      {zoneData?.grandTotal && (
                        <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                          <td className="py-3 px-4 sticky left-0 bg-gray-100 z-10">TOTAL</td>
                          {Array(12).fill(0).map((_, idx) => {
                            const monthTotal = sortedZones.reduce((sum, z) => 
                              sum + (showWeighted ? z.monthly[idx]?.weightedForecast : z.monthly[idx]?.rawForecast) || 0, 0);
                            return (
                              <td key={idx} className="py-3 px-2 text-center text-sm">
                                {formatCompact(monthTotal)}
                              </td>
                            );
                          })}
                          <td className="py-3 px-3 text-center bg-blue-100 text-blue-700">
                            {formatCompact(showWeighted ? zoneData.grandTotal.weightedForecast : zoneData.grandTotal.rawForecast)}
                          </td>
                          <td className="py-3 px-3 text-center bg-emerald-100 text-emerald-700">
                            {formatCompact(zoneData.grandTotal.actualOrders)}
                          </td>
                          <td className="py-3 px-3 text-center bg-amber-100 text-amber-700">
                            {formatCompact(zoneData.grandTotal.target)}
                          </td>
                          <td className="py-3 px-3 text-center">{zoneData.grandTotal.achievement.toFixed(1)}%</td>
                          <td className="py-3 px-3 text-center">{zoneData.grandTotal.hitRate.toFixed(1)}%</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Two Column: Users & Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Leaderboard */}
              {userData?.users && userData.users.length > 0 && (
                <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <SectionHeader
                    icon={Users}
                    title="User Performance"
                    subtitle={`${userData.users.length} users ranked by forecast`}
                    isExpanded={expandedSections.users}
                    onToggle={() => toggleSection('users')}
                    gradient="from-purple-500 to-pink-600"
                  />
                  {expandedSections.users && (
                    <div className="p-5 pt-0 space-y-3 max-h-[500px] overflow-y-auto">
                      {userData.users.slice(0, 10).map(user => (
                        <UserCard key={user.userId} user={user} />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Product Distribution */}
              {productData?.products && productData.products.length > 0 && (
                <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <SectionHeader
                    icon={Package}
                    title="Product Type Mix"
                    subtitle="Forecast by product category"
                    isExpanded={expandedSections.products}
                    onToggle={() => toggleSection('products')}
                    gradient="from-amber-500 to-orange-600"
                  />
                  {expandedSections.products && (
                    <div className="p-5 pt-0">
                      <ProductChart products={productData.products} />
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Funnel & Hit Rate */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Offer Funnel */}
              {funnelData?.funnel && funnelData.funnel.length > 0 && (
                <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <SectionHeader
                    icon={Layers}
                    title="Offer Funnel"
                    subtitle={`${funnelData.summary?.totalOffers || 0} offers • ${funnelData.conversionRates?.overallConversion?.toFixed(1) || 0}% conversion`}
                    isExpanded={expandedSections.funnel}
                    onToggle={() => toggleSection('funnel')}
                    gradient="from-cyan-500 to-blue-600"
                  />
                  {expandedSections.funnel && (
                    <div className="p-5 pt-0">
                      <FunnelVisualization funnel={funnelData.funnel} />
                    </div>
                  )}
                </section>
              )}

              {/* Hit Rate by Zone */}
              {hitRateData?.byZone && hitRateData.byZone.length > 0 && (
                <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <SectionHeader
                    icon={Target}
                    title="Hit Rate Analysis"
                    subtitle={`Overall: ${hitRateData.overall?.hitRateByCount?.toFixed(1) || 0}%`}
                    isExpanded={expandedSections.hitRate}
                    onToggle={() => toggleSection('hitRate')}
                    gradient="from-rose-500 to-pink-600"
                  />
                  {expandedSections.hitRate && (
                    <div className="p-5 pt-0 grid grid-cols-2 gap-4">
                      {hitRateData.byZone.map((zone: any) => (
                        <HitRateCard
                          key={zone.zoneName}
                          title={zone.zoneName}
                          hitRate={zone.hitRateByCount}
                          total={zone.totalOffers}
                          won={zone.wonOffers}
                          color={ZONE_COLORS[zone.zoneName]?.primary || '#6b7280'}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Summary Footer */}
            {hitRateData?.overall && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="h-6 w-6 text-yellow-400" />
                  <h3 className="text-xl font-bold">Performance Summary</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-sm text-gray-300">Total Offers</div>
                    <div className="text-2xl font-bold">{hitRateData.overall.totalOffers}</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-sm text-gray-300">Won Orders</div>
                    <div className="text-2xl font-bold text-emerald-400">{hitRateData.overall.wonOffers}</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-sm text-gray-300">Total Value</div>
                    <div className="text-2xl font-bold">{formatINR(hitRateData.overall.totalValue)}</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-sm text-gray-300">Won Value</div>
                    <div className="text-2xl font-bold text-emerald-400">{formatINR(hitRateData.overall.wonValue)}</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-sm text-gray-300">Hit Rate (Count)</div>
                    <div className="text-2xl font-bold text-yellow-400">{hitRateData.overall.hitRateByCount.toFixed(1)}%</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-sm text-gray-300">Hit Rate (Value)</div>
                    <div className="text-2xl font-bold text-yellow-400">{hitRateData.overall.hitRateByValue.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
