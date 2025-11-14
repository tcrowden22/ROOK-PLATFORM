// Supabase removed - using SDK instead
import {
  User,
  Group,
  Role,
  Ticket,
  Comment,
  KnowledgeArticle,
  ServiceCatalogItem,
  Device,
  Telemetry,
  SoftwarePackage,
  DeploymentJob,
  Application,
  DashboardMetrics,
} from './types';

export const api = {
  async getMetrics(): Promise<DashboardMetrics> {
    try {
      // Use SDK instead of Supabase
      const { sigurd, huginn, muninn } = await import('../sdk');

      const [incidents, serviceRequests, devicesResponse, users] = await Promise.all([
        sigurd.incidents.list().catch(() => []),
        sigurd.serviceRequests.list().catch(() => []),
        huginn.devices.list().catch(() => ({devices: [], pagination: {total: 0, page: 1, limit: 50, totalPages: 0}})),
        muninn.users.list().catch(() => []),
      ]);

      // Extract devices array from response (handles both array and paginated response)
      const devices = Array.isArray(devicesResponse) ? devicesResponse : (devicesResponse.devices || []);

      const openStatuses = new Set(['new', 'in_progress', 'waiting']);
      const closedStatuses = new Set(['resolved', 'closed']);
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      let ticketsResolvedToday = 0;
      const resolutionDurations: number[] = [];

      const incidentsOpen = incidents.filter(i => openStatuses.has(i.status)).length;
      const serviceRequestsOpen = serviceRequests.filter(r => openStatuses.has(r.status)).length;

      incidents.forEach((incident) => {
        if (incident.resolved_at) {
          const resolvedAt = Date.parse(incident.resolved_at);
          const createdAt = Date.parse(incident.created_at);
          if (!Number.isNaN(resolvedAt) && !Number.isNaN(createdAt) && resolvedAt >= createdAt) {
            resolutionDurations.push(resolvedAt - createdAt);
            if (resolvedAt >= dayAgo) {
              ticketsResolvedToday += 1;
            }
          }
        }
      });

      serviceRequests.forEach((request) => {
        const completedAtString = request.completed_at || request.updated_at;
        if (completedAtString) {
          const completedAt = Date.parse(completedAtString);
          const createdAt = Date.parse(request.created_at);
          if (!Number.isNaN(completedAt) && !Number.isNaN(createdAt) && completedAt >= createdAt) {
            if (request.completed_at && completedAt >= dayAgo) {
              ticketsResolvedToday += 1;
            }
            if (request.completed_at) {
              resolutionDurations.push(completedAt - createdAt);
            }
          }
        }
      });

      const avgResolutionMinutes =
        resolutionDurations.length > 0
          ? Math.round((resolutionDurations.reduce((sum, value) => sum + value, 0) / resolutionDurations.length) / 60000)
          : null;

      const recentActivity = [
        ...incidents.map((incident) => ({
          id: incident.id,
          type: 'incident' as const,
          title: incident.title,
          status: incident.status,
          description: `Incident · ${incident.priority.toUpperCase()}`,
          timestamp: incident.updated_at || incident.created_at,
        })),
        ...serviceRequests.map((request) => ({
          id: request.id,
          type: 'service-request' as const,
          title: request.title,
          status: request.status,
          description: `Service Request · ${request.priority.toUpperCase()}`,
          timestamp: request.updated_at || request.created_at,
        })),
      ]
        .filter(item => !!item.timestamp)
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
        .slice(0, 8);

      const ticketsTotal = incidents.length + serviceRequests.length;
      const ticketsOpen = incidentsOpen + serviceRequestsOpen;
      const ticketsClosed =
        incidents.filter(i => closedStatuses.has(i.status)).length +
        serviceRequests.filter(r => closedStatuses.has(r.status)).length;

      return {
        usersTotal: users.length,
        usersActive: users.filter(user => user.status === 'active').length,
        usersLocked: users.filter(user => user.status === 'locked').length,
        ticketsTotal,
        ticketsOpen,
        ticketsClosed,
        ticketsResolvedToday,
        avgResolutionMinutes,
        incidentsOpen,
        serviceRequestsOpen,
        devicesTotal: devices.length,
        devicesCompliant: devices.filter(d => d.compliance).length,
        devicesNonCompliant: devices.filter(d => !d.compliance).length,
        recentActivity,
      };
    } catch (error) {
      console.error('Failed to load metrics:', error);
      // Return empty metrics on error
      return {
        usersTotal: 0,
        usersActive: 0,
        usersLocked: 0,
        ticketsTotal: 0,
        ticketsOpen: 0,
        ticketsClosed: 0,
        ticketsResolvedToday: 0,
        avgResolutionMinutes: null,
        incidentsOpen: 0,
        serviceRequestsOpen: 0,
        devicesTotal: 0,
        devicesCompliant: 0,
        devicesNonCompliant: 0,
        recentActivity: [],
      };
    }
  },

  users: {
    async list(): Promise<User[]> {
      try {
        const { muninn } = await import('../sdk');
        return await muninn.users.list();
      } catch (error) {
        console.error('Failed to fetch users:', error);
        return [];
      }
    },

    async get(id: string): Promise<User | null> {
      try {
        const { muninn } = await import('../sdk');
        return await muninn.users.get(id);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        return null;
      }
    },

    async create(user: { email: string; name: string; password: string; role?: string }): Promise<User> {
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: user.email,
          name: user.name,
          password_hash: user.password,
          role: user.role || 'user',
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<User>): Promise<User> {
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async lock(id: string): Promise<User> {
      return this.update(id, { status: 'locked' });
    },

    async suspend(id: string): Promise<User> {
      return this.update(id, { status: 'suspended' });
    },

    async activate(id: string): Promise<User> {
      return this.update(id, { status: 'active' });
    },
  },

  groups: {
    async list(): Promise<Group[]> {
      try {
        const { muninn } = await import('../sdk');
        return await muninn.groups.list();
      } catch (error) {
        console.error('Failed to fetch groups:', error);
        return [];
      }
    },

    async create(name: string): Promise<Group> {
      try {
        const { muninn } = await import('../sdk');
        return await muninn.groups.create(name);
      } catch (error) {
        console.error('Failed to create group:', error);
        throw error;
      }
    },

    async addMember(groupId: string, userId: string): Promise<void> {
      try {
        const { muninn } = await import('../sdk');
        return await muninn.groups.addMember(groupId, userId);
      } catch (error) {
        console.error('Failed to add member to group:', error);
        throw error;
      }
    },

    async removeMember(groupId: string, userId: string): Promise<void> {
      try {
        const { muninn } = await import('../sdk');
        return await muninn.groups.removeMember(groupId, userId);
      } catch (error) {
        console.error('Failed to remove member from group:', error);
        throw error;
      }
    },

    async getMembers(groupId: string): Promise<User[]> {
      try {
        const { muninn } = await import('../sdk');
        return await muninn.groups.getMembers(groupId);
      } catch (error) {
        console.error('Failed to get group members:', error);
        return [];
      }
    },
  },

  roles: {
    async list(): Promise<Role[]> {
      try {
        const { muninn } = await import('../sdk');
        return await muninn.roles.list();
      } catch (error) {
        console.error('Failed to fetch roles:', error);
        return [];
      }
    },

    async create(name: string): Promise<Role> {
      const { muninn } = await import('../sdk');
      return muninn.roles.create(name);
    },
  },

  tickets: {
    async list(filters?: { status?: string; priority?: string; requester?: string }): Promise<Ticket[]> {
      // Use SDK instead of Supabase
      try {
        const { sigurd } = await import('../sdk');
        const tickets = await sigurd.tickets.list();
        
        // Apply filters client-side for now
        let filtered = tickets;
        if (filters?.status) {
          filtered = filtered.filter(t => t.status === filters.status);
        }
        if (filters?.priority) {
          filtered = filtered.filter(t => t.priority === filters.priority);
        }
        if (filters?.requester) {
          filtered = filtered.filter(t => t.requester_user_id === filters.requester);
        }
        
        return filtered;
      } catch (error) {
        console.error('Failed to fetch tickets:', error);
        return [];
      }
    },

    async get(id: string): Promise<Ticket | null> {
      try {
        const { sigurd } = await import('../sdk');
        return await sigurd.tickets.get(id);
      } catch (error) {
        console.error('Failed to fetch ticket:', error);
        return null;
      }
    },

    async create(ticket: {
      type: string;
      priority: string;
      title: string;
      description: string;
      requester_user_id: string;
      device_id?: string;
    }): Promise<Ticket> {
      try {
        const { sigurd } = await import('../sdk');
        return await sigurd.tickets.create({
          type: ticket.type as 'incident' | 'request',
          priority: ticket.priority as 'low' | 'medium' | 'high' | 'critical',
          title: ticket.title,
          description: ticket.description,
          deviceId: ticket.device_id,
        });
      } catch (error) {
        console.error('Failed to create ticket:', error);
        throw error;
      }
    },

    async update(id: string, updates: Partial<Ticket>): Promise<Ticket> {
      const { sigurd } = await import('../sdk');
      return sigurd.tickets.update(id, updates);
    },

    async addComment(ticketId: string, authorUserId: string, body: string): Promise<Comment> {
      // Note: Use sigurd.comments.create() from SDK instead
      const { sigurd } = await import('../sdk');
      return sigurd.comments.create('incidents', ticketId, { body }) as any;
    },

    async getComments(ticketId: string): Promise<Comment[]> {
      // Note: Use sigurd.comments.list() from SDK instead
      const { sigurd } = await import('../sdk');
      return sigurd.comments.list('incidents', ticketId) as any;
    },
  },

  kb: {
    async list(searchTerm?: string): Promise<KnowledgeArticle[]> {
      try {
        const { sigurd } = await import('../sdk');
        const articles = await sigurd.kb.list();
        
        // Apply search filter client-side
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return articles.filter(a => 
            a.title.toLowerCase().includes(term) || 
            a.body.toLowerCase().includes(term)
          );
        }
        
        return articles;
      } catch (error) {
        console.error('Failed to fetch knowledge articles:', error);
        return [];
      }
    },

    async get(id: string): Promise<KnowledgeArticle | null> {
      try {
        const { sigurd } = await import('../sdk');
        return await sigurd.kb.get(id);
      } catch (error) {
        console.error('Failed to fetch knowledge article:', error);
        return null;
      }
    },

    async create(article: { title: string; body: string; tags: string[] }): Promise<KnowledgeArticle> {
      try {
        const { sigurd } = await import('../sdk');
        return await sigurd.kb.create(article);
      } catch (error) {
        console.error('Failed to create knowledge article:', error);
        throw error;
      }
    },
  },

  catalog: {
    async list(): Promise<ServiceCatalogItem[]> {
      const { data, error } = await supabase
        .from('service_catalog_items')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  },

  devices: {
    async list(filters?: { compliance?: boolean; owner?: string }): Promise<Device[]> {
      try {
        const { huginn } = await import('../sdk');
        const devicesResponse = await huginn.devices.list();
        
        // Extract devices array from response (handles both array and paginated response)
        const devices = Array.isArray(devicesResponse) ? devicesResponse : (devicesResponse.devices || []);
        
        // Apply filters client-side
        let filtered = devices;
        if (filters?.compliance !== undefined) {
          filtered = filtered.filter(d => d.compliance === filters.compliance);
        }
        if (filters?.owner) {
          filtered = filtered.filter(d => d.owner_user_id === filters.owner);
        }
        
        return filtered;
      } catch (error) {
        console.error('Failed to fetch devices:', error);
        return [];
      }
    },

    async get(id: string): Promise<Device | null> {
      try {
        const { huginn } = await import('../sdk');
        return await huginn.devices.get(id);
      } catch (error) {
        console.error('Failed to fetch device:', error);
        return null;
      }
    },

    async enroll(device: {
      hostname: string;
      os: string;
      owner_user_id?: string;
    }): Promise<Device> {
      try {
        const { huginn } = await import('../sdk');
        return await huginn.devices.enroll({
          hostname: device.hostname,
          os: device.os,
          ownerUserId: device.owner_user_id,
        });
      } catch (error) {
        console.error('Failed to enroll device:', error);
        throw error;
      }
    },

    async getTelemetry(deviceId: string): Promise<Telemetry[]> {
      try {
        const { huginn } = await import('../sdk');
        return await huginn.devices.getTelemetry(deviceId);
      } catch (error) {
        console.error('Failed to fetch telemetry:', error);
        return [];
      }
    },

    async requestRemoteSupport(deviceId: string, userId: string): Promise<Ticket> {
      const device = await this.get(deviceId);
      if (!device) throw new Error('Device not found');

      return api.tickets.create({
        type: 'incident',
        priority: 'medium',
        title: `Remote support requested for ${device.hostname}`,
        description: `Remote support has been requested for device ${device.hostname} (${device.os})`,
        requester_user_id: userId,
        device_id: deviceId,
      });
    },

    async deploy(deviceId: string, packageId: string): Promise<DeploymentJob> {
      try {
        const { huginn } = await import('../sdk');
        return await huginn.deployments.create(deviceId, packageId);
      } catch (error) {
        console.error('Failed to deploy:', error);
        throw error;
      }
    },

    async getDeploymentJobs(deviceId: string): Promise<DeploymentJob[]> {
      try {
        const { huginn } = await import('../sdk');
        return await huginn.deployments.list(deviceId);
      } catch (error) {
        console.error('Failed to fetch deployment jobs:', error);
        return [];
      }
    },
  },

  software: {
    async list(): Promise<SoftwarePackage[]> {
      try {
        const { huginn } = await import('../sdk');
        return await huginn.software.list();
      } catch (error) {
        console.error('Failed to fetch software packages:', error);
        return [];
      }
    },

    async create(pkg: { name: string; version: string; platform: string }): Promise<SoftwarePackage> {
      const { data, error } = await supabase
        .from('software_packages')
        .insert(pkg)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  },

  applications: {
    async list(): Promise<Application[]> {
      try {
        const { muninn } = await import('../sdk');
        return await muninn.applications.list();
      } catch (error) {
        console.error('Failed to fetch applications:', error);
        return [];
      }
    },

    async create(app: { name: string; description?: string; logo_url?: string; redirect_url: string; scopes?: string[] }): Promise<Application> {
      try {
        const { muninn } = await import('../sdk');
        return await muninn.applications.create(app);
      } catch (error) {
        console.error('Failed to create application:', error);
        throw error;
      }
    },
  },
};
