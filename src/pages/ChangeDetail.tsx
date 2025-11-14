import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { sigurd } from '../sdk';
import type { Change } from '../lib/types';

interface Props {
  changeId: string;
  onNavigate: (page: string, data?: any) => void;
}

export function ChangeDetail({ changeId, onNavigate }: Props) {
  const [change, setChange] = useState<Change | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChange();
  }, [changeId]);

  const loadChange = async () => {
    try {
      const data = await sigurd.changes.get(changeId);
      setChange(data);
    } catch (error) {
      console.error('Failed to load change:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!change) return <div className="p-8">Change not found</div>;

  return (
    <div className="p-8">
      <button
        onClick={() => onNavigate('changes')}
        className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Changes
      </button>
      <h1 className="text-2xl font-bold mb-4">{change.title}</h1>
      <div className="glass-panel p-6">
        <p className="text-slate-300">{change.description}</p>
        <div className="mt-4 flex gap-4">
          <span>Status: {change.status}</span>
          <span>Risk: {change.risk}</span>
        </div>
      </div>
    </div>
  );
}

