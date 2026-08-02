import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Archive, RefreshCw, Trash2, X } from 'lucide-react';

interface ArchiveConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  actionType: 'archive' | 'restore' | 'delete';
  isSubmitting?: boolean;
  errorMsg?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const ArchiveConfirmModal: React.FC<ArchiveConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  actionType,
  isSubmitting = false,
  errorMsg = null,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  const iconMap = {
    archive: <Archive className="w-5 h-5 text-amber-400" />,
    restore: <RefreshCw className="w-5 h-5 text-emerald-400" />,
    delete: <Trash2 className="w-5 h-5 text-red-400" />
  };

  const bgMap = {
    archive: 'bg-amber-950/60 border-amber-800/60',
    restore: 'bg-emerald-950/60 border-emerald-800/60',
    delete: 'bg-red-950/60 border-red-800/60'
  };

  const btnMap = {
    archive: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30',
    restore: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30',
    delete: 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${bgMap[actionType]}`}>
              {iconMap[actionType]}
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className={`px-4 py-2 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 ${btnMap[actionType]}`}
            >
              {isSubmitting ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
