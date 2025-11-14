import { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { LifecyclePolicy } from '../../lib/skuld/types';
// Supabase removed - API endpoint not yet implemented

export function Settings() {
  const [policies, setPolicies] = useState<LifecyclePolicy[]>([]);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    // TODO: Add lifecycle policies endpoint to Skuld API
    setPolicies([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Skuld Settings</h1>
        <p className="text-slate-400 mt-1">Configure asset management policies and defaults</p>
      </div>

      <div className="glass-panel p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <SettingsIcon size={20} className="text-blue-400" />
            Lifecycle Policies
          </h2>

          <div className="space-y-4">
            {policies.map((policy) => (
              <div key={policy.id} className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-200">{policy.name}</h3>
                  <span className="status-badge status-active">Active</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-slate-400 block mb-1">Retire After (months)</label>
                    <input
                      type="number"
                      value={policy.retire_after_months}
                      className="input-field w-full"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Warranty Period (months)</label>
                    <input
                      type="number"
                      value={policy.warranty_months}
                      className="input-field w-full"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-800/30 pt-6">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Asset Tag Configuration</h2>

          <div className="glass-card p-4 space-y-3">
            <div>
              <label className="text-slate-400 block mb-1 text-sm">Tag Prefix</label>
              <input
                type="text"
                defaultValue="AST-"
                className="input-field w-full"
                placeholder="e.g., AST-, EQUIP-"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-sm">Starting Number</label>
              <input
                type="number"
                defaultValue="1000"
                className="input-field w-full"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="auto-tag" className="w-4 h-4" defaultChecked />
              <label htmlFor="auto-tag" className="text-sm text-slate-300">
                Auto-generate tags for new assets
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="gradient-button text-white rounded-lg px-6 py-2 flex items-center gap-2">
            <Save size={16} />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
