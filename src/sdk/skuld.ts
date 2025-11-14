/**
 * Skuld (Assets) API Client
 */
import { get, post, patch } from './client.js';

export const skuld = {
  assets: {
    list: (): Promise<any[]> => get('/api/skuld/assets'),
    get: (id: string): Promise<any> => get(`/api/skuld/assets/${id}`),
    create: (data: any): Promise<any> => post('/api/skuld/assets', data),
    update: (id: string, data: any): Promise<any> => 
      patch(`/api/skuld/assets/${id}`, data),
    changeStatus: (id: string, newStatus: string, reason: string, auditNote: string): Promise<any> =>
      patch(`/api/skuld/assets/${id}/status`, { status: newStatus, reason, audit_note: auditNote }),
    getStats: (): Promise<any> => get('/api/skuld/assets/stats'),
    getWarrantyExpiring: (days?: number): Promise<any[]> => 
      get(`/api/skuld/assets/warranty-expiring${days ? `?days=${days}` : ''}`),
  },

  models: {
    list: (): Promise<any[]> => get('/api/skuld/models'),
    getStats: (id: string): Promise<any> => get(`/api/skuld/models/${id}/stats`),
  },

  vendors: {
    list: (): Promise<any[]> => get('/api/skuld/vendors'),
    getStats: (id: string): Promise<any> => get(`/api/skuld/vendors/${id}/stats`),
  },

  locations: {
    list: (): Promise<any[]> => get('/api/skuld/locations'),
  },

  assignments: {
    list: (): Promise<any[]> => get('/api/skuld/assignments'),
  },

  imports: {
    list: (): Promise<any[]> => get('/api/skuld/imports'),
    preview: (csvData: string): Promise<any> => 
      post('/api/skuld/imports/preview', { csv_data: csvData }),
    execute: (source: string, assets: any[], fieldMapping?: Record<string, string>): Promise<any> =>
      post('/api/skuld/imports', { source, assets, field_mapping: fieldMapping }),
  },
};

