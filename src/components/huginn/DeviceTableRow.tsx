import { memo } from 'react';
import { Monitor, CheckCircle, AlertTriangle } from 'lucide-react';
import type { Device } from '../../sdk/types';

interface DeviceTableRowProps {
  device: Device;
  isSelected: boolean;
  onSelect: (deviceId: string, selected: boolean) => void;
  onClick: (deviceId: string) => void;
}

export const DeviceTableRow = memo(function DeviceTableRow({
  device,
  isSelected,
  onSelect,
  onClick,
}: DeviceTableRowProps) {
  const getOsIcon = (os: string) => {
    const osLower = os.toLowerCase();
    if (osLower.includes('windows')) return '🪟';
    if (osLower.includes('mac')) return '🍎';
    if (osLower.includes('linux') || osLower.includes('ubuntu')) return '🐧';
    if (osLower.includes('ios')) return '📱';
    if (osLower.includes('android')) return '🤖';
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

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
          Active
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30">
        Retired
      </span>
    );
  };

  return (
    <tr
      className={`border-b border-slate-800/30 hover:bg-slate-800/30 transition-colors cursor-pointer ${
        isSelected ? 'bg-blue-500/10' : ''
      }`}
      onClick={() => onClick(device.id)}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(device.id, e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
          />
          <Monitor className="text-emerald-400" size={20} />
          <div>
            <div className="font-medium text-slate-200">{device.hostname}</div>
            {device.serial && (
              <div className="text-xs text-slate-500">SN: {device.serial}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-slate-300">{device.owner_name || 'Unassigned'}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getOsIcon(device.os)}</span>
          <div>
            <div className="text-slate-300">{device.platform || device.os}</div>
            {device.os_version && (
              <div className="text-xs text-slate-500">{device.os_version}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-slate-300">{device.serial || '-'}</td>
      <td className="px-6 py-4">{getStatusBadge(device.status)}</td>
      <td className="px-6 py-4 text-slate-400">{getLastSeenText(device.last_seen_at)}</td>
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
    </tr>
  );
});

