/**
 * Sigurd (ITSM) API Client
 */
import { get, post, patch } from './client.js';
import type { 
  Ticket, 
  Incident, 
  ServiceRequest, 
  Problem, 
  Change, 
  KnowledgeArticle,
  TicketComment,
  Attachment,
  TicketHistory,
  ServiceCatalogItem
} from './types.js';

export type TicketType = 'incidents' | 'service-requests' | 'problems' | 'changes';

export const sigurd = {
  // Tickets (legacy - use incidents/service-requests instead)
  tickets: {
    list: (): Promise<Ticket[]> => get('/api/sigurd/tickets'),
    get: (id: string): Promise<Ticket> => get(`/api/sigurd/tickets/${id}`),
    create: (data: {
      type: 'incident' | 'request';
      priority: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      deviceId?: string;
    }): Promise<Ticket> => post('/api/sigurd/tickets', data),
    update: (id: string, data: Partial<Ticket>): Promise<Ticket> => 
      patch(`/api/sigurd/tickets/${id}`, data),
  },

  // Incidents
  incidents: {
    list: (): Promise<Incident[]> => get('/api/sigurd/incidents'),
    get: (id: string): Promise<Incident> => get(`/api/sigurd/incidents/${id}`),
    create: (data: {
      priority: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      impact?: string;
      urgency?: string;
      deviceId?: string;
      assigneeUserId?: string;
    }): Promise<Incident> => post('/api/sigurd/incidents', data),
    update: (id: string, data: {
      status?: 'new' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
      priority?: 'low' | 'medium' | 'high' | 'critical';
      assigneeUserId?: string | null;
      impact?: string | null;
      urgency?: string | null;
      resolvedAt?: string | null;
    }): Promise<Incident> => patch(`/api/sigurd/incidents/${id}`, data),
  },

  // Service Requests
  serviceRequests: {
    list: (): Promise<ServiceRequest[]> => get('/api/sigurd/service-requests'),
    get: (id: string): Promise<ServiceRequest> => get(`/api/sigurd/service-requests/${id}`),
    create: (data: {
      priority: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      catalogItemId?: string;
      assigneeUserId?: string;
    }): Promise<ServiceRequest> => post('/api/sigurd/service-requests', data),
    update: (id: string, data: {
      status?: 'new' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
      priority?: 'low' | 'medium' | 'high' | 'critical';
      assigneeUserId?: string | null;
      fulfillmentNotes?: string | null;
      completedAt?: string | null;
    }): Promise<ServiceRequest> => patch(`/api/sigurd/service-requests/${id}`, data),
    approve: (id: string): Promise<ServiceRequest> => post(`/api/sigurd/service-requests/${id}/approve`),
  },

  // Problems
  problems: {
    list: (): Promise<Problem[]> => get('/api/sigurd/problems'),
    get: (id: string): Promise<Problem> => get(`/api/sigurd/problems/${id}`),
    create: (data: {
      priority: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      assignedUserId?: string;
      relatedIncidents?: string[];
    }): Promise<Problem> => post('/api/sigurd/problems', data),
    update: (id: string, data: {
      status?: 'new' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
      priority?: 'low' | 'medium' | 'high' | 'critical';
      assignedUserId?: string | null;
      rootCause?: string | null;
      workaround?: string | null;
      resolution?: string | null;
      relatedIncidents?: string[];
    }): Promise<Problem> => patch(`/api/sigurd/problems/${id}`, data),
  },

  // Changes
  changes: {
    list: (): Promise<Change[]> => get('/api/sigurd/changes'),
    get: (id: string): Promise<Change> => get(`/api/sigurd/changes/${id}`),
    create: (data: {
      risk: 'low' | 'medium' | 'high';
      title: string;
      description: string;
      reason: string;
      impactAnalysis?: string;
      rollbackPlan?: string;
      assignedUserId?: string;
      scheduledStart?: string;
      scheduledEnd?: string;
    }): Promise<Change> => post('/api/sigurd/changes', data),
    update: (id: string, data: {
      status?: 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
      risk?: 'low' | 'medium' | 'high';
      assignedUserId?: string | null;
      impactAnalysis?: string | null;
      rollbackPlan?: string | null;
      scheduledStart?: string | null;
      scheduledEnd?: string | null;
      completedAt?: string | null;
    }): Promise<Change> => patch(`/api/sigurd/changes/${id}`, data),
    approve: (id: string): Promise<Change> => post(`/api/sigurd/changes/${id}/approve`),
  },

  // Unified Comments (works for all ticket types)
  comments: {
    list: (ticketType: TicketType, ticketId: string): Promise<TicketComment[]> => 
      get(`/api/sigurd/${ticketType}/${ticketId}/comments`),
    create: (ticketType: TicketType, ticketId: string, data: {
      body: string;
      mentions?: string[];
    }): Promise<TicketComment> => 
      post(`/api/sigurd/${ticketType}/${ticketId}/comments`, data),
  },

  // Unified Attachments (works for all ticket types)
  attachments: {
    list: (ticketType: TicketType, ticketId: string): Promise<Attachment[]> => 
      get(`/api/sigurd/${ticketType}/${ticketId}/attachments`),
    upload: (ticketType: TicketType, ticketId: string, file: {
      file: string; // base64 encoded
      fileName: string;
      mimeType: string;
    }): Promise<Attachment> => 
      post(`/api/sigurd/${ticketType}/${ticketId}/attachments`, file),
    download: async (ticketType: TicketType, ticketId: string, attachmentId: string): Promise<Blob> => {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('keycloak_token') || localStorage.getItem('rook_session_token');
      
      const response = await fetch(`${API_URL}/api/sigurd/${ticketType}/${ticketId}/attachments/${attachmentId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (!response.ok) {
        throw new Error('Failed to download attachment');
      }
      
      return await response.blob();
    },
  },

  // Unified History (works for all ticket types)
  history: {
    list: (ticketType: TicketType, ticketId: string): Promise<TicketHistory[]> => 
      get(`/api/sigurd/${ticketType}/${ticketId}/history`),
  },

  // Catalog
  catalog: {
    list: (): Promise<ServiceCatalogItem[]> => get('/api/sigurd/catalog'),
    get: (id: string): Promise<ServiceCatalogItem> => get(`/api/sigurd/catalog/${id}`),
    request: (id: string, data: {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      formData?: Record<string, any>;
    }): Promise<ServiceRequest> => post(`/api/sigurd/catalog/${id}/request`, data),
  },

  // Knowledge Base
  kb: {
    list: (): Promise<KnowledgeArticle[]> => get('/api/sigurd/kb'),
    get: (id: string): Promise<KnowledgeArticle> => get(`/api/sigurd/kb/${id}`),
    create: (data: Partial<KnowledgeArticle>): Promise<KnowledgeArticle> => 
      post('/api/sigurd/kb', data),
  },
};

