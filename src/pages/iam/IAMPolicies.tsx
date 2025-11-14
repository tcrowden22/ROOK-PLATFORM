import { useEffect, useState } from 'react';
import { Save, Shield } from 'lucide-react';
import { Toast } from '../../components/iam/Toast';
import { muninn } from '../../sdk';

export function IAMPolicies() {
  const [policy, setPolicy] = useState({ minLength: 8, lockoutThreshold: 5, requireMfaForAdmins: false });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const policies = await muninn.policies.list();
      const passwordPolicy = policies.find((p: any) => p.name === 'password_policy');
      if (passwordPolicy?.value) {
        setPolicy(typeof passwordPolicy.value === 'string' ? JSON.parse(passwordPolicy.value) : passwordPolicy.value);
      }
    } catch (error) {
      console.error('Failed to load policy:', error);
    }
  };

  const handleSave = async () => {
    try {
      await muninn.policies.updatePasswordPolicy(policy);
      setToast({ message: 'Policy updated successfully', type: 'success' });
    } catch (error: any) {
      setToast({ message: error.message || 'Failed to update policy', type: 'error' });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-200">Policies</h1>
        <p className="text-sm text-slate-400 mt-1">Configure security policies</p>
      </div>

      <div className="glass-table p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-blue-600" size={24} />
          <h2 className="text-lg font-semibold text-slate-200">Password Policy</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Minimum Password Length</label>
            <input
              type="number"
              value={policy.minLength}
              onChange={(e) => setPolicy({ ...policy, minLength: parseInt(e.target.value) })}
              min="6"
              max="32"
              className="w-32 px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-slate-500 mt-1">Minimum: 6, Maximum: 32 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Lockout After Failed Attempts</label>
            <input
              type="number"
              value={policy.lockoutThreshold}
              onChange={(e) => setPolicy({ ...policy, lockoutThreshold: parseInt(e.target.value) })}
              min="3"
              max="10"
              className="w-32 px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-slate-500 mt-1">Lock account after N failed login attempts</p>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-slate-300">Require MFA for Admins</label>
              <p className="text-xs text-slate-400 mt-1">Admin users must enable MFA to access the system</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={policy.requireMfaForAdmins}
                onChange={(e) => setPolicy({ ...policy, requireMfaForAdmins: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="pt-4 border-t">
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 gradient-button text-white rounded-lg">
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
