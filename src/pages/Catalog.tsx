import { useEffect, useState } from 'react';
import { sigurd } from '../sdk';
import type { ServiceCatalogItem } from '../lib/types';

interface Props {
  onNavigate: (page: string, data?: any) => void;
}

export function Catalog({ onNavigate }: Props) {
  const [items, setItems] = useState<ServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const data = await sigurd.catalog.list();
      setItems(data);
    } catch (error) {
      console.error('Failed to load catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))];

  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter(i => i.category === selectedCategory);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Service Catalog</h1>
      
      <div className="mb-6 flex gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded ${
              selectedCategory === cat 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <div key={item.id} className="glass-panel p-6 hover:bg-slate-800/50 cursor-pointer">
            <h3 className="text-lg font-semibold mb-2">{item.name}</h3>
            <p className="text-slate-400 text-sm mb-4">{item.description}</p>
            <button
              onClick={() => {
                // TODO: Open request drawer with dynamic form
                alert('Request functionality coming soon');
              }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
            >
              Request
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

