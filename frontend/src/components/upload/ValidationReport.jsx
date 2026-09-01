import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const ValidationReport = ({ report, fieldMap, extraColumns, onConfirm, onReset, running }) => {
  if (!report) return null;

  const hasErrors = report.errors && report.errors.length > 0;
  const hasWarnings = report.warnings && report.warnings.length > 0;

  return (
    <div className="card p-6 flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 className="text-md font-bold text-slate-200">Schema Validation & Data Integrity Report</h3>
          <p className="text-xs text-slate-400 mt-0.5">Summary of parsed transaction columns and checks</p>
        </div>
        <div className="flex items-center gap-3">
          {onReset && (
            <button
              onClick={onReset}
              disabled={running}
              className="btn-ghost text-xs"
            >
              Choose another file
            </button>
          )}
          {!hasErrors && (
            <button
              onClick={onConfirm}
              disabled={running}
              className="btn-primary"
            >
              {running ? (
                <>
                  <div className="h-4 w-4 border-2 border-t-navy border-white/20 rounded-full animate-spin" />
                  <span>Running Pipeline...</span>
                </>
              ) : (
                <span>Proceed to Risk Engine</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Field Mapping Grid */}
      <div>
        <h4 className="section-label mb-3">Detected Mappings</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.entries(fieldMap || {}).map(([canonical, source]) => (
            <div key={canonical} className="bg-white/5 border border-white/5 rounded-lg p-2.5 flex flex-col gap-0.5">
              <span className="text-[10px] text-cyan font-mono font-bold uppercase">{canonical}</span>
              <span className="text-xs text-slate-300 font-medium truncate" title={source}>{source}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Warnings & Errors Logs */}
      <div className="flex flex-col gap-4">
        {/* Errors */}
        {hasErrors && (
          <div className="border border-rose/30 bg-rose/10 rounded-lg p-4 flex gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-rose flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-rose uppercase tracking-wider mb-1">Fatal Errors</h5>
              <ul className="list-disc pl-4 text-xs text-slate-300 flex flex-col gap-1">
                {report.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Warnings */}
        {hasWarnings && (
          <div className="border border-amber/30 bg-amber/10 rounded-lg p-4 flex gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-amber uppercase tracking-wider mb-1">Data Quality Warnings</h5>
              <ul className="list-disc pl-4 text-xs text-slate-300 flex flex-col gap-1">
                {report.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Info */}
        {report.info && report.info.length > 0 && (
          <div className="border border-cyan/30 bg-cyan/10 rounded-lg p-4 flex gap-3">
            <InformationCircleIcon className="h-5 w-5 text-cyan flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-cyan uppercase tracking-wider mb-1">Normalization Actions</h5>
              <ul className="list-disc pl-4 text-xs text-slate-300 flex flex-col gap-1">
                {report.info.map((inf, i) => (
                  <li key={i}>{inf}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Extra unmapped columns */}
      {extraColumns && extraColumns.length > 0 && (
        <div>
          <h4 className="section-label mb-2">Unmapped File Columns</h4>
          <div className="flex flex-wrap gap-1.5">
            {extraColumns.map((col) => (
              <span key={col} className="bg-white/5 border border-white/5 rounded px-2 py-0.5 text-xs text-slate-400 font-mono">
                {col}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationReport;
