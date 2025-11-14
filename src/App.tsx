import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { OdinOverview } from './pages/odin/OdinOverview';
import { Users } from './pages/Users';
import { Tickets } from './pages/Tickets';
import { TicketDetail } from './pages/TicketDetail';
import { EnhancedTicketDetail } from './pages/EnhancedTicketDetail';
import { Incidents } from './pages/Incidents';
import { IncidentDetail } from './pages/IncidentDetail';
import { ServiceRequests } from './pages/ServiceRequests';
import { RequestDetail } from './pages/RequestDetail';
import { Problems } from './pages/Problems';
import { ProblemDetail } from './pages/ProblemDetail';
import { Changes } from './pages/Changes';
import { ChangeDetail } from './pages/ChangeDetail';
import { Catalog } from './pages/Catalog';
import { Devices } from './pages/huginn/Devices';
import { DeviceDetail } from './pages/huginn/DeviceDetail';
import { Applications } from './pages/Applications';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { Profile } from './pages/Profile';
import { IAMOverview } from './pages/iam/IAMOverview';
import { IAMDirectory } from './pages/iam/IAMDirectory';
import { IAMGroups } from './pages/iam/IAMGroups';
import { IAMRoles } from './pages/iam/IAMRoles';
import { IAMApps } from './pages/iam/IAMApps';
import { IAMPolicies } from './pages/iam/IAMPolicies';
import { IAMAudit } from './pages/iam/IAMAudit';
import { IAMSettings } from './pages/iam/IAMSettings';
import { UsersList } from './pages/muninn/UsersList';
import { UserDetail } from './pages/muninn/UserDetail';
import { GroupsList } from './pages/muninn/GroupsList';
import { GroupDetail } from './pages/muninn/GroupDetail';
import { ITSMOverview } from './pages/itsm/ITSMOverview';
import { Workflows } from './pages/yggdrasil/Workflows';
import { Triggers } from './pages/yggdrasil/Triggers';
import { Integrations } from './pages/yggdrasil/Integrations';
import { Logs } from './pages/yggdrasil/Logs';
import { YggdrasilOverview } from './pages/yggdrasil/YggdrasilOverview';
import { HuginnOverview } from './pages/huginn/HuginnOverview';
import { Overview as SkuldOverview } from './pages/skuld/Overview';
import { Assets } from './pages/skuld/Assets';
import { AssetDetail } from './pages/skuld/AssetDetail';
import { Models } from './pages/skuld/Models';
import { Vendors } from './pages/skuld/Vendors';
import { Locations } from './pages/skuld/Locations';
import { Assignments } from './pages/skuld/Assignments';
import { Imports } from './pages/skuld/Imports';
import { ImportWizard } from './pages/skuld/ImportWizard';
import { Integrations as SkuldIntegrations } from './pages/skuld/Integrations';
import { Settings as SkuldSettings } from './pages/skuld/Settings';
import { auth } from './lib/auth';
import { jobs } from './lib/jobs';
import { OrganizationProvider, useOrganization } from './contexts/OrganizationContext';
// Keycloak JS client not needed - authentication handled server-side via API
// import { initKeycloak, onKeycloakTokenExpired, refreshKeycloakToken } from './lib/keycloak';

type Page =
  | 'login'
  | 'odin-overview'
  | 'command-center'
  | 'dashboard'
  | 'users'
  | 'user-detail'
  | 'groups'
  | 'group-detail'
  | 'iam-overview'
  | 'iam-directory'
  | 'iam-groups'
  | 'iam-roles'
  | 'iam-apps'
  | 'iam-policies'
  | 'iam-audit'
  | 'iam-settings'
  | 'itsm-overview'
  | 'tickets'
  | 'ticket-detail'
  | 'incidents'
  | 'incident-detail'
  | 'requests'
  | 'service-requests'
  | 'request-detail'
  | 'problems'
  | 'problem-detail'
  | 'changes'
  | 'change-detail'
  | 'catalog'
  | 'devices'
  | 'device-detail'
  | 'apps'
  | 'kb'
  | 'profile'
  | 'huginn-overview'
  | 'yggdrasil-overview'
  | 'yggdrasil-workflows'
  | 'yggdrasil-triggers'
  | 'yggdrasil-integrations'
  | 'yggdrasil-logs'
  | 'skuld-overview'
  | 'skuld-assets'
  | 'skuld-asset-detail'
  | 'skuld-models'
  | 'skuld-vendors'
  | 'skuld-locations'
  | 'skuld-assignments'
  | 'skuld-imports'
  | 'skuld-import-wizard'
  | 'skuld-integrations'
  | 'skuld-settings';

