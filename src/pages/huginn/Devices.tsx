import { useState, useEffect, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2 } from 'lucide-react';
import { huginn } from '../../sdk/huginn';
import { DeviceFilters } from '../../components/huginn/DeviceFilters';
import { DeviceTableRow } from '../../components/huginn/DeviceTableRow';
import { BulkActionsBar } from '../../components/huginn/BulkActionsBar';
import { useToast } from '../../components/ui/ToastProvider';
import type { Device, DeviceListResponse } from '../../sdk/types';
import type { DeviceListFilters } from '../../sdk/huginn';

interface DevicesProps {
  onNavigate: (page: string, id?: string) => void;
}

export function Devices({ onNavigate }: DevicesProps) {
  const { showToast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DeviceListFilters>({
    page: 1,
    limit: 50,
  });
  const [pagination, setPagination] = useState<DeviceListResponse['pagination'] | null>(null);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());

  // Table container ref for virtualization
  const [parentRef, setParentRef] = useState<HTMLDivElement | null>(null);

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await huginn.devices.list(filters);
      // Handle paginated response - extract devices array if needed
      if (Array.isArray(response)) {
        setDevices(response);
        setPagination({ total: response.length, page: 1, limit: response.length, totalPages: 1 });
      } else {
        setDevices(response.devices || []);
        setPagination(response.pagination || { total: 0, page: 1, limit: 50, totalPages: 0 });
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to load devices', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Extract unique platforms and tags from devices
  const availablePlatforms = useMemo(() => {
    const platforms = new Set<string>();
    devices.forEach((device) => {
      if (device.platform) platforms.add(device.platform);
    });
    return Array.from(platforms).sort();
  }, [devices]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    devices.forEach((device) => {
      if (device.tags) {
        device.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [devices]);

  // Virtualization setup
  const rowVirtualizer = useVirtualizer({
    count: devices.length,
    getScrollElement: () => parentRef,
    estimateSize: () => 64, // Estimated row height
    overscan: 10, // Render 10 extra rows outside visible area
  });

  const handleSelect = useCallback((deviceId: string, selected: boolean) => {
    setSelectedDeviceIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(deviceId);
      } else {
        next.delete(deviceId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedDeviceIds.size === devices.length) {
      setSelectedDeviceIds(new Set());
    } else {
      setSelectedDeviceIds(new Set(devices.map((d) => d.id)));
    }
  }, [devices, selectedDeviceIds.size]);

  const handleDeviceClick = useCallback(
    (deviceId: string) => {
      onNavigate('device-detail', deviceId);
    },
    [onNavigate]
  );

  const handleFiltersChange = useCallback((newFilters: DeviceListFilters) => {
    setFilters(newFilters);
    setSelectedDeviceIds(new Set()); // Clear selection when filters change
  }, []);

  const handleBulkActionComplete = useCallback(() => {
    fetchDevices();
  }, [fetchDevices]);

  if (loading && devices.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Devices</h1>
        <p className="text-slate-400 mt-1">Monitor and manage all devices across your organization</p>
      </div>

      <div className="glass-table">
        <DeviceFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availablePlatforms={availablePlatforms}
          availableTags={availableTags}
        />

        {selectedDeviceIds.size > 0 && (
          <BulkActionsBar
            selectedDeviceIds={selectedDeviceIds}
            onActionComplete={handleBulkActionComplete}
            onClearSelection={() => setSelectedDeviceIds(new Set())}
          />
        )}

        <div className="overflow-x-auto">
          <div
            ref={setParentRef}
            className="h-[600px] overflow-auto"
            style={{ contain: 'strict' }}
          >
            <table className="w-full">
              <thead className="border-b border-slate-800/30 sticky top-0 bg-slate-900/95 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    <input
                      type="checkbox"
                      checked={selectedDeviceIds.size === devices.length && devices.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Serial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Last Seen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Compliance
                  </th>
                </tr>
              </thead>
              <tbody
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const device = devices[virtualRow.index];
                  return (
                    <tr
                      key={virtualRow.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <DeviceTableRow
                        device={device}
                        isSelected={selectedDeviceIds.has(device.id)}
                        onSelect={handleSelect}
                        onClick={handleDeviceClick}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-6 border-t border-slate-800/30 flex items-center justify-between">
            <div className="text-sm text-slate-400">
              Showing {devices.length} of {pagination.total} devices
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-slate-300">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

