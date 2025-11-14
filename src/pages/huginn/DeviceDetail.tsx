import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Download, RotateCcw, Shield, RefreshCw, Trash2, ChevronDown } from 'lucide-react';
import { huginn } from '../../sdk/huginn';
import { useToast } from '../../components/ui/ToastProvider';
import type { DeviceDetail as DeviceDetailType } from '../../sdk/types';

interface DeviceDetailProps {
  deviceId: string;
  onNavigate: (page: string, id?: string) => void;
}

export function DeviceDetail({ deviceId, onNavigate }: DeviceDetailProps) {
  const { showToast } = useToast();
  const [device, setDevice] = useState<DeviceDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'hardware' | 'software' | 'policies' | 'activity' | 'actions'>('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDevice();
  }, [deviceId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowActionDropdown(false);
      }
    };

    if (showActionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionDropdown]);

  const loadDevice = async () => {
    try {
      setLoading(true);
      const data = await huginn.devices.get(deviceId);
      setDevice(data);
    } catch (error: any) {
      showToast(error.message || 'Failed to load device', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'installApp' | 'rotateKey' | 'isolate' | 'restart' | 'wipe') => {
    if (!device) return;

    // Confirm destructive actions
    if (action === 'wipe' || action === 'isolate') {
      if (!confirm(`Are you sure you want to ${action} this device? This action cannot be undone.`)) {
        return;
      }
    }

    setActionLoading(action);
    try {
      const response = await huginn.devices.executeAction(deviceId, { action });
      showToast(`Action "${action}" queued successfully`, 'success');
      setShowActionDropdown(false);
      // Reload device to get updated activity
      setTimeout(() => loadDevice(), 1000);
    } catch (error: any) {
      showToast(error.message || `Failed to execute ${action}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || !device) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading device...</div>
      </div>
    );
  }

  const latestTelemetry = device.telemetry && device.telemetry.length > 0 ? device.telemetry[0] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('devices')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Devices</span>
        </button>

        {/* Actions Split Button */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex">
            <button
              onClick={() => handleAction('installApp')}
              disabled={actionLoading !== null}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-l-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading === 'installApp' ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Install App
            </button>
            <button
              onClick={() => setShowActionDropdown(!showActionDropdown)}
              className="px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-lg border-l border-blue-500 transition-colors"
            >
              <ChevronDown size={16} />
            </button>
          </div>
          {showActionDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
              <button
                onClick={() => {
                  handleAction('rotateKey');
                  setShowActionDropdown(false);
                }}
                disabled={actionLoading !== null}
                className="w-full px-4 py-2 text-left text-slate-200 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
              >
                <RotateCcw size={16} />
                Rotate Key
              </button>
              <button
                onClick={() => {
                  handleAction('isolate');
                  setShowActionDropdown(false);
                }}
                disabled={actionLoading !== null}
                className="w-full px-4 py-2 text-left text-slate-200 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Shield size={16} />
                Isolate
              </button>
              <button
                onClick={() => {
                  handleAction('restart');
                  setShowActionDropdown(false);
                }}
                disabled={actionLoading !== null}
                className="w-full px-4 py-2 text-left text-slate-200 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={16} />
                Restart
              </button>
              <button
                onClick={() => {
                  handleAction('wipe');
                  setShowActionDropdown(false);
                }}
                disabled={actionLoading !== null}
                className="w-full px-4 py-2 text-left text-red-400 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 size={16} />
                Wipe
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Device Summary */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-200 mb-2">{device.hostname}</h1>
            <p className="text-slate-400">{device.platform || device.os} {device.os_version && `(${device.os_version})`}</p>
          </div>
          <div className="flex gap-2">
            {device.compliance ? (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                Compliant
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                Non-Compliant
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              device.status === 'active'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
            }`}>
              {device.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Owner</p>
            <p className="text-sm font-medium text-slate-200">{device.owner_name || 'Unassigned'}</p>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Serial Number</p>
            <p className="text-sm font-medium text-slate-200">{device.serial || '-'}</p>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Last Seen</p>
            <p className="text-sm font-medium text-slate-200">
              {new Date(device.last_seen_at).toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Enrolled</p>
            <p className="text-sm font-medium text-slate-200">
              {new Date(device.enrolled_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card">
        <div className="border-b border-slate-800/30">
          <div className="flex gap-1 px-6">
            {(['overview', 'hardware', 'software', 'policies', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {latestTelemetry && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">System Metrics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-2">CPU Usage</p>
                      <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-blue-600 rounded-full"
                          style={{ width: `${latestTelemetry.cpu || 0}%` }}
                        />
                      </div>
                      <p className="text-sm font-medium text-slate-200 mt-1">{latestTelemetry.cpu || 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-2">Memory Usage</p>
                      <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-green-600 rounded-full"
                          style={{ width: `${latestTelemetry.memory || 0}%` }}
                        />
                      </div>
                      <p className="text-sm font-medium text-slate-200 mt-1">{latestTelemetry.memory || 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-2">Disk Usage</p>
                      <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-orange-600 rounded-full"
                          style={{ width: `${latestTelemetry.disk || 0}%` }}
                        />
                      </div>
                      <p className="text-sm font-medium text-slate-200 mt-1">{latestTelemetry.disk || 0}%</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-4">
                    Last updated: {new Date(latestTelemetry.created_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'hardware' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Platform</p>
                  <p className="text-sm font-medium text-slate-200">{device.platform || device.os}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">OS Version</p>
                  <p className="text-sm font-medium text-slate-200">{device.os_version || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Serial Number</p>
                  <p className="text-sm font-medium text-slate-200">{device.serial || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Ownership</p>
                  <p className="text-sm font-medium text-slate-200 capitalize">{device.ownership || '-'}</p>
                </div>
              </div>
              {latestTelemetry && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Current Metrics</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">CPU</p>
                      <p className="text-lg font-semibold text-slate-200">{latestTelemetry.cpu || 0}%</p>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Memory</p>
                      <p className="text-lg font-semibold text-slate-200">{latestTelemetry.memory || 0}%</p>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Disk</p>
                      <p className="text-lg font-semibold text-slate-200">{latestTelemetry.disk || 0}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'software' && (
            <div className="space-y-4">
              {device.deployments && device.deployments.length > 0 ? (
                <div className="space-y-3">
                  {device.deployments.map((deployment) => (
                    <div key={deployment.id} className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-200">
                            {deployment.package_name || 'Unknown Package'}
                            {deployment.package_version && ` ${deployment.package_version}`}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Started: {new Date(deployment.created_at).toLocaleString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          deployment.status === 'success'
                            ? 'bg-green-500/20 text-green-400'
                            : deployment.status === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : deployment.status === 'running'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {deployment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No deployment jobs</p>
              )}
            </div>
          )}

          {activeTab === 'policies' && (
            <div className="space-y-4">
              {device.policies && device.policies.length > 0 ? (
                <div className="space-y-3">
                  {device.policies.map((policy) => (
                    <div key={policy.id} className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-200">{policy.policy_name || 'Unknown Policy'}</p>
                          {policy.policy_description && (
                            <p className="text-xs text-slate-500 mt-1">{policy.policy_description}</p>
                          )}
                          <p className="text-xs text-slate-500 mt-1">
                            Assigned: {new Date(policy.assigned_at).toLocaleString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          policy.status === 'applied'
                            ? 'bg-green-500/20 text-green-400'
                            : policy.status === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {policy.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No policies assigned</p>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              {device.activity && device.activity.length > 0 ? (
                <div className="space-y-3">
                  {device.activity.map((activity) => (
                    <div key={activity.id} className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-200 capitalize">{activity.action}</p>
                          {activity.initiated_by_name && (
                            <p className="text-xs text-slate-500 mt-1">
                              By: {activity.initiated_by_name}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          activity.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : activity.status === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : activity.status === 'processing'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No activity recorded</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

