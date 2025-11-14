import { useState, useEffect } from 'react';
import { Search, UserCheck, Calendar } from 'lucide-react';
import { AssetAssignment } from '../../lib/skuld/types';
import { skuld } from '../../sdk';

export function Assignments() {
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const data = await skuld.assignments.list().catch(() => []);
      setAssignments(data as AssetAssignment[]);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    }
  };

  const filteredAssignments = assignments.filter(a =>
    a.asset?.tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.assignee?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isActive = (assignment: AssetAssignment) => {
    if (assignment.end_date) {
      return new Date(assignment.end_date) > new Date();
    }
    return true;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Asset Assignments</h1>
        <p className="text-slate-400 mt-1">Track asset assignments to users</p>
      </div>

      <div className="glass-table">
        <div className="p-6 border-b border-slate-800/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 input-field"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Assignee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Org Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Start Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">End Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredAssignments.map((assignment) => (
                <tr key={assignment.id} className="table-row cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{assignment.asset?.tag || '-'}</div>
                    <div className="text-xs text-slate-500">{assignment.asset?.model?.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <UserCheck size={16} className="text-blue-400" />
                      <span className="text-slate-200">{assignment.assignee?.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{assignment.assignee_org_unit || '-'}</td>
                  <td className="px-6 py-4 text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      {new Date(assignment.start_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {assignment.end_date ? new Date(assignment.end_date).toLocaleDateString() : 'Ongoing'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`status-badge ${isActive(assignment) ? 'status-active' : 'status-info'}`}>
                      {isActive(assignment) ? 'Active' : 'Ended'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
