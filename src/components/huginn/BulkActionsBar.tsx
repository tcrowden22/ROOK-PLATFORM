import { useState, useEffect } from 'react';
import { User, Shield, Lock, Trash2, Edit, Tag, Loader2 } from 'lucide-react';
import { huginn } from '../../sdk/huginn';
import { useToast } from '../ui/ToastProvider';
import type { BulkActionRequest, DevicePolicy } from '../../sdk/types';

interface BulkActionsBarProps {
  selectedDeviceIds: Set<string>;
  onActionComplete: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedDeviceIds,
  onActionComplete,
  onClearSelection,
}: BulkActionsBarProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);
  const [showPushPolicyModal, setShowPushPolicyModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [policies, setPolicies] = useState<DevicePolicy[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [newHostname, setNewHostname] = useState('');
  const [tags, setTags] = useState<string[]>(['']);

  // Load policies when modal opens
  useEffect(() => {
    if (showPushPolicyModal && policies.length === 0) {
      loadPolicies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPushPolicyModal]);

  const loadPolicies = async () => {
    try {
      setPoliciesLoading(true);
      const policiesData = await huginn.policies.list();
      setPolicies(policiesData);
    } catch (error: any) {
      showToast(error.message || 'Failed to load policies', 'error');
    } finally {
      setPoliciesLoading(false);
    }
  };

  const handleBulkAction = async (action: BulkActionRequest['action'], params?: any) => {
    if (selectedDeviceIds.size === 0) return;

    setLoading(true);
    try {
      const response = await huginn.devices.bulkAction({
        deviceIds: Array.from(selectedDeviceIds),
        action,
        params,
      });

      if (response.success) {
        showToast(
          `Successfully processed ${response.processed} device(s)`,
          'success'
        );
        onActionComplete();
        onClearSelection();
        setShowAssignUserModal(false);
        setShowPushPolicyModal(false);
        setShowRenameModal(false);
        setShowTagModal(false);
      } else {
        showToast(
          `Processed ${response.processed} device(s), ${response.failed} failed`,
          'warning'
        );
        if (response.errors && response.errors.length > 0) {
          console.error('Bulk action errors:', response.errors);
        }
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to perform bulk action', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTagSubmit = () => {
    const validTags = tags.filter((t) => t.trim().length > 0);
    if (validTags.length === 0) {
      showToast('Please enter at least one tag', 'error');
      return;
    }
    handleBulkAction('tag', { tags: validTags });
  };

  if (selectedDeviceIds.size === 0) return null;

  return (
    <>
      <div className="p-4 bg-blue-500/10 border-b border-blue-500/30 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-slate-200 font-medium">
            {selectedDeviceIds.size} device(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAssignUserModal(true)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-200 text-sm transition-colors disabled:opacity-50"
            >
              <User size={16} />
              Assign User
            </button>
            <button
              onClick={() => setShowPushPolicyModal(true)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-200 text-sm transition-colors disabled:opacity-50"
            >
              <Shield size={16} />
              Push Policy
            </button>
            <button
              onClick={() => handleBulkAction('lock')}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm transition-colors disabled:opacity-50"
            >
              <Lock size={16} />
              Lock
            </button>
            <button
              onClick={() => handleBulkAction('wipe')}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              Wipe
            </button>
            <button
              onClick={() => setShowRenameModal(true)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-200 text-sm transition-colors disabled:opacity-50"
            >
              <Edit size={16} />
              Rename
            </button>
            <button
              onClick={() => setShowTagModal(true)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-200 text-sm transition-colors disabled:opacity-50"
            >
              <Tag size={16} />
              Tag
            </button>
          </div>
        </div>
        {loading && <Loader2 size={20} className="animate-spin text-blue-400" />}
      </div>

      {/* Assign User Modal */}
      {showAssignUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Assign User</h3>
            <input
              type="text"
              placeholder="User ID"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignUserModal(false);
                  setSelectedUserId('');
                }}
                className="flex-1 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedUserId) {
                    showToast('Please enter a user ID', 'error');
                    return;
                  }
                  handleBulkAction('assignUser', { userId: selectedUserId });
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Push Policy Modal */}
      {showPushPolicyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Push Policy</h3>
            {policiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-blue-400" />
              </div>
            ) : policies.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No policies available</p>
            ) : (
              <>
                <select
                  value={selectedPolicyId}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 mb-4"
                >
                  <option value="">Select a policy...</option>
                  {policies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.name} {policy.platform ? `(${policy.platform})` : ''}
                    </option>
                  ))}
                </select>
                {selectedPolicyId && (
                  <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
                    {policies.find((p) => p.id === selectedPolicyId)?.description && (
                      <p className="text-sm text-slate-300">
                        {policies.find((p) => p.id === selectedPolicyId)?.description}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPushPolicyModal(false);
                      setSelectedPolicyId('');
                    }}
                    className="flex-1 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedPolicyId) {
                        showToast('Please select a policy', 'error');
                        return;
                      }
                      handleBulkAction('pushPolicy', { policyId: selectedPolicyId });
                    }}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors disabled:opacity-50"
                  >
                    Push Policy
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Rename Devices</h3>
            <input
              type="text"
              placeholder="New hostname"
              value={newHostname}
              onChange={(e) => setNewHostname(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setNewHostname('');
                }}
                className="flex-1 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newHostname.trim()) {
                    showToast('Please enter a hostname', 'error');
                    return;
                  }
                  handleBulkAction('rename', { hostname: newHostname });
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors disabled:opacity-50"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Add Tags</h3>
            <div className="space-y-2 mb-4">
              {tags.map((tag, index) => (
                <input
                  key={index}
                  type="text"
                  placeholder="Tag name"
                  value={tag}
                  onChange={(e) => {
                    const newTags = [...tags];
                    newTags[index] = e.target.value;
                    setTags(newTags);
                  }}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200"
                />
              ))}
            </div>
            <button
              onClick={() => setTags([...tags, ''])}
              className="text-sm text-blue-400 hover:text-blue-300 mb-4"
            >
              + Add another tag
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTagModal(false);
                  setTags(['']);
                }}
                className="flex-1 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTagSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors disabled:opacity-50"
              >
                Add Tags
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

