import { useEffect, useState } from 'react';
import { Users, Shield, KeyRound, Lock, Grid3x3, Activity, Zap, Globe } from 'lucide-react';
import type { User, Application, Group } from '../../lib/types';

interface OdinOverviewProps {
  onNavigate: (page: any, data?: any) => void;
}

interface IdentityStats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  suspendedUsers: number;
  mfaEnabled: number;
  totalGroups: number;
  totalApplications: number;
}

type RecentUser = Pick<User, 'id' | 'name' | 'email' | 'status' | 'created_at'>;
type ListedApplication = Pick<Application, 'id' | 'name' | 'created_at'>;
type ListedGroup = Pick<Group, 'id' | 'name' | 'created_at'>;

export function OdinOverview({ onNavigate }: OdinOverviewProps) {
  const [stats, setStats] = useState<IdentityStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [topApplications, setTopApplications] = useState<ListedApplication[]>([]);
  const [highlightGroups, setHighlightGroups] = useState<ListedGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { muninn } = await import('../../sdk');

      const [users, groups, applications] = await Promise.all([
        muninn.users.list().catch(() => []),
        muninn.groups.list().catch(() => []),
        muninn.applications.list().catch(() => []),
      ]);

      const totalUsers = users.length;
      const activeUsers = users.filter((user) => user.status === 'active').length;
      const lockedUsers = users.filter((user) => user.status === 'locked').length;
      const suspendedUsers = users.filter((user) => user.status === 'suspended').length;
      const mfaEnabled = users.filter((user) => user.mfa_enabled).length;

      const statsPayload: IdentityStats = {
        totalUsers,
        activeUsers,
        lockedUsers,
        suspendedUsers,
        mfaEnabled,
        totalGroups: groups.length,
        totalApplications: applications.length,
      };

      const recentProvisioned = [...users]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          status: user.status,
          created_at: user.created_at,
        }));

      const leadingApps = [...applications]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map((app) => ({
          id: app.id,
          name: app.name,
          created_at: app.created_at,
        }));

      const focusGroups = [...groups]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map((group) => ({
          id: group.id,
          name: group.name,
          created_at: group.created_at,
        }));

      setStats(statsPayload);
      setRecentUsers(recentProvisioned);
      setTopApplications(leadingApps);
      setHighlightGroups(focusGroups);
    } catch (error) {
      console.error('Failed to load Odin overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <Zap className="text-blue-400 animate-pulse-glow" size={32} />
          <span className="text-slate-300 text-lg">Aggregating identity telemetry...</span>
        </div>
      </div>
    );
  }

  const metricCards = [
    {
      title: 'Total Okta Users',
      value: stats.totalUsers,
      icon: Users,
      accent: 'from-blue-500 to-indigo-500',
      onClick: () => onNavigate('iam-directory'),
    },
    {
      title: 'Active Sessions',
      value: stats.activeUsers,
      icon: Activity,
      accent: 'from-emerald-500 to-teal-500',
      onClick: () => onNavigate('iam-directory', { status: 'active' }),
    },
    {
      title: 'MFA Coverage',
      value: `${stats.totalUsers > 0 ? Math.round((stats.mfaEnabled / stats.totalUsers) * 100) : 0}%`,
      icon: Shield,
      accent: 'from-violet-500 to-purple-500',
      onClick: () => onNavigate('iam-settings'),
    },
    {
      title: 'SSO Applications',
      value: stats.totalApplications,
      icon: Grid3x3,
      accent: 'from-cyan-500 to-sky-500',
      onClick: () => onNavigate('apps'),
    },
  ];

  const riskCards = [
    {
      title: 'Locked Accounts',
      value: stats.lockedUsers,
      subtext: 'Require admin unlock',
      icon: Lock,
      border: 'border-amber-500/40',
    },
    {
      title: 'Suspended Accounts',
      value: stats.suspendedUsers,
      subtext: 'Awaiting review',
      icon: KeyRound,
      border: 'border-rose-500/40',
    },
    {
      title: 'Provisioned Groups',
      value: stats.totalGroups,
      subtext: 'Okta assignments',
      icon: Globe,
      border: 'border-cyan-500/40',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Odin — Identity Overview
          </h1>
          <p className="text-slate-400">Live insight into your Okta-connected workforce</p>
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
                <div className={`p-3 rounded-xl bg-gradient-to-br ${card.accent} shadow-lg`}>
                  <Icon size={24} className="text-white" />
                </div>
                <Grid3x3 size={16} className="text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-1">
                <p className="text-slate-400 text-sm font-medium">{card.title}</p>
                <p className="text-3xl font-bold text-slate-100">{card.value}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-blue-400" size={24} />
            <h2 className="text-xl font-semibold text-slate-200">Identity Risk Snapshot</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {riskCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className={`bg-slate-800/60 rounded-lg p-5 border ${card.border}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className="text-slate-200" size={20} />
                    <p className="text-sm text-slate-400">{card.title}</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-100 mb-1">{card.value}</p>
                  <p className="text-xs text-slate-500">{card.subtext}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="text-emerald-400" size={24} />
            <h2 className="text-xl font-semibold text-slate-200">MFA Coverage</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Enabled Users</span>
                <span className="text-sm font-semibold text-emerald-400">{stats.mfaEnabled}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
                  style={{
                    width: `${stats.totalUsers > 0 ? Math.max(4, Math.round((stats.mfaEnabled / stats.totalUsers) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-4 border border-emerald-500/30">
              <p className="text-xs text-emerald-300 uppercase tracking-wide mb-2">Recommendation</p>
              <p className="text-sm text-slate-300">
                Target at least 95% MFA adoption across Okta to align with zero-trust baseline controls.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-blue-300" size={20} />
            <h3 className="text-lg font-semibold text-slate-200">Recently Provisioned Users</h3>
          </div>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 hover:bg-slate-800/40 rounded-lg transition-colors">
                <div>
                  <p className="text-sm text-slate-200 font-medium">{user.name || user.email}</p>
                  <p className="text-xs text-slate-500">{new Date(user.created_at).toLocaleString()}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                  {user.status}
                </span>
              </div>
            ))}
            {recentUsers.length === 0 && <p className="text-sm text-slate-500">No recent provisioning events.</p>}
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Grid3x3 className="text-cyan-300" size={20} />
            <h3 className="text-lg font-semibold text-slate-200">Top Connected Apps</h3>
          </div>
          <div className="space-y-3">
            {topApplications.map((app) => (
              <div key={app.id} className="flex items-center justify-between p-3 hover:bg-slate-800/40 rounded-lg transition-colors">
                <div>
                  <p className="text-sm text-slate-200 font-medium">{app.name}</p>
                  <p className="text-xs text-slate-500">Added {new Date(app.created_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => onNavigate('apps')}
                  className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  Manage
                </button>
              </div>
            ))}
            {topApplications.length === 0 && <p className="text-sm text-slate-500">No SSO applications connected yet.</p>}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="text-purple-300" size={20} />
          <h3 className="text-lg font-semibold text-slate-200">Strategic Groups</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {highlightGroups.map((group) => (
            <div key={group.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/40">
              <p className="text-sm font-semibold text-slate-200 mb-1">{group.name}</p>
              <p className="text-xs text-slate-500">Created {new Date(group.created_at).toLocaleDateString()}</p>
              <button
                onClick={() => onNavigate('iam-groups')}
                className="mt-3 text-xs font-semibold text-blue-300 hover:text-blue-200"
              >
                View members
              </button>
            </div>
          ))}
          {highlightGroups.length === 0 && <p className="text-sm text-slate-500 col-span-full">No Okta groups have been provisioned yet.</p>}
        </div>
      </div>
    </div>
  );
}
