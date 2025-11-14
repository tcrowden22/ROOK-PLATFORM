// Supabase removed - using SDK instead
import { Workflow, Trigger, Integration, RunLog } from './types';

export const yggdrasilApi = {
  workflows: {
    async list(filters?: { status?: string }): Promise<Workflow[]> {
      let query = supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async get(id: string): Promise<Workflow | null> {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async create(workflow: {
      name: string;
      description?: string;
      trigger_type: string;
      definition?: Record<string, any>;
      created_by?: string;
    }): Promise<Workflow> {
      const { data, error } = await supabase
        .from('workflows')
        .insert({
          ...workflow,
          status: 'active',
          run_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Workflow>): Promise<Workflow> {
      const { data, error } = await supabase
        .from('workflows')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    async pause(id: string): Promise<Workflow> {
      return this.update(id, { status: 'paused' });
    },

    async resume(id: string): Promise<Workflow> {
      return this.update(id, { status: 'active' });
    },

    async disable(id: string): Promise<Workflow> {
      return this.update(id, { status: 'disabled' });
    },

    async execute(id: string, context?: Record<string, any>): Promise<RunLog> {
      const workflow = await this.get(id);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      if (workflow.status !== 'active') {
        throw new Error(`Workflow is ${workflow.status} and cannot be executed`);
      }

      const runLog = await yggdrasilApi.runLogs.create({
        workflow_id: id,
        workflow_name: workflow.name,
        trigger_type: 'manual',
        steps_total: 0,
        payload: context || {},
      });

      try {
        await yggdrasilApi.runLogs.updateStatus(runLog.id, 'running');

        const stepsTotal = Array.isArray(workflow.definition?.steps)
          ? workflow.definition.steps.length
          : 0;

        await yggdrasilApi.runLogs.update(runLog.id, {
          steps_total: stepsTotal,
          steps_completed: stepsTotal,
        });

        await yggdrasilApi.runLogs.complete(runLog.id, 'success');

        return await yggdrasilApi.runLogs.get(runLog.id) as RunLog;
      } catch (error: any) {
        await yggdrasilApi.runLogs.complete(runLog.id, 'failed', error.message);
        throw error;
      }
    },

    async getStats(): Promise<{ total: number; active: number; paused: number; disabled: number }> {
      // TODO: Add stats endpoint to Yggdrasil API
      return { total: 0, active: 0, paused: 0, disabled: 0 };

      return {
        total: data.length,
        active: data.filter(w => w.status === 'active').length,
        paused: data.filter(w => w.status === 'paused').length,
        disabled: data.filter(w => w.status === 'disabled').length,
      };
    },
  },

  triggers: {
    async list(workflowId?: string): Promise<Trigger[]> {
      let query = supabase
        .from('workflow_triggers')
        .select('*')
        .order('created_at', { ascending: false });

      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async get(id: string): Promise<Trigger | null> {
      const { data, error } = await supabase
        .from('workflow_triggers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async create(trigger: {
      workflow_id: string;
      name: string;
      type: string;
      config?: Record<string, any>;
      enabled?: boolean;
    }): Promise<Trigger> {
      const { data, error } = await supabase
        .from('workflow_triggers')
        .insert(trigger)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Trigger>): Promise<Trigger> {
      const { data, error } = await supabase
        .from('workflow_triggers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      const { error } = await supabase
        .from('workflow_triggers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    async enable(id: string): Promise<Trigger> {
      return this.update(id, { enabled: true });
    },

    async disable(id: string): Promise<Trigger> {
      return this.update(id, { enabled: false });
    },
  },

  integrations: {
    async list(): Promise<Integration[]> {
      const { data, error } = await supabase
        .from('workflow_integrations')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },

    async get(id: string): Promise<Integration | null> {
      const { data, error } = await supabase
        .from('workflow_integrations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async create(integration: {
      name: string;
      type: string;
      config?: Record<string, any>;
    }): Promise<Integration> {
      const { data, error } = await supabase
        .from('workflow_integrations')
        .insert({
          ...integration,
          status: 'disconnected',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Integration>): Promise<Integration> {
      const { data, error } = await supabase
        .from('workflow_integrations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      const { error } = await supabase
        .from('workflow_integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    async connect(id: string): Promise<Integration> {
      return this.update(id, {
        status: 'connected',
        last_sync_at: new Date().toISOString()
      });
    },

    async disconnect(id: string): Promise<Integration> {
      return this.update(id, { status: 'disconnected' });
    },

    async sync(id: string): Promise<Integration> {
      return this.update(id, {
        last_sync_at: new Date().toISOString()
      });
    },
  },

  runLogs: {
    async list(filters?: { workflow_id?: string; status?: string; limit?: number }): Promise<RunLog[]> {
      let query = supabase
        .from('workflow_run_logs')
        .select('*')
        .order('started_at', { ascending: false });

      if (filters?.workflow_id) {
        query = query.eq('workflow_id', filters.workflow_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async get(id: string): Promise<RunLog | null> {
      const { data, error } = await supabase
        .from('workflow_run_logs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async create(runLog: {
      workflow_id: string;
      workflow_name: string;
      trigger_type: string;
      steps_total?: number;
      payload?: Record<string, any>;
    }): Promise<RunLog> {
      const { data, error } = await supabase
        .from('workflow_run_logs')
        .insert({
          ...runLog,
          status: 'running',
          steps_completed: 0,
          steps_total: runLog.steps_total || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<RunLog>): Promise<RunLog> {
      const { data, error } = await supabase
        .from('workflow_run_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async updateStatus(id: string, status: string): Promise<RunLog> {
      return this.update(id, { status });
    },

    async complete(id: string, status: 'success' | 'failed' | 'cancelled', errorMessage?: string): Promise<RunLog> {
      const updates: any = {
        status,
        completed_at: new Date().toISOString(),
      };

      if (errorMessage) {
        updates.error_message = errorMessage;
      }

      return this.update(id, updates);
    },

    async getRecent(workflowId: string, limit: number = 10): Promise<RunLog[]> {
      return this.list({ workflow_id: workflowId, limit });
    },

    async getStats(workflowId?: string): Promise<{
      total: number;
      success: number;
      failed: number;
      running: number;
      averageDuration: number;
    }> {
      // TODO: Add run logs endpoint to Yggdrasil API
      const data: any[] = [];

      if (!data || data.length === 0) {
        return { total: 0, success: 0, failed: 0, running: 0, averageDuration: 0 };
      }

      const completedRuns = data.filter(r => r.duration_ms !== null);
      const averageDuration = completedRuns.length > 0
        ? completedRuns.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / completedRuns.length
        : 0;

      return {
        total: data.length,
        success: data.filter(r => r.status === 'success').length,
        failed: data.filter(r => r.status === 'failed').length,
        running: data.filter(r => r.status === 'running').length,
        averageDuration: Math.round(averageDuration),
      };
    },
  },
};
