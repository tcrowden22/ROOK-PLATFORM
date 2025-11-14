import { useEffect, useState } from 'react';
import { Search, Plus, X, Lock, Unlock, ShieldOff, Clock, User as UserIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { muninn } from '../../sdk';
import { User } from '../../lib/types';
import { Toast } from '../../components/iam/Toast';
import { useOrganization } from '../../contexts/OrganizationContext';

export function IAMDirectory() {
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mfaFilter, setMfaFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { currentOrganization, availableOrganizations } = useOrganization();
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    role: 'user' as 'admin' | 'agent' | 'user',
    department: '',
    employee_id: '',
    enabled: true,
    emailVerified: true,
    organization_id: '',
  });

  // Set default organization when modal opens or organizations load
  useEffect(() => {
    if (currentOrganization && !newUser.organization_id) {
      setNewUser(prev => ({ ...prev, organization_id: currentOrganization.id }));
    }
  }, [currentOrganization]);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter, mfaFilter]);

  const loadUsers = async () => {
    try {
      const data = await api.users.list();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
      setToast({ message: 'Failed to load users', type: 'error' });
    }
  };

  const filterUsers = () => {
    let result = users;
    if (searchTerm) {
      result = result.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') result = result.filter(u => u.status === statusFilter);
    if (mfaFilter === 'enabled') result = result.filter(u => u.mfa_enabled);
    if (mfaFilter === 'disabled') result = result.filter(u => !u.mfa_enabled);
    setFiltered(result);
  };

  const handleBulkAction = async (action: string) => {
    for (const userId of Array.from(selectedUsers)) {
      const user = users.find(u => u.id === userId);
      if (!user) continue;

      if (action === 'activate') await api.users.activate(userId);
      else if (action === 'suspend') await api.users.suspend(userId);
      else if (action === 'reset-mfa') {
        const { muninn } = await import('../../sdk');
        await muninn.users.resetMFA(userId, 'Bulk MFA reset');
      }
    }
    setToast({ message: `Bulk action completed`, type: 'success' });
    setSelectedUsers(new Set());
    loadUsers();
  };

  const handleUserAction = async (action: string, user: User) => {
    try {
      if (action === 'lock') {
        await api.users.lock(user.id);
      } else if (action === 'unlock') {
        await api.users.activate(user.id);
      } else if (action === 'reset-mfa') {
        const { muninn } = await import('../../sdk');
        await muninn.users.resetMFA(user.id, 'MFA reset via IAM Directory');
        setToast({ message: 'MFA reset successfully', type: 'success' });
        loadUsers();
        return;
      }
      
      setToast({ message: `User ${action} successful`, type: 'success' });
      loadUsers();
      if (selectedUser?.id === user.id) {
        const updatedUser = await api.users.get(user.id);
        if (updatedUser) setSelectedUser(updatedUser);
      }
    } catch (error: any) {
      setToast({ message: error.message || 'Action failed', type: 'error' });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newUser.organization_id) {
        setToast({ message: 'Please select an organization', type: 'error' });
        return;
      }

      await muninn.users.create({
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username || undefined,
        password: newUser.password,
        role: newUser.role,
        department: newUser.department || undefined,
        employee_id: newUser.employee_id || undefined,
        enabled: newUser.enabled,
        emailVerified: newUser.emailVerified,
        organization_id: newUser.organization_id,
      });
      setToast({ message: 'User created successfully', type: 'success' });
      setShowCreateModal(false);
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        role: 'user',
        department: '',
        employee_id: '',
        enabled: true,
        emailVerified: true,
        organization_id: currentOrganization?.id || '',
      });
      loadUsers();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      setToast({ 
        message: error.message || 'Failed to create user', 
        type: 'error' 
      });
    }
  };

  const getStatusChip = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      locked: 'bg-red-100 text-red-700',
      suspended: 'bg-gray-100 text-gray-700',
    };
    return <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles]}`}>{status}</span>;
  };

  const getMFAChip = (enabled?: boolean) => {
    return enabled ? (
      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">MFA On</span>
    ) : (
      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">MFA Off</span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">Directory</h1>
          <p className="text-sm text-slate-400 mt-1">Manage user accounts and access</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 gradient-button text-white rounded-lg"
        >
          <Plus size={18} />
          New User
        </button>
      </div>

      <div className="glass-table">
        <div className="p-4 border-b space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="locked">Locked</option>
              <option value="suspended">Suspended</option>
            </select>
            <select value={mfaFilter} onChange={(e) => setMfaFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="all">All MFA</option>
              <option value="enabled">MFA Enabled</option>
              <option value="disabled">MFA Disabled</option>
            </select>
          </div>

          {selectedUsers.size > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-slate-300">{selectedUsers.size} selected</span>
              <button onClick={() => handleBulkAction('activate')} className="px-3 py-1 text-xs bg-green-600 text-white rounded">Activate</button>
              <button onClick={() => handleBulkAction('suspend')} className="px-3 py-1 text-xs bg-yellow-600 text-white rounded">Suspend</button>
              <button onClick={() => handleBulkAction('reset-mfa')} className="px-3 py-1 text-xs bg-orange-600 text-white rounded">Reset MFA</button>
              <button onClick={() => setSelectedUsers(new Set())} className="ml-auto text-sm text-slate-400">Clear</button>
            </div>
          )}
        </div>

        <table className="w-full">
          <thead className="border-b border-slate-800/30">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === filtered.length && filtered.length > 0}
                  onChange={(e) => setSelectedUsers(e.target.checked ? new Set(filtered.map(u => u.id)) : new Set())}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">MFA</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Last Sign-in</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((user) => (
              <tr key={user.id} className="table-row">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedUsers);
                      e.target.checked ? newSet.add(user.id) : newSet.delete(user.id);
                      setSelectedUsers(newSet);
                    }}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200 text-sm">{user.name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{getStatusChip(user.status)}</td>
                <td className="px-4 py-3">{getMFAChip(user.mfa_enabled)}</td>
                <td className="px-4 py-3 text-sm text-slate-400">
                  {user.last_login ? (
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(user.last_login).toLocaleDateString()}
                    </div>
                  ) : (
                    <span className="text-slate-400">Never</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setSelectedUser(user); setShowDrawer(true); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View
                    </button>
                    {user.status === 'locked' ? (
                      <button onClick={() => handleUserAction('unlock', user)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Unlock">
                        <Unlock size={16} />
                      </button>
                    ) : (
                      <button onClick={() => handleUserAction('lock', user)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Lock">
                        <Lock size={16} />
                      </button>
                    )}
                    {user.mfa_enabled && (
                      <button onClick={() => handleUserAction('reset-mfa', user)} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="Reset MFA">
                        <ShieldOff size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            <p>No users found</p>
          </div>
        )}
      </div>

      {showDrawer && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-40" onClick={() => setShowDrawer(false)}>
          <div className="absolute right-0 top-0 h-full w-96 glass-panel overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-medium">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-200">{selectedUser.name}</h2>
                    <p className="text-sm text-slate-400">{selectedUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setShowDrawer(false)} className="text-slate-400 hover:text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="flex gap-2">
                {getStatusChip(selectedUser.status)}
                {getMFAChip(selectedUser.mfa_enabled)}
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Profile</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Role:</span>
                    <span className="font-medium text-slate-200">{selectedUser.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Created:</span>
                    <span className="text-slate-200">{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Login:</span>
                    <span className="text-slate-200">
                      {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  {selectedUser.status === 'locked' ? (
                    <button onClick={() => handleUserAction('unlock', selectedUser)} className="w-full px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 justify-center">
                      <Unlock size={16} />
                      Unlock User
                    </button>
                  ) : (
                    <button onClick={() => handleUserAction('lock', selectedUser)} className="w-full px-4 py-2 text-sm gradient-button bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg flex items-center gap-2 justify-center">
                      <Lock size={16} />
                      Lock User
                    </button>
                  )}
                  {selectedUser.mfa_enabled && (
                    <button onClick={() => handleUserAction('reset-mfa', selectedUser)} className="w-full px-4 py-2 text-sm border table-row text-slate-300 rounded-lg flex items-center gap-2 justify-center">
                      <ShieldOff size={16} />
                      Reset MFA
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="glass-panel max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-semibold text-slate-200">Add User to Organization</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john.doe@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Username (Keycloak)
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Leave empty to use email as username"
                />
                <p className="text-xs text-slate-500 mt-1">If not provided, email will be used as username</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Role *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'agent' | 'user' })}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="user">User</option>
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="IT Operations"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={newUser.employee_id}
                  onChange={(e) => setNewUser({ ...newUser, employee_id: e.target.value })}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="EMP-12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Organization *
                </label>
                <select
                  value={newUser.organization_id}
                  onChange={(e) => setNewUser({ ...newUser, organization_id: e.target.value })}
                  className="w-full px-4 py-2 input-field focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select an organization</option>
                  {availableOrganizations.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">User will be assigned to this organization</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={newUser.enabled}
                    onChange={(e) => setNewUser({ ...newUser, enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="enabled" className="text-sm font-medium text-slate-300">
                    Enabled (Keycloak)
                  </label>
                  <span className="text-xs text-slate-500">User account will be active in Keycloak</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="emailVerified"
                    checked={newUser.emailVerified}
                    onChange={(e) => setNewUser({ ...newUser, emailVerified: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="emailVerified" className="text-sm font-medium text-slate-300">
                    Email Verified (Keycloak)
                  </label>
                  <span className="text-xs text-slate-500">Mark email as verified in Keycloak</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 input-field hover:bg-slate-800/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
