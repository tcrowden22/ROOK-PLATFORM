import { useEffect, useState } from 'react';
import { Search, Plus, X, AlertCircle, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import { Incident, User } from '../lib/types';
import { EnhancedTicketDetail } from './EnhancedTicketDetail';

interface IncidentsProps {
  initialFilters?: { status?: string };
  onNavigate: (page: string, id?: string) => void;
}

export function Incidents({ initialFilters, onNavigate }: IncidentsProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters?.status || 'all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIncident, setNewIncident] = useState({
    priority: 'medium',
    title: '',
    description: '',
    impact: '',
    urgency: '',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const currentUser = auth.getCurrentUser();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterIncidents();
  }, [incidents, searchTerm, statusFilter, priorityFilter]);

  const loadData = async () => {
    try {
      const { sigurd } = await import('../sdk');
      const { api } = await import('../lib/api');
      const [incidentsData, usersData] = await Promise.all([
        sigurd.incidents.list().catch(() => []),
        api.users.list().catch(() => []),
      ]);
      setIncidents(incidentsData);
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoading(false);
    }
  };

  const filterIncidents = () => {
    let filtered = incidents;

    if (searchTerm) {
      filtered = filtered.filter((incident) =>
        incident.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'open') {
        filtered = filtered.filter((t) => t.status === 'new' || t.status === 'in_progress');
      } else {
        filtered = filtered.filter((t) => t.status === statusFilter);
      }
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter((t) => t.priority === priorityFilter);
    }

    setFilteredIncidents(filtered);
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const { sigurd } = await import('../sdk');
      await sigurd.incidents.create({
        priority: newIncident.priority as 'low' | 'medium' | 'high' | 'critical',
        title: newIncident.title,
        description: newIncident.description,
        impact: newIncident.impact || undefined,
        urgency: newIncident.urgency || undefined,
      });

      setSuccessMessage('Incident created successfully');
      setShowCreateModal(false);
      setNewIncident({ priority: 'medium', title: '', description: '', impact: '', urgency: '' });
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to create incident:', error);
    }
  };

  const getUserName = (userId: string) => {
    return users.find((u) => u.id === userId)?.name || 'Unknown';
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      new: 'status-badge status-info',
      in_progress: 'status-badge status-pending',
      resolved: 'status-badge status-active',
      closed: 'status-badge status-info',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'status-badge status-info',
      medium: 'status-badge status-pending',
      high: 'status-badge status-locked',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[priority as keyof typeof styles]}`}>
        {priority}
      </span>
    );
  };

  const isSLABreached = (incident: Incident) => {
    if (!incident.breach_at) return false;
    return new Date(incident.breach_at) < new Date();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading incidents...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Incidents</h1>
          <p className="text-slate-400 mt-1">Manage urgent service disruptions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 gradient-button text-white rounded-lg px-4 py-2 transition-colors"
        >
          <Plus size={20} />
          <span>New Incident</span>
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 p-4 glass-card border border-green-500/30 bg-green-500/10 rounded-lg">
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}

      <div className="glass-table">
        <div className="p-6 border-b border-slate-200">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Incident</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Requester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Assignee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredIncidents.map((incident) => (
                <tr
                  key={incident.id}
                  onClick={() => setSelectedIncidentId(incident.id)}
                  className="table-row cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{incident.title}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(incident.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">{getPriorityBadge(incident.priority)}</td>
                  <td className="px-6 py-4">{getStatusBadge(incident.status)}</td>
                  <td className="px-6 py-4 text-slate-400">{getUserName(incident.requester_user_id)}</td>
                  <td className="px-6 py-4 text-slate-400">
                    {incident.assignee_user_id ? getUserName(incident.assignee_user_id) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {isSLABreached(incident) ? (
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle size={16} />
                        <span className="text-xs font-medium">Breached</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-400">
                        <Clock size={16} />
                        <span className="text-xs font-medium">On Time</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <div className="glass-panel max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-200">Report New Incident</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-400"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateIncident} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
                <select
                  value={newIncident.priority}
                  onChange={(e) => setNewIncident({ ...newIncident, priority: e.target.value })}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Impact</label>
                  <input
                    type="text"
                    value={newIncident.impact}
                    onChange={(e) => setNewIncident({ ...newIncident, impact: e.target.value })}
                    className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Multiple users affected"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Urgency</label>
                  <input
                    type="text"
                    value={newIncident.urgency}
                    onChange={(e) => setNewIncident({ ...newIncident, urgency: e.target.value })}
                    className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Business critical"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 input-field hover:bg-slate-800/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 gradient-button text-white rounded-lg px-4 py-2 transition-colors"
                >
                  Create Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedIncidentId && (
        <EnhancedTicketDetail
          ticketId={selectedIncidentId}
          ticketType="incidents"
          onClose={() => {
            setSelectedIncidentId(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
