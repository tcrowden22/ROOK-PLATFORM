import { useEffect, useState } from 'react';
import { Users, Ticket, Monitor, TrendingUp, AlertCircle, CheckCircle, Zap, Activity, Shield, Cpu, ClipboardList, Clock, UserCheck, UserX } from 'lucide-react';
import { api } from '../lib/api';
import { DashboardMetrics } from '../lib/types';

interface DashboardProps {
  onNavigate: (page: string, filters?: any) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await api.getMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <Zap className="text-blue-400 animate-pulse-glow" size={32} />
          <span className="text-slate-300 text-lg">Initializing command center...</span>
        </div>
      </div>
    );
  }

  const compliancePercentage = metrics.devicesTotal > 0 ? Math.round((metrics.devicesCompliant / metrics.devicesTotal) * 100) : 0;
  const resolutionRate = metrics.ticketsTotal > 0 ? Math.round((metrics.ticketsClosed / metrics.ticketsTotal) * 100) : 0;
  const openTicketRatio = metrics.ticketsTotal > 0 ? Math.round((metrics.ticketsOpen / metrics.ticketsTotal) * 100) : 0;
  const averageResolutionDisplay = (() => {
    if (metrics.avgResolutionMinutes === null) return '—';
    if (metrics.avgResolutionMinutes >= 60) {
      const hours = (metrics.avgResolutionMinutes / 60);
      return hours >= 24
        ? `${(hours / 24).toFixed(1)}d`
        : `${hours.toFixed(1)}h`;
    }
    return `${metrics.avgResolutionMinutes}m`;
  })();

  const formatRelativeTime = (isoDate: string) => {
    const timestamp = Date.parse(isoDate);
    if (Number.isNaN(timestamp)) return '—';
    const diffMs = Date.now() - timestamp;
    const minutes = Math.floor(diffMs / (60 * 1000));
    if (minutes < 1) return 'moments ago';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  };

  const metricCards = [
    {
      title: 'Total Users',
      value: metrics.usersTotal,
      icon: Users,
      gradient: 'from-blue-500 to-blue-500',
      glow: 'cyan',
      onClick: () => onNavigate('users'),
    },
    {
      title: 'Open Tickets',
      value: metrics.ticketsOpen,
      icon: AlertCircle,
      gradient: 'from-amber-500 to-orange-500',
      glow: 'amber',
      onClick: () => onNavigate('tickets', { status: 'open' }),
    },
    {
      title: 'Total Devices',
      value: metrics.devicesTotal,
      icon: Monitor,
      gradient: 'from-emerald-500 to-teal-500',
      glow: 'emerald',
      onClick: () => onNavigate('devices'),
    },
    {
      title: 'Compliance',
      value: `${compliancePercentage}%`,
      icon: CheckCircle,
      gradient: 'from-violet-500 to-purple-500',
      glow: 'violet',
      onClick: () => onNavigate('devices', { compliance: true }),
    },
  ];

  const quickStats = [
    {
      label: 'Active Users',
      value: metrics.usersActive,
      accent: 'text-blue-400',
      icon: UserCheck,
    },
    {
      label: 'Locked Users',
      value: metrics.usersLocked,
      accent: 'text-amber-400',
      icon: UserX,
    },
    {
      label: 'Resolved (24h)',
      value: metrics.ticketsResolvedToday,
      accent: 'text-emerald-400',
      icon: CheckCircle,
    },
    {
      label: 'Avg Resolution',
      value: averageResolutionDisplay,
      accent: 'text-violet-400',
      icon: Clock,
    },
  ];

  const activityIconMap: Record<DashboardMetrics['recentActivity'][number]['type'], { icon: typeof Users; color: string }> = {
    'incident': { icon: AlertCircle, color: 'text-amber-400' },
    'service-request': { icon: ClipboardList, color: 'text-blue-400' },
    'device': { icon: Monitor, color: 'text-emerald-400' },
    'user': { icon: Users, color: 'text-cyan-400' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Command Center
          </h1>
          <p className="text-slate-400">Real-time intelligence on IT operations</p>
        </div>
        <div className="glass-card px-4 py-2">
          <div className="flex items-center gap-2">
            <Activity className="text-blue-400 animate-pulse" size={16} />
            <span className="text-sm text-slate-300">Live</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              onClick={card.onClick}
              className="metric-card group text-left"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                  <Icon size={24} className="text-white" />
                </div>
                <TrendingUp size={16} className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-1">
                <p className="text-slate-400 text-sm font-medium">{card.title}</p>
                <p className="text-3xl font-bold text-slate-100">{card.value}</p>
              </div>
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl`} />
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-violet-400" size={24} />
            <h2 className="text-xl font-semibold text-slate-200">System Health</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Device Compliance</span>
                <span className="text-sm font-semibold text-blue-400">{compliancePercentage}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-1000"
                  style={{ width: `${compliancePercentage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Ticket Resolution Rate</span>
                <span className="text-sm font-semibold text-emerald-400">{resolutionRate}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Open Ticket Share</span>
                <span className="text-sm font-semibold text-amber-400">{openTicketRatio}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-1000"
                  style={{ width: `${openTicketRatio}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Average Resolution Time</span>
              <span className="text-sm font-semibold text-slate-200">{averageResolutionDisplay}</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Cpu className="text-blue-400" size={24} />
            <h2 className="text-xl font-semibold text-slate-200">Quick Stats</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {quickStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500">{stat.label}</p>
                    <Icon size={16} className={stat.accent} />
                  </div>
                  <p className={`text-2xl font-bold ${stat.accent}`}>{stat.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-slate-200 mb-4">Recent Activity</h2>
        {metrics.recentActivity.length === 0 ? (
          <p className="text-sm text-slate-500">No recent activity recorded.</p>
        ) : (
          <div className="space-y-3">
            {metrics.recentActivity.map((activity) => {
              const activityMeta = activityIconMap[activity.type] ?? activityIconMap['incident'];
              const Icon = activityMeta.icon;
              return (
                <div key={`${activity.type}-${activity.id}`} className="flex items-center gap-4 p-3 hover:bg-slate-800/30 rounded-lg transition-colors">
                  <Icon className={activityMeta.color} size={20} />
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">{activity.title}</p>
                    {activity.description && (
                      <p className="text-xs text-slate-500 mt-1">{activity.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">{formatRelativeTime(activity.timestamp)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
