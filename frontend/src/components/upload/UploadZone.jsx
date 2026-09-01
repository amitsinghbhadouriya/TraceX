import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ArrowUpTrayIcon, DocumentIcon } from '@heroicons/react/24/outline';
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
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-cyan bg-cyan/5'
            : 'border-white/15 hover:border-cyan/40 bg-white/5 hover:bg-white/[0.08]'
        }`}
      >
        <input {...getInputProps()} />
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 border-4 border-t-cyan border-white/10 rounded-full animate-spin" />
            <p className="text-slate-300 text-sm font-medium">Validating schema & normalizing timestamps...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-cyan/10 flex items-center justify-center text-cyan shadow-glow-cyan">
              <ArrowUpTrayIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {isDragActive ? 'Drop your file here' : 'Drag & drop transaction file'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                CSV, XLSX, XLS, or TXT up to 500MB
              </p>
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-4 p-3 rounded-lg border border-rose/30 bg-rose/10 text-rose text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};

export default UploadZone;
