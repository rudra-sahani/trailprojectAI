import React from 'react';
import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';
import { Severity } from '../../../shared/types/common.js';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className = '' }) => {
  switch (severity) {
    case 'critical':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-950/80 text-red-300 border border-red-800 ${className}`}>
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          <span>CRITICAL BIAS</span>
        </span>
      );
    case 'high':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800 ${className}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>HIGH SEVERITY</span>
        </span>
      );
    case 'medium':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-yellow-950/60 text-yellow-300 border border-yellow-800/60 ${className}`}>
          <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
          <span>MEDIUM RISK</span>
        </span>
      );
    case 'low':
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 ${className}`}>
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>LOW SEVERITY</span>
        </span>
      );
  }
};
