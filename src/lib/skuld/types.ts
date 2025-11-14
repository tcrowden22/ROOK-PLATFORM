export type AssetStatus =
  | 'requested'
  | 'ordered'
  | 'received'
  | 'in_stock'
  | 'assigned'
  | 'in_use'
  | 'in_repair'
  | 'lost'
  | 'retired'
  | 'disposed';

export type AssetCategory =
  | 'laptop'
  | 'desktop'
  | 'phone'
  | 'tablet'
  | 'peripheral'
  | 'software'
  | 'license'
  | 'other';

export type ImportSource =
  | 'csv'
  | 'workday'
  | 'intune'
  | 'jamf'
  | 'kandji'
  | 'sentinelone'
  | 'manageengine';

export type ImportStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface LifecyclePolicy {
  id: string;
  name: string;
  retire_after_months: number;
  warranty_months: number;
  actions: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AssetModel {
  id: string;
  name: string;
  category: AssetCategory;
  manufacturer: string;
  specs: Record<string, any>;
  lifecycle_policy_id?: string;
  lifecycle_policy?: LifecyclePolicy;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  external_id?: string;
  contact: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  code?: string;
  address: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  tag?: string;
  serial?: string;
  model_id?: string;
  model?: AssetModel;
  status: AssetStatus;
  owner_user_id?: string;
  owner?: { id: string; name: string; email: string };
  device_id?: string;
  location_id?: string;
  location?: Location;
  cost?: number;
  purchase_date?: string;
  warranty_end?: string;
  vendor_id?: string;
  vendor?: Vendor;
  po_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AssetEvent {
  id: string;
  asset_id: string;
  type: string;
  from_status?: string;
  to_status?: string;
  actor_user_id?: string;
  actor?: { id: string; name: string };
  payload: Record<string, any>;
  created_at: string;
}

export interface AssetAssignment {
  id: string;
  asset_id: string;
  asset?: Asset;
  assignee_user_id: string;
  assignee?: { id: string; name: string; email: string };
  assignee_org_unit?: string;
  start_date: string;
  end_date?: string;
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface AssetImport {
  id: string;
  source: ImportSource;
  status: ImportStatus;
  stats: {
    total?: number;
    created?: number;
    updated?: number;
    failed?: number;
    errors?: string[];
  };
  error_text?: string;
  created_by?: string;
  created_at: string;
  completed_at?: string;
}

export interface IntegrationProvider {
  id: string;
  name: string;
  type: ImportSource;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  config?: Record<string, any>;
  last_sync_at?: string;
  enabled: boolean;
}

export interface AssetStats {
  total: number;
  by_status: Record<AssetStatus, number>;
  by_category: Record<AssetCategory, number>;
  in_use: number;
  in_stock: number;
  retiring_soon: number;
  warranty_expiring: number;
  open_repairs: number;
  total_value: number;
  ready_to_deploy?: number;
  in_repair?: number;
  spare?: number;
  warranty_expiring_30?: number;
  warranty_expiring_60?: number;
  warranty_expiring_90?: number;
}

export interface ImportPreview {
  headers: string[];
  preview: Array<Record<string, any>>;
  total_rows: number;
  suggested_mappings: Record<string, string>;
}

export interface FieldMapping {
  [csvField: string]: string; // Maps CSV column name to database field name
}

export interface ModelStats {
  total: number;
  by_status: Record<AssetStatus, number>;
  in_use: number;
  in_stock: number;
  in_repair: number;
  total_value: number;
  avg_cost: number;
}

export interface VendorStats {
  total: number;
  by_status: Record<AssetStatus, number>;
  total_value: number;
  in_use: number;
  in_stock: number;
  purchase_volume: Array<{
    month: string;
    count: number;
    value: number;
  }>;
}
