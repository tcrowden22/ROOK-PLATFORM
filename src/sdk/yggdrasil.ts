/**
 * Yggdrasil (Workflows) API Client
 */
import { get, post } from './client.js';

export const yggdrasil = {
  workflows: {
    list: (): Promise<any[]> => get('/api/yggdrasil/workflows'),
    get: (id: string): Promise<any> => get(`/api/yggdrasil/workflows/${id}`),
    create: (data: any): Promise<any> => post('/api/yggdrasil/workflows', data),
  },

  triggers: {
    list: (workflowId: string): Promise<any[]> => 
      get(`/api/yggdrasil/workflows/${workflowId}/triggers`),
  },

  integrations: {
    list: (): Promise<any[]> => get('/api/yggdrasil/integrations'),
  },

  logs: {
    list: (workflowId: string): Promise<any[]> => 
      get(`/api/yggdrasil/workflows/${workflowId}/logs`),
  },
};

