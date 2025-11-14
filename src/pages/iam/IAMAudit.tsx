import { useEffect, useState } from 'react';
import { Filter, Clock } from 'lucide-react';
import { User } from '../../lib/types';
import { api } from '../../lib/api';
import { muninn } from '../../sdk';

export function IAMAudit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    loadData();
  }, [actionFilter]);

  const loadData = async () => {
    try {
      const [logsData, usersData] = await Promise.all([
        muninn.audit.list({ action: actionFilter || undefined }),
        api.users.list(),
      ]);
      setLogs(logsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load audit data:', error);
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return 'System';
    return users.find(u => u.id === userId)?.name || 'Unknown';
  };

  const getActionColor = (action: string) => {
    if (action.includes('locked') || action.includes('suspended')) return 'text-red-600';
    if (action.includes('created') || action.includes('unlocked')) return 'text-green-600';
    if (action.includes('updated')) return 'text-blue-600';
    return 'text-slate-400';
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-200">Audit Log</h1>
        <p className="text-sm text-slate-400 mt-1">Track all IAM activities</p>
      </div>

      <div className="glass-table">
        <div className="p-4 border-b flex gap-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All Actions</option>
              <option value="user.created">User Created</option>
              <option value="user.locked">User Locked</option>
              <option value="user.unlocked">User Unlocked</option>
              <option value="user.login">User Login</option>
              <option value="policy.updated">Policy Updated</option>
              <option value="app.created">App Created</option>
            </select>
          </div>
        </div>

        <div className="divide-y">
          {logs.map((log) => (
            <div key={log.id} className="p-4 table-row">
              <div className="flex items-start gap-3">
                <Clock className="text-slate-400 mt-1" size={16} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                    <span className="text-slate-400">—</span>
                    <span className="font-medium text-slate-300">{getUserName(log.actor_user_id)}</span>
                    <span className={'font-medium ' + getActionColor(log.action)}>{log.action}</span>
                    {log.target_name && <span className="text-slate-400">{log.target_name}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {logs.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            <Clock size={48} className="mx-auto mb-3 text-slate-300" />
            <p>No audit logs found</p>
          </div>
        )}
      </div>
    </div>
  );
}
