import { useState, useEffect } from 'react';
import { Plus, Search, Users, TrendingUp, DollarSign, Package, Boxes } from 'lucide-react';
import { Vendor, VendorStats } from '../../lib/skuld/types';
import { skuld } from '../../sdk';

export function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorStats, setVendorStats] = useState<VendorStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    if (selectedVendor) {
      loadVendorStats(selectedVendor.id);
    }
  }, [selectedVendor]);

  const loadVendors = async () => {
    try {
      const data = await skuld.vendors.list().catch(() => []);
      setVendors(data as Vendor[]);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  };

  const loadVendorStats = async (vendorId: string) => {
    try {
      const stats = await skuld.vendors.getStats(vendorId);
      setVendorStats(stats);
    } catch (error) {
      console.error('Failed to load vendor stats:', error);
    }
  };

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Vendors</h1>
          <p className="text-slate-400 mt-1">Manage asset vendors and suppliers</p>
        </div>
        <button className="gradient-button text-white rounded-lg px-4 py-2 flex items-center gap-2">
          <Plus size={20} />
          <span>Add Vendor</span>
        </button>
      </div>

      {selectedVendor && vendorStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-table p-4">
            <div className="flex items-center gap-3">
              <Package className="text-blue-400" size={24} />
              <div>
                <p className="text-sm text-slate-400">Total Assets</p>
                <p className="text-2xl font-bold text-slate-200">{vendorStats.total}</p>
              </div>
            </div>
          </div>
          <div className="glass-table p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="text-yellow-400" size={24} />
              <div>
                <p className="text-sm text-slate-400">Total Value</p>
                <p className="text-2xl font-bold text-slate-200">${vendorStats.total_value.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="glass-table p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-green-400" size={24} />
              <div>
                <p className="text-sm text-slate-400">In Use</p>
                <p className="text-2xl font-bold text-slate-200">{vendorStats.in_use}</p>
              </div>
            </div>
          </div>
          <div className="glass-table p-4">
            <div className="flex items-center gap-3">
              <Boxes className="text-violet-400" size={24} />
              <div>
                <p className="text-sm text-slate-400">In Stock</p>
                <p className="text-2xl font-bold text-slate-200">{vendorStats.in_stock}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-table">
        <div className="p-6 border-b border-slate-800/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 input-field"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Vendor Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">External ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredVendors.map((vendor) => (
                <tr 
                  key={vendor.id} 
                  className={`table-row cursor-pointer ${selectedVendor?.id === vendor.id ? 'bg-blue-500/10' : ''}`}
                  onClick={() => setSelectedVendor(vendor)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Users className="text-blue-400" size={20} />
                      <span className="font-medium text-slate-200">{vendor.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{vendor.external_id || '-'}</td>
                  <td className="px-6 py-4 text-slate-300 text-sm">
                    {vendor.contact?.website || vendor.contact?.support || '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(vendor.created_at).toLocaleDateString()}
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
