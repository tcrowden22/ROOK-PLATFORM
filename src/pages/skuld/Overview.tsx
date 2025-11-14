import { useState, useEffect } from 'react';
import { Package, Box, TrendingUp, AlertTriangle, Shield, Wrench, DollarSign, BarChart3 } from 'lucide-react';
import { Asset, AssetStats } from '../../lib/skuld/types';
import { skuld } from '../../sdk';

export function Overview() {
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [recentAssets, setRecentAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allAssets = await skuld.assets.list().catch(() => []);
      
      // Sort by created_at and get recent 5
      const sortedAssets = [...allAssets].sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      const recentAssets = sortedAssets.slice(0, 5);

      if (allAssets.length > 0) {
        const now = new Date();
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

        const statsData: AssetStats = {
          total: allAssets.length,
          by_status: allAssets.reduce((acc: any, a: any) => {
            acc[a.status] = (acc[a.status] || 0) + 1;
            return acc;
          }, {} as any),
          by_category: {} as any,
          in_use: allAssets.filter((a: any) => a.status === 'in_use').length,
          in_stock: allAssets.filter((a: any) => a.status === 'in_stock').length,
          retiring_soon: allAssets.filter((a: any) => {
            if (!a.purchase_date) return false;
            const purchaseDate = new Date(a.purchase_date);
            const ageMonths = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
            return ageMonths > 30;
          }).length,
          warranty_expiring: allAssets.filter((a: any) => {
            if (!a.warranty_end) return false;
            const warrantyEnd = new Date(a.warranty_end);
            return warrantyEnd > now && warrantyEnd < threeMonthsFromNow;
          }).length,
          open_repairs: allAssets.filter((a: any) => a.status === 'in_repair').length,
          total_value: allAssets.reduce((sum: number, a: any) => sum + (Number(a.cost) || 0), 0),
        };

        setStats(statsData);
      }

      setRecentAssets(recentAssets as Asset[]);
    } catch (error) {
      console.error('Failed to load overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading overview...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Skuld — Asset Management</h1>
        <p className="text-slate-400 mt-1">Track and manage your organization's assets throughout their lifecycle</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Package className="text-blue-400" size={24} />
            <span className="text-slate-400 text-sm">Total Assets</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.total || 0}</p>
          <p className="text-xs text-slate-500 mt-2">All tracked assets</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Box className="text-green-400" size={24} />
            <span className="text-slate-400 text-sm">In Use</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.in_use || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Currently deployed</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-violet-400" size={24} />
            <span className="text-slate-400 text-sm">In Stock</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.in_stock || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Available for deployment</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="text-emerald-400" size={24} />
            <span className="text-slate-400 text-sm">Total Value</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">
            ${((stats?.total_value || 0) / 1000).toFixed(0)}k
          </p>
          <p className="text-xs text-slate-500 mt-2">Asset portfolio value</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="text-amber-400" size={24} />
            <span className="text-slate-400 text-sm">Retiring Soon</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.retiring_soon || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Over 30 months old</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-blue-400" size={24} />
            <span className="text-slate-400 text-sm">Warranty Expiring</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.warranty_expiring || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Within 3 months</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="text-red-400" size={24} />
            <span className="text-slate-400 text-sm">In Repair</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">{stats?.open_repairs || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Currently being serviced</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="text-cyan-400" size={24} />
            <span className="text-slate-400 text-sm">Utilization</span>
          </div>
          <p className="text-3xl font-bold text-slate-200">
            {stats?.total ? Math.round((stats.in_use / stats.total) * 100) : 0}%
          </p>
          <p className="text-xs text-slate-500 mt-2">Assets in active use</p>
        </div>
      </div>

      <div className="glass-table">
        <div className="p-6 border-b border-slate-800/30">
          <h2 className="text-xl font-semibold text-slate-200">Recently Added Assets</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Tag</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {recentAssets.map((asset) => (
                <tr key={asset.id} className="table-row">
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-200">{asset.tag || '-'}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{(asset as any).model?.name || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`status-badge ${
                      asset.status === 'in_use' ? 'status-active' :
                      asset.status === 'in_stock' ? 'status-info' :
                      asset.status === 'in_repair' ? 'status-pending' :
                      'status-info'
                    }`}>
                      {asset.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{(asset as any).location?.name || '-'}</td>
                  <td className="px-6 py-4 text-slate-300">{(asset as any).owner?.name || 'Unassigned'}</td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
