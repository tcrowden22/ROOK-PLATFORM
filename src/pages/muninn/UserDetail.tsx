import { useEffect, useState } from 'react';
import { ArrowLeft, ShieldOff, Ban, UserCheck, Clock } from 'lucide-react';
import { muninn } from '../../sdk';
import type { UserDetail, Device, Application, AuditLog } from '../../sdk/types';
import { SyncSourceBadge } from '../../components/muninn/SyncSourceBadge';
import { AppLauncher } from '../../components/muninn/AppLauncher';
import { UserActions } from '../../components/muninn/UserActions';
import { ResetMFA } from '../../components/muninn/ResetMFA';
import { Toast } from '../../components/iam/Toast';

interface UserDetailProps {
  userId?: string;
  onNavigate?: (page: string, data?: any) => void;
}

export function UserDetail({ userId: propUserId, onNavigate }: UserDetailProps) {
  // Extract userId from URL if not provided
  const getUserIdFromUrl = () => {
    const match = window.location.pathname.match(/^\/users\/([^/]+)$/);
    return match ? match[1] : null;
  };
  
  const userId = propUserId || getUserIdFromUrl();
  
  const [user, setUser] = useState<UserDetail | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'devices' | 'app-access' | 'activity' | 'security'>('profile');
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<'suspend' | 'unsuspend' | 'reset-mfa' | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId]);

  const loadUserData = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const [userData, devicesData, appsData, activityData] = await Promise.all([
        muninn.users.get(userId),
        muninn.users.getDevices(userId).catch(() => []),
        muninn.users.getApplications(userId).catch(() => []),
        muninn.users.getActivity(userId).catch(() => []),
      ]);
      
      setUser(userData);
      setDevices(devicesData);
      setApplications(appsData);
      setActivity(activityData);
    } catch (error) {
      console.error('Failed to load user data:', error);
      setToast({ message: 'Failed to load user data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('users');
    } else {
      window.history.pushState({}, '', '/users');
      window.location.reload();
    }
  };

  const handleAction = (action: 'suspend' | 'unsuspend' | 'reset-mfa') => {
    setActionModal(action);
  };

  const handleActionSuccess = () => {
    setActionModal(null);
    setToast({ message: 'Action completed successfully', type: 'success' });
    loadUserData();
  };

  const handleActionCancel = () => {
    setActionModal(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading user details...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">User not found</p>
        <button onClick={handleBack} className="mt-4 text-blue-600 hover:underline">
          Back to Users
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'devices', label: 'Devices' },
    { id: 'app-access', label: 'App Access' },
    { id: 'activity', label: 'Activity' },
    { id: 'security', label: 'Security' },
  ] as const;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-200">{user.name}</h1>
          <p className="text-sm text-slate-400 mt-1">{user.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800/30 mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="glass-table p-6">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-200">{user.name}</h2>
                  <SyncSourceBadge source={user.sync_source} />
                </div>
                <p className="text-slate-400">{user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-400">Status</label>
                <p className="text-slate-200 mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.status === 'active' ? 'bg-green-100 text-green-700' :
                    user.status === 'locked' ? 'bg-red-100 text-red-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {user.status}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Role</label>
                <p className="text-slate-200 mt-1">{user.role}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Department</label>
                <p className="text-slate-200 mt-1">{user.department || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Employee ID</label>
                <p className="text-slate-200 mt-1">{user.employee_id || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Created</label>
                <p className="text-slate-200 mt-1">{new Date(user.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Last Login</label>
                <p className="text-slate-200 mt-1 flex items-center gap-1">
                  {user.last_login ? (
                    <>
                      <Clock size={14} />
                      {new Date(user.last_login).toLocaleDateString()}
                    </>
                  ) : (
                    'Never'
                  )}
                </p>
              </div>
            </div>

            {user.groups && user.groups.length > 0 && (
              <div>
                <label className="text-sm font-medium text-slate-400">Groups</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {user.groups.map((group) => (
                    <span key={group.id} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {group.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'devices' && (
          <div>
            {devices.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No devices found</p>
            ) : (
              <div className="space-y-4">
                {devices.map((device) => (
                  <div key={device.id} className="border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-slate-200">{device.hostname}</h3>
                        <p className="text-sm text-slate-400">{device.os} {device.os_version}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {device.platform} • {device.serial || 'No serial'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs ${
                          device.compliance ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {device.compliance ? 'Compliant' : 'Non-Compliant'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'app-access' && (
          <div>
            {applications.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No applications granted</p>
            ) : (
              <AppLauncher applications={applications} />
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            {activity.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No activity found</p>
            ) : (
              <div className="space-y-3">
                {activity.map((log) => (
                  <div key={log.id} className="border-l-2 border-blue-500 pl-4 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-200">{log.action}</p>
                        {log.metadata?.audit_note && (
                          <p className="text-xs text-slate-400 mt-1">{log.metadata.audit_note}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-slate-400">MFA Status</label>
              <p className="text-slate-200 mt-1">
                {user.mfa_enabled ? (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    Enabled
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    Disabled
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-3">
              {user.status === 'suspended' ? (
                <button
                  onClick={() => handleAction('unsuspend')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  <UserCheck size={16} />
                  Unsuspend User
                </button>
              ) : (
                <button
                  onClick={() => handleAction('suspend')}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                >
                  <Ban size={16} />
                  Suspend User
                </button>
              )}
              {user.mfa_enabled && (
                <button
                  onClick={() => handleAction('reset-mfa')}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-800/50"
                >
                  <ShieldOff size={16} />
                  Reset MFA
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {actionModal === 'suspend' && user && (
        <UserActions
          user={user}
          action="suspend"
          onSuccess={handleActionSuccess}
          onCancel={handleActionCancel}
        />
      )}

      {actionModal === 'unsuspend' && user && (
        <UserActions
          user={user}
          action="unsuspend"
          onSuccess={handleActionSuccess}
          onCancel={handleActionCancel}
        />
      )}

      {actionModal === 'reset-mfa' && user && (
        <ResetMFA
          user={user}
          onSuccess={handleActionSuccess}
          onCancel={handleActionCancel}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

