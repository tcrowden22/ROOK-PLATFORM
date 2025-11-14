import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import type { DeviceListFilters } from '../../sdk/huginn';

interface DeviceFiltersProps {
  filters: DeviceListFilters;
  onFiltersChange: (filters: DeviceListFilters) => void;
  availablePlatforms: string[];
  availableTags: string[];
}

export function DeviceFilters({
  filters,
  onFiltersChange,
  availablePlatforms,
  availableTags,
}: DeviceFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Use refs to capture latest values without causing effect re-runs
  const filtersRef = useRef(filters);
  const onFiltersChangeRef = useRef(onFiltersChange);

  // Keep refs in sync with latest values
  useEffect(() => {
    filtersRef.current = filters;
    onFiltersChangeRef.current = onFiltersChange;
  }, [filters, onFiltersChange]);

  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer - use refs to get latest values without dependency
    debounceTimerRef.current = setTimeout(() => {
      onFiltersChangeRef.current({ ...filtersRef.current, search: searchTerm || undefined });
    }, 300);

    // Cleanup function always has access to the latest timer via ref.current
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // Only depend on searchTerm - debounce should only restart when search term changes
  }, [searchTerm]);

  const handleFilterChange = (key: keyof DeviceListFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setSearchTerm('');
    onFiltersChange({
      page: 1,
      limit: filters.limit || 50,
    });
  };

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.platform ||
    filters.ownership ||
    filters.status ||
    filters.compliance ||
    (filters.tags && filters.tags.length > 0)
  );

  return (
    <div className="p-6 border-b border-slate-800/30 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search devices by name, serial, or user..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-200 placeholder-slate-500"
        />
      </div>

      {/* Faceted Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Platform Filter */}
        <select
          value={filters.platform || 'all'}
          onChange={(e) =>
            handleFilterChange('platform', e.target.value === 'all' ? undefined : e.target.value)
          }
          className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-200"
        >
          <option value="all">All Platforms</option>
          {availablePlatforms.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>

        {/* Ownership Filter */}
        <select
          value={filters.ownership || 'all'}
          onChange={(e) =>
            handleFilterChange('ownership', e.target.value === 'all' ? undefined : e.target.value)
          }
          className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-200"
        >
          <option value="all">All Ownership</option>
          <option value="corporate">Corporate</option>
          <option value="personal">Personal</option>
          <option value="shared">Shared</option>
        </select>

        {/* Status Filter */}
        <select
          value={filters.status || 'all'}
          onChange={(e) =>
            handleFilterChange('status', e.target.value === 'all' ? undefined : e.target.value)
          }
          className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-200"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="retired">Retired</option>
        </select>

        {/* Compliance Filter */}
        <select
          value={filters.compliance || 'all'}
          onChange={(e) =>
            handleFilterChange('compliance', e.target.value === 'all' ? undefined : e.target.value)
          }
          className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-200"
        >
          <option value="all">All Compliance</option>
          <option value="compliant">Compliant</option>
          <option value="non-compliant">Non-Compliant</option>
        </select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-200 transition-colors"
          >
            <X size={16} />
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}

