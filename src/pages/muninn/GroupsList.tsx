import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { muninn } from '../../sdk';
import type { Group } from '../../sdk/types';

interface GroupsListProps {
  onNavigate?: (page: string, data?: any) => void;
}

export function GroupsList({ onNavigate }: GroupsListProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    filterGroups();
  }, [groups, searchTerm]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await muninn.groups.list();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterGroups = () => {
    let filtered = groups;

    if (searchTerm) {
      filtered = filtered.filter(
        (g) =>
          g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (g.description && g.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredGroups(filtered);
  };

  const handleGroupClick = (group: Group) => {
    if (onNavigate) {
      onNavigate('group-detail', group.id);
    } else {
      window.history.pushState({}, '', `/groups/${group.id}`);
      window.location.reload();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading groups...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">Groups</h1>
          <p className="text-sm text-slate-400 mt-1">Manage user groups and permissions</p>
        </div>
      </div>

      <div className="glass-table">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-200 placeholder-slate-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-800/30">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              onClick={() => handleGroupClick(group)}
              className="p-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-200">{group.name}</h3>
                  {group.description && (
                    <p className="text-sm text-slate-400 mt-1">{group.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">
                    {group.member_count || 0} {group.member_count === 1 ? 'member' : 'members'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredGroups.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            <p>No groups found</p>
          </div>
        )}
      </div>
    </div>
  );
}

