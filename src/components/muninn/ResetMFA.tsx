import { useState } from 'react';
import { ShieldOff, X } from 'lucide-react';
import { muninn } from '../../sdk';
import type { User } from '../../sdk/types';

interface ResetMFAProps {
  user: User;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ResetMFA({ user, onSuccess, onCancel }: ResetMFAProps) {
  const [auditNote, setAuditNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auditNote.trim()) {
      setError('Audit note is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await muninn.users.resetMFA(user.id, auditNote);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to reset MFA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <ShieldOff className="text-orange-600" size={24} />
            <h2 className="text-xl font-semibold text-slate-800">Reset MFA</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              <strong>Warning:</strong> Resetting MFA will disable two-factor authentication for{' '}
              <strong>{user.name}</strong> ({user.email}). They will need to set up MFA again on their next login.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Audit Note <span className="text-red-500">*</span>
            </label>
            <textarea
              value={auditNote}
              onChange={(e) => setAuditNote(e.target.value)}
              placeholder="Enter a reason for resetting MFA..."
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              This note will be recorded in the audit log
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !auditNote.trim()}
            >
              {loading ? 'Resetting...' : 'Reset MFA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

