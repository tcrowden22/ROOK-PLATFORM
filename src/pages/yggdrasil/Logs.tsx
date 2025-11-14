import { useState, useEffect } from 'react';
import { Search, RefreshCw, CheckCircle, XCircle, Clock, PlayCircle } from 'lucide-react';
import { RunLog } from '../../lib/yggdrasil/types';

export function Logs() {
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const mockData: RunLog[] = [
      {
        id: '1',
        workflow_id: '1',
        workflow_name: 'Onboard New Employee',
        status: 'success',
        started_at: new Date(Date.now() - 300000).toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: 4500,
        trigger_type: 'event',
        steps_completed: 8,
        steps_total: 8,
      },
      {
        id: '2',
        workflow_id: '2',
        workflow_name: 'Incident Auto-Assignment',
        status: 'success',
        started_at: new Date(Date.now() - 600000).toISOString(),
        completed_at: new Date(Date.now() - 580000).toISOString(),
        duration_ms: 1200,
        trigger_type: 'event',
        steps_completed: 3,
        steps_total: 3,
      },
      {
        id: '3',
        workflow_id: '1',
        workflow_name: 'Onboard New Employee',
        status: 'failed',
        started_at: new Date(Date.now() - 900000).toISOString(),
        completed_at: new Date(Date.now() - 880000).toISOString(),
        duration_ms: 2100,
        trigger_type: 'manual',
        error_message: 'Failed to provision email account: API timeout',
        steps_completed: 5,
        steps_total: 8,
      },
      {
        id: '4',
        workflow_id: '3',
        workflow_name: 'Weekly Backup Report',
        status: 'running',
        started_at: new Date(Date.now() - 30000).toISOString(),
        trigger_type: 'scheduled',
        steps_completed: 2,
        steps_total: 5,
      },
    ];
    setLogs(mockData);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.workflow_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const classes = {
      success: 'status-badge status-active',
      failed: 'status-badge status-locked',
      running: 'status-badge status-pending',
      cancelled: 'status-badge status-info',
    };
    const icons = {
      success: <CheckCircle size={14} />,
      failed: <XCircle size={14} />,
      running: <PlayCircle size={14} />,
      cancelled: <XCircle size={14} />,
    };
    return (
      <span className={classes[status as keyof typeof classes]}>
        <span className="flex items-center gap-1">
          {icons[status as keyof typeof icons]}
          {status}
        </span>
      </span>
    );
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Execution Logs</h1>
          <p className="text-slate-400 mt-1">Monitor workflow runs and troubleshoot issues</p>
        </div>
        <button
          onClick={loadLogs}
          className="gradient-button text-white rounded-lg px-4 py-2 flex items-center gap-2"
        >
          <RefreshCw size={20} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="glass-table">
        <div className="p-6 border-b border-slate-800/30">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 input-field"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-field"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Workflow</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Trigger</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="table-row cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{log.workflow_name}</div>
                    {log.error_message && (
                      <div className="text-xs text-red-400 mt-1">{log.error_message}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                  <td className="px-6 py-4">
                    <span className="text-slate-300 capitalize">{log.trigger_type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                          style={{ width: `${(log.steps_completed / log.steps_total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-12">
                        {log.steps_completed}/{log.steps_total}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {formatDuration(log.duration_ms)}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(log.started_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-green-400" size={24} />
            <span className="text-slate-400 text-sm">Successful</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">
            {logs.filter(l => l.status === 'success').length}
          </p>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="text-red-400" size={24} />
            <span className="text-slate-400 text-sm">Failed</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">
            {logs.filter(l => l.status === 'failed').length}
          </p>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <PlayCircle className="text-amber-400" size={24} />
            <span className="text-slate-400 text-sm">Running</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">
            {logs.filter(l => l.status === 'running').length}
          </p>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-blue-400" size={24} />
            <span className="text-slate-400 text-sm">Avg Duration</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">2.6s</p>
        </div>
      </div>
    </div>
  );
}
