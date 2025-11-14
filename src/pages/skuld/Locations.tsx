import { useState, useEffect } from 'react';
import { Plus, Search, MapPin } from 'lucide-react';
import { Location } from '../../lib/skuld/types';
import { skuld } from '../../sdk';

export function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const data = await skuld.locations.list().catch(() => []);
      setLocations(data as Location[]);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const filteredLocations = locations.filter(l =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.code?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Locations</h1>
          <p className="text-slate-400 mt-1">Manage physical asset locations</p>
        </div>
        <button className="gradient-button text-white rounded-lg px-4 py-2 flex items-center gap-2">
          <Plus size={20} />
          <span>Add Location</span>
        </button>
      </div>

      <div className="glass-table">
        <div className="p-6 border-b border-slate-800/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search locations..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Location Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredLocations.map((location) => (
                <tr key={location.id} className="table-row cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="text-emerald-400" size={20} />
                      <span className="font-medium text-slate-200">{location.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="status-badge status-info">{location.code || '-'}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-300 text-sm">
                    {location.address?.city && location.address?.state
                      ? `${location.address.city}, ${location.address.state}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(location.created_at).toLocaleDateString()}
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
