// Supabase removed - using SDK instead
import {
  Asset,
  AssetModel,
  Vendor,
  Location,
  AssetAssignment,
  AssetEvent,
  AssetImport,
  AssetStats,
  AssetStatus,
  LifecyclePolicy,
} from './types';

export const skuldApi = {
  assets: {
    async list(filters?: { status?: AssetStatus; owner?: string; location?: string }): Promise<Asset[]> {
      let query = supabase
        .from('assets')
        .select('*, model:asset_models(*), location:locations(*), vendor:vendors(*)')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.owner) {
        query = query.eq('owner_user_id', filters.owner);
      }
      if (filters?.location) {
        query = query.eq('location_id', filters.location);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async get(id: string): Promise<Asset | null> {
      const { data, error } = await supabase
        .from('assets')
        .select('*, model:asset_models(*), location:locations(*), vendor:vendors(*)')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async create(asset: {
      tag?: string;
      serial?: string;
      model_id?: string;
      status: AssetStatus;
      owner_user_id?: string;
      location_id?: string;
      cost?: number;
      purchase_date?: string;
      warranty_end?: string;
      vendor_id?: string;
      po_number?: string;
      notes?: string;
    }): Promise<Asset> {
      const { data, error } = await supabase
        .from('assets')
        .insert(asset)
        .select('*, model:asset_models(*), location:locations(*), vendor:vendors(*)')
        .single();

      if (error) throw error;

      await this.createEvent(data.id, 'created', undefined, data.status);

      return data;
    },

    async update(id: string, updates: Partial<Asset>): Promise<Asset> {
      const oldAsset = await this.get(id);

      const { data, error } = await supabase
        .from('assets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, model:asset_models(*), location:locations(*), vendor:vendors(*)')
        .single();

      if (error) throw error;

      if (oldAsset && oldAsset.status !== data.status) {
        await this.createEvent(id, 'status_changed', oldAsset.status, data.status);
      }

      return data;
    },

    async changeStatus(id: string, newStatus: AssetStatus, reason?: string): Promise<Asset> {
      const oldAsset = await this.get(id);
      if (!oldAsset) throw new Error('Asset not found');

      const { data, error } = await supabase
        .from('assets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, model:asset_models(*), location:locations(*), vendor:vendors(*)')
        .single();

      if (error) throw error;

      await this.createEvent(id, 'status_changed', oldAsset.status, newStatus, { reason });

      return data;
    },

    async retire(id: string, reason?: string): Promise<Asset> {
      return this.changeStatus(id, 'retired', reason);
    },

    async dispose(id: string, reason?: string): Promise<Asset> {
      return this.changeStatus(id, 'disposed', reason);
    },

    async assign(assetId: string, userId: string, reason?: string): Promise<Asset> {
      const asset = await this.get(assetId);
      if (!asset) throw new Error('Asset not found');

      const { data, error } = await supabase
        .from('assets')
        .update({
          owner_user_id: userId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)
        .select('*, model:asset_models(*), location:locations(*), vendor:vendors(*)')
        .single();

      if (error) throw error;

      // TODO: Add asset assignment endpoint to Skuld API
      console.warn('Asset assignment requires API endpoint implementation');

      await this.createEvent(assetId, 'assigned', asset.status, 'assigned', {
        user_id: userId,
        reason
      });

      return data;
    },

    async unassign(assetId: string, reason?: string): Promise<Asset> {
      const asset = await this.get(assetId);
      if (!asset) throw new Error('Asset not found');

      const { data: assignment } = await supabase
        .from('asset_assignments')
        .select('*')
        .eq('asset_id', assetId)
        .is('end_date', null)
        .maybeSingle();

      if (assignment) {
        await supabase
          .from('asset_assignments')
          .update({
            end_date: new Date().toISOString().split('T')[0],
            reason: reason || 'Unassigned'
          })
          .eq('id', assignment.id);
      }

      const { data, error } = await supabase
        .from('assets')
        .update({
          owner_user_id: null,
          status: 'in_stock',
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)
        .select('*, model:asset_models(*), location:locations(*), vendor:vendors(*)')
        .single();

      if (error) throw error;

      await this.createEvent(assetId, 'unassigned', asset.status, 'in_stock', { reason });

      return data;
    },

    async createEvent(
      assetId: string,
      type: string,
      fromStatus?: string,
      toStatus?: string,
      payload: Record<string, any> = {}
    ): Promise<AssetEvent> {
      const { data, error } = await supabase
        .from('asset_events')
        .insert({
          asset_id: assetId,
          type,
          from_status: fromStatus,
          to_status: toStatus,
          payload,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getEvents(assetId: string): Promise<AssetEvent[]> {
      const { data, error } = await supabase
        .from('asset_events')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async getStats(): Promise<AssetStats> {
      // TODO: Add assets list endpoint to Skuld API
      const assets: any[] = [];

      if (!assets) {
        return {
          total: 0,
          by_status: {} as Record<AssetStatus, number>,
          by_category: {} as any,
          in_use: 0,
          in_stock: 0,
          retiring_soon: 0,
          warranty_expiring: 0,
          open_repairs: 0,
          total_value: 0,
        };
      }

      const byStatus = assets.reduce((acc, asset) => {
        acc[asset.status] = (acc[asset.status] || 0) + 1;
        return acc;
      }, {} as Record<AssetStatus, number>);

      const totalValue = assets.reduce((sum, asset) => sum + (asset.cost || 0), 0);

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const warrantyExpiring = assets.filter(a => {
        if (!a.warranty_end) return false;
        const warrantyDate = new Date(a.warranty_end);
        return warrantyDate <= thirtyDaysFromNow && warrantyDate >= new Date();
      }).length;

      return {
        total: assets.length,
        by_status: byStatus,
        by_category: {} as any,
        in_use: assets.filter(a => a.status === 'in_use').length,
        in_stock: assets.filter(a => a.status === 'in_stock').length,
        retiring_soon: 0,
        warranty_expiring: warrantyExpiring,
        open_repairs: assets.filter(a => a.status === 'in_repair').length,
        total_value: totalValue,
      };
    },
  },

  models: {
    async list(): Promise<AssetModel[]> {
      const { data, error } = await supabase
        .from('asset_models')
        .select('*, lifecycle_policy:lifecycle_policies(*)')
        .order('name');

      if (error) throw error;
      return data || [];
    },

    async get(id: string): Promise<AssetModel | null> {
      const { data, error } = await supabase
        .from('asset_models')
        .select('*, lifecycle_policy:lifecycle_policies(*)')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async create(model: {
      name: string;
      category: string;
      manufacturer: string;
      specs?: Record<string, any>;
      lifecycle_policy_id?: string;
    }): Promise<AssetModel> {
      const { data, error } = await supabase
        .from('asset_models')
        .insert(model)
        .select('*, lifecycle_policy:lifecycle_policies(*)')
        .single();

      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<AssetModel>): Promise<AssetModel> {
      const { data, error } = await supabase
        .from('asset_models')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, lifecycle_policy:lifecycle_policies(*)')
        .single();

      if (error) throw error;
      return data;
    },
  },

  vendors: {
    async list(): Promise<Vendor[]> {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },

    async create(vendor: { name: string; external_id?: string; contact?: Record<string, any> }): Promise<Vendor> {
      const { data, error } = await supabase
        .from('vendors')
        .insert(vendor)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Vendor>): Promise<Vendor> {
      const { data, error } = await supabase
        .from('vendor')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  },

  locations: {
    async list(): Promise<Location[]> {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },

    async create(location: { name: string; code?: string; address?: Record<string, any> }): Promise<Location> {
      const { data, error } = await supabase
        .from('locations')
        .insert(location)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Location>): Promise<Location> {
      const { data, error } = await supabase
        .from('locations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  },

  assignments: {
    async list(filters?: { asset_id?: string; assignee_user_id?: string }): Promise<AssetAssignment[]> {
      let query = supabase
        .from('asset_assignments')
        .select('*, asset:assets(*), assignee:users(id, name, email)')
        .order('created_at', { ascending: false });

      if (filters?.asset_id) {
        query = query.eq('asset_id', filters.asset_id);
      }
      if (filters?.assignee_user_id) {
        query = query.eq('assignee_user_id', filters.assignee_user_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async getCurrent(userId: string): Promise<AssetAssignment[]> {
      const { data, error } = await supabase
        .from('asset_assignments')
        .select('*, asset:assets(*)')
        .eq('assignee_user_id', userId)
        .is('end_date', null);

      if (error) throw error;
      return data || [];
    },
  },

  imports: {
    async list(): Promise<AssetImport[]> {
      const { data, error } = await supabase
        .from('asset_imports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async create(importRecord: {
      source: string;
      created_by?: string;
    }): Promise<AssetImport> {
      const { data, error } = await supabase
        .from('asset_imports')
        .insert({
          ...importRecord,
          status: 'pending',
          stats: {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async updateStatus(
      id: string,
      status: string,
      stats?: Record<string, any>,
      errorText?: string
    ): Promise<AssetImport> {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (stats) {
        updates.stats = stats;
      }

      if (errorText) {
        updates.error_text = errorText;
      }

      if (status === 'completed' || status === 'failed') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('asset_imports')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  },

  lifecyclePolicies: {
    async list(): Promise<LifecyclePolicy[]> {
      const { data, error } = await supabase
        .from('lifecycle_policies')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },

    async create(policy: {
      name: string;
      retire_after_months?: number;
      warranty_months?: number;
      actions?: Record<string, any>;
    }): Promise<LifecyclePolicy> {
      const { data, error } = await supabase
        .from('lifecycle_policies')
        .insert(policy)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  },
};
