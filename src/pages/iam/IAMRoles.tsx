import { useEffect, useState } from 'react';
import { Role } from '../../lib/types';
import { api } from '../../lib/api';

export function IAMRoles() {
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const rolesData = await api.roles.list();
      setRoles(rolesData);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-200">Roles</h1>
        <p className="text-sm text-slate-400 mt-1">Manage user roles and permissions</p>
      </div>

      <div className="glass-table p-6">
        <div className="space-y-4">
          {roles.map((role) => (
            <div key={role.id} className="p-4 border rounded-lg">
              <h3 className="font-semibold text-slate-200">{role.name}</h3>
              <p className="text-sm text-slate-400 mt-1">{role.description}</p>
              {role.permissions && role.permissions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {role.permissions.map((perm, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">{perm}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
