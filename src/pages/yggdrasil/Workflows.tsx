import { useState, useEffect } from 'react';
import { Plus, Search, Play, Pause, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Workflow } from '../../lib/yggdrasil/types';

export function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    const mockData: Workflow[] = [
      {
        id: '1',
        name: 'Onboard New Employee',
        description: 'Automated workflow for provisioning accounts and access',
        status: 'active',
        trigger_type: 'event',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'admin',
        last_run_at: new Date().toISOString(),
        run_count: 47,
      },
      {
        id: '2',
        name: 'Incident Auto-Assignment',
        description: 'Automatically assign incidents based on category and priority',
        status: 'active',
        trigger_type: 'event',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'admin',
        last_run_at: new Date().toISOString(),
        run_count: 234,
      },
      {
        id: '3',
        name: 'Weekly Backup Report',
        description: 'Generate and send weekly backup status reports',
        status: 'paused',
        trigger_type: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'admin',
        run_count: 12,
      },
    ];
    setWorkflows(mockData);
  };

  const filteredWorkflows = workflows.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         w.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const classes = {
      active: 'status-badge status-active',
      paused: 'status-badge status-pending',
      disabled: 'status-badge status-locked',
    };
    return <span className={classes[status as keyof typeof classes]}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Yggdrasil — Automation & Orchestration</h1>
          <p className="text-slate-400 mt-1">Design and manage automated workflows</p>
        </div>
        <button className="gradient-button text-white rounded-lg px-4 py-2 flex items-center gap-2">
          <Plus size={20} />
          <span>New Workflow</span>
        </button>
      </div>

      <div className="glass-table">
        <div className="p-6 border-b border-slate-800/30">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search workflows..."
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
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="disabled">Disabled</option>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Runs</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Last Run</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredWorkflows.map((workflow) => (
                <tr key={workflow.id} className="table-row cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{workflow.name}</div>
                    <div className="text-xs text-slate-400 mt-1">{workflow.description}</div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(workflow.status)}</td>
                  <td className="px-6 py-4">
                    <span className="text-slate-300 capitalize">{workflow.trigger_type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-300">{workflow.run_count}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {workflow.last_run_at ? new Date(workflow.last_run_at).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors" title="Run">
                        <Play size={16} className="text-blue-400" />
                      </button>
                      <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors" title="Pause">
                        <Pause size={16} className="text-amber-400" />
                      </button>
                      <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-green-400" size={24} />
            <span className="text-slate-400 text-sm">Active Workflows</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{workflows.filter(w => w.status === 'active').length}</p>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-amber-400" size={24} />
            <span className="text-slate-400 text-sm">Total Runs Today</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">156</p>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="text-red-400" size={24} />
            <span className="text-slate-400 text-sm">Failed Runs</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">3</p>
        </div>
      </div>
    </div>
  );
}
