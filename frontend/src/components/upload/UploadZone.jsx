import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import useAnalysisStore from '../../store/analysisStore';

const UploadZone = ({ onUploadSuccess }) => {
  const { uploadDataset } = useAnalysisStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await uploadDataset(acceptedFiles[0]);
      onUploadSuccess(data);
    } catch (err) {
      setError(err.message || 'Failed to upload file.');
    } finally {
      setLoading(false);
    }
  }, [uploadDataset, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/plain': ['.txt'],
    }
  });

  return (
    <div className="w-full flex flex-col gap-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${
          isDragActive
            ? 'border-cyan bg-cyan/10 shadow-glow-cyan scale-[1.01]'
            : 'border-white/15 hover:border-cyan/50 bg-navy-900/60 hover:bg-navy-900/90'
        }`}
      >
        <input {...getInputProps()} />

        {loading ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative">
              <div className="h-14 w-14 border-4 border-t-cyan border-white/10 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-cyan">
                <SparklesIcon className="h-6 w-6 animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-100 text-sm font-bold">Scanning & Reading File Columns...</p>
              <p className="text-xs text-slate-400 mt-1">Normalizing dates, accounts, and payment amounts</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            {/* Center Upload Icon */}
            <div className="h-16 w-16 rounded-2xl bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shadow-glow-cyan group-hover:scale-110 group-hover:bg-cyan/25 transition-all duration-300">
              <CloudArrowUpIcon className="h-8 w-8" />
            </div>

            <div>
              <p className="text-base font-extrabold text-slate-100">
                {isDragActive ? 'Drop your transaction file right here' : 'Drag and drop your file here, or browse'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Drop your CSV or Excel ledger to automatically detect fraud rings, mule accounts, and payment anomalies.
              </p>
            </div>

            {/* Supported Formats Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-white/5 text-slate-300 border border-white/10">
                <DocumentTextIcon className="h-3.5 w-3.5 text-cyan" />
                CSV
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-white/5 text-slate-300 border border-white/10">
                <DocumentArrowUpIcon className="h-3.5 w-3.5 text-emerald" />
                Excel (.xlsx, .xls)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-white/5 text-slate-300 border border-white/10">
                <CheckCircleIcon className="h-3.5 w-3.5 text-amber" />
                Kaggle Datasets
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-400 bg-white/5 border border-white/5">
                Up to 500 MB
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose/30 bg-rose/10 text-rose text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
