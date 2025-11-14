import { useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Shield } from 'lucide-react';
import { IntegrationProvider } from '../../lib/skuld/types';

export function Integrations() {
  const [providers] = useState<IntegrationProvider[]>([
    { id: '1', name: 'Workday', type: 'workday', description: 'HRIS employee data sync', status: 'connected', enabled: true, last_sync_at: new Date().toISOString() },
    { id: '2', name: 'Microsoft Intune', type: 'intune', description: 'Device management integration', status: 'connected', enabled: true, last_sync_at: new Date().toISOString() },
    { id: '3', name: 'Jamf Pro', type: 'jamf', description: 'Apple device management', status: 'disconnected', enabled: false },
    { id: '4', name: 'Kandji', type: 'kandji', description: 'Modern Apple MDM', status: 'disconnected', enabled: false },
    { id: '5', name: 'SentinelOne', type: 'sentinelone', description: 'Endpoint security', status: 'error', enabled: true },
    { id: '6', name: 'ManageEngine', type: 'manageengine', description: 'IT asset management', status: 'disconnected', enabled: false },
  ]);

  const getStatusBadge = (status: string) => {
    const config = {
      connected: { class: 'status-badge status-active', icon: <CheckCircle size={14} /> },
      disconnected: { class: 'status-badge status-info', icon: <AlertCircle size={14} /> },
      error: { class: 'status-badge status-locked', icon: <XCircle size={14} /> },
    };
    const item = config[status as keyof typeof config];
    return (
      <span className={item.class}>
        <span className="flex items-center gap-1">
          {item.icon}
          {status}
        </span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">External Integrations</h1>
        <p className="text-slate-400 mt-1">Connect asset data sources and sync providers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((provider) => (
          <div key={provider.id} className="glass-card p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Shield className="text-blue-400" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">{provider.name}</h3>
                  <p className="text-sm text-slate-400">{provider.description}</p>
                </div>
              </div>
              {getStatusBadge(provider.status)}
            </div>

            {provider.last_sync_at && (
              <div className="text-xs text-slate-500">
                Last sync: {new Date(provider.last_sync_at).toLocaleString()}
              </div>
            )}

            <div className="flex gap-2">
              {provider.status === 'connected' ? (
                <>
                  <button className="flex-1 px-4 py-2 gradient-button text-white rounded-lg flex items-center justify-center gap-2">
                    <RefreshCw size={16} />
                    Sync Now
                  </button>
                  <button className="px-4 py-2 input-field text-slate-300 rounded-lg hover:bg-slate-800/50">
                    Test
                  </button>
                </>
              ) : (
                <button className="flex-1 px-4 py-2 gradient-button text-white rounded-lg">
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
