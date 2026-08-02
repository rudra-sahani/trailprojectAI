import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Activity, History, RefreshCw, CheckCircle, Database, Layers, ArrowRight } from 'lucide-react';
import { UserProfile } from '../../shared/types/api-contracts.js';

interface HrDashboardProps {
  currentUser: UserProfile;
  onNavigate: (tab: string) => void;
}

export const HrDashboard: React.FC<HrDashboardProps> = ({ currentUser, onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [opsQueue, setOpsQueue] = useState<any[]>([]);
  const [ingestionIssues, setIngestionIssues] = useState<any[]>([]);
  const [agentRuns, setAgentRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const token = `token-${currentUser.id}`;

  const fetchHrData = async () => {
    setLoading(true);
    try {
      // 1. Dashboard analytics
      const statsRes = await fetch('/api/v1/analytics/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.data);

      // 2. Operations queue
      const opsRes = await fetch('/api/v1/operations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const opsData = await opsRes.json();
      if (opsData.success) setOpsQueue(opsData.data || []);

      // 3. Ingestion issues
      const ingRes = await fetch('/api/v1/operations/ingestion-issues', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const ingData = await ingRes.json();
      if (ingData.success) setIngestionIssues(ingData.data || []);

      // 4. Agent runs
      const runRes = await fetch('/api/v1/agent-runs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const runData = await runRes.json();
      if (runData.success) setAgentRuns(runData.data || []);

    } catch (err) {
      console.error('Error fetching HR dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHrData();
  }, [currentUser.id]);

  const handleRetrigger = async (opId: string) => {
    try {
      const res = await fetch(`/api/v1/operations/${opId}/retrigger`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert('Pipeline manually re-triggered and resolved successfully!');
        fetchHrData();
      } else {
        alert(data.error?.message || 'Retrigger failed');
      }
    } catch (err: any) {
      alert('Retrigger error: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">HR Governance Command Center</h1>
            <span className="text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
              HR Admin
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            System-wide bias monitoring, operations failure escalation, and immutable compliance audit log.
          </p>
        </div>

        <button
          onClick={() => onNavigate('audit')}
          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-2"
        >
          <History className="w-4 h-4" />
          <span>Open Audit Center</span>
        </button>
      </div>

      {/* KPI Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Total Employees</div>
            <div className="text-2xl font-extrabold text-white mt-1">{stats.totalEmployees}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Active profiles</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Completed Reviews</div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.completedReviews} / {stats.totalReviews}</div>
            <div className="text-[10px] text-emerald-500 mt-0.5">{stats.completionRate}% completion rate</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Active Bias Flags</div>
            <div className="text-2xl font-extrabold text-yellow-400 mt-1">{stats.totalBiasFlags}</div>
            <div className="text-[10px] text-amber-400 mt-0.5">{stats.highSeverityFlags} high severity</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Human Overrides</div>
            <div className="text-2xl font-extrabold text-indigo-400 mt-1">{stats.humanOverrides}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Audited edits</div>
          </div>
        </div>
      )}

      {/* Operations Queue (Escalated Jobs) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Operations & Failure Escalation Queue ({opsQueue.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Manual Re-trigger Capabilities</span>
        </div>

        {opsQueue.length > 0 ? (
          <div className="space-y-3">
            {opsQueue.map((op) => (
              <div key={op.id} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-300 uppercase px-2 py-0.5 bg-rose-950 border border-rose-800 rounded">
                      {op.status}
                    </span>
                    <span className="text-xs font-bold text-white">Employee: {op.employeeName || op.review_id}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Failed Stage: <strong className="text-slate-100">{op.failed_stage}</strong> • Reason: {op.failure_reason}
                  </p>
                </div>

                <button
                  onClick={() => handleRetrigger(op.id)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-trigger Pipeline</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-400 flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Zero escalated pipeline failures in Operations Queue. All agents operating cleanly.</span>
          </div>
        )}
      </div>

      {/* AI Agents Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            <span>5-Agent Pipeline Health & Performance Matrix</span>
          </h2>
          <span className="text-xs text-slate-400">Store-and-Forward Architecture</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="text-[10px] font-bold text-blue-400 uppercase">1. Collector</div>
            <div className="text-xs font-bold text-white mt-1">ONLINE</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Atomic Segmentation</div>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="text-[10px] font-bold text-indigo-400 uppercase">2. Retrieval</div>
            <div className="text-xs font-bold text-white mt-1">ONLINE</div>
            <div className="text-[10px] text-slate-400 mt-0.5">0.3 Coverage Floor</div>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="text-[10px] font-bold text-yellow-400 uppercase">3. Bias Detection</div>
            <div className="text-xs font-bold text-white mt-1">ONLINE</div>
            <div className="text-[10px] text-slate-400 mt-0.5">4-Check Guardrails</div>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="text-[10px] font-bold text-teal-400 uppercase">4. Synthesis</div>
            <div className="text-xs font-bold text-white mt-1">ONLINE</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Cited Drafting</div>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="text-[10px] font-bold text-purple-400 uppercase">5. Human Review</div>
            <div className="text-xs font-bold text-white mt-1">ONLINE</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Human-in-the-Loop</div>
          </div>
        </div>
      </div>

    </div>
  );
};
