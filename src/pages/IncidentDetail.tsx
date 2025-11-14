import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { sigurd } from '../sdk';
import type { Incident } from '../lib/types';

interface Props {
  incidentId: string;
  onNavigate: (page: string, data?: any) => void;
}

export function IncidentDetail({ incidentId, onNavigate }: Props) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncident();
  }, [incidentId]);

  const loadIncident = async () => {
    try {
      const data = await sigurd.incidents.get(incidentId);
      setIncident(data);
    } catch (error) {
      console.error('Failed to load incident:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!incident) return <div className="p-8">Incident not found</div>;

  return (
    <div className="p-8">
      <button
        onClick={() => onNavigate('incidents')}
        className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Incidents
      </button>
      <h1 className="text-2xl font-bold mb-4">{incident.title}</h1>
      <div className="glass-panel p-6">
        <p className="text-slate-300">{incident.description}</p>
        <div className="mt-4 flex gap-4">
          <span>Status: {incident.status}</span>
          <span>Priority: {incident.priority}</span>
        </div>
      </div>
    </div>
  );
}

