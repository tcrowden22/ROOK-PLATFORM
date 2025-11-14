import { useEffect, useState } from 'react';
import { Plus, X, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import { Application } from '../lib/types';

export function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newApp, setNewApp] = useState({ name: '', redirect_url: '' });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const data = await api.applications.list();
      setApplications(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load applications:', error);
      setLoading(false);
    }
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.applications.create(newApp);
      setSuccessMessage('Application added successfully');
      setShowCreateModal(false);
      setNewApp({ name: '', redirect_url: '' });
      loadApplications();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to create application:', error);
    }
  };

  const handleLaunch = (url: string) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading applications...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Applications</h1>
          <p className="text-slate-600 mt-1">Manage SSO-enabled applications</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span>Add Application</span>
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {applications.map((app) => (
          <div key={app.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                {app.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 truncate">{app.name}</h3>
                <p className="text-xs text-slate-500">
                  Added {new Date(app.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-1">Redirect URL</p>
              <p className="text-xs text-slate-600 truncate font-mono bg-slate-50 px-2 py-1 rounded">
                {app.redirect_url}
              </p>
            </div>

            <button
              onClick={() => handleLaunch(app.redirect_url)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <ExternalLink size={16} />
              <span>Launch</span>
            </button>
          </div>
        ))}
      </div>

      {applications.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-slate-500 mb-4">No applications configured</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            <span>Add Your First Application</span>
          </button>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Add Application</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateApp} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Application Name
                </label>
                <input
                  type="text"
                  value={newApp.name}
                  onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="My Application"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Redirect URL
                </label>
                <input
                  type="url"
                  value={newApp.redirect_url}
                  onChange={(e) => setNewApp({ ...newApp, redirect_url: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://app.example.com/callback"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  URL where users will be redirected after SSO authentication
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Add Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
