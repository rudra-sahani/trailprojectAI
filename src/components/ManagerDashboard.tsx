import React, { useState, useEffect } from 'react';
import { FileText, Play, Plus, Clock, Users, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../../shared/types/api-contracts.js';

interface ManagerDashboardProps {
  currentUser: UserProfile;
  onOpenWorkspace: (reviewId: string) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ currentUser, onOpenWorkspace }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [reviewPeriod, setReviewPeriod] = useState('2026-Q2');
  const [startingCycleId, setStartingCycleId] = useState<string | null>(null);

  const token = `token-${currentUser.id}`;

  const fetchManagerData = async () => {
    setLoading(true);
    try {
      // 1. Reviews
      const rRes = await fetch('/api/v1/reviews', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const rData = await rRes.json();
      if (rData.success) setReviews(rData.data);

      // 2. Team members
      const tRes = await fetch('/api/v1/users/team', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tData = await tRes.json();
      if (tData.success) {
        setTeamMembers(tData.data);
        if (tData.data.length > 0) setSelectedEmpId(tData.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching manager dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerData();
  }, [currentUser.id]);

  const handleStartPipeline = async (reviewId: string) => {
    setStartingCycleId(reviewId);
    try {
      const res = await fetch(`/api/v1/reviews/${reviewId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success) {
        onOpenWorkspace(reviewId);
      } else {
        alert(data.error?.message || 'Pipeline execution failed');
      }
    } catch (err: any) {
      alert('Error starting pipeline: ' + err.message);
    } finally {
      setStartingCycleId(null);
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;

    try {
      const res = await fetch('/api/v1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          reviewPeriod,
          managerId: currentUser.id
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        fetchManagerData();
      } else {
        alert(data.error?.message || 'Failed to create review cycle');
      }
    } catch (err: any) {
      alert('Error creating cycle: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Manager Dashboard: {currentUser.full_name}</h1>
            <span className="text-[10px] font-semibold bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">
              Engineering Manager
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Managing direct reports & initiating AI-synthesized 360 performance review cycles.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Initiate Review Cycle</span>
        </button>
      </div>

      {/* Create Cycle Modal */}
      {showCreateModal && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md mx-auto space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Initiate New Review Cycle</h2>
          <form onSubmit={handleCreateCycle} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Employee</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
              >
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name} ({m.employee_code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Review Period</label>
              <input
                type="text"
                value={reviewPeriod}
                onChange={(e) => setReviewPeriod(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow"
              >
                Create Cycle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Review Cycles Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Team Review Cycles ({reviews.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Store-and-Forward AI Pipeline</span>
        </div>

        <div className="space-y-3">
          {reviews.map((cycle) => {
            const isStarting = startingCycleId === cycle.id;
            return (
              <div key={cycle.id} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{cycle.employee_name}</h3>
                    <span className="text-[10px] font-semibold bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                      {cycle.review_period}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                    <span>Stage: <strong className="text-blue-300">{cycle.pipeline_stage || 'COLLECTOR'}</strong></span>
                    <span>Status: <strong className="text-emerald-400">{cycle.status}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {cycle.status === 'DRAFT' || cycle.status === 'COLLECTING_FEEDBACK' ? (
                    <button
                      onClick={() => handleStartPipeline(cycle.id)}
                      disabled={isStarting}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
                    >
                      {isStarting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isStarting ? 'Running AI Agents...' : 'Run 5-Agent Pipeline'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenWorkspace(cycle.id)}
                      className="px-4 py-2 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-xs font-bold rounded-lg shadow transition-all flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
