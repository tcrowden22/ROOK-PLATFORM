import { useState, useEffect } from 'react';
import { Plus, Search, Plug, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Integration } from '../../lib/yggdrasil/types';

export function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    const mockData: Integration[] = [
      {
        id: '1',
        name: 'Slack Notifications',
        type: 'slack',
        status: 'connected',
        config: { webhook_url: 'https://hooks.slack.com/...' },
        last_sync_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Microsoft Teams',
        type: 'teams',
        status: 'connected',
        config: { tenant_id: 'xxx-xxx-xxx' },
        last_sync_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        name: 'Jira Service Management',
        type: 'jira',
        status: 'error',
        config: { api_url: 'https://company.atlassian.net' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '4',
        name: 'GitHub Actions',
        type: 'github',
        status: 'disconnected',
        config: { org: 'company-org' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    setIntegrations(mockData);
  };

  const filteredIntegrations = integrations.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         i.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const classes = {
      connected: 'status-badge status-active',
      disconnected: 'status-badge status-info',
      error: 'status-badge status-locked',
    };
    const icons = {
      connected: <CheckCircle size={14} />,
      disconnected: <AlertCircle size={14} />,
      error: <XCircle size={14} />,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="text-slate-400 mt-1">Connect external services and platforms</p>
        </div>
        <button className="gradient-button text-white rounded-lg px-4 py-2 flex items-center gap-2">
          <Plus size={20} />
          <span>New Integration</span>
        </button>
      </div>

      <div className="glass-table">
        <div className="p-6 border-b border-slate-800/30">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search integrations..."
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
              <option value="connected">Connected</option>
              <option value="disconnected">Disconnected</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Integration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Last Sync</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredIntegrations.map((integration) => (
                <tr key={integration.id} className="table-row cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Plug className="text-blue-400" size={20} />
                      <div className="font-medium text-slate-200">{integration.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-300 capitalize">{integration.type}</span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(integration.status)}</td>
                  <td className="px-6 py-4 text-slate-400">
                    {integration.last_sync_at ? new Date(integration.last_sync_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors" title="Sync">
                      <RefreshCw size={16} className="text-blue-400" />
                    </button>
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
            <span className="text-slate-400 text-sm">Connected</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">
            {integrations.filter(i => i.status === 'connected').length}
          </p>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="text-red-400" size={24} />
            <span className="text-slate-400 text-sm">Errors</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">
            {integrations.filter(i => i.status === 'error').length}
          </p>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <Plug className="text-blue-400" size={24} />
            <span className="text-slate-400 text-sm">Total</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{integrations.length}</p>
        </div>
      </div>
    </div>
  );
}
