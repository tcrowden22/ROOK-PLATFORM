import { useEffect, useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { sigurd, muninn } from '../sdk';
import { auth } from '../lib/auth';
import { Change, User } from '../lib/types';
import { EnhancedTicketDetail } from './EnhancedTicketDetail';

export function Changes() {
  const [changes, setChanges] = useState<Change[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChange, setNewChange] = useState({
    risk: 'medium',
    title: '',
    description: '',
    reason: '',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);

  const currentUser = auth.getCurrentUser();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [changesData, usersData] = await Promise.all([
        sigurd.changes.list().catch(() => []),
        muninn.users.list().catch(() => []),
      ]);
      setChanges(changesData);
      setUsers(usersData as User[]);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      await sigurd.changes.create({
        risk: newChange.risk as 'low' | 'medium' | 'high',
        title: newChange.title,
        description: newChange.description,
        reason: newChange.reason,
      });
      setSuccessMessage('Change request created successfully');
      setShowCreateModal(false);
      setNewChange({ risk: 'medium', title: '', description: '', reason: '' });
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to create change:', error);
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return '-';
    return users.find((u) => u.id === userId)?.name || 'Unknown';
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'status-badge status-info',
      pending_approval: 'status-badge status-pending',
      approved: 'status-badge status-active',
      scheduled: 'status-badge status-info',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'status-badge status-active',
      failed: 'status-badge status-locked',
      cancelled: 'status-badge status-info',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getRiskBadge = (risk: string) => {
    const styles = {
      low: 'status-badge status-active',
      medium: 'status-badge status-pending',
      high: 'status-badge status-locked',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[risk as keyof typeof styles]}`}>
        {risk} risk
      </span>
    );
  };

  const filteredChanges = changes.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading changes...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Change Management</h1>
          <p className="text-slate-400 mt-1">Plan and execute infrastructure changes</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span>New Change</span>
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 p-4 glass-card border border-green-500/30 bg-green-500/10 rounded-lg">
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}

      <div className="glass-table">
        <div className="p-6 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search changes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Change</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Risk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Requester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Scheduled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredChanges.map((change) => (
                <tr key={change.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{change.title}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">{change.description}</div>
                  </td>
                  <td className="px-6 py-4">{getRiskBadge(change.risk)}</td>
                  <td className="px-6 py-4">{getStatusBadge(change.status)}</td>
                  <td className="px-6 py-4 text-slate-400">{getUserName(change.requester_user_id)}</td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {change.scheduled_start
                      ? new Date(change.scheduled_start).toLocaleDateString()
                      : 'Not scheduled'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <div className="glass-panel max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-slate-200">New Change Request</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-400"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Risk Level</label>
                <select
                  value={newChange.risk}
                  onChange={(e) => setNewChange({ ...newChange, risk: e.target.value })}
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
                  value={newChange.title}
                  onChange={(e) => setNewChange({ ...newChange, title: e.target.value })}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Upgrade production database"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={newChange.description}
                  onChange={(e) => setNewChange({ ...newChange, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Detailed description of the change..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Business Reason</label>
                <textarea
                  value={newChange.reason}
                  onChange={(e) => setNewChange({ ...newChange, reason: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Why is this change necessary?"
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
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Create Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedChangeId && (
        <EnhancedTicketDetail
          ticketId={selectedChangeId}
          ticketType="changes"
          onClose={() => {
            setSelectedChangeId(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
