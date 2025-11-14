import { useEffect, useState } from 'react';
import { Save, Building2, Globe, AlertCircle, Info } from 'lucide-react';
import { muninn } from '../../sdk';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Toast } from '../../components/iam/Toast';

export function IAMSettings() {
  const { currentOrganization, availableOrganizations, refreshOrganizations, isLoading } = useOrganization();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    status: 'active' as 'active' | 'suspended' | 'archived',
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (currentOrganization) {
      setFormData({
        name: currentOrganization.name || '',
        domain: currentOrganization.domain || '',
        status: (currentOrganization.status as 'active' | 'suspended' | 'archived') || 'active',
      });
      setHasChanges(false);
    }
  }, [currentOrganization]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) {
      setToast({ message: 'No organization selected', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      await muninn.organizations.update(currentOrganization.id, {
        name: formData.name,
        domain: formData.domain || undefined,
        status: formData.status,
      });
      
      setToast({ message: 'Organization settings updated successfully', type: 'success' });
      setHasChanges(false);
      await refreshOrganizations();
    } catch (error: any) {
      console.error('Failed to update organization:', error);
      setToast({ 
        message: error.message || 'Failed to update organization settings', 
        type: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-200">Settings</h1>
          <p className="text-sm text-slate-400 mt-1">Configure organization settings</p>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center gap-3 text-slate-400">
            <Info size={20} />
            <p className="text-slate-300">Loading organization settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-200">Settings</h1>
          <p className="text-sm text-slate-400 mt-1">Configure organization settings</p>
        </div>

        <div className="glass-panel p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertCircle size={20} />
              <p className="text-slate-300">No organization available.</p>
            </div>
            {availableOrganizations.length === 0 && (
              <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <p className="text-sm text-slate-400 mb-2">You are not assigned to any organization.</p>
                <p className="text-xs text-slate-500">Please contact your administrator to be assigned to an organization.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-200">Organization Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Manage settings for {currentOrganization.name}</p>
      </div>

      <form onSubmit={handleSave}>
        <div className="glass-panel p-6 space-y-6">
          {/* Organization Information */}
          <div>
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-violet-400" />
              Organization Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Acme Corporation"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Display name for this organization</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                  <Globe size={16} />
                  Email Domain
                </label>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) => handleChange('domain', e.target.value)}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="acme.com"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Optional: Email domain for automatic organization assignment (e.g., @acme.com)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Active: Normal operation | Suspended: Temporarily disabled | Archived: Soft deleted
                </p>
              </div>
            </div>
          </div>

          {/* Organization Details */}
          <div className="border-t border-slate-700/50 pt-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Info size={20} className="text-blue-400" />
              Organization Details
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Organization ID:</span>
                <span className="text-slate-200 font-mono text-xs">{currentOrganization.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Created:</span>
                <span className="text-slate-200">
                  {new Date(currentOrganization.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Updated:</span>
                <span className="text-slate-200">
                  {new Date(currentOrganization.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <button
              type="submit"
              disabled={!hasChanges || saving}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                hasChanges && !saving
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