// URL-based routing helper
function parseUrl(): { page: Page; data?: any } {
  const path = window.location.pathname;
  
  // Match /users/:id
  const userMatch = path.match(/^\/users\/([^/]+)$/);
  if (userMatch) {
    return { page: 'user-detail', data: userMatch[1] };
  }
  
  // Match /groups/:id
  const groupMatch = path.match(/^\/groups\/([^/]+)$/);
  if (groupMatch) {
    return { page: 'group-detail', data: groupMatch[1] };
  }

  // Match /tickets/:id
  const ticketMatch = path.match(/^\/tickets\/([^/]+)$/);
  if (ticketMatch) {
    return { page: 'ticket-detail', data: ticketMatch[1] };
  }

  // Match /incidents/:id
  const incidentMatch = path.match(/^\/incidents\/([^/]+)$/);
  if (incidentMatch) {
    return { page: 'incident-detail', data: incidentMatch[1] };
  }

  // Match /requests/:id
  const requestMatch = path.match(/^\/requests\/([^/]+)$/);
  if (requestMatch) {
    return { page: 'request-detail', data: requestMatch[1] };
  }

  // Match /problems/:id
  const problemMatch = path.match(/^\/problems\/([^/]+)$/);
  if (problemMatch) {
    return { page: 'problem-detail', data: problemMatch[1] };
  }

  // Match /changes/:id
  const changeMatch = path.match(/^\/changes\/([^/]+)$/);
  if (changeMatch) {
    return { page: 'change-detail', data: changeMatch[1] };
  }

  // Match /assets/:id
  const assetMatch = path.match(/^\/assets\/([^/]+)$/);
  if (assetMatch) {
    return { page: 'skuld-asset-detail', data: assetMatch[1] };
  }
  
  // Match exact routes
  if (path === '/users') return { page: 'users' };
  if (path === '/groups') return { page: 'groups' };
  if (path === '/' || path === '/odin' || path === '/odin/overview') return { page: 'odin-overview' };
  if (path === '/command-center') return { page: 'command-center' };
  if (path === '/dashboard') return { page: 'command-center' };
  if (path === '/tickets') return { page: 'tickets' };
  if (path === '/incidents') return { page: 'incidents' };
  if (path === '/requests' || path === '/service-requests') return { page: 'service-requests' };
  if (path === '/problems') return { page: 'problems' };
  if (path === '/changes') return { page: 'changes' };
  if (path === '/catalog') return { page: 'catalog' };
  if (path === '/') return { page: 'odin-overview' };
  if (path === '/assets') return { page: 'skuld-assets' };
  if (path === '/assets/import') return { page: 'skuld-import-wizard' };
  if (path === '/models') return { page: 'skuld-models' };
  if (path === '/vendors') return { page: 'skuld-vendors' };
  
  // Default to dashboard if authenticated, otherwise login handled by auth check
  return { page: 'odin-overview' };
}

