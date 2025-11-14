import { useState } from 'react';
import { Ban, UserCheck, X } from 'lucide-react';
import { muninn } from '../../sdk';
import type { User } from '../../sdk/types';

interface UserActionsProps {
  user: User;
  action: 'suspend' | 'unsuspend';
  onSuccess: () => void;
  onCancel: () => void;
}

export function UserActions({ user, action, onSuccess, onCancel }: UserActionsProps) {
  const [auditNote, setAuditNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuspend = action === 'suspend';
  const actionLabel = isSuspend ? 'Suspend' : 'Unsuspend';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auditNote.trim()) {
      setError('Audit note is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSuspend) {
        await muninn.users.suspend(user.id, auditNote);
      } else {
        await muninn.users.unsuspend(user.id, auditNote);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || `Failed to ${actionLabel} user`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {isSuspend ? (
              <Ban className="text-orange-600" size={24} />
            ) : (
              <UserCheck className="text-green-600" size={24} />
            )}
            <h2 className="text-xl font-semibold text-slate-800">{actionLabel} User</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className={`${isSuspend ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
            <p className={`text-sm ${isSuspend ? 'text-orange-800' : 'text-green-800'}`}>
              {isSuspend ? (
                <>
                  <strong>Warning:</strong> Suspending <strong>{user.name}</strong> ({user.email}) will prevent them from logging in.
                </>
              ) : (
                <>
                  Unsuspending <strong>{user.name}</strong> ({user.email}) will restore their access.
                </>
              )}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Audit Note <span className="text-red-500">*</span>
            </label>
            <textarea
              value={auditNote}
              onChange={(e) => setAuditNote(e.target.value)}
              placeholder={`Enter a reason for ${actionLabel.toLowerCase()}ing this user...`}
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
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isSuspend
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
              disabled={loading || !auditNote.trim()}
            >
              {loading ? `${actionLabel}ing...` : actionLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

