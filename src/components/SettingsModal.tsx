import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, User, Building, Cpu, Sliders, Bell, Key, Check, Info } from 'lucide-react';
import { UserProfile } from '../../shared/types/api-contracts.js';
import { useToast } from './ui/Toast.tsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'governance' | 'agents' | 'notifications'>('profile');
  const [retrievalFloor, setRetrievalFloor] = useState<number>(0.3);
  const [recencyWindow, setRecencyWindow] = useState<number>(90);
  const [emailAlerts, setEmailAlerts] = useState<boolean>(true);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSaveSettings = () => {
    addToast({
      type: 'success',
      title: 'Settings Saved',
      description: 'Your governance preferences and agent threshold configurations have been updated.'
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-950 text-purple-400 border border-purple-800">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">System & Profile Settings</h2>
                <p className="text-xs text-slate-400">Manage user context, agent thresholds, and governance compliance preferences.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 pt-3 bg-slate-900/50 border-b border-slate-800 flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'profile'
                  ? 'border-purple-500 text-purple-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>User Profile</span>
            </button>

            <button
              onClick={() => setActiveTab('governance')}
              className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'governance'
                  ? 'border-purple-500 text-purple-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Organization</span>
            </button>

            <button
              onClick={() => setActiveTab('agents')}
              className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'agents'
                  ? 'border-purple-500 text-purple-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Agent Guardrails</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'notifications'
                  ? 'border-purple-500 text-purple-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Alerts</span>
            </button>
          </div>

          {/* Tab Contents */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/60">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg">
                    {currentUser.full_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{currentUser.full_name}</h3>
                    <p className="text-xs text-slate-400">{currentUser.job_title} • {currentUser.department}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                        {currentUser.role}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Code: {currentUser.employee_code}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-700/50 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Email Address</span>
                    <p className="font-semibold text-slate-200">{currentUser.email}</p>
                  </div>
                  <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-700/50 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Session Identity Token</span>
                    <p className="font-mono text-[11px] text-purple-300">token-{currentUser.id.substring(0, 8)}...</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'governance' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700 space-y-2">
                  <h3 className="font-bold text-sm text-white">Active Organization: VeriReview Enterprise HQ</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Connected to compliant multi-agent evaluation pipeline with strict append-only audit stream.
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded font-bold text-[10px]">
                      SOC2 Type II Certified
                    </span>
                    <span className="px-2.5 py-1 bg-blue-950 border border-blue-800 text-blue-300 rounded font-bold text-[10px]">
                      GDPR Compliant Store-and-Forward
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'agents' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">Retrieval Agent Coverage Floor</h4>
                      <p className="text-slate-400 text-[11px]">Minimum proportion of feedback sources required in synthesis.</p>
                    </div>
                    <span className="font-mono font-bold text-purple-400 text-sm">{retrievalFloor}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={retrievalFloor}
                    onChange={(e) => setRetrievalFloor(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">Recency Bias Window (Days)</h4>
                      <p className="text-slate-400 text-[11px]">Time horizon to monitor for disproportionate feedback weighting.</p>
                    </div>
                    <span className="font-mono font-bold text-purple-400 text-sm">{recencyWindow} days</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    step="15"
                    value={recencyWindow}
                    onChange={(e) => setRecencyWindow(parseInt(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-slate-700">
                  <div>
                    <h4 className="font-bold text-white text-sm">High-Severity Bias Escalation Alerts</h4>
                    <p className="text-slate-400">Receive instant notifications when high severity bias flags occur in review drafts.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
