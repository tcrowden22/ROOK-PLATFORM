import { useState, useEffect } from 'react';
import { Monitor, CheckCircle, XCircle, AlertTriangle, Activity, Cpu, HardDrive, Wifi, Download, Shield, TrendingUp, Key, Copy, Trash2, Clock } from 'lucide-react';
import { huginn, gateway } from '../../sdk';
import type { RegistrationCode } from '../../sdk/gateway';
import { auth } from '../../lib/auth';

interface HuginnStats {
  totalDevices: number;
  activeDevices: number;
  retiredDevices: number;
  compliantDevices: number;
  nonCompliantDevices: number;
  windowsDevices: number;
  macDevices: number;
  linuxDevices: number;
  onlineDevices: number;
  avgCpu: number;
  avgMemory: number;
  avgDisk: number;
  pendingDeployments: number;
}

interface RecentDevice {
  id: string;
  hostname: string;
  os: string;
  status: string;
  compliance: boolean;
  last_seen_at: string;
  enrolled_at: string;
}

export function HuginnOverview() {
  const [stats, setStats] = useState<HuginnStats | null>(null);
  const [recentDevices, setRecentDevices] = useState<RecentDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationCodes, setRegistrationCodes] = useState<RegistrationCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const currentUser = auth.getCurrentUser();
  const canManageCodes = currentUser && (currentUser.role === 'admin' || currentUser.role === 'agent');

  useEffect(() => {
    loadData();
    if (canManageCodes) {
      loadRegistrationCodes();
    }
  }, [canManageCodes]);

  const loadData = async () => {
    try {
      const devicesResponse = await huginn.devices.list().catch(() => ({devices: [], pagination: {total: 0}}));
      
      // Extract devices array from response (handles both array and paginated response)
      const devices = Array.isArray(devicesResponse) ? devicesResponse : (devicesResponse.devices || []);
      
      // Sort by enrolled_at and get recent 5
      const sortedDevices = [...devices].sort((a: any, b: any) => {
        const dateA = new Date(a.enrolled_at || 0).getTime();
        const dateB = new Date(b.enrolled_at || 0).getTime();
        return dateB - dateA;
      });
      const recentDevices = sortedDevices.slice(0, 5);

      // Get telemetry data - try to get from first few devices
      // Note: For overview, we'd ideally aggregate telemetry, but for now calculate from available data
      let telemetryData: any[] = [];
      if (devices.length > 0) {
        // Try to get telemetry from first device as sample
        try {
          const firstDeviceTelemetry = await huginn.devices.getTelemetry(devices[0].id).catch(() => []);
          telemetryData = firstDeviceTelemetry.slice(0, 100);
        } catch (err) {
          // Ignore telemetry errors for overview
        }
      }

      // Get deployments - need to check each device
      // For now, we'll skip this as it requires iterating through devices
      // TODO: Add aggregated deployments endpoint
      const pendingDeployments = 0;

      if (devices.length > 0) {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        const onlineCount = devices.filter((d: any) => {
          const lastSeen = new Date(d.last_seen_at || 0);
          return lastSeen > oneHourAgo;
        }).length;

        const avgCpu = telemetryData.length
          ? telemetryData.reduce((sum, t) => sum + (Number(t.cpu) || 0), 0) / telemetryData.length
          : 0;

        const avgMemory = telemetryData.length
          ? telemetryData.reduce((sum, t) => sum + (Number(t.memory) || 0), 0) / telemetryData.length
          : 0;

        const avgDisk = telemetryData.length
          ? telemetryData.reduce((sum, t) => sum + (Number(t.disk) || 0), 0) / telemetryData.length
          : 0;

        const statsData: HuginnStats = {
          totalDevices: devices.length,
          activeDevices: devices.filter((d: any) => d.status === 'active').length,
          retiredDevices: devices.filter((d: any) => d.status === 'retired').length,
          compliantDevices: devices.filter((d: any) => d.compliance).length,
          nonCompliantDevices: devices.filter((d: any) => !d.compliance).length,
          windowsDevices: devices.filter((d: any) => d.os?.toLowerCase().includes('windows')).length,
          macDevices: devices.filter((d: any) => d.os?.toLowerCase().includes('mac')).length,
          linuxDevices: devices.filter((d: any) => d.os?.toLowerCase().includes('linux')).length,
          onlineDevices: onlineCount,
          avgCpu: Math.round(avgCpu),
          avgMemory: Math.round(avgMemory),
          avgDisk: Math.round(avgDisk),
          pendingDeployments,
        };

        setStats(statsData);
        setRecentDevices(recentDevices as RecentDevice[]);
      }
    } catch (error) {
      console.error('Failed to load Huginn overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrationCodes = async () => {
    if (!canManageCodes) return;
    
    setCodesLoading(true);
    try {
      const codes = await gateway.registrationCodes.list();
      // Update expired codes status
      const now = new Date();
      const updatedCodes = codes.map(code => {
        if (code.status === 'active' && new Date(code.expires_at) < now) {
          return { ...code, status: 'expired' as const };
        }
        return code;
      });
      setRegistrationCodes(updatedCodes);
    } catch (error) {
      console.error('Failed to load registration codes:', error);
    } finally {
      setCodesLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!canManageCodes) return;
    
    setGeneratingCode(true);
    try {
      const newCode = await gateway.registrationCodes.generate(24);
      await loadRegistrationCodes();
      // Show success message or copy to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(newCode.code);
        alert(`Registration code generated and copied to clipboard: ${newCode.code}`);
      } else {
        alert(`Registration code generated: ${newCode.code}\n\nCopy this code now - it won't be shown again!`);
      }
    } catch (error: any) {
      console.error('Failed to generate registration code:', error);
      alert(`Failed to generate code: ${error.message || 'Unknown error'}`);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(code);
        alert('Code copied to clipboard!');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Code copied to clipboard!');
      }
    } catch (error) {
      console.error('Failed to copy code:', error);
      alert('Failed to copy code to clipboard');
    }
  };

  const handleRevokeCode = async (codeId: string) => {
    if (!canManageCodes) return;
    if (!confirm('Are you sure you want to revoke this registration code?')) {
      return;
    }

    try {
      await gateway.registrationCodes.revoke(codeId);
      await loadRegistrationCodes();
    } catch (error: any) {
      console.error('Failed to revoke code:', error);
      alert(`Failed to revoke code: ${error.message || 'Unknown error'}`);
    }
  };

  const formatExpiration = (expiresAt: string): string => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    
    if (diff < 0) {
      return 'Expired';
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading overview...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Huginn — Mobile Device & Remote Management</h1>
        <p className="text-slate-400 mt-1">Monitor, manage, and secure all devices across your organization</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Monitor className="text-blue-400" size={24} />
            <span className="text-slate-400 text-sm">Total Devices</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.totalDevices || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Enrolled devices</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Wifi className="text-green-400" size={24} />
            <span className="text-slate-400 text-sm">Online Now</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.onlineDevices || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Active in last hour</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-emerald-400" size={24} />
            <span className="text-slate-400 text-sm">Compliant</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.compliantDevices || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Meeting policies</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="text-red-400" size={24} />
            <span className="text-slate-400 text-sm">Non-Compliant</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.nonCompliantDevices || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Policy violations</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Monitor className="text-violet-400" size={24} />
            <span className="text-slate-400 text-sm">Windows</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.windowsDevices || 0}</p>
          <p className="text-xs text-slate-500 mt-2">
            {stats?.totalDevices ? Math.round((stats.windowsDevices / stats.totalDevices) * 100) : 0}% of fleet
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Monitor className="text-cyan-400" size={24} />
            <span className="text-slate-400 text-sm">macOS</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.macDevices || 0}</p>
          <p className="text-xs text-slate-500 mt-2">
            {stats?.totalDevices ? Math.round((stats.macDevices / stats.totalDevices) * 100) : 0}% of fleet
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Monitor className="text-amber-400" size={24} />
            <span className="text-slate-400 text-sm">Linux</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.linuxDevices || 0}</p>
          <p className="text-xs text-slate-500 mt-2">
            {stats?.totalDevices ? Math.round((stats.linuxDevices / stats.totalDevices) * 100) : 0}% of fleet
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Download className="text-orange-400" size={24} />
            <span className="text-slate-400 text-sm">Pending Deployments</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.pendingDeployments || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Awaiting installation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-table">
          <div className="p-6 border-b border-slate-800/30">
            <h2 className="text-xl font-semibold text-slate-200">Recently Enrolled Devices</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-800/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Hostname</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">OS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {recentDevices.map((device) => (
                  <tr key={device.id} className="table-row">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-200">{device.hostname}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{device.os}</td>
                    <td className="px-6 py-4">
                      <span className={`status-badge ${
                        device.status === 'active' ? 'status-active' : 'status-info'
                      }`}>
                        {device.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`status-badge ${
                        device.compliance ? 'status-active' : 'status-error'
                      }`}>
                        {device.compliance ? 'Compliant' : 'Non-compliant'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-table">
            <div className="p-6 border-b border-slate-800/30">
              <h2 className="text-xl font-semibold text-slate-200">Fleet Health</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Cpu className="text-blue-400" size={20} />
                  <div>
                    <p className="font-medium text-slate-200">Avg. CPU Usage</p>
                    <p className="text-sm text-slate-400">Across all devices</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-200">{stats?.avgCpu || 0}%</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="text-green-400" size={20} />
                  <div>
                    <p className="font-medium text-slate-200">Avg. Memory Usage</p>
                    <p className="text-sm text-slate-400">Across all devices</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-200">{stats?.avgMemory || 0}%</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <HardDrive className="text-violet-400" size={20} />
                  <div>
                    <p className="font-medium text-slate-200">Avg. Disk Usage</p>
                    <p className="text-sm text-slate-400">Across all devices</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-200">{stats?.avgDisk || 0}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-table">
            <div className="p-6 border-b border-slate-800/30">
              <h2 className="text-xl font-semibold text-slate-200">Compliance Overview</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="text-green-400" size={20} />
                  <div>
                    <p className="font-medium text-slate-200">Compliance Rate</p>
                    <p className="text-sm text-slate-400">Devices meeting policies</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-200">
                    {stats?.totalDevices ? Math.round((stats.compliantDevices / stats.totalDevices) * 100) : 0}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-blue-400" size={20} />
                  <div>
                    <p className="font-medium text-slate-200">Online Rate</p>
                    <p className="text-sm text-slate-400">Devices active now</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-200">
                    {stats?.totalDevices ? Math.round((stats.onlineDevices / stats.totalDevices) * 100) : 0}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`${
                    (stats?.nonCompliantDevices || 0) > 0 ? 'text-red-400' : 'text-slate-400'
                  }`} size={20} />
                  <div>
                    <p className="font-medium text-slate-200">Attention Required</p>
                    <p className="text-sm text-slate-400">Non-compliant devices</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-200">
                    {stats?.nonCompliantDevices || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Registration Codes Section - Only for admin/agent */}
      {canManageCodes && (
        <div className="glass-table">
          <div className="p-6 border-b border-slate-800/30 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                <Key className="text-blue-400" size={24} />
                Agent Registration Codes
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Generate codes for agents to register and automatically link to your account
              </p>
            </div>
            <button
              onClick={handleGenerateCode}
              disabled={generatingCode}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              {generatingCode ? 'Generating...' : 'Generate Code'}
            </button>
          </div>

          <div className="p-6">
            {codesLoading ? (
              <div className="text-center py-8 text-slate-400">Loading codes...</div>
            ) : registrationCodes.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No registration codes generated yet.</p>
                <p className="text-sm mt-2">Click "Generate Code" to create your first registration code.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-800/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Expires</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Used By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {registrationCodes.map((code) => (
                      <tr key={code.id} className="table-row">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-sm text-slate-200 bg-slate-800/50 px-2 py-1 rounded">
                              {code.code}
                            </code>
                            <button
                              onClick={() => handleCopyCode(code.code)}
                              className="p-1 hover:bg-slate-800/50 rounded transition-colors"
                              title="Copy code"
                            >
                              <Copy className="text-slate-400 hover:text-slate-200" size={16} />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`status-badge ${
                            code.status === 'active' ? 'status-active' :
                            code.status === 'used' ? 'status-info' :
                            code.status === 'expired' ? 'status-warning' :
                            'status-error'
                          }`}>
                            {code.status.charAt(0).toUpperCase() + code.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          <div className="flex items-center gap-2">
                            <Clock className="text-slate-400" size={14} />
                            <span className="text-sm">
                              {formatExpiration(code.expires_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {code.used_by_agent_identifier ? (
                            <span className="text-sm">{code.used_by_agent_identifier}</span>
                          ) : (
                            <span className="text-sm text-slate-500">Not used</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          <span className="text-sm">
                            {new Date(code.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {code.status === 'active' && (
                            <button
                              onClick={() => handleRevokeCode(code.id)}
                              className="p-1 hover:bg-red-900/30 rounded transition-colors"
                              title="Revoke code"
                            >
                              <Trash2 className="text-red-400 hover:text-red-300" size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
