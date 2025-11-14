import type { SyncSource } from '../../sdk/types';

interface SyncSourceBadgeProps {
  source?: SyncSource;
}

export function SyncSourceBadge({ source }: SyncSourceBadgeProps) {
  if (!source) {
    return null;
  }

  const styles = {
    idp: 'bg-blue-100 text-blue-700 border-blue-200',
    local: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const labels = {
    idp: 'From IdP',
    local: 'Local override',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium border ${styles[source]}`}>
      {labels[source]}
    </span>
  );
}

