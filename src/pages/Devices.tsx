import { useEffect, useState } from 'react';
import { Search, Monitor, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Device, User } from '../lib/types';

interface DevicesProps {
  initialFilters?: { compliance?: boolean };
  onNavigate: (page: string, id?: string) => void;
}

export function Devices({ initialFilters, onNavigate }: DevicesProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [complianceFilter, setComplianceFilter] = useState<string>(
    initialFilters?.compliance !== undefined ? (initialFilters.compliance ? 'compliant' : 'non-compliant') : 'all'
  );
  const [osFilter, setOsFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterDevices();
  }, [devices, searchTerm, complianceFilter, osFilter]);

  const loadData = async () => {
    try {
      const [devicesData, usersData] = await Promise.all([
        api.devices.list(),
        api.users.list(),
      ]);
      setDevices(devicesData);
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoading(false);
    }
  };

  const filterDevices = () => {
    let filtered = devices;

    if (searchTerm) {
      filtered = filtered.filter((device) =>
        device.hostname.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (complianceFilter !== 'all') {
      filtered = filtered.filter((d) =>
        complianceFilter === 'compliant' ? d.compliance : !d.compliance
      );
    }

    if (osFilter !== 'all') {
      filtered = filtered.filter((d) => d.os.toLowerCase().includes(osFilter.toLowerCase()));
    }

    setFilteredDevices(filtered);
  };

  const getUserName = (userId?: string) => {
    if (!userId) return 'Unassigned';
    return users.find((u) => u.id === userId)?.name || 'Unknown';
  };

  const getOsIcon = (os: string) => {
    if (os.toLowerCase().includes('windows')) return '🪟';
    if (os.toLowerCase().includes('mac')) return '🍎';
    if (os.toLowerCase().includes('linux') || os.toLowerCase().includes('ubuntu')) return '🐧';
    return '💻';
  };

  const getLastSeenText = (lastSeen: string) => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading devices...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Devices</h1>
        <p className="text-slate-400 mt-1">Monitor and manage all devices across your organization</p>
      </div>

      <div className="glass-table">
        <div className="p-6 border-b border-slate-800/30">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search devices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-200 placeholder-slate-500"
              />
            </div>
            <select
              value={complianceFilter}
              onChange={(e) => setComplianceFilter(e.target.value)}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-200"
            >
              <option value="all">All Devices</option>
              <option value="compliant">Compliant</option>
              <option value="non-compliant">Non-Compliant</option>
            </select>
            <select
              value={osFilter}
              onChange={(e) => setOsFilter(e.target.value)}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-200"
            >
              <option value="all">All OS</option>
              <option value="windows">Windows</option>
              <option value="mac">macOS</option>
              <option value="linux">Linux</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Device</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">OS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Compliance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredDevices.map((device) => (
                <tr
                  key={device.id}
                  onClick={() => onNavigate('device-detail', device.id)}
                  className="table-row"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Monitor className="text-emerald-400" size={20} />
                      <div>
                        <div className="font-medium text-slate-200">{device.hostname}</div>
                        <div className="text-xs text-slate-500">
                          Enrolled {new Date(device.enrolled_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getOsIcon(device.os)}</span>
                      <span className="text-slate-300">{device.os}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{getUserName(device.owner_user_id)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`status-badge ${
                        device.status === 'active'
                          ? 'status-active'
                          : 'status-info'
                      }`}
                    >
                      {device.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {device.compliance ? (
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle size={16} />
                        <span className="text-xs font-medium">Compliant</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertTriangle size={16} />
                        <span className="text-xs font-medium">Non-Compliant</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-400">{getLastSeenText(device.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
