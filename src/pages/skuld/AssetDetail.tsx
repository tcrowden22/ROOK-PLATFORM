import { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Calendar, User, MapPin, Package, AlertTriangle } from 'lucide-react';
import { Asset, AssetEvent } from '../../lib/skuld/types';
import { skuld } from '../../sdk';
import { LifecycleRibbon } from '../../components/skuld/LifecycleRibbon';
import { StatusChangeModal } from '../../components/skuld/StatusChangeModal';
import { WarrantyExpiryBanner } from '../../components/skuld/WarrantyExpiryBanner';

interface AssetDetailProps {
  assetId?: string;
  onNavigate?: (page: string, data?: any) => void;
}

export function AssetDetail({ assetId: propAssetId, onNavigate }: AssetDetailProps) {
  // Get ID from props or URL
  const urlMatch = window.location.pathname.match(/^\/assets\/([^/]+)$/);
  const id = propAssetId || urlMatch?.[1];
  
  const navigate = (path: string) => {
    if (onNavigate) {
      if (path === '/assets') {
        onNavigate('skuld-assets');
      } else {
        window.location.href = path;
      }
    } else {
      window.location.href = path;
    }
  };
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadAsset();
    }
  }, [id]);

  const loadAsset = async () => {
    try {
      const data = await skuld.assets.get(id!);
      setAsset(data as Asset);
    } catch (error) {
      console.error('Failed to load asset:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (reason: string, auditNote: string) => {
    if (!asset || !selectedNewStatus) return;
    
    await skuld.assets.changeStatus(asset.id, selectedNewStatus, reason, auditNote);
    await loadAsset(); // Reload to get updated data
    setStatusModalOpen(false);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading asset...</div>;
  }

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-slate-400 mb-4">Asset not found</p>
        <button
          onClick={() => navigate('/assets')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Back to Assets
        </button>
      </div>
    );
  }

  const assetAny = asset as any;
  const expiringAssets = asset.warranty_end && assetAny.warranty_days_remaining !== null && 
    assetAny.warranty_days_remaining <= 30 && assetAny.warranty_days_remaining >= 0
    ? [asset] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/assets')}
          className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-400" />
        </button>
        <div className="flex-1">
          <h1 className="page-title">Asset Details</h1>
          <p className="text-slate-400 mt-1">Tag: {asset.tag || 'N/A'}</p>
        </div>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
          <Edit size={16} />
          <span>Edit</span>
        </button>
      </div>

      {expiringAssets.length > 0 && (
        <WarrantyExpiryBanner
          expiringAssets={expiringAssets.map(a => ({
            id: a.id,
            tag: a.tag,
            warranty_end: a.warranty_end!,
            days_remaining: assetAny.warranty_days_remaining || 0,
          }))}
          dismissible={false}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-table p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Asset Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Asset Tag</p>
                <p className="text-slate-200 font-medium">{asset.tag || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Serial Number</p>
                <p className="text-slate-200 font-mono">{asset.serial || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Status</p>
                <div className="space-y-2">
                  <span className="status-badge status-active">{asset.status.replace('_', ' ')}</span>
                  <LifecycleRibbon 
                    currentStatus={asset.status}
                    onStatusClick={() => {
                      setSelectedNewStatus(asset.status);
                      setStatusModalOpen(true);
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Cost</p>
                <p className="text-slate-200">${asset.cost?.toFixed(2) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Purchase Date</p>
                <p className="text-slate-200 flex items-center gap-2">
                  <Calendar size={14} />
                  {formatDate(asset.purchase_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Warranty End</p>
                <p className="text-slate-200 flex items-center gap-2">
                  <Calendar size={14} />
                  {formatDate(asset.warranty_end)}
                  {assetAny.warranty_days_remaining !== null && assetAny.warranty_days_remaining >= 0 && (
                    <span className={`text-xs ml-2 ${
                      assetAny.warranty_days_remaining <= 30 ? 'text-red-400' :
                      assetAny.warranty_days_remaining <= 60 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      ({assetAny.warranty_days_remaining} days remaining)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">PO Number</p>
                <p className="text-slate-200">{asset.po_number || 'N/A'}</p>
              </div>
              {asset.notes && (
                <div className="col-span-2">
                  <p className="text-sm text-slate-400 mb-1">Notes</p>
                  <p className="text-slate-300">{asset.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-table p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Activity Timeline</h2>
            <div className="space-y-4">
              {assetAny.events && assetAny.events.length > 0 ? (
                assetAny.events.map((event: AssetEvent) => (
                  <div key={event.id} className="border-l-2 border-slate-700 pl-4 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-200">{event.type.replace('_', ' ')}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                    {event.from_status && event.to_status && (
                      <p className="text-xs text-slate-400 mb-1">
                        {event.from_status.replace('_', ' ')} → {event.to_status.replace('_', ' ')}
                      </p>
                    )}
                    {event.actor && (
                      <p className="text-xs text-slate-500">By: {event.actor.name}</p>
                    )}
                    {event.payload?.reason && (
                      <p className="text-sm text-slate-300 mt-2">Reason: {event.payload.reason}</p>
                    )}
                    {event.payload?.audit_note && (
                      <p className="text-sm text-slate-400 mt-1">{event.payload.audit_note}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm">No activity recorded</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-table p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Relationships</h2>
            <div className="space-y-4">
              {assetAny.model && (
                <div>
                  <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                    <Package size={14} />
                    Model
                  </p>
                  <p className="text-slate-200">{assetAny.model.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{assetAny.model.category}</p>
                </div>
              )}
              {assetAny.owner && (
                <div>
                  <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                    <User size={14} />
                    Owner
                  </p>
                  <p className="text-slate-200">{assetAny.owner.name}</p>
                  <p className="text-xs text-slate-500">{assetAny.owner.email}</p>
                </div>
              )}
              {assetAny.location && (
                <div>
                  <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                    <MapPin size={14} />
                    Location
                  </p>
                  <p className="text-slate-200">{assetAny.location.name}</p>
                  {assetAny.location.code && (
                    <p className="text-xs text-slate-500">Code: {assetAny.location.code}</p>
                  )}
                </div>
              )}
              {assetAny.vendor && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Vendor</p>
                  <p className="text-slate-200">{assetAny.vendor.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <StatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        currentStatus={asset.status}
        newStatus={selectedNewStatus as any}
        onConfirm={handleStatusChange}
        assetTag={asset.tag || undefined}
      />
    </div>
  );
}

