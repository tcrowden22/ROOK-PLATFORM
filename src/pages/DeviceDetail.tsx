import { useEffect, useState } from 'react';
import { ArrowLeft, Headphones, Download, X } from 'lucide-react';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import { Device, Telemetry, DeploymentJob, SoftwarePackage, User } from '../lib/types';

interface DeviceDetailProps {
  deviceId: string;
  onNavigate: (page: string, id?: string) => void;
}

export function DeviceDetail({ deviceId, onNavigate }: DeviceDetailProps) {
  const [device, setDevice] = useState<Device | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [deploymentJobs, setDeploymentJobs] = useState<DeploymentJob[]>([]);
  const [softwarePackages, setSoftwarePackages] = useState<SoftwarePackage[]>([]);
  const [owner, setOwner] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const currentUser = auth.getCurrentUser();

  useEffect(() => {
    loadData();
  }, [deviceId]);

  const loadData = async () => {
    try {
      const [deviceData, telemetryData, jobsData, packagesData, usersData] = await Promise.all([
        api.devices.get(deviceId),
        api.devices.getTelemetry(deviceId),
        api.devices.getDeploymentJobs(deviceId),
        api.software.list(),
        api.users.list(),
      ]);

      setDevice(deviceData);
      setTelemetry(telemetryData);
      setDeploymentJobs(jobsData);
      setSoftwarePackages(packagesData);

      if (deviceData?.owner_user_id) {
        const ownerData = usersData.find((u) => u.id === deviceData.owner_user_id);
        setOwner(ownerData || null);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load device:', error);
      setLoading(false);
    }
  };

  const handleRequestSupport = async () => {
    if (!currentUser) return;

    try {
      await api.devices.requestRemoteSupport(deviceId, currentUser.id);
      setSuccessMessage('Remote support ticket created successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to request support:', error);
    }
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;

    try {
      await api.devices.deploy(deviceId, selectedPackage);
      setSuccessMessage('Deployment job created successfully');
      setShowDeployModal(false);
      setSelectedPackage('');
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to create deployment:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-slate-100 text-slate-800',
      running: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const getPackageName = (packageId: string) => {
    const pkg = softwarePackages.find((p) => p.id === packageId);
    return pkg ? `${pkg.name} ${pkg.version}` : 'Unknown';
  };

  if (loading || !device) {
    return <div className="flex items-center justify-center h-64">Loading device...</div>;
  }

  const latestTelemetry = telemetry[0];

  return (
    <div>
      <button
        onClick={() => onNavigate('devices')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
      >
        <ArrowLeft size={20} />
        <span>Back to Devices</span>
      </button>

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">{device.hostname}</h1>
                <p className="text-slate-600">{device.os}</p>
              </div>
              <div className="flex gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    device.compliance ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {device.compliance ? 'Compliant' : 'Non-Compliant'}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    device.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {device.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Owner</p>
                <p className="text-sm font-medium text-slate-800">{owner?.name || 'Unassigned'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Last Seen</p>
                <p className="text-sm font-medium text-slate-800">
                  {new Date(device.last_seen_at).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Enrolled</p>
                <p className="text-sm font-medium text-slate-800">
                  {new Date(device.enrolled_at).toLocaleDateString()}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Device ID</p>
                <p className="text-xs font-mono text-slate-600">{device.id.substring(0, 18)}...</p>
              </div>
            </div>
          </div>

          {latestTelemetry && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">System Metrics</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-2">CPU Usage</p>
                  <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-blue-600 rounded-full"
                      style={{ width: `${latestTelemetry.cpu || 0}%` }}
                    />
                  </div>
                  <p className="text-sm font-medium text-slate-800 mt-1">{latestTelemetry.cpu}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-2">Memory Usage</p>
                  <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-green-600 rounded-full"
                      style={{ width: `${latestTelemetry.memory || 0}%` }}
                    />
                  </div>
                  <p className="text-sm font-medium text-slate-800 mt-1">{latestTelemetry.memory}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-2">Disk Usage</p>
                  <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-orange-600 rounded-full"
                      style={{ width: `${latestTelemetry.disk || 0}%` }}
                    />
                  </div>
                  <p className="text-sm font-medium text-slate-800 mt-1">{latestTelemetry.disk}%</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">
                Last updated: {new Date(latestTelemetry.created_at).toLocaleString()}
              </p>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Deployment Jobs</h2>
            {deploymentJobs.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No deployment jobs</p>
            ) : (
              <div className="space-y-3">
                {deploymentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{getPackageName(job.package_id)}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Started: {new Date(job.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div>{getStatusBadge(job.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={handleRequestSupport}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Headphones size={18} />
                <span>Request Remote Support</span>
              </button>
              <button
                onClick={() => setShowDeployModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download size={18} />
                <span>Install Software</span>
              </button>
            </div>
          </div>

          {telemetry.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Telemetry History</h3>
              <div className="space-y-2">
                {telemetry.slice(0, 5).map((t) => (
                  <div key={t.id} className="text-xs text-slate-600">
                    {new Date(t.created_at).toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeployModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Install Software</h2>
              <button
                onClick={() => setShowDeployModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleDeploy} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select Software Package
                </label>
                <select
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose a package...</option>
                  {softwarePackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} {pkg.version} ({pkg.platform})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDeployModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Deploy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
