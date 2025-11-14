import React from 'react';
import { Building2 } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';

export function OrganizationSelector() {
  const { currentOrganization, availableOrganizations, setCurrentOrganization, isLoading } = useOrganization();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400">
        <Building2 size={16} />
        <span>Loading...</span>
      </div>
    );
  }

  // Show current organization even if only one
  if (!currentOrganization) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-amber-400">
        <Building2 size={16} />
        <span>No organization</span>
      </div>
    );
  }

  // If only one organization, just show it as a badge
  if (availableOrganizations.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <Building2 size={16} className="text-violet-400" />
        <span className="text-sm text-slate-200 font-medium">{currentOrganization.name}</span>
      </div>
    );
  }

  // Multiple organizations - show dropdown
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOrg = availableOrganizations.find(o => o.id === e.target.value);
    if (selectedOrg) {
      setCurrentOrganization(selectedOrg);
      // Reload page to refresh data with new organization context
      window.location.reload();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Building2 size={16} className="text-violet-400" />
      <select
        id="organization-select"
        value={currentOrganization?.id || ''}
        onChange={handleChange}
        className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
      >
        {availableOrganizations.map(org => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  );
}