function updateUrl(page: Page, data?: any) {
  let path = '/';
  
  if (page === 'users') path = '/users';
  else if (page === 'user-detail' && data) path = `/users/${data}`;
  else if (page === 'groups') path = '/groups';
  else if (page === 'group-detail' && data) path = `/groups/${data}`;
  else if (page === 'odin-overview') path = '/odin';
  else if (page === 'command-center') path = '/command-center';
  else if (page === 'dashboard') path = '/command-center';
  else if (page === 'tickets') path = '/tickets';
  else if (page === 'ticket-detail' && data) path = `/tickets/${data}`;
  else if (page === 'incidents') path = '/incidents';
  else if (page === 'incident-detail' && data) path = `/incidents/${data}`;
  else if (page === 'requests' || page === 'service-requests') path = '/requests';
  else if (page === 'request-detail' && data) path = `/requests/${data}`;
  else if (page === 'problems') path = '/problems';
  else if (page === 'problem-detail' && data) path = `/problems/${data}`;
  else if (page === 'changes') path = '/changes';
  else if (page === 'change-detail' && data) path = `/changes/${data}`;
  else if (page === 'catalog') path = '/catalog';
  else if (page === 'skuld-assets') path = '/assets';
  else if (page === 'skuld-asset-detail' && data) path = `/assets/${data}`;
  else if (page === 'skuld-import-wizard') path = '/assets/import';
  else if (page === 'skuld-models') path = '/models';
  else if (page === 'skuld-vendors') path = '/vendors';
  
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pageData, setPageData] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Check if user is already authenticated (from localStorage)
      // Keycloak authentication is handled server-side via API, no redirect needed
      const KEYCLOAK_ENABLED = import.meta.env.VITE_KEYCLOAK_URL !== undefined;
      
      try {
        if (KEYCLOAK_ENABLED) {
          // Keycloak is enabled, but we use direct login via API (no redirect)
          // Just check if we have a valid session token
          const valid = await auth.validateSession();
          if (valid) {
            setIsAuthenticated(true);
            const { page, data } = parseUrl();
            setCurrentPage(page);
            setPageData(data || null);
            updateUrl(page, data);
            jobs.startAll();
          } else {
            setIsAuthenticated(false);
            setCurrentPage('login');
          }
        } else {
          // Demo mode: check existing auth
          if (auth.isAuthenticated()) {
            const valid = await auth.validateSession();
            if (valid) {
              setIsAuthenticated(true);
              const { page, data } = parseUrl();
              setCurrentPage(page);
              setPageData(data || null);
              updateUrl(page, data);
              jobs.startAll();
            } else {
              setIsAuthenticated(false);
              setCurrentPage('login');
            }
          } else {
            // No auth token, show login immediately
            setIsAuthenticated(false);
            setCurrentPage('login');
          }
        }
      } catch (error) {
        // If validation fails, show login page
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setCurrentPage('login');
      }
    };

    checkAuth();

    // Handle browser back/forward
    // Note: We check authentication state at the time of the event, not from closure
    const handlePopState = () => {
      // Check if user is authenticated by validating the session synchronously
      // or by checking if we're not on the login page
      if (auth.isAuthenticated()) {
        const { page, data } = parseUrl();
        setCurrentPage(page);
        setPageData(data || null);
      }
    };
    
    window.addEventListener('popstate', handlePopState);

    return () => {
      jobs.stopAll();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []); // Empty dependency array - only run once on mount

  const handleNavigate = (page: Page, data?: any) => {
    setCurrentPage(page);
    setPageData(data || null);
    updateUrl(page, data);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentPage('odin-overview');
    updateUrl('odin-overview');
    jobs.startAll();
  };

  const handleLogout = async () => {
    try {
      await auth.logout();
      setIsAuthenticated(false);
      setCurrentPage('login');
      jobs.stopAll();
    } catch (error) {
      console.error('Logout error:', error);
      // Still reset state even if logout fails
      setIsAuthenticated(false);
      setCurrentPage('login');
      jobs.stopAll();
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'odin-overview':
        return <OdinOverview onNavigate={handleNavigate} />;
      case 'command-center':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'users':
        return <UsersList onNavigate={handleNavigate} />;
      case 'user-detail':
        return <UserDetail userId={pageData} onNavigate={handleNavigate} />;
      case 'groups':
        return <GroupsList onNavigate={handleNavigate} />;
      case 'group-detail':
        return <GroupDetail groupId={pageData} onNavigate={handleNavigate} />;
      case 'iam-overview':
        return <IAMOverview />;
      case 'iam-directory':
        return <IAMDirectory />;
      case 'iam-groups':
        return <IAMGroups />;
      case 'iam-roles':
        return <IAMRoles />;
      case 'iam-apps':
        return <IAMApps />;
      case 'iam-policies':
        return <IAMPolicies />;
      case 'iam-audit':
        return <IAMAudit />;
      case 'iam-settings':
        return <IAMSettings />;
      case 'itsm-overview':
        return <ITSMOverview />;
      case 'tickets':
        return <Tickets initialFilters={pageData} onNavigate={handleNavigate} />;
      case 'ticket-detail':
        return <TicketDetail ticketId={pageData} onNavigate={handleNavigate} />;
      case 'incidents':
        return <Incidents initialFilters={pageData} onNavigate={handleNavigate} />;
      case 'incident-detail':
        return <IncidentDetail incidentId={pageData} onNavigate={handleNavigate} />;
      case 'requests':
      case 'service-requests':
        return <ServiceRequests onNavigate={handleNavigate} />;
      case 'request-detail':
        return <RequestDetail requestId={pageData} onNavigate={handleNavigate} />;
      case 'problems':
        return <Problems onNavigate={handleNavigate} />;
      case 'problem-detail':
        return <ProblemDetail problemId={pageData} onNavigate={handleNavigate} />;
      case 'changes':
        return <Changes onNavigate={handleNavigate} />;
      case 'change-detail':
        return <ChangeDetail changeId={pageData} onNavigate={handleNavigate} />;
      case 'catalog':
        return <Catalog onNavigate={handleNavigate} />;
      case 'devices':
        return <Devices onNavigate={handleNavigate} />;
      case 'device-detail':
        return <DeviceDetail deviceId={pageData} onNavigate={handleNavigate} />;
      case 'apps':
        return <Applications />;
      case 'kb':
        return <KnowledgeBase />;
      case 'profile':
        return <Profile onNavigate={handleNavigate} />;
      case 'huginn-overview':
        return <HuginnOverview />;
      case 'yggdrasil-overview':
        return <YggdrasilOverview />;
      case 'yggdrasil-workflows':
        return <Workflows />;
      case 'yggdrasil-triggers':
        return <Triggers />;
      case 'yggdrasil-integrations':
        return <Integrations />;
      case 'yggdrasil-logs':
        return <Logs />;
      case 'skuld-overview':
        return <SkuldOverview />;
      case 'skuld-assets':
        return <Assets onNavigate={handleNavigate} />;
      case 'skuld-asset-detail':
        return <AssetDetail assetId={pageData} onNavigate={handleNavigate} />;
      case 'skuld-models':
        return <Models />;
      case 'skuld-vendors':
        return <Vendors />;
      case 'skuld-locations':
        return <Locations />;
      case 'skuld-assignments':
        return <Assignments />;
      case 'skuld-imports':
        return <Imports onNavigate={handleNavigate} />;
      case 'skuld-import-wizard':
        return <ImportWizard onNavigate={handleNavigate} />;
      case 'skuld-integrations':
        return <SkuldIntegrations />;
      case 'skuld-settings':
        return <SkuldSettings />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <OrganizationProvider>
      <OrganizationGate>
        <Layout currentPage={currentPage} onNavigate={handleNavigate} onLogout={handleLogout}>
          {renderPage()}
        </Layout>
      </OrganizationGate>
    </OrganizationProvider>
  );
}

function OrganizationGate({ children }: { children: React.ReactNode }) {
  const { isLoading, currentOrganization, availableOrganizations } = useOrganization();

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
        <div className="text-sm text-slate-400">Loading organization context…</div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center">
        <h2 className="text-2xl font-semibold text-slate-200">No organization available</h2>
        {availableOrganizations.length === 0 ? (
          <p className="max-w-md text-sm text-slate-400">
            Your account is not assigned to an organization. Please contact an administrator to gain access.
          </p>
        ) : (
          <p className="max-w-md text-sm text-slate-400">
            We were unable to select an organization automatically. Refresh the page or choose one from the selector.
          </p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

export default App;
