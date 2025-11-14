import { useState, useEffect } from 'react';
import { Users, Shield, Lock, UserCheck, UserX, Activity, AlertCircle } from 'lucide-react';
import { muninn } from '../../sdk';

interface IAMStats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  suspendedUsers: number;
  totalGroups: number;
  totalRoles: number;
  mfaEnabled: number;
  recentActivity: number;
}

interface RecentUser {
  id: string;
  email: string;
  name: string;
  status: string;
  role: string;
  created_at: string;
}

export function IAMOverview() {
  const [stats, setStats] = useState<IAMStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [users, groups, roles, auditLogs] = await Promise.all([
        muninn.users.list().catch(() => []),
        muninn.groups.list().catch(() => []),
        muninn.roles.list().catch(() => []),
        muninn.audit.list().catch(() => []),
      ]);

      // Filter audit logs to last 24 hours
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentAudit = auditLogs.filter((log: any) => {
        const logDate = new Date(log.created_at).getTime();
        return logDate >= oneDayAgo;
      });

      // Sort users by created_at descending
      const sortedUsers = [...users].sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      const statsData: IAMStats = {
        totalUsers: users.length,
        activeUsers: users.filter((u: any) => u.status === 'active').length,
        lockedUsers: users.filter((u: any) => u.status === 'locked').length,
        suspendedUsers: users.filter((u: any) => u.status === 'suspended').length,
        totalGroups: groups.length,
        totalRoles: roles.length,
        mfaEnabled: users.filter((u: any) => u.mfa_enabled).length,
        recentActivity: recentAudit.length,
      };

      setStats(statsData);
      setRecentUsers(sortedUsers.slice(0, 5) as RecentUser[]);
    } catch (error) {
      console.error('Failed to load IAM overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading overview...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Muninn — Identity & Access Management</h1>
        <p className="text-slate-400 mt-1">Manage users, groups, roles, and access control across your organization</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-blue-400" size={24} />
            <span className="text-slate-400 text-sm">Total Users</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.totalUsers || 0}</p>
          <p className="text-xs text-slate-500 mt-2">All user accounts</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <UserCheck className="text-green-400" size={24} />
            <span className="text-slate-400 text-sm">Active Users</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.activeUsers || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Currently active</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="text-amber-400" size={24} />
            <span className="text-slate-400 text-sm">Locked Accounts</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.lockedUsers || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Security lockouts</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <UserX className="text-red-400" size={24} />
            <span className="text-slate-400 text-sm">Suspended</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.suspendedUsers || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Temporarily disabled</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-violet-400" size={24} />
            <span className="text-slate-400 text-sm">MFA Enabled</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.mfaEnabled || 0}</p>
          <p className="text-xs text-slate-500 mt-2">
            {stats?.totalUsers ? Math.round((stats.mfaEnabled / stats.totalUsers) * 100) : 0}% of users
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-cyan-400" size={24} />
            <span className="text-slate-400 text-sm">Groups</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.totalGroups || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Access groups</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-emerald-400" size={24} />
            <span className="text-slate-400 text-sm">Roles</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.totalRoles || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Permission roles</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="text-blue-400" size={24} />
            <span className="text-slate-400 text-sm">Recent Activity</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.recentActivity || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Last 24 hours</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-table">
          <div className="p-6 border-b border-slate-800/30">
            <h2 className="text-xl font-semibold text-slate-200">Recently Created Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-800/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {recentUsers.map((user) => (
                  <tr key={user.id} className="table-row">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-200">{user.name}</p>
                        <p className="text-sm text-slate-400">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="status-badge status-info capitalize">{user.role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`status-badge ${
                        user.status === 'active' ? 'status-active' :
                        user.status === 'locked' ? 'status-error' :
                        'status-pending'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-table">
          <div className="p-6 border-b border-slate-800/30">
            <h2 className="text-xl font-semibold text-slate-200">Security Status</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="text-green-400" size={20} />
                <div>
                  <p className="font-medium text-slate-200">MFA Adoption</p>
                  <p className="text-sm text-slate-400">Multi-factor authentication</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-200">
                  {stats?.totalUsers ? Math.round((stats.mfaEnabled / stats.totalUsers) * 100) : 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <UserCheck className="text-blue-400" size={20} />
                <div>
                  <p className="font-medium text-slate-200">Account Health</p>
                  <p className="text-sm text-slate-400">Active vs. total users</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-200">
                  {stats?.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className={`${
                  (stats?.lockedUsers || 0) + (stats?.suspendedUsers || 0) > 0 ? 'text-amber-400' : 'text-slate-400'
                }`} size={20} />
                <div>
                  <p className="font-medium text-slate-200">Restricted Accounts</p>
                  <p className="text-sm text-slate-400">Locked or suspended</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-200">
                  {(stats?.lockedUsers || 0) + (stats?.suspendedUsers || 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="text-violet-400" size={20} />
                <div>
                  <p className="font-medium text-slate-200">Activity Rate</p>
                  <p className="text-sm text-slate-400">Actions per day</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-200">
                  {stats?.recentActivity || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
