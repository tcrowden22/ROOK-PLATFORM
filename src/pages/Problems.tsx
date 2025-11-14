import { useEffect, useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { sigurd, muninn } from '../sdk';
import { auth } from '../lib/auth';
import { Problem, User } from '../lib/types';
import { EnhancedTicketDetail } from './EnhancedTicketDetail';

export function Problems() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProblem, setNewProblem] = useState({
    priority: 'medium',
    title: '',
    description: '',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [problemsData, usersData] = await Promise.all([
        sigurd.problems.list().catch(() => []),
        muninn.users.list().catch(() => []),
      ]);
      setProblems(problemsData);
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await sigurd.problems.create({
        priority: newProblem.priority as 'low' | 'medium' | 'high' | 'critical',
        title: newProblem.title,
        description: newProblem.description,
      });
      setSuccessMessage('Problem created successfully');
      setShowCreateModal(false);
      setNewProblem({ priority: 'medium', title: '', description: '' });
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to create problem:', error);
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return '-';
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

  const filteredProblems = problems.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading problems...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Problem Management</h1>
          <p className="text-slate-400 mt-1">Root cause analysis and resolution</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span>New Problem</span>
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
              placeholder="Search problems..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Problem</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredProblems.map((problem) => (
                <tr key={problem.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{problem.title}</div>
                    {problem.workaround && (
                      <div className="text-xs text-green-400 mt-1">Workaround available</div>
                    )}
                  </td>
                  <td className="px-6 py-4">{getPriorityBadge(problem.priority)}</td>
                  <td className="px-6 py-4">{getStatusBadge(problem.status)}</td>
                  <td className="px-6 py-4 text-slate-400">{getUserName(problem.assigned_user_id)}</td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {new Date(problem.created_at).toLocaleDateString()}
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
              <h2 className="text-xl font-semibold text-slate-200">New Problem</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-400"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
                <select
                  value={newProblem.priority}
                  onChange={(e) => setNewProblem({ ...newProblem, priority: e.target.value })}
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
                  value={newProblem.title}
                  onChange={(e) => setNewProblem({ ...newProblem, title: e.target.value })}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Recurring system crashes"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={newProblem.description}
                  onChange={(e) => setNewProblem({ ...newProblem, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the problem and its symptoms..."
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
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  Create Problem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedProblemId && (
        <EnhancedTicketDetail
          ticketId={selectedProblemId}
          ticketType="problems"
          onClose={() => {
            setSelectedProblemId(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
