/**
 * Huginn (MDM) API Client
 */
import { get, post } from './client.js';
import type {
  Device,
  DeviceListResponse,
  DeviceDetail,
  Telemetry,
  SoftwarePackage,
  DeploymentJob,
  BulkActionRequest,
  BulkActionResponse,
  DeviceActionRequest,
  DeviceActionResponse,
} from './types.js';

export interface DeviceListFilters {
  page?: number;
  limit?: number;
  search?: string;
  platform?: string;
  ownership?: 'corporate' | 'personal' | 'shared';
  status?: 'active' | 'retired';
  compliance?: 'compliant' | 'non-compliant' | 'all';
  tags?: string[];
}

export const huginn = {
  devices: {
    list: async (filters?: DeviceListFilters): Promise<DeviceListResponse> => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.platform) params.append('platform', filters.platform);
      if (filters?.ownership) params.append('ownership', filters.ownership);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.compliance && filters.compliance !== 'all') {
        params.append('compliance', filters.compliance === 'compliant' ? 'true' : 'false');
      }
      if (filters?.tags && filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
      }
      const queryString = params.toString();
      const response = await get<DeviceListResponse>(`/api/huginn/devices${queryString ? `?${queryString}` : ''}`);
      // Handle both paginated response and direct array
      if (Array.isArray(response)) {
        return response;
      }
      // If response has devices property, return it as DeviceListResponse
      if (response && typeof response === 'object' && 'devices' in response) {
        return response as DeviceListResponse;
      }
      return response;
    },
    get: (id: string): Promise<DeviceDetail> => get(`/api/huginn/devices/${id}`),
    getTelemetry: (id: string): Promise<Telemetry[]> => 
      get(`/api/huginn/devices/${id}/telemetry`),
    bulkAction: (request: BulkActionRequest): Promise<BulkActionResponse> =>
      post('/api/huginn/devices/bulk', request),
    executeAction: (id: string, request: DeviceActionRequest): Promise<DeviceActionResponse> =>
      post(`/api/huginn/devices/${id}/actions`, request),
    enroll: (data: {
      hostname: string;
      os: string;
      ownerUserId?: string;
    }): Promise<Device> => post('/api/huginn/devices', data),
  },

  software: {
    list: (): Promise<SoftwarePackage[]> => get('/api/huginn/software'),
  },

  deployments: {
    list: (deviceId: string): Promise<DeploymentJob[]> => 
      get(`/api/huginn/devices/${deviceId}/deployments`),
    create: (deviceId: string, packageId: string): Promise<DeploymentJob> => 
      post('/api/huginn/deployments', { deviceId, packageId }),
  },

  policies: {
    list: (): Promise<DevicePolicy[]> => get('/api/huginn/policies'),
  },
};

