import { X, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { AssetStatus } from '../../lib/skuld/types';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: AssetStatus;
  newStatus: AssetStatus;
  onConfirm: (reason: string, auditNote: string) => Promise<void>;
  assetTag?: string;
}

export function StatusChangeModal({
  isOpen,
  onClose,
  currentStatus,
  newStatus,
  onConfirm,
  assetTag,
}: StatusChangeModalProps) {
  const [reason, setReason] = useState('');
  const [auditNote, setAuditNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim() || !auditNote.trim()) {
      setError('Both reason and audit note are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm(reason.trim(), auditNote.trim());
      setReason('');
      setAuditNote('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to change status');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      setAuditNote('');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-table max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-200">Change Asset Status</h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          {assetTag && (
            <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400">Asset Tag</p>
              <p className="text-slate-200 font-medium">{assetTag}</p>
            </div>
          )}

          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-slate-400 mb-2">Status Transition</p>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-slate-700 rounded text-sm text-slate-300">
                {currentStatus.replace('_', ' ')}
              </span>
              <span className="text-slate-500">→</span>
              <span className="px-3 py-1 bg-blue-500 rounded text-sm text-white font-medium">
                {newStatus.replace('_', ' ')}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Reason <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief reason for this status change"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Audit Note <span className="text-red-400">*</span>
              </label>
              <textarea
                value={auditNote}
                onChange={(e) => setAuditNote(e.target.value)}
                placeholder="Detailed notes about this status change for audit purposes"
                rows={4}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-1">
                This note will be recorded in the asset activity timeline
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !reason.trim() || !auditNote.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Changing...' : 'Confirm Change'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

