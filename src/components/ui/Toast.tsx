import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastType } from './ToastProvider';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  const Icon = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  }[type];

  const bgColor = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
  }[type];

  const textColor = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-amber-800',
    info: 'text-blue-800',
  }[type];

  const iconColor = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-amber-600',
    info: 'text-blue-600',
  }[type];

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border rounded-lg shadow-lg ${bgColor} ${textColor} min-w-[300px] max-w-[500px] animate-slide-in`}>
      <Icon size={20} className={iconColor} />
      <span className="font-medium flex-1">{message}</span>
      <button
        onClick={onClose}
        className={`ml-2 hover:opacity-70 ${iconColor}`}
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
}

