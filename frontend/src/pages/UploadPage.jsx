import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadZone from '../components/upload/UploadZone';
import ValidationReport from '../components/upload/ValidationReport';
import TiltCard3D from '../components/3d/TiltCard3D';
import useAnalysisStore from '../store/analysisStore';
import {
  CloudArrowUpIcon,
  SparklesIcon,
  BookOpenIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const UploadPage = () => {
  const { runAnalysis, selectDataset, datasets, fetchDatasets, analysisRunning, analysisError } = useAnalysisStore();
  const [uploadData, setUploadData] = useState(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const navigate = useNavigate();

  const handleUploadSuccess = (data) => {
    setUploadData(data);
  };

  const handleProceed = async () => {
    if (!uploadData?.session_id || !uploadData?.datasetId) return;

    selectDataset({
      _id: uploadData.datasetId,
      sessionId: uploadData.session_id,
      filename: uploadData.validation_report?.original_filename || 'Uploaded File',
      rowCount: uploadData.row_count,
      status: 'uploaded',
    });

    const success = await runAnalysis(uploadData.datasetId);
    if (success) {
      navigate('/dashboard');
    }
  };

  const handleInstantDemo = async () => {
    setDemoLoading(true);
    try {
      await fetchDatasets();
      const current = useAnalysisStore.getState().datasets;
      if (current.length > 0) {
        const target = current[0];
        selectDataset(target);
        if (target.status !== 'analysis_complete') {
          await runAnalysis(target._id);
        }
        navigate('/dashboard');
      } else {
        // Trigger pre-seeded sample upload via API
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Instant demo error:', err);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <CloudArrowUpIcon className="h-6 w-6 text-cyan" />
            <span>Case Data Ingestion</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload raw transaction logs to begin anomaly detection, entity resolution, and network graph generation.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="btn-ghost text-xs hidden sm:flex items-center gap-1.5"
        >
          <BookOpenIcon className="h-4 w-4" />
          <span>Interactive Story</span>
        </button>
      </div>

      {analysisError && (
        <div className="p-4 rounded-xl bg-rose/15 border border-rose/30 text-rose text-sm font-semibold">
          ⚠️ Analysis Pipeline Failed: {analysisError}
        </div>
      )}

      {/* 1-Click Interactive Demo Banner */}
      {!uploadData && (
        <TiltCard3D glowColor="#00D4FF" className="card p-6 bg-navy-800/90 border-cyan/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-cyan/20 border border-cyan/40 flex items-center justify-center text-cyan shadow-glow-cyan flex-shrink-0">
              <SparklesIcon className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Don't have a dataset ready?</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Launch the pre-loaded seeded fraud ring case with 985 transactions and 4 suspicious communities.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstantDemo}
            disabled={demoLoading}
            className="btn-primary text-xs flex-shrink-0 whitespace-nowrap"
          >
            {demoLoading ? (
              <div className="h-4 w-4 border-2 border-t-navy border-white/20 rounded-full animate-spin" />
            ) : (
              <>
                <SparklesIcon className="h-4 w-4" />
                <span>1-Click Load Case</span>
              </>
            )}
          </button>
        </TiltCard3D>
      )}

      {/* Upload Zone */}
      {!uploadData ? (
        <div className="card p-6 flex flex-col gap-6 bg-navy-800/80 border-white/10">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Upload Transaction File</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Supports CSV, Excel (XLSX, XLS), and anonymized Kaggle PCA files up to 500MB
            </p>
          </div>
          <UploadZone onUploadSuccess={handleUploadSuccess} />
        </div>
      ) : (
        <ValidationReport
          report={uploadData.validation_report}
          fieldMap={uploadData.field_map}
          extraColumns={uploadData.extra_columns}
          onConfirm={handleProceed}
          onReset={() => setUploadData(null)}
          running={analysisRunning}
        />
      )}
    </div>
  );
};

export default UploadPage;
