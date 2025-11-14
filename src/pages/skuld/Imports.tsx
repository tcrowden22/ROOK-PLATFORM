import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { AssetImport } from '../../lib/skuld/types';
import { skuld } from '../../sdk/skuld';

interface ImportsProps {
  onNavigate?: (page: string, data?: any) => void;
}

export function Imports({ onNavigate }: ImportsProps) {
  const [imports, setImports] = useState<AssetImport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImports();
  }, []);

  const loadImports = async () => {
    try {
      setLoading(true);
      const data = await skuld.imports.list();
      setImports(data);
    } catch (error) {
      console.error('Failed to load imports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    if (onNavigate) {
      onNavigate('skuld-import-wizard');
    } else {
      window.location.href = '/assets/import';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} className="text-green-400" />;
      case 'failed': return <XCircle size={16} className="text-red-400" />;
      case 'processing': return <Clock size={16} className="text-amber-400 animate-spin" />;
      default: return <Clock size={16} className="text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Data Imports</h1>
          <p className="text-slate-400 mt-1">Import assets from CSV or external systems</p>
        </div>
        <button 
          onClick={handleUploadClick}
          className="gradient-button text-white rounded-lg px-4 py-2 flex items-center gap-2"
        >
          <Upload size={20} />
          <span>Upload CSV</span>
        </button>
      </div>

      <div className="glass-table">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Failed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Started</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Loading imports...
                  </td>
                </tr>
              ) : imports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No imports found. Click "Upload CSV" to start importing assets.
                  </td>
                </tr>
              ) : (
                imports.map((imp) => (
                <tr key={imp.id} className="table-row cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-blue-400" />
                      <span className="text-slate-200 capitalize">{imp.source}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`status-badge ${
                      imp.status === 'completed' ? 'status-active' :
                      imp.status === 'failed' ? 'status-locked' :
                      imp.status === 'processing' ? 'status-pending' :
                      'status-info'
                    }`}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(imp.status)}
                        {imp.status}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{imp.record_count || imp.stats?.total || 0}</td>
                  <td className="px-6 py-4 text-slate-300">{imp.imported_count || (imp.stats?.created || 0) + (imp.stats?.updated || 0)}</td>
                  <td className="px-6 py-4 text-red-400">{imp.error_count || imp.stats?.failed || 0}</td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(imp.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {imp.completed_at ? new Date(imp.completed_at).toLocaleString() : '-'}
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
