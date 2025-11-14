import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { sigurd } from '../sdk';
import type { ServiceRequest } from '../lib/types';

interface Props {
  requestId: string;
  onNavigate: (page: string, data?: any) => void;
}

export function RequestDetail({ requestId, onNavigate }: Props) {
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequest();
  }, [requestId]);

  const loadRequest = async () => {
    try {
      const data = await sigurd.serviceRequests.get(requestId);
      setRequest(data);
    } catch (error) {
      console.error('Failed to load service request:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!request) return <div className="p-8">Service request not found</div>;

  return (
    <div className="p-8">
      <button
        onClick={() => onNavigate('requests')}
        className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Requests
      </button>
      <h1 className="text-2xl font-bold mb-4">{request.title}</h1>
      <div className="glass-panel p-6">
        <p className="text-slate-300">{request.description}</p>
        <div className="mt-4 flex gap-4">
          <span>Status: {request.status}</span>
          <span>Priority: {request.priority}</span>
        </div>
      </div>
    </div>
  );
}

