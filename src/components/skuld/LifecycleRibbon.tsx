import { AssetStatus } from '../../lib/skuld/types';

interface LifecycleRibbonProps {
  currentStatus: AssetStatus;
  onStatusClick?: () => void;
  className?: string;
}

// Map statuses to lifecycle stages
const getLifecycleStage = (status: AssetStatus): 'procured' | 'in_transit' | 'in_service' | 'retired' => {
  if (['requested', 'ordered', 'received', 'in_stock'].includes(status)) {
    return 'procured';
  }
  if (['assigned', 'in_use'].includes(status)) {
    return 'in_service';
  }
  if (['retired', 'disposed'].includes(status)) {
    return 'retired';
  }
  return 'in_transit'; // in_repair, lost
};

export function LifecycleRibbon({ currentStatus, onStatusClick, className = '' }: LifecycleRibbonProps) {
  const currentStage = getLifecycleStage(currentStatus);
  
  const stages = [
    { id: 'procured', label: 'Procured', statuses: ['requested', 'ordered', 'received', 'in_stock'] },
    { id: 'in_transit', label: 'In Transit', statuses: [] },
    { id: 'in_service', label: 'In Service', statuses: ['assigned', 'in_use'] },
    { id: 'retired', label: 'Retired', statuses: ['retired', 'disposed'] },
  ];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {stages.map((stage, index) => {
        const isActive = stage.id === currentStage;
        const isCompleted = stages.findIndex(s => s.id === currentStage) > index;
        const isClickable = onStatusClick && isActive;

        return (
          <div key={stage.id} className="flex items-center">
            <div
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${isActive 
                  ? 'bg-blue-500 text-white shadow-lg scale-105' 
                  : isCompleted 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }
                ${isClickable ? 'cursor-pointer hover:bg-blue-600' : ''}
              `}
              onClick={isClickable ? onStatusClick : undefined}
              title={isActive ? `Current status: ${currentStatus}` : ''}
            >
              {stage.label}
            </div>
            {index < stages.length - 1 && (
              <div className={`
                w-8 h-0.5 mx-1
                ${isCompleted ? 'bg-green-500' : 'bg-slate-700'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
}

