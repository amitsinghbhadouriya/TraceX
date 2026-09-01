import React, { useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  BanknotesIcon,
  TagIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  BuildingStorefrontIcon,
  ArrowRightIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

const ValidationReport = ({ report, fieldMap, extraColumns, onConfirm, onReset, running }) => {
  const [showAllColumns, setShowAllColumns] = useState(false);

  if (!report) return null;

  const hasErrors = report.errors && report.errors.length > 0;
  const hasWarnings = report.warnings && report.warnings.length > 0;
  const originalFilename = report.original_filename || 'Uploaded File';
  const rowCount = report.row_count || 0;

  // Helper to format canonical field names into friendly labels and icons
  const getFieldMeta = (canonical) => {
    switch (canonical.toLowerCase()) {
      case 'timestamp':
        return { label: 'Time & Date', icon: ClockIcon, color: 'text-cyan', desc: 'Transaction chronology' };
      case 'amount':
        return { label: 'Payment Amount', icon: BanknotesIcon, color: 'text-emerald', desc: 'Transfer value ($)' };
      case 'status':
        return { label: 'Fraud Label / Class', icon: TagIcon, color: 'text-amber', desc: 'Known fraud tag' };
      case 'account_id':
      case 'user_id':
        return { label: 'Sender Account', icon: CreditCardIcon, color: 'text-cyan', desc: 'Account identifier' };
      case 'merchant':
      case 'merchant_id':
        return { label: 'Merchant / Shop', icon: BuildingStorefrontIcon, color: 'text-purple-400', desc: 'Destination store' };
      case 'device_id':
        return { label: 'Device / IP', icon: DevicePhoneMobileIcon, color: 'text-pink-400', desc: 'Hardware footprint' };
      default:
        return { label: canonical.replace('_', ' ').toUpperCase(), icon: CheckCircleIcon, color: 'text-cyan', desc: 'Mapped field' };
    }
  };

  return (
    <div className="card p-6 sm:p-8 bg-navy-800/90 border-white/10 shadow-2xl flex flex-col gap-6 animate-fade-in">
      
      {/* ── Top Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-100">File Ready for Fraud Analysis</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald/15 text-emerald border border-emerald/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
              Verified
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            File: <strong className="text-slate-200">{originalFilename}</strong> • {rowCount > 0 ? `${rowCount.toLocaleString()} records processed` : 'All columns verified'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
          {onReset && (
            <button
              onClick={onReset}
              disabled={running}
              className="btn-ghost text-xs border border-white/10 hover:border-white/20"
            >
              Choose another file
            </button>
          )}
          {!hasErrors && (
            <button
              onClick={onConfirm}
              disabled={running}
              className="btn-primary text-xs py-2.5 px-6 shadow-glow-cyan flex items-center gap-2"
            >
              {running ? (
                <>
                  <div className="h-4 w-4 border-2 border-t-navy border-white/20 rounded-full animate-spin" />
                  <span>Scanning Fraud Networks...</span>
                </>
              ) : (
                <>
                  <span>Start Fraud Scan</span>
                  <ArrowRightIcon className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Matched Data Columns ───────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <CheckCircleIcon className="h-4 w-4 text-cyan" />
            <span>Matched Data Columns</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            {Object.keys(fieldMap || {}).length} primary fields detected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(fieldMap || {}).map(([canonical, source]) => {
            const meta = getFieldMeta(canonical);
            const Icon = meta.icon;
            return (
              <div
                key={canonical}
                className="p-3.5 rounded-xl bg-white/5 border border-white/8 flex items-center gap-3 hover:border-cyan/30 transition-all"
              >
                <div className={`h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block truncate">
                    {meta.label}
                  </span>
                  <p className="text-xs font-bold text-slate-200 truncate mt-0.5">
                    Found in: <span className="font-mono text-cyan">"{source}"</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Data Quality Warnings (Friendly Amber Box) ─────────── */}
      {hasWarnings && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber uppercase tracking-wider mb-1">
              Data Quality Notes ({report.warnings.length})
            </h4>
            <ul className="list-disc pl-4 text-xs text-slate-300 flex flex-col gap-1">
              {report.warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Fatal Errors (if any) ──────────────────────────────── */}
      {hasErrors && (
        <div className="p-4 rounded-xl bg-rose/10 border border-rose/30 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-rose flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-rose uppercase tracking-wider mb-1">
              Required Adjustments ({report.errors.length})
            </h4>
            <ul className="list-disc pl-4 text-xs text-slate-300 flex flex-col gap-1">
              {report.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Data Preparation Steps (Clean Plain-English Cards) ─── */}
      {report.info && report.info.length > 0 && (
        <div className="p-4 rounded-xl bg-cyan/5 border border-cyan/20 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="h-4 w-4 text-cyan" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Automatic Optimizations Applied
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {report.info.slice(0, 6).map((inf, i) => (
              <div key={i} className="text-xs text-slate-300 flex items-start gap-2 bg-white/5 p-2.5 rounded-lg border border-white/5">
                <span className="text-emerald font-bold text-xs mt-0.5">✓</span>
                <span className="leading-snug">{inf}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Extra ML Features / Unmapped Columns ────────────────── */}
      {extraColumns && extraColumns.length > 0 && (
        <div className="p-4 rounded-xl bg-navy-900/80 border border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-cyan" />
              <h4 className="text-xs font-bold text-slate-300">
                Additional ML Feature Columns ({extraColumns.length})
              </h4>
            </div>
            <button
              onClick={() => setShowAllColumns(!showAllColumns)}
              className="text-[11px] text-cyan hover:underline flex items-center gap-1"
            >
              <span>{showAllColumns ? 'Show Less' : `View All ${extraColumns.length}`}</span>
              {showAllColumns ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            These numerical signals (e.g. PCA components V1–V28) will be evaluated by our machine learning models for anomaly scoring.
          </p>

          <div className="flex flex-wrap gap-1.5 mt-1 max-h-24 overflow-y-auto no-scrollbar">
            {(showAllColumns ? extraColumns : extraColumns.slice(0, 16)).map((col) => (
              <span
                key={col}
                className="bg-white/5 hover:bg-cyan/10 border border-white/8 hover:border-cyan/30 rounded-md px-2 py-0.5 text-[10px] text-slate-300 font-mono transition-all"
              >
                {col}
              </span>
            ))}
            {!showAllColumns && extraColumns.length > 16 && (
              <span className="text-[10px] text-slate-400 self-center px-1 font-mono">
                +{extraColumns.length - 16} more
              </span>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ValidationReport;
