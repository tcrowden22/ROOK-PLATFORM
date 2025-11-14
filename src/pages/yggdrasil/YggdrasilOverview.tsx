import { useState, useEffect } from 'react';
import { Zap, Workflow, CheckCircle, XCircle, Clock, TrendingUp, Activity, PlayCircle, PauseCircle, Radio, Plug } from 'lucide-react';
// Supabase removed - using SDK instead

interface YggdrasilStats {
  totalWorkflows: number;
  activeWorkflows: number;
  pausedWorkflows: number;
  disabledWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  runningExecutions: number;
  totalTriggers: number;
  activeTriggers: number;
  totalIntegrations: number;
  connectedIntegrations: number;
  avgExecutionTime: number;
  executionsToday: number;
}

interface RecentExecution {
  id: string;
  workflow_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  trigger_type: string;
}

export function YggdrasilOverview() {
  const [stats, setStats] = useState<YggdrasilStats | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<RecentExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { yggdrasil } = await import('../../sdk');
      
      const [workflows, integrations] = await Promise.all([
        yggdrasil.workflows.list().catch(() => []),
        yggdrasil.integrations.list().catch(() => []),
      ]);

      // Get triggers and logs for first workflow (if exists)
      let executions: any[] = [];
      let triggers: any[] = [];
      if (workflows && workflows.length > 0) {
        const [workflowTriggers, workflowLogs] = await Promise.all([
          yggdrasil.triggers.list(workflows[0].id).catch(() => []),
          yggdrasil.logs.list(workflows[0].id).catch(() => []),
        ]);
        triggers = workflowTriggers;
        executions = workflowLogs;
      }

      if (workflows && executions) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const executionsToday = executions.filter(e => {
          const execDate = new Date(e.started_at);
          return execDate >= today;
        }).length;

        const completedExecutions = executions.filter(e => e.duration_ms !== null);
        const avgTime = completedExecutions.length > 0
          ? completedExecutions.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / completedExecutions.length
          : 0;

        const statsData: YggdrasilStats = {
          totalWorkflows: workflows.length,
          activeWorkflows: workflows.filter(w => w.status === 'active').length,
          pausedWorkflows: workflows.filter(w => w.status === 'paused').length,
          disabledWorkflows: workflows.filter(w => w.status === 'disabled').length,
          totalExecutions: executions.length,
          successfulExecutions: executions.filter(e => e.status === 'success').length,
          failedExecutions: executions.filter(e => e.status === 'failed').length,
          runningExecutions: executions.filter(e => e.status === 'running').length,
          totalTriggers: triggers?.length || 0,
          activeTriggers: triggers?.filter(t => t.enabled).length || 0,
          totalIntegrations: integrations?.length || 0,
          connectedIntegrations: integrations?.filter(i => i.status === 'connected').length || 0,
          avgExecutionTime: Math.round(avgTime),
          executionsToday,
        };

        setStats(statsData);
        setRecentExecutions(executions.slice(0, 5) as RecentExecution[]);
      }
    } catch (error) {
      console.error('Failed to load Yggdrasil overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading overview...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Yggdrasil — Workflow Automation</h1>
        <p className="text-slate-400 mt-1">Build, automate, and orchestrate processes across your organization</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Workflow className="text-blue-400" size={24} />
            <span className="text-slate-400 text-sm">Total Workflows</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.totalWorkflows || 0}</p>
          <p className="text-xs text-slate-500 mt-2">All automations</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <PlayCircle className="text-green-400" size={24} />
            <span className="text-slate-400 text-sm">Active</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.activeWorkflows || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Currently running</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <PauseCircle className="text-amber-400" size={24} />
            <span className="text-slate-400 text-sm">Paused</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.pausedWorkflows || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Temporarily stopped</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="text-violet-400" size={24} />
            <span className="text-slate-400 text-sm">Executions Today</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.executionsToday || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Runs in last 24h</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-emerald-400" size={24} />
            <span className="text-slate-400 text-sm">Successful</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.successfulExecutions || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Completed successfully</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="text-red-400" size={24} />
            <span className="text-slate-400 text-sm">Failed</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.failedExecutions || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Execution errors</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Radio className="text-cyan-400" size={24} />
            <span className="text-slate-400 text-sm">Active Triggers</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.activeTriggers || 0}</p>
          <p className="text-xs text-slate-500 mt-2">
            of {stats?.totalTriggers || 0} total
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Plug className="text-orange-400" size={24} />
            <span className="text-slate-400 text-sm">Integrations</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.connectedIntegrations || 0}</p>
          <p className="text-xs text-slate-500 mt-2">
            Connected services
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-table">
          <div className="p-6 border-b border-slate-800/30">
            <h2 className="text-xl font-semibold text-slate-200">Recent Executions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-800/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Workflow</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Trigger</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {recentExecutions.map((execution) => (
                  <tr key={execution.id} className="table-row">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-200 truncate max-w-xs">{execution.workflow_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="status-badge status-info capitalize">{execution.trigger_type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`status-badge ${
                        execution.status === 'success' ? 'status-active' :
                        execution.status === 'failed' ? 'status-error' :
                        execution.status === 'running' ? 'status-pending' :
                        'status-info'
                      }`}>
                        {execution.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatDuration(execution.duration_ms)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-table">
            <div className="p-6 border-b border-slate-800/30">
              <h2 className="text-xl font-semibold text-slate-200">Performance Metrics</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-green-400" size={20} />
                  <div>
                    <p className="font-medium text-slate-200">Success Rate</p>
                    <p className="text-sm text-slate-400">Successful executions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-200">
                    {stats?.totalExecutions
                      ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)
                      : 0}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="text-blue-400" size={20} />
                  <div>
                    <p className="font-medium text-slate-200">Avg. Execution Time</p>
                    <p className="text-sm text-slate-400">Per workflow run</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-200">
                    {formatDuration(stats?.avgExecutionTime || 0)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="text-violet-400" size={20} />
                  <div>
                    <p className="font-medium text-slate-200">Total Executions</p>
                    <p className="text-sm text-slate-400">All time runs</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-200">
                    {stats?.totalExecutions || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-table">
            <div className="p-6 border-b border-slate-800/30">
              <h2 className="text-xl font-semibold text-slate-200">Workflow Health</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <PlayCircle className="text-green-400" size={20} />
                  <div>
                    <p className="font-medium text-slate-200">Active Rate</p>
                    <p className="text-sm text-slate-400">Workflows enabled</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-200">
                    {stats?.totalWorkflows
                      ? Math.round((stats.activeWorkflows / stats.totalWorkflows) * 100)
                      : 0}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Radio className="text-cyan-400" size={20} />
                  <div>
                    <p className="font-medium text-slate-200">Trigger Efficiency</p>
                    <p className="text-sm text-slate-400">Active triggers</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-200">
                    {stats?.totalTriggers
                      ? Math.round((stats.activeTriggers / stats.totalTriggers) * 100)
                      : 0}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Plug className="text-orange-400" size={20} />
                  <div>
                    <p className="font-medium text-slate-200">Integration Health</p>
                    <p className="text-sm text-slate-400">Connected services</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-200">
                    {stats?.totalIntegrations
                      ? Math.round((stats.connectedIntegrations / stats.totalIntegrations) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
