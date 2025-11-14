import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { muninn } from '@/sdk';

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  status: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  availableOrganizations: Organization[];
  setCurrentOrganization: (org: Organization | null) => void;
  isLoading: boolean;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const ORGANIZATION_STORAGE_KEY = 'rook_current_organization_id';

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's available organizations
  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      console.log('[OrganizationContext] Fetching organizations...');
      const orgs = await muninn.organizations.list();
      console.log('[OrganizationContext] Organizations fetched:', orgs);
      setAvailableOrganizations(orgs);

      // Restore selected organization from localStorage
      const savedOrgId = localStorage.getItem(ORGANIZATION_STORAGE_KEY);
      if (savedOrgId && orgs.length > 0) {
        const savedOrg = orgs.find(o => o.id === savedOrgId);
        if (savedOrg) {
          console.log('[OrganizationContext] Restoring saved organization:', savedOrg.name);
          setCurrentOrganizationState(savedOrg);
          localStorage.setItem(ORGANIZATION_STORAGE_KEY, savedOrg.id);
          return;
        }
      }

      // If no saved org, use default (first one or marked as default)
      if (orgs.length > 0) {
        console.log('[OrganizationContext] Setting default organization:', orgs[0].name);
        setCurrentOrganizationState(orgs[0]);
        localStorage.setItem(ORGANIZATION_STORAGE_KEY, orgs[0].id);
      } else {
        // No organizations - clear selection
        console.warn('[OrganizationContext] No organizations found for user');
        setCurrentOrganizationState(null);
        localStorage.removeItem(ORGANIZATION_STORAGE_KEY);
      }
    } catch (error: any) {
      console.error('[OrganizationContext] Failed to fetch organizations:', error);
      console.error('[OrganizationContext] Error details:', {
        status: error.status,
        message: error.message,
        stack: error.stack,
      });
      // Don't fail completely - just log and continue
      setAvailableOrganizations([]);
      setCurrentOrganizationState(null);
      // If it's a 401/403, might be auth issue, but don't clear everything
      if (error.status === 401 || error.status === 403) {
        console.warn('[OrganizationContext] Authentication issue when fetching organizations');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Set current organization and persist to localStorage
  const setCurrentOrganization = (org: Organization | null) => {
    setCurrentOrganizationState(org);
    if (org) {
      localStorage.setItem(ORGANIZATION_STORAGE_KEY, org.id);
    } else {
      localStorage.removeItem(ORGANIZATION_STORAGE_KEY);
    }
  };

  // Refresh organizations list
  const refreshOrganizations = async () => {
    await fetchOrganizations();
  };

  // Fetch organizations on mount
  useEffect(() => {
    fetchOrganizations();
  }, []);

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        availableOrganizations,
        setCurrentOrganization,
        isLoading,
        refreshOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

