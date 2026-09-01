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
  ShieldCheckIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ArrowRightIcon
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
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Instant demo error:', err);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto animate-fade-in pb-10">
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shadow-glow-cyan">
              <CloudArrowUpIcon className="h-5 w-5" />
            </div>
            <span>Upload Transactions & Case Data</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload any transaction CSV or Excel file to automatically find hidden fraud rings, unusual payments, and connected accounts.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="btn-ghost text-xs hidden sm:flex items-center gap-1.5 border border-white/10 hover:border-cyan/30"
        >
          <BookOpenIcon className="h-4 w-4 text-cyan" />
          <span>Interactive Story</span>
        </button>
      </div>

      {analysisError && (
        <div className="p-4 rounded-xl bg-rose/15 border border-rose/30 text-rose text-sm font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>Analysis Pipeline Failed: {analysisError}</span>
        </div>
      )}

      {/* ── 1-Click Interactive Demo Card ──────────────────────── */}
      {!uploadData && (
        <div className="card p-5 sm:p-6 bg-gradient-to-r from-navy-800 via-navy-900 to-navy-800 border-cyan/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
          <div className="flex items-center gap-4 z-10">
            <div className="h-12 w-12 rounded-2xl bg-cyan/20 border border-cyan/40 flex items-center justify-center text-cyan shadow-glow-cyan flex-shrink-0">
              <SparklesIcon className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-100">Want to test with a pre-loaded sample?</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan/20 text-cyan border border-cyan/40">
                  Instant Case
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Launch our verified sample fraud case with <strong>985 transactions</strong>, <strong>4 connected fraud rings</strong>, and full 3D network maps.
              </p>
            </div>
          </div>

          <button
            onClick={handleInstantDemo}
            disabled={demoLoading}
            className="btn-primary text-xs py-2.5 px-5 flex-shrink-0 whitespace-nowrap z-10 shadow-glow-cyan flex items-center gap-2 self-stretch sm:self-auto justify-center"
          >
            {demoLoading ? (
              <div className="h-4 w-4 border-2 border-t-navy border-white/20 rounded-full animate-spin" />
            ) : (
              <>
                <SparklesIcon className="h-4 w-4" />
                <span>1-Click Load Demo Case</span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Main Upload Card ───────────────────────────────────── */}
      {!uploadData ? (
        <div className="flex flex-col gap-6">
          <div className="card p-6 sm:p-8 bg-navy-800/90 border-white/10 shadow-xl flex flex-col gap-6">
            <div>
              <h2 className="text-base font-extrabold text-slate-100">Select or Drop Your Transaction File</h2>
              <p className="text-xs text-slate-400 mt-1">
                Works out-of-the-box with bank payment logs, e-commerce exports, credit card records, and Kaggle datasets.
              </p>
            </div>
            
            <UploadZone onUploadSuccess={handleUploadSuccess} />
          </div>

          {/* ── Automatic Column Mapping Info ─────────────────────── */}
          <div className="card p-5 bg-navy-800/60 border-white/5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-emerald" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Smart Auto-Detection Supported:
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                <CreditCardIcon className="h-5 w-5 text-cyan flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Accounts & Transfers</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">`account_id`, `card_number`, `user`, `sender`, `recipient`</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                <DevicePhoneMobileIcon className="h-5 w-5 text-amber flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Devices & Locations</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">`device_id`, `ip_address`, `city`, `location`, `terminal`</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                <BuildingStorefrontIcon className="h-5 w-5 text-emerald flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Amounts & Timestamps</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">`amount`, `timestamp`, `date`, `time`, `PCA V1-V28`</p>
                </div>
              </div>
            </div>
          </div>
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
