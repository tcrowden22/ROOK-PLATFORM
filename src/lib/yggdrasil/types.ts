export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'disabled';
  trigger_type: 'manual' | 'scheduled' | 'event';
  created_at: string;
  updated_at: string;
  created_by: string;
  last_run_at?: string;
  run_count: number;
}

export interface Trigger {
  id: string;
  name: string;
  type: 'webhook' | 'schedule' | 'event' | 'manual';
  workflow_id: string;
  enabled: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  config: Record<string, any>;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RunLog {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  trigger_type: string;
  error_message?: string;
  steps_completed: number;
  steps_total: number;
}
