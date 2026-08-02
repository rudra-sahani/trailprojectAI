import React from 'react';
import { LayoutDashboard, FileText, Search, ShieldCheck, History, AlertTriangle, Layers, Settings, Users, MessageSquarePlus, Sparkles, Building2, UserCheck } from 'lucide-react';
import { UserRole } from '../../shared/types/common.js';

interface SidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  userRole: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onNavigate, userRole }) => {
  const isHr = userRole === 'HR_ADMIN';
  const isManager = userRole === 'MANAGER' || isHr;

  return (
    <aside className="w-64 bg-[#0E1626] border-r border-[#A28089]/20 text-slate-300 flex flex-col justify-between p-4 shrink-0 min-h-[calc(100vh-4rem)] transition-colors">
      <div className="space-y-6">
        
        {/* Main Section */}
        <div>
          <div className="text-[10px] font-bold text-[#A28089] uppercase tracking-wider mb-2 px-3 font-mono">
            Core Workspace
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus-ring ${
                currentTab === 'dashboard'
                  ? 'bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 shadow-sm'
                  : 'hover:bg-[#131F33] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4 text-[#51E2F5]" />
                <span className="font-display">Dashboard</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('organization')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus-ring ${
                currentTab === 'organization'
                  ? 'bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 shadow-sm'
                  : 'hover:bg-[#131F33] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-[#FFA8BE]" />
                <span className="font-display">Organization</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded badge-pink">
                SaaS
              </span>
            </button>

        {/* Workforce Section */}
        <div>
          <div className="text-[10px] font-bold text-[#A28089] uppercase tracking-wider mb-2 px-3 font-mono">
            Workforce
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => onNavigate('employees')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus-ring ${
                currentTab === 'employees'
                  ? 'bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 shadow-sm'
                  : 'hover:bg-[#131F33] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-[#51E2F5]" />
                <span className="font-display">Employees</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('departments')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus-ring ${
                currentTab === 'departments'
                  ? 'bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 shadow-sm'
                  : 'hover:bg-[#131F33] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-[#9DF9EF]" />
                <span className="font-display">Departments</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('teams')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus-ring ${
                currentTab === 'teams'
                  ? 'bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 shadow-sm'
                  : 'hover:bg-[#131F33] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4 text-[#FFA8BE]" />
                <span className="font-display">Teams</span>
              </div>
            </button>
          </nav>
        </div>

            {isManager && (
              <button
                onClick={() => onNavigate('reviews')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus-ring ${
                  currentTab === 'reviews' || currentTab === 'workspace'
                    ? 'bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 shadow-sm'
                    : 'hover:bg-[#131F33] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-[#9DF9EF]" />
                  <span className="font-display">Review Workspace</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full badge-mint">
                  Active
                </span>
              </button>
            )}

            <button
              onClick={() => onNavigate('feedback')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus-ring ${
                currentTab === 'feedback'
                  ? 'bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 shadow-sm'
                  : 'hover:bg-[#131F33] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquarePlus className="w-4 h-4 text-emerald-400" />
                <span className="font-display">Submit Feedback</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Atomic
              </span>
            </button>
          </nav>
        </div>

        {/* Intelligence & Evidence */}
        <div>
          <div className="text-[10px] font-bold text-[#A28089] uppercase tracking-wider mb-2 px-3 font-mono">
            AI & Evidence Nodes
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => onNavigate('evidence')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus-ring ${
                currentTab === 'evidence'
                  ? 'bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 shadow-sm'
                  : 'hover:bg-[#131F33] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-[#51E2F5]" />
                <span className="font-display">Evidence Explorer</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('bias')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus-ring ${
                currentTab === 'bias'
                  ? 'bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 shadow-sm'
                  : 'hover:bg-[#131F33] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="font-display">Bias Guardrails</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                4 Rules
              </span>
            </button>
          </nav>
        </div>

        {/* Governance & Admin (HR / Admin) */}
        {isHr && (
          <div>
            <div className="text-[10px] font-bold text-[#A28089] uppercase tracking-wider mb-2 px-3 font-mono">
              Governance & Compliance
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => onNavigate('audit')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus-ring ${
                  currentTab === 'audit'
                    ? 'bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 shadow-sm'
                    : 'hover:bg-[#131F33] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <History className="w-4 h-4 text-[#51E2F5]" />
                  <span className="font-display">Audit Center</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded badge-cyan">
                  Ledger
                </span>
              </button>

              <button
                onClick={() => onNavigate('ops-queue')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus-ring ${
                  currentTab === 'ops-queue'
                    ? 'bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 shadow-sm'
                    : 'hover:bg-[#131F33] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-[#FFA8BE]" />
                  <span className="font-display">Operations Queue</span>
                </div>
              </button>

              <button
                onClick={() => onNavigate('agents-health')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus-ring ${
                  currentTab === 'agents-health'
                    ? 'bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 shadow-sm'
                    : 'hover:bg-[#131F33] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-[#9DF9EF]" />
                  <span className="font-display">5-Agent Matrix</span>
                </div>
              </button>
            </nav>
          </div>
        )}

      </div>

      <div className="pt-4 border-t border-[#A28089]/20 text-[11px] text-slate-500 text-center flex flex-col gap-1">
        <div className="flex items-center justify-center gap-1.5 text-slate-400 font-semibold font-display">
          <Sparkles className="w-3 h-3 text-[#51E2F5]" />
          <span>VeriReview Engine v1.0</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">Store-and-Forward Compliance</div>
      </div>
    </aside>
  );
};
