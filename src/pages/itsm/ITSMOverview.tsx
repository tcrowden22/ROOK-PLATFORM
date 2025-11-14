import { useState, useEffect } from 'react';
import { Ticket, AlertCircle, CheckCircle, Clock, TrendingUp, Users, Calendar, Target } from 'lucide-react';

interface ITSMStats {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  breachedSLA: number;
  totalIncidents: number;
  totalRequests: number;
  totalProblems: number;
  totalChanges: number;
  avgResolutionTime: number;
  assignedToMe: number;
}

interface RecentTicket {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  created_at: string;
}

export function ITSMOverview() {
  const [stats, setStats] = useState<ITSMStats | null>(null);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { sigurd } = await import('../../sdk');
      
      const [incidents, requests, problems, changes] = await Promise.all([
        sigurd.incidents.list().catch(() => []),
        sigurd.serviceRequests.list().catch(() => []),
        sigurd.problems.list().catch(() => []),
        sigurd.changes.list().catch(() => []),
      ]);
 
      const normalizedTickets = [
        ...incidents.map((incident) => ({
          id: incident.id,
          title: incident.title,
          type: 'incident',
          status: incident.status,
          priority: incident.priority,
          created_at: incident.created_at,
          resolved_at: incident.resolved_at || null,
          breach_at: incident.breach_at || null,
        })),
        ...requests.map((request) => ({
          id: request.id,
          title: request.title,
          type: 'service request',
          status: request.status,
          priority: request.priority,
          created_at: request.created_at,
          resolved_at: request.completed_at || null,
          breach_at: null as string | null,
        })),
      ];
      const now = new Date();
      const openStatuses = ['new', 'in_progress', 'waiting'];
      const resolvedStatuses = ['resolved', 'closed'];

      const breached = normalizedTickets.filter(t => {
        if (!t.breach_at || !openStatuses.includes(t.status)) return false;
        return new Date(t.breach_at) < now;
      });

      const resolved = normalizedTickets.filter(t => t.resolved_at && t.created_at);

      const avgTime = resolved.length > 0
        ? resolved.reduce((sum, t) => {
            const created = new Date(t.created_at).getTime();
            const resolvedAt = new Date(t.resolved_at as string).getTime();
            return sum + (resolvedAt - created);
          }, 0) / resolved.length / (1000 * 60 * 60)
        : 0;

      const statsData: ITSMStats = {
        totalTickets: normalizedTickets.length,
        openTickets: normalizedTickets.filter(t => openStatuses.includes(t.status)).length,
        resolvedTickets: normalizedTickets.filter(t => resolvedStatuses.includes(t.status)).length,
        breachedSLA: breached.length,
        totalIncidents: incidents.length,
        totalRequests: requests.length,
        totalProblems: problems.length,
        totalChanges: changes.length,
        avgResolutionTime: Math.round(avgTime),
        assignedToMe: 0,
      };

      setStats(statsData);
      setRecentTickets(
        normalizedTickets
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5) as RecentTicket[],
      );
    } catch (error) {
      console.error('Failed to load ITSM overview data:', error);
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
        <h1 className="page-title">Sigurd — IT Service Management</h1>
        <p className="text-slate-400 mt-1">Track and resolve incidents, service requests, problems, and changes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Ticket className="text-blue-400" size={24} />
            <span className="text-slate-400 text-sm">Total Tickets</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.totalTickets || 0}</p>
          <p className="text-xs text-slate-500 mt-2">All time tickets</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-amber-400" size={24} />
            <span className="text-slate-400 text-sm">Open Tickets</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.openTickets || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Awaiting resolution</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-green-400" size={24} />
            <span className="text-slate-400 text-sm">Resolved</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.resolvedTickets || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Successfully closed</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-red-400" size={24} />
            <span className="text-slate-400 text-sm">SLA Breached</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.breachedSLA || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Past due date</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-violet-400" size={24} />
            <span className="text-slate-400 text-sm">Incidents</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.totalIncidents || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Service disruptions</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-cyan-400" size={24} />
            <span className="text-slate-400 text-sm">Service Requests</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.totalRequests || 0}</p>
          <p className="text-xs text-slate-500 mt-2">User requests</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Target className="text-orange-400" size={24} />
            <span className="text-slate-400 text-sm">Problems</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.totalProblems || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Root cause analysis</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-emerald-400" size={24} />
            <span className="text-slate-400 text-sm">Changes</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.totalChanges || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Planned changes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-table">
          <div className="p-6 border-b border-slate-800/30">
            <h2 className="text-xl font-semibold text-slate-200">Recent Tickets</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-800/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {recentTickets.map((ticket) => (
                  <tr key={ticket.id} className="table-row">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-200 truncate max-w-xs">{ticket.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="status-badge status-info capitalize">{ticket.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`status-badge ${
                        ticket.priority === 'high' || ticket.priority === 'critical' ? 'status-error' :
                        ticket.priority === 'medium' ? 'status-pending' :
                        'status-info'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`status-badge ${
                        ticket.status === 'resolved' || ticket.status === 'closed' ? 'status-active' :
                        ticket.status === 'in_progress' ? 'status-pending' :
                        'status-info'
                      }`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-table">
          <div className="p-6 border-b border-slate-800/30">
            <h2 className="text-xl font-semibold text-slate-200">Performance Metrics</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-green-400" size={20} />
                <div>
                  <p className="font-medium text-slate-200">Resolution Rate</p>
                  <p className="text-sm text-slate-400">Resolved vs. total</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-200">
                  {stats?.totalTickets ? Math.round((stats.resolvedTickets / stats.totalTickets) * 100) : 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="text-blue-400" size={20} />
                <div>
                  <p className="font-medium text-slate-200">Avg. Resolution Time</p>
                  <p className="text-sm text-slate-400">Hours to resolve</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-200">
                  {stats?.avgResolutionTime || 0}h
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Target className={`${
                  (stats?.breachedSLA || 0) > 0 ? 'text-red-400' : 'text-green-400'
                }`} size={20} />
                <div>
                  <p className="font-medium text-slate-200">SLA Compliance</p>
                  <p className="text-sm text-slate-400">Within target time</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-200">
                  {stats?.openTickets ?
                    Math.round(((stats.openTickets - (stats.breachedSLA || 0)) / stats.openTickets) * 100) : 100}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Ticket className="text-violet-400" size={20} />
                <div>
                  <p className="font-medium text-slate-200">Open Rate</p>
                  <p className="text-sm text-slate-400">Open vs. total</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-200">
                  {stats?.totalTickets ? Math.round((stats.openTickets / stats.totalTickets) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
