import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Group, User } from '../../lib/types';
import { Toast } from '../../components/iam/Toast';
import { api } from '../../lib/api';

export function IAMGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [groupsData, usersData] = await Promise.all([
        api.groups.list(),
        api.users.list(),
      ]);
      setGroups(groupsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load data:', error);
      setToast({ message: 'Failed to load data', type: 'error' });
    }
  };

  const loadMembers = async (groupId: string) => {
    try {
      const membersData = await api.groups.getMembers(groupId);
      setMembers(membersData);
    } catch (error) {
      console.error('Failed to load members:', error);
      setToast({ message: 'Failed to load group members', type: 'error' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.groups.create(newGroup.name, newGroup.description);
      setToast({ message: 'Group created successfully', type: 'success' });
      setShowModal(false);
      setNewGroup({ name: '', description: '' });
      loadData();
    } catch (error: any) {
      setToast({ message: error.message || 'Failed to create group', type: 'error' });
    }
  };

  const handleSelect = (group: Group) => {
    setSelectedGroup(group);
    loadMembers(group.id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">Groups</h1>
          <p className="text-sm text-slate-400 mt-1">Organize users into groups</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 gradient-button text-white rounded-lg">
          <Plus size={18} />
          Create Group
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="glass-table p-6">
          <h2 className="text-lg font-semibold mb-4">All Groups</h2>
          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleSelect(group)}
                className={'w-full text-left p-3 rounded-lg border transition ' + (selectedGroup?.id === group.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 table-row')}
              >
                <div className="font-medium text-slate-200">{group.name}</div>
                <div className="text-sm text-slate-400">{group.description || 'No description'}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedGroup && (
          <div className="glass-table p-6">
            <h2 className="text-lg font-semibold mb-4">Group Members</h2>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-200 text-sm">{member.name}</div>
                    <div className="text-xs text-slate-400">{member.email}</div>
                  </div>
                </div>
              ))}
              {members.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No members yet</p>}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <div className="glass-panel max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Create Group</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" value={newGroup.name} onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={newGroup.description} onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
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
