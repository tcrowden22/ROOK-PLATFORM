import { useEffect, useState } from 'react';
import { Plus, X, Shield } from 'lucide-react';
import { Application } from '../../lib/types';
import { Toast } from '../../components/iam/Toast';
import { api } from '../../lib/api';

export function IAMApps() {
  const [apps, setApps] = useState<Application[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [newApp, setNewApp] = useState({ name: '', description: '', logo_url: '', redirect_url: '', scopes: '' });

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      const appsData = await api.applications.list();
      setApps(appsData);
    } catch (error) {
      console.error('Failed to load apps:', error);
      setToast({ message: 'Failed to load applications', type: 'error' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.applications.create({
        ...newApp,
        scopes: newApp.scopes ? newApp.scopes.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
      setToast({ message: 'App created successfully', type: 'success' });
      setShowModal(false);
      setNewApp({ name: '', description: '', logo_url: '', redirect_url: '', scopes: '' });
      loadApps();
    } catch (error: any) {
      setToast({ message: error.message || 'Failed to create app', type: 'error' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">Applications (SSO)</h1>
          <p className="text-sm text-slate-400 mt-1">Manage SSO-enabled applications</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 gradient-button text-white rounded-lg">
          <Plus size={18} />
          Add App
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {apps.map((app) => (
          <div key={app.id} className="glass-table p-6 hover:shadow-md transition cursor-pointer">
            <div className="flex flex-col items-center text-center">
              {app.logo_url ? (
                <img src={app.logo_url} alt={app.name} className="w-16 h-16 object-contain mb-3" />
              ) : (
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                  <Shield className="text-blue-600" size={32} />
                </div>
              )}
              <h3 className="font-semibold text-slate-200 mb-1">{app.name}</h3>
              <p className="text-xs text-slate-400 mb-3 line-clamp-2">{app.description}</p>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Assigned</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <div className="glass-panel max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Add Application</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" value={newApp.name} onChange={(e) => setNewApp({ ...newApp, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={newApp.description} onChange={(e) => setNewApp({ ...newApp, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Logo URL</label>
                <input type="url" value={newApp.logo_url} onChange={(e) => setNewApp({ ...newApp, logo_url: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Redirect URL</label>
                <input type="url" value={newApp.redirect_url} onChange={(e) => setNewApp({ ...newApp, redirect_url: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Scopes (comma-separated)</label>
                <input type="text" value={newApp.scopes} onChange={(e) => setNewApp({ ...newApp, scopes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="read, write, admin" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
