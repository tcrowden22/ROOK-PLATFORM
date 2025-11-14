import { ExternalLink } from 'lucide-react';
import type { Application } from '../../sdk/types';

interface AppLauncherProps {
  applications: Application[];
}

export function AppLauncher({ applications }: AppLauncherProps) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>No applications available</p>
      </div>
    );
  }

  const handleLaunch = (app: Application) => {
    window.open(app.redirect_url, '_blank');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {applications.map((app) => (
        <div
          key={app.id}
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-slate-200"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
              {app.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 truncate">{app.name}</h3>
              {app.description && (
                <p className="text-xs text-slate-500 truncate">{app.description}</p>
              )}
            </div>
          </div>

          {app.redirect_url && (
            <button
              onClick={() => handleLaunch(app)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <ExternalLink size={16} />
              <span>Launch</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

