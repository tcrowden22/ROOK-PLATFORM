import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit, UserPlus } from 'lucide-react';
import { Asset, AssetStats } from '../../lib/skuld/types';
import { skuld } from '../../sdk';
import { WarrantyExpiryBanner } from '../../components/skuld/WarrantyExpiryBanner';
import { StockCountsWidget } from '../../components/skuld/StockCountsWidget';
import { LifecycleRibbon } from '../../components/skuld/LifecycleRibbon';

interface AssetsProps {
  onNavigate?: (page: string, data?: any) => void;
}

export function Assets({ onNavigate }: AssetsProps) {
  const navigate = (page: string, data?: any) => {
    if (onNavigate) {
      onNavigate(page, data);
    } else {
      window.location.href = data ? `/${page}/${data}` : `/${page}`;
    }
  };
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [expiringAssets, setExpiringAssets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assetsData, statsData, expiringData] = await Promise.all([
        skuld.assets.list().catch(() => []),
        skuld.assets.getStats().catch(() => null),
        skuld.assets.getWarrantyExpiring(30).catch(() => []),
      ]);
      setAssets(assetsData as Asset[]);
      setStats(statsData);
      setExpiringAssets(expiringData);
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const assetAny = asset as any;
    const matchesSearch =
      (asset.tag?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.serial?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (assetAny.model?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || assetAny.model?.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    const classes = {
      requested: 'status-badge status-info',
      ordered: 'status-badge status-pending',
      received: 'status-badge status-info',
      in_stock: 'status-badge status-active',
      assigned: 'status-badge status-active',
      in_use: 'status-badge status-active',
      in_repair: 'status-badge status-pending',
      lost: 'status-badge status-locked',
      retired: 'status-badge status-info',
      disposed: 'status-badge status-locked',
    };
    return <span className={classes[status as keyof typeof classes]}>{status.replace('_', ' ')}</span>;
  };

  const getWarrantyDisplay = (asset: any) => {
    if (!asset.warranty_end) return <span className="text-slate-500">N/A</span>;
    
    const daysRemaining = asset.warranty_days_remaining;
    if (daysRemaining === null) return <span className="text-slate-500">N/A</span>;
    
    if (daysRemaining < 0) {
      return <span className="text-red-400">Expired</span>;
    }
    if (daysRemaining <= 30) {
      return <span className="text-red-400 font-medium">{daysRemaining} days</span>;
    }
    if (daysRemaining <= 60) {
      return <span className="text-yellow-400">{daysRemaining} days</span>;
    }
    return <span className="text-slate-300">{daysRemaining} days</span>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading assets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Assets</h1>
          <p className="text-slate-400 mt-1">Manage all organizational assets and their lifecycle</p>
        </div>
        <button className="gradient-button text-white rounded-lg px-4 py-2 flex items-center gap-2">
          <Plus size={20} />
          <span>Add Asset</span>
        </button>
      </div>

      {stats && (
        <StockCountsWidget
          readyToDeploy={stats.ready_to_deploy || 0}
          inRepair={stats.in_repair || 0}
          spare={stats.spare || 0}
        />
      )}

      <WarrantyExpiryBanner
        expiringAssets={expiringAssets}
        onViewClick={() => {
          // Filter to show only expiring assets
          setStatusFilter('all');
          // Could navigate to a filtered view instead
        }}
      />

      <div className="glass-table">
        <div className="p-6 border-b border-slate-800/30">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search by tag, serial, or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 input-field"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select-field">
              <option value="all">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="assigned">Assigned</option>
              <option value="in_use">In Use</option>
              <option value="in_repair">In Repair</option>
              <option value="retired">Retired</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="select-field">
              <option value="all">All Categories</option>
              <option value="laptop">Laptop</option>
              <option value="desktop">Desktop</option>
              <option value="phone">Phone</option>
              <option value="peripheral">Peripheral</option>
              <option value="software">Software</option>
              <option value="license">License</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Tag</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Serial</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Warranty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="table-row cursor-pointer">
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-200">{asset.tag || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-400 capitalize">
                      {(asset as any).model?.category || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-200">{(asset as any).model?.name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-mono text-xs">{asset.serial || '-'}</td>
                  <td className="px-6 py-4">
                    {getStatusBadge(asset.status)}
                  </td>
                  <td className="px-6 py-4 text-slate-300">{(asset as any).owner?.name || 'Unassigned'}</td>
                  <td className="px-6 py-4 text-slate-300">{(asset as any).location?.name || '-'}</td>
                  <td className="px-6 py-4">
                    {getWarrantyDisplay(asset)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => navigate('skuld-asset-detail', asset.id)}
                        className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors" 
                        title="View"
                      >
                        <Eye size={16} className="text-blue-400" />
                      </button>
                      <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors" title="Edit">
                        <Edit size={16} className="text-violet-400" />
                      </button>
                      <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors" title="Assign">
                        <UserPlus size={16} className="text-green-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-800/30 flex items-center justify-between text-sm text-slate-400">
          <span>Showing {filteredAssets.length} of {assets.length} assets</span>
        </div>
      </div>
    </div>
  );
}
