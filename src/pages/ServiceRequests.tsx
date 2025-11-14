import { useEffect, useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import { ServiceRequest, User } from '../lib/types';
import { EnhancedTicketDetail } from './EnhancedTicketDetail';

export function ServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ServiceRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRequest, setNewRequest] = useState({
    priority: 'low',
    title: '',
    description: '',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const currentUser = auth.getCurrentUser();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      const { sigurd } = await import('../sdk');
      const [requestsData, usersData] = await Promise.all([
        sigurd.serviceRequests.list().catch(() => []),
        api.users.list().catch(() => []),
      ]);
      setRequests(requestsData);
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    if (searchTerm) {
      filtered = filtered.filter((request) =>
        request.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    setFilteredRequests(filtered);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const { sigurd } = await import('../sdk');
      await sigurd.serviceRequests.create({
        priority: newRequest.priority as 'low' | 'medium' | 'high' | 'critical',
        title: newRequest.title,
        description: newRequest.description,
      });

      setSuccessMessage('Service request created successfully');
      setShowCreateModal(false);
      setNewRequest({ priority: 'low', title: '', description: '' });
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to create service request:', error);
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

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading service requests...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Service Requests</h1>
          <p className="text-slate-400 mt-1">Request standard IT services</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 gradient-button text-white rounded-lg px-4 py-2 transition-colors"
        >
          <Plus size={20} />
          <span>New Request</span>
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
                placeholder="Search requests..."
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
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Request</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Requester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Assignee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredRequests.map((request) => (
                <tr
                  key={request.id}
                  onClick={() => setSelectedRequestId(request.id)}
                  className="table-row cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{request.title}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">{request.description}</div>
                  </td>
                  <td className="px-6 py-4">{getPriorityBadge(request.priority)}</td>
                  <td className="px-6 py-4">{getStatusBadge(request.status)}</td>
                  <td className="px-6 py-4 text-slate-400">{getUserName(request.requester_user_id)}</td>
                  <td className="px-6 py-4 text-slate-400">
                    {request.assignee_user_id ? getUserName(request.assignee_user_id) : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {new Date(request.created_at).toLocaleDateString()}
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
              <h2 className="text-xl font-semibold text-slate-200">New Service Request</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-400"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
                <select
                  value={newRequest.priority}
                  onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value })}
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
                  value={newRequest.title}
                  onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Request new laptop"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Provide details about your request..."
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
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRequestId && (
        <EnhancedTicketDetail
          ticketId={selectedRequestId}
          ticketType="service-requests"
          onClose={() => {
            setSelectedRequestId(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
