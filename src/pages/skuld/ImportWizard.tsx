import { useState } from 'react';
import { Upload, FileText, ArrowRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { skuld } from '../../sdk';
import { ImportPreview, FieldMapping } from '../../lib/skuld/types';

interface ImportWizardProps {
  onNavigate?: (page: string, data?: any) => void;
}

type Step = 'upload' | 'preview' | 'mapping' | 'review' | 'results';

export function ImportWizard({ onNavigate }: ImportWizardProps) {
  const navigate = (page: string, data?: any) => {
    if (onNavigate) {
      onNavigate(page, data);
    } else {
      window.location.href = data ? `/${page}/${data}` : `/${page}`;
    }
  };
  const [step, setStep] = useState<Step>('upload');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string>('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [importResult, setImportResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setCsvFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setCsvData(text);

      // Preview CSV
      try {
        setLoading(true);
        const previewData = await skuld.imports.preview(text);
        setPreview(previewData);
        setFieldMapping(previewData.suggested_mappings || {});
        setStep('preview');
      } catch (err: any) {
        setError(err.message || 'Failed to preview CSV');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (csvField: string, dbField: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [csvField]: dbField,
    }));
  };

  const handleReview = () => {
    setStep('review');
  };

  const handleImport = async () => {
    if (!preview || !csvData) return;

    try {
      setLoading(true);
      setError(null);

      // Parse CSV to array of objects
      const lines = csvData.split('\n').filter((line) => line.trim());
      const headers = lines[0].split(',').map((h) => h.trim());
      const assets = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const asset: Record<string, any> = {};
        headers.forEach((header, index) => {
          asset[header] = values[index] || '';
        });
        return asset;
      });

      const result = await skuld.imports.execute('csv', assets, fieldMapping);
      setImportResult(result);
      setStep('results');
    } catch (err: any) {
      setError(err.message || 'Failed to import assets');
    } finally {
      setLoading(false);
    }
  };

  const dbFields = [
    { value: 'tag', label: 'Tag' },
    { value: 'serial', label: 'Serial Number' },
    { value: 'model', label: 'Model (name)' },
    { value: 'model_id', label: 'Model ID' },
    { value: 'status', label: 'Status' },
    { value: 'cost', label: 'Cost' },
    { value: 'purchase_date', label: 'Purchase Date' },
    { value: 'warranty_end', label: 'Warranty End' },
    { value: 'vendor', label: 'Vendor (name)' },
    { value: 'vendor_id', label: 'Vendor ID' },
    { value: 'location', label: 'Location (name)' },
    { value: 'location_id', label: 'Location ID' },
    { value: 'po_number', label: 'PO Number' },
    { value: 'notes', label: 'Notes' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">CSV Import Wizard</h1>
          <p className="text-slate-400 mt-1">Import assets from CSV file with field mapping</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {(['upload', 'preview', 'mapping', 'review', 'results'] as Step[]).map((s, index) => (
          <div key={s} className="flex items-center">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                ${
                  step === s
                    ? 'bg-blue-500 text-white'
                    : ['upload', 'preview', 'mapping', 'review', 'results'].indexOf(step) > index
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-700 text-slate-400'
                }
              `}
            >
              {index + 1}
            </div>
            {index < 4 && (
              <div
                className={`
                  w-16 h-0.5 mx-2
                  ${['upload', 'preview', 'mapping', 'review', 'results'].indexOf(step) > index ? 'bg-green-500' : 'bg-slate-700'}
                `}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} className="text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="glass-table p-12">
          <div className="flex flex-col items-center justify-center">
            <Upload size={48} className="text-blue-400 mb-4" />
            <h2 className="text-xl font-semibold text-slate-200 mb-2">Upload CSV File</h2>
            <p className="text-slate-400 mb-6">Select a CSV file containing asset data</p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                disabled={loading}
              />
              <div className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                Choose File
              </div>
            </label>
            {csvFile && (
              <p className="mt-4 text-slate-400 text-sm">
                Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && preview && (
        <div className="glass-table p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-200">CSV Preview</h2>
            <button
              onClick={() => setStep('mapping')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              Next: Map Fields
              <ArrowRight size={16} />
            </button>
          </div>
          <p className="text-slate-400 mb-4">
            Found {preview.total_rows} rows. Showing first {preview.preview.length} rows:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {preview.headers.map((header) => (
                    <th key={header} className="px-4 py-2 text-left text-slate-400">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-800">
                    {preview.headers.map((header) => (
                      <td key={header} className="px-4 py-2 text-slate-300">
                        {row[header] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 3: Field Mapping */}
      {step === 'mapping' && preview && (
        <div className="glass-table p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-200">Map CSV Fields</h2>
            <button
              onClick={handleReview}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              Review Mapping
              <ArrowRight size={16} />
            </button>
          </div>
          <p className="text-slate-400 mb-4">
            Map each CSV column to the corresponding database field. Suggested mappings are pre-filled.
          </p>
          <div className="space-y-3">
            {preview.headers.map((csvField) => (
              <div key={csvField} className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
                <div className="flex-1">
                  <p className="text-slate-300 font-medium">{csvField}</p>
                  <p className="text-xs text-slate-500">CSV Column</p>
                </div>
                <ArrowRight className="text-slate-600" size={20} />
                <div className="flex-1">
                  <select
                    value={fieldMapping[csvField] || ''}
                    onChange={(e) => handleMappingChange(csvField, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                  >
                    <option value="">-- Skip --</option>
                    {dbFields.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 'review' && preview && (
        <div className="glass-table p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-200">Review Import</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('mapping')}
                className="px-4 py-2 text-slate-400 hover:text-slate-200"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Importing...' : 'Import Assets'}
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-400 font-medium mb-2">Import Summary</p>
              <p className="text-slate-300">Total rows: {preview.total_rows}</p>
              <p className="text-slate-300">Mapped fields: {Object.keys(fieldMapping).filter(k => fieldMapping[k]).length}</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-slate-400 text-sm mb-2">Field Mappings:</p>
              <div className="space-y-1">
                {Object.entries(fieldMapping).map(([csv, db]) => (
                  db && (
                    <p key={csv} className="text-xs text-slate-300">
                      {csv} → {db}
                    </p>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Results */}
      {step === 'results' && importResult && (
        <div className="glass-table p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-200">Import Results</h2>
            <button
              onClick={() => navigate('skuld-assets')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              View Assets
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="text-green-400" size={20} />
                <p className="text-green-400 font-medium">Created</p>
              </div>
              <p className="text-3xl font-bold text-slate-200">{importResult.stats?.created || 0}</p>
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="text-blue-400" size={20} />
                <p className="text-blue-400 font-medium">Updated</p>
              </div>
              <p className="text-3xl font-bold text-slate-200">{importResult.stats?.updated || 0}</p>
            </div>
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="text-red-400" size={20} />
                <p className="text-red-400 font-medium">Failed</p>
              </div>
              <p className="text-3xl font-bold text-slate-200">{importResult.stats?.failed || 0}</p>
            </div>
          </div>
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-slate-400 text-sm mb-2">Errors:</p>
              <ul className="space-y-1">
                {importResult.errors.slice(0, 10).map((err: string, idx: number) => (
                  <li key={idx} className="text-xs text-red-400">{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

