import { useEffect, useState } from 'react';
import { Ban, ShieldOff, UserCheck, Clock, Plus, X } from 'lucide-react';
import { muninn } from '../../sdk';
import type { User } from '../../sdk/types';
import { UserSearch } from '../../components/muninn/UserSearch';
import { SyncSourceBadge } from '../../components/muninn/SyncSourceBadge';
import { UserActions } from '../../components/muninn/UserActions';
import { ResetMFA } from '../../components/muninn/ResetMFA';
import { Toast } from '../../components/iam/Toast';
import { useOrganization } from '../../contexts/OrganizationContext';

interface UsersListProps {
  onNavigate?: (page: string, data?: any) => void;
}

export function UsersList({ onNavigate }: UsersListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mfaFilter, setMfaFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionModal, setActionModal] = useState<'suspend' | 'unsuspend' | 'reset-mfa' | null>(null);
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
      setLoading(true);
      const data = await muninn.users.list();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
      setToast({ message: 'Failed to load users', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u.employee_id && u.employee_id.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((u) => u.status === statusFilter);
    }

    if (mfaFilter === 'enabled') {
      filtered = filtered.filter((u) => u.mfa_enabled === true);
    } else if (mfaFilter === 'disabled') {
      filtered = filtered.filter((u) => !u.mfa_enabled);
    }

    setFilteredUsers(filtered);
  };

  const handleUserClick = (user: User) => {
    if (onNavigate) {
      onNavigate('user-detail', user.id);
    } else {
      window.history.pushState({}, '', `/users/${user.id}`);
      window.location.reload();
    }
  };

  const handleAction = (user: User, action: 'suspend' | 'unsuspend' | 'reset-mfa') => {
    setSelectedUser(user);
    setActionModal(action);
  };

  const handleActionSuccess = () => {
    setActionModal(null);
    setSelectedUser(null);
    setToast({ message: 'Action completed successfully', type: 'success' });
    loadUsers();
  };

  const handleActionCancel = () => {
    setActionModal(null);
    setSelectedUser(null);
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
      suspended: 'bg-orange-100 text-orange-700',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const getMFAChip = (enabled?: boolean) => {
    return enabled ? (
      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">MFA On</span>
    ) : (
      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">MFA Off</span>
    );
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: 'bg-blue-100 text-blue-800',
      agent: 'bg-purple-100 text-purple-800',
      user: 'bg-slate-100 text-slate-800',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[role as keyof typeof styles]}`}>
        {role}
      </span>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading users...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">Users</h1>
          <p className="text-sm text-slate-400 mt-1">Manage user accounts and access</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span>Add User</span>
        </button>
      </div>

      <div className="glass-table">
        <div className="p-4 border-b space-y-3">
          <UserSearch value={searchTerm} onChange={setSearchTerm} />
          
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-slate-800/50 border-slate-700/50 text-slate-200"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="locked">Locked</option>
              <option value="suspended">Suspended</option>
            </select>
            
            <select
              value={mfaFilter}
              onChange={(e) => setMfaFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-slate-800/50 border-slate-700/50 text-slate-200"
            >
              <option value="all">All MFA</option>
              <option value="enabled">MFA Enabled</option>
              <option value="disabled">MFA Disabled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Dept</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">MFA</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Roles</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Last Activity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                  onClick={() => handleUserClick(user)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-200 text-sm">{user.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <SyncSourceBadge source={user.sync_source} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{user.email}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{user.department || '-'}</td>
                  <td className="px-4 py-3">{getStatusChip(user.status)}</td>
                  <td className="px-4 py-3">{getMFAChip(user.mfa_enabled)}</td>
                  <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {user.last_login ? (
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(user.last_login).toLocaleDateString()}
                      </div>
                    ) : (
                      <span>Never</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {user.status === 'suspended' ? (
                        <button
                          onClick={() => handleAction(user, 'unsuspend')}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Unsuspend"
                        >
                          <UserCheck size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(user, 'suspend')}
                          className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                          title="Suspend"
                        >
                          <Ban size={16} />
                        </button>
                      )}
                      {user.mfa_enabled && (
                        <button
                          onClick={() => handleAction(user, 'reset-mfa')}
                          className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                          title="Reset MFA"
                        >
                          <ShieldOff size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            <p>No users found</p>
          </div>
        )}
      </div>

      {actionModal === 'suspend' && selectedUser && (
        <UserActions
          user={selectedUser}
          action="suspend"
          onSuccess={handleActionSuccess}
          onCancel={handleActionCancel}
        />
      )}

      {actionModal === 'unsuspend' && selectedUser && (
        <UserActions
          user={selectedUser}
          action="unsuspend"
          onSuccess={handleActionSuccess}
          onCancel={handleActionCancel}
        />
      )}

      {actionModal === 'reset-mfa' && selectedUser && (
        <ResetMFA
          user={selectedUser}
          onSuccess={handleActionSuccess}
          onCancel={handleActionCancel}
        />
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

