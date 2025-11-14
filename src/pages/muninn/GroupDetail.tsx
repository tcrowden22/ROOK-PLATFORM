import { useEffect, useState } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { muninn } from '../../sdk';
import type { Group, User } from '../../sdk/types';
import { Toast } from '../../components/iam/Toast';

interface GroupDetailProps {
  groupId?: string;
  onNavigate?: (page: string, data?: any) => void;
}

export function GroupDetail({ groupId: propGroupId, onNavigate }: GroupDetailProps) {
  // Extract groupId from URL if not provided
  const getGroupIdFromUrl = () => {
    const match = window.location.pathname.match(/^\/groups\/([^/]+)$/);
    return match ? match[1] : null;
  };
  
  const groupId = propGroupId || getGroupIdFromUrl();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (groupId) {
      loadGroupData();
    }
  }, [groupId]);

  useEffect(() => {
    filterMembers();
  }, [members, searchTerm]);

  const loadGroupData = async () => {
    if (!groupId) return;
    
    try {
      setLoading(true);
      const [groupData, membersData, policiesData] = await Promise.all([
        muninn.groups.get(groupId),
        muninn.groups.getMembers(groupId).catch(() => []),
        muninn.groups.getPolicies(groupId).catch(() => []),
      ]);
      
      setGroup(groupData);
      setMembers(membersData);
      setPolicies(policiesData);
    } catch (error) {
      console.error('Failed to load group data:', error);
      setToast({ message: 'Failed to load group data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = members;

    if (searchTerm) {
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMembers(filtered);
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('groups');
    } else {
      window.history.pushState({}, '', '/groups');
      window.location.reload();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading group details...</div>;
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Group not found</p>
        <button onClick={handleBack} className="mt-4 text-blue-600 hover:underline">
          Back to Groups
        </button>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-slate-200">{group.name}</h1>
          {group.description && (
            <p className="text-sm text-slate-400 mt-1">{group.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members Section */}
        <div className="glass-table p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200">
              Members ({members.length})
            </h2>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-200 placeholder-slate-500"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 border border-slate-700/50 rounded-lg hover:bg-slate-800/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-200 text-sm">{member.name}</div>
                  <div className="text-xs text-slate-400">{member.email}</div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  member.status === 'active' ? 'bg-green-100 text-green-700' :
                  member.status === 'locked' ? 'bg-red-100 text-red-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {member.status}
                </span>
              </div>
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <p className="text-slate-500 text-center py-8">No members found</p>
          )}
        </div>

        {/* Policies Section */}
        <div className="glass-table p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Policies</h2>
          
          {policies.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No policies assigned</p>
          ) : (
            <div className="space-y-3">
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className="border border-slate-700/50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-200">{policy.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">Type: {policy.type}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      policy.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {policy.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

