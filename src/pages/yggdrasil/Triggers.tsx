import { useState, useEffect } from 'react';
import { Plus, Search, Radio, Calendar, Webhook, Zap } from 'lucide-react';
import { Trigger } from '../../lib/yggdrasil/types';

export function Triggers() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadTriggers();
  }, []);

  const loadTriggers = async () => {
    const mockData: Trigger[] = [
      {
        id: '1',
        name: 'New User Created',
        type: 'event',
        workflow_id: '1',
        enabled: true,
        config: { event_type: 'user.created' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Daily 9 AM Sync',
        type: 'schedule',
        workflow_id: '3',
        enabled: true,
        config: { cron: '0 9 * * *' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        name: 'Incident Webhook',
        type: 'webhook',
        workflow_id: '2',
        enabled: false,
        config: { endpoint: '/api/webhooks/incident' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    setTriggers(mockData);
  };

  const filteredTriggers = triggers.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    const icons = {
      event: <Zap size={16} className="text-violet-400" />,
      schedule: <Calendar size={16} className="text-blue-400" />,
      webhook: <Webhook size={16} className="text-cyan-400" />,
      manual: <Radio size={16} className="text-emerald-400" />,
    };
    return icons[type as keyof typeof icons] || <Radio size={16} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Triggers</h1>
          <p className="text-slate-400 mt-1">Configure automation triggers and events</p>
        </div>
        <button className="gradient-button text-white rounded-lg px-4 py-2 flex items-center gap-2">
          <Plus size={20} />
          <span>New Trigger</span>
        </button>
      </div>

      <div className="glass-table">
        <div className="p-6 border-b border-slate-800/30">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search triggers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 input-field"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="select-field"
            >
              <option value="all">All Types</option>
              <option value="event">Event</option>
              <option value="schedule">Schedule</option>
              <option value="webhook">Webhook</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Trigger Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Configuration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredTriggers.map((trigger) => (
                <tr key={trigger.id} className="table-row cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{trigger.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(trigger.type)}
                      <span className="text-slate-300 capitalize">{trigger.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {trigger.enabled ? (
                      <span className="status-badge status-active">Enabled</span>
                    ) : (
                      <span className="status-badge status-locked">Disabled</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
                      {JSON.stringify(trigger.config).substring(0, 40)}...
                    </code>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(trigger.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {['event', 'schedule', 'webhook', 'manual'].map(type => (
          <div key={type} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              {getTypeIcon(type)}
              <span className="text-slate-400 text-sm capitalize">{type} Triggers</span>
            </div>
            <p className="text-3xl font-bold text-slate-200">
              {triggers.filter(t => t.type === type).length}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
