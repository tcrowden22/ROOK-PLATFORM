import { useState, useEffect } from 'react';
import { Plus, Search, Boxes, TrendingUp, DollarSign } from 'lucide-react';
import { AssetModel, ModelStats } from '../../lib/skuld/types';
import { skuld } from '../../sdk';

export function Models() {
  const [models, setModels] = useState<AssetModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AssetModel | null>(null);
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (selectedModel) {
      loadModelStats(selectedModel.id);
    }
  }, [selectedModel]);

  const loadModels = async () => {
    try {
      const data = await skuld.models.list().catch(() => []);
      setModels(data as AssetModel[]);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadModelStats = async (modelId: string) => {
    try {
      const stats = await skuld.models.getStats(modelId);
      setModelStats(stats);
    } catch (error) {
      console.error('Failed to load model stats:', error);
    }
  };

  const filteredModels = models.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Asset Models</h1>
          <p className="text-slate-400 mt-1">Define device and software models</p>
        </div>
        <button className="gradient-button text-white rounded-lg px-4 py-2 flex items-center gap-2">
          <Plus size={20} />
          <span>Add Model</span>
        </button>
      </div>

      {selectedModel && modelStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-table p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-blue-400" size={24} />
              <div>
                <p className="text-sm text-slate-400">Total Assets</p>
                <p className="text-2xl font-bold text-slate-200">{modelStats.total}</p>
              </div>
            </div>
          </div>
          <div className="glass-table p-4">
            <div className="flex items-center gap-3">
              <Boxes className="text-green-400" size={24} />
              <div>
                <p className="text-sm text-slate-400">In Use</p>
                <p className="text-2xl font-bold text-slate-200">{modelStats.in_use}</p>
              </div>
            </div>
          </div>
          <div className="glass-table p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="text-yellow-400" size={24} />
              <div>
                <p className="text-sm text-slate-400">Total Value</p>
                <p className="text-2xl font-bold text-slate-200">${modelStats.total_value.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="glass-table p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="text-violet-400" size={24} />
              <div>
                <p className="text-sm text-slate-400">Avg Cost</p>
                <p className="text-2xl font-bold text-slate-200">${modelStats.avg_cost.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-table">
        <div className="p-6 border-b border-slate-800/30">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 input-field"
              />
            </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Model Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Manufacturer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Lifecycle Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredModels.map((model) => (
                <tr 
                  key={model.id} 
                  className={`table-row cursor-pointer ${selectedModel?.id === model.id ? 'bg-blue-500/10' : ''}`}
                  onClick={() => setSelectedModel(model)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Boxes className="text-violet-400" size={20} />
                      <span className="font-medium text-slate-200">{model.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{model.manufacturer}</td>
                  <td className="px-6 py-4">
                    <span className="status-badge status-info capitalize">{model.category}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{model.lifecycle_policy?.name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
