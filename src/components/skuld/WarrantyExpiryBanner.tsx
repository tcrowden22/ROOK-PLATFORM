import { AlertTriangle, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface WarrantyExpiryBannerProps {
  expiringAssets: Array<{
    id: string;
    tag?: string;
    serial?: string;
    warranty_end: string;
    days_remaining: number;
  }>;
  onViewClick?: () => void;
  dismissible?: boolean;
  storageKey?: string;
}

export function WarrantyExpiryBanner({
  expiringAssets,
  onViewClick,
  dismissible = true,
  storageKey = 'warranty-banner-dismissed',
}: WarrantyExpiryBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissible && storageKey) {
      const dismissedValue = localStorage.getItem(storageKey);
      if (dismissedValue === 'true') {
        setDismissed(true);
      }
    }
  }, [dismissible, storageKey]);

  const handleDismiss = () => {
    setDismissed(true);
    if (storageKey) {
      localStorage.setItem(storageKey, 'true');
    }
  };

  if (dismissed || expiringAssets.length === 0) {
    return null;
  }

  const criticalCount = expiringAssets.filter(a => a.days_remaining <= 30 && a.days_remaining >= 0).length;
  const warningCount = expiringAssets.filter(a => a.days_remaining > 30 && a.days_remaining <= 60).length;

  const isCritical = criticalCount > 0;
  const bgColor = isCritical ? 'bg-red-500/20 border-red-500/50' : 'bg-yellow-500/20 border-yellow-500/50';
  const textColor = isCritical ? 'text-red-400' : 'text-yellow-400';
  const iconColor = isCritical ? 'text-red-500' : 'text-yellow-500';

  return (
    <div className={`${bgColor} border rounded-lg p-4 mb-6 flex items-center justify-between animate-slide-in`}>
      <div className="flex items-center gap-3 flex-1">
        <AlertTriangle className={iconColor} size={20} />
        <div className="flex-1">
          <p className={`font-medium ${textColor}`}>
            {criticalCount > 0 && (
              <span className="font-bold">{criticalCount} asset{criticalCount !== 1 ? 's' : ''} </span>
            )}
            {warningCount > 0 && criticalCount === 0 && (
              <span>{warningCount} asset{warningCount !== 1 ? 's' : ''} </span>
            )}
            {criticalCount === 0 && warningCount === 0 && (
              <span>{expiringAssets.length} asset{expiringAssets.length !== 1 ? 's' : ''} </span>
            )}
            with {isCritical ? 'expiring' : 'expiring soon'} warranty
            {isCritical ? ' within 30 days' : warningCount > 0 ? ' within 60 days' : ''}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Review and renew warranties to avoid service interruptions
          </p>
        </div>
        {onViewClick && (
          <button
            onClick={onViewClick}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${textColor} hover:bg-slate-800/50`}
          >
            View All
          </button>
        )}
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="ml-4 p-1 hover:bg-slate-800/50 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} className="text-slate-400" />
        </button>
      )}
    </div>
  );
}

