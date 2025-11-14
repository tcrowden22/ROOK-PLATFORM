import { useEffect, useState } from 'react';
import { Search, Plus, X, AlertCircle, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import { Ticket, User } from '../lib/types';
import type { TicketType as TicketResource } from '../sdk/sigurd';
import { EnhancedTicketDetail } from './EnhancedTicketDetail';

interface TicketsProps {
  initialFilters?: { status?: string };
  onNavigate: (page: string, id?: string) => void;
}

export function Tickets({ initialFilters, onNavigate }: TicketsProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters?.status || 'all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    type: 'incident',
    priority: 'medium',
    title: '',
    description: '',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<{ id: string; type: TicketResource } | null>(null);

  const currentUser = auth.getCurrentUser();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchTerm, statusFilter, priorityFilter]);

  const loadData = async () => {
    try {
      const { sigurd } = await import('../sdk');
      const [incidentsData, serviceRequestsData, usersData] = await Promise.all([
        sigurd.incidents.list().catch(() => []),
        sigurd.serviceRequests.list().catch(() => []),
        api.users.list().catch(() => []),
      ]);

      const incidentTickets: Ticket[] = incidentsData.map((incident) => ({
        id: incident.id,
        type: 'incident',
        status: incident.status,
        priority: incident.priority,
        requester_user_id: incident.requester_user_id,
        assignee_user_id: incident.assignee_user_id || undefined,
        device_id: incident.device_id || undefined,
        title: incident.title,
        description: incident.description,
        change_summary: undefined,
        breach_at: incident.breach_at,
        resolved_at: incident.resolved_at || undefined,
        closed_at: undefined,
        created_at: incident.created_at,
        updated_at: incident.updated_at,
      }));

      const requestTickets: Ticket[] = serviceRequestsData.map((request) => ({
        id: request.id,
        type: 'request',
        status: request.status,
        priority: request.priority,
        requester_user_id: request.requester_user_id,
        assignee_user_id: request.assignee_user_id || undefined,
        device_id: undefined,
        title: request.title,
        description: request.description,
        change_summary: undefined,
        breach_at: undefined,
        resolved_at: request.completed_at || undefined,
        closed_at: request.status === 'closed' ? request.completed_at || undefined : undefined,
        created_at: request.created_at,
        updated_at: request.updated_at,
      }));

      const combinedTickets = [...incidentTickets, ...requestTickets].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setTickets(combinedTickets);
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = tickets;

    if (searchTerm) {
      filtered = filtered.filter((ticket) =>
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase())
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

    setFilteredTickets(filtered);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const { sigurd } = await import('../sdk');

      if (newTicket.type === 'incident') {
        await sigurd.incidents.create({
          priority: newTicket.priority as 'low' | 'medium' | 'high' | 'critical',
          title: newTicket.title,
          description: newTicket.description,
        });
      } else {
        await sigurd.serviceRequests.create({
          priority: newTicket.priority as 'low' | 'medium' | 'high' | 'critical',
          title: newTicket.title,
          description: newTicket.description,
        });
      }

      setSuccessMessage('Ticket created successfully');
      setShowCreateModal(false);
      setNewTicket({ type: 'incident', priority: 'medium', title: '', description: '' });
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to create ticket:', error);
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

  const getTypeBadge = (type: string) => {
    const styles = {
      incident: 'status-badge status-locked',
      request: 'status-badge status-info',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[type as keyof typeof styles]}`}>
        {type}
      </span>
    );
  };

  const isSLABreached = (ticket: Ticket) => {
    if (!ticket.breach_at) return false;
    return new Date(ticket.breach_at) < new Date();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading tickets...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Tickets</h1>
          <p className="text-slate-400 mt-1">Manage incidents and service requests</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 gradient-button text-white rounded-lg px-4 py-2 transition-colors"
        >
          <Plus size={20} />
          <span>New Ticket</span>
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
                placeholder="Search tickets..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Ticket</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Requester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Assignee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() =>
                    setSelectedTicket({
                      id: ticket.id,
                      type: ticket.type === 'incident' ? 'incidents' : 'service-requests',
                    })
                  }
                  className="table-row cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{ticket.title}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(ticket.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">{getTypeBadge(ticket.type)}</td>
                  <td className="px-6 py-4">{getPriorityBadge(ticket.priority)}</td>
                  <td className="px-6 py-4">{getStatusBadge(ticket.status)}</td>
                  <td className="px-6 py-4 text-slate-400">{getUserName(ticket.requester_user_id)}</td>
                  <td className="px-6 py-4 text-slate-400">
                    {ticket.assignee_user_id ? getUserName(ticket.assignee_user_id) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {isSLABreached(ticket) ? (
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
              <h2 className="text-xl font-semibold text-slate-200">Create New Ticket</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-400"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
                  <select
                    value={newTicket.type}
                    onChange={(e) => setNewTicket({ ...newTicket, type: e.target.value })}
                    className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="incident">Incident</option>
                    <option value="request">Request</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
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
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTicket && (
        <EnhancedTicketDetail
          ticketId={selectedTicket.id}
          ticketType={selectedTicket.type}
          onClose={() => {
            setSelectedTicket(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
