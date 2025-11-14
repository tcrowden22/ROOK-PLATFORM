import { Package, Wrench, Box } from 'lucide-react';

interface StockCountsWidgetProps {
  readyToDeploy: number;
  inRepair: number;
  spare: number;
  thresholds?: {
    readyToDeploy?: number;
    inRepair?: number;
    spare?: number;
  };
}

export function StockCountsWidget({
  readyToDeploy,
  inRepair,
  spare,
  thresholds = {},
}: StockCountsWidgetProps) {
  const { readyToDeploy: readyThreshold = 10, inRepair: repairThreshold = 5, spare: spareThreshold = 5 } = thresholds;

  const cards = [
    {
      label: 'Ready to Deploy',
      value: readyToDeploy,
      icon: Package,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      threshold: readyThreshold,
      warning: readyToDeploy < readyThreshold,
    },
    {
      label: 'In Repair',
      value: inRepair,
      icon: Wrench,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      threshold: repairThreshold,
      warning: inRepair > repairThreshold,
    },
    {
      label: 'Spare',
      value: spare,
      icon: Box,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      threshold: spareThreshold,
      warning: spare < spareThreshold,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`
              ${card.bgColor} ${card.borderColor}
              border rounded-lg p-4
              ${card.warning ? 'ring-2 ring-yellow-500/50' : ''}
            `}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                {card.warning && (
                  <p className="text-xs text-yellow-400 mt-1">
                    {card.label === 'Ready to Deploy' || card.label === 'Spare'
                      ? `Below threshold (${card.threshold})`
                      : `Above threshold (${card.threshold})`}
                  </p>
                )}
              </div>
              <Icon className={`${card.color} opacity-50`} size={32} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

