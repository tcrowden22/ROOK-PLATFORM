import { ReactNode, useState } from 'react';
import { LayoutDashboard, Users, Ticket, Monitor, Grid3x3, BookOpen, LogOut, ChevronRight, Menu, X, Building2, Shield, HeadphonesIcon, Laptop, AlertCircle, RefreshCw, UserCircle, UsersIcon, KeyRound, FileText, ClipboardList, Settings, Activity, Zap, Network, Workflow, Radio, Plug, ScrollText, Package, Box, Boxes, MapPin, UserCheck, Upload, Layers } from 'lucide-react';
import { auth } from '../lib/auth';
import { OrganizationSelector } from './OrganizationSelector';

interface LayoutProps { 
  children: ReactNode; 
  currentPage: string; 
  onNavigate: (page: string, data?: any) => void;
  onLogout?: () => void;
}

export function Layout({ children, currentPage, onNavigate, onLogout }: LayoutProps) {
  const [expandedService, setExpandedService] = useState<string | null>('command-center');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const user = auth.getCurrentUser();

  const services = [
    { id: 'command-center', name: 'Command Center', description: 'Unified Operations', icon: Activity, color: 'text-cyan-400', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
    { id: 'odin', name: 'Odin', description: 'SSO & Dashboard', icon: Building2, color: 'text-blue-400', items: [
      { id: 'odin-overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'apps', label: 'Applications', icon: Grid3x3 },
    ] },
    { id: 'muninn', name: 'Muninn', description: 'IAM', icon: Shield, color: 'text-violet-400', items: [{ id: 'iam-overview', label: 'Overview', icon: LayoutDashboard }, { id: 'iam-directory', label: 'Directory', icon: UserCircle }, { id: 'iam-groups', label: 'Groups', icon: UsersIcon }, { id: 'iam-roles', label: 'Roles', icon: KeyRound }, { id: 'iam-apps', label: 'Apps (SSO)', icon: Grid3x3 }, { id: 'iam-policies', label: 'Policies', icon: FileText }, { id: 'iam-audit', label: 'Audit', icon: ClipboardList }, { id: 'iam-settings', label: 'Settings', icon: Settings }] },
    { id: 'sigurd', name: 'Sigurd', description: 'ITSM', icon: HeadphonesIcon, color: 'text-amber-400', items: [{ id: 'itsm-overview', label: 'Overview', icon: LayoutDashboard }, { id: 'incidents', label: 'Incidents', icon: Ticket }, { id: 'service-requests', label: 'Service Requests', icon: Grid3x3 }, { id: 'problems', label: 'Problems', icon: AlertCircle }, { id: 'changes', label: 'Changes', icon: RefreshCw }, { id: 'kb', label: 'Knowledge Base', icon: BookOpen }] },
    { id: 'skuld', name: 'Skuld', description: 'Asset Mgmt', icon: Package, color: 'text-rose-400', items: [{ id: 'skuld-overview', label: 'Overview', icon: LayoutDashboard }, { id: 'skuld-assets', label: 'Assets', icon: Box }, { id: 'skuld-models', label: 'Models', icon: Boxes }, { id: 'skuld-vendors', label: 'Vendors', icon: Users }, { id: 'skuld-locations', label: 'Locations', icon: MapPin }, { id: 'skuld-assignments', label: 'Assignments', icon: UserCheck }, { id: 'skuld-imports', label: 'Imports', icon: Upload }, { id: 'skuld-integrations', label: 'Integrations', icon: Layers }, { id: 'skuld-settings', label: 'Settings', icon: Settings }] },
    { id: 'huginn', name: 'Huginn', description: 'MDM/RMM', icon: Laptop, color: 'text-emerald-400', items: [{ id: 'huginn-overview', label: 'Overview', icon: LayoutDashboard }, { id: 'devices', label: 'Devices', icon: Monitor }] },
    { id: 'yggdrasil', name: 'Yggdrasil', description: 'Automation', icon: Network, color: 'text-cyan-400', items: [{ id: 'yggdrasil-overview', label: 'Overview', icon: LayoutDashboard }, { id: 'yggdrasil-workflows', label: 'Workflows', icon: Workflow }, { id: 'yggdrasil-triggers', label: 'Triggers', icon: Radio }, { id: 'yggdrasil-integrations', label: 'Integrations', icon: Plug }, { id: 'yggdrasil-logs', label: 'Logs', icon: ScrollText }] },
  ];

  return (
    <div className="min-h-screen cyber-grid" style={{ background: 'linear-gradient(135deg, #0b0f17 0%, #111827 50%, #0b0f17 100%)' }}>
      <div className="flex">
        <aside className={`min-h-screen backdrop-blur-xl border-r border-slate-800/50 transition-all duration-300 relative ${isCollapsed ? 'w-20' : 'w-72'}`} style={{ background: 'rgba(11, 15, 23, 0.95)' }}>
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
          
          <div className="flex items-center justify-between p-6 border-b border-slate-800/50 relative z-10">
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <div className="relative"><Zap className="text-blue-400 animate-pulse-glow" size={32} /><div className="absolute inset-0 bg-blue-400/20 blur-xl" /></div>
                <div><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Rook</h1><p className="text-slate-500 text-xs font-medium tracking-wider">IT OPERATIONS</p></div>
              </div>
            )}
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 hover:bg-slate-800/50 rounded-lg transition-all">{isCollapsed ? <Menu size={20} className="text-blue-400" /> : <X size={20} className="text-blue-400" />}</button>
          </div>

          <nav className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-180px)] scrollbar-thin relative z-10">
            {services.map((service) => (
              <div key={service.id} className="space-y-1">
                <button onClick={() => setExpandedService(expandedService === service.id ? null : service.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 rounded-lg transition-all group">
                  <div className="flex items-center gap-3"><service.icon className={`${service.color} group-hover:scale-110 transition-transform`} size={20} />
                    {!isCollapsed && <div className="text-left"><div className="text-sm font-semibold text-slate-200">{service.name}</div><div className="text-xs text-slate-500">{service.description}</div></div>}
                  </div>
                  {!isCollapsed && <div className={`transition-transform ${expandedService === service.id ? 'rotate-90' : ''}`}><ChevronRight size={16} className="text-slate-500" /></div>}
                </button>
                {expandedService === service.id && !isCollapsed && (
                  <div className="ml-4 space-y-1 border-l-2 border-slate-800/50 pl-2">
                    {service.items.map((item) => (<button key={item.id} onClick={() => onNavigate(item.id)} className={`sidebar-item w-full text-left ${currentPage === item.id ? 'active' : ''}`}><item.icon size={16} className={currentPage === item.id ? 'text-blue-400' : 'text-slate-400'} /><span className={`text-sm ${currentPage === item.id ? 'text-blue-400 font-medium' : 'text-slate-300'}`}>{item.label}</span></button>))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800/50 backdrop-blur-xl z-10" style={{ background: 'rgba(11, 15, 23, 0.95)' }}>
            <button onClick={() => onNavigate('profile')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 rounded-lg transition-all mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold ring-2 ring-blue-500/50">{user?.name.charAt(0).toUpperCase()}</div>
              {!isCollapsed && <div className="flex-1 text-left"><div className="text-sm font-medium text-slate-200">{user?.name}</div><div className="text-xs text-slate-500 capitalize">{user?.role}</div></div>}
            </button>
            {!isCollapsed && (
              <button
                onClick={async () => {
                  try {
                    await auth.logout();
                    // Call onLogout if provided (for App state management)
                    if (onLogout) {
                      onLogout();
                    } else {
                      // Fallback: just navigate to login
                      onNavigate('login');
                    }
                  } catch (error) {
                    console.error('Logout error:', error);
                    // Still navigate to login even if logout fails
                    if (onLogout) {
                      onLogout();
                    } else {
                      onNavigate('login');
                    }
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <LogOut size={16} />
                <span className="text-sm">Sign Out</span>
              </button>
            )}
          </div>
        </aside>

        <main className="flex-1 min-h-screen">
          <div className="glass-panel m-6 mb-0 p-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><Activity size={16} className="text-green-400 animate-pulse" /><span className="text-sm text-slate-400">System: <span className="text-green-400 font-medium">Operational</span></span></div>
              <div className="cyber-line w-px h-6" />
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Uptime: <span className="text-blue-400 font-medium">99.98%</span></span>
                <span>Active Incidents: <span className="text-amber-400 font-medium">3</span></span>
                <span>Devices: <span className="text-emerald-400 font-medium">247</span></span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <OrganizationSelector />
              <div className="live-indicator"><span className="text-xs text-slate-400">Live</span></div>
            </div>
          </div>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
