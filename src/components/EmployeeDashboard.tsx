import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, AlertCircle, Eye, ShieldAlert, Sparkles, MessageSquare } from 'lucide-react';
import { UserProfile } from '../../shared/types/api-contracts.js';
import { FeedbackSubmissionModal } from './FeedbackSubmissionModal.tsx';

interface EmployeeDashboardProps {
  currentUser: UserProfile;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ currentUser }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeReport, setActiveReport] = useState<any | null>(null);
  const [showSubmission, setShowSubmission] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      const token = `token-${currentUser.id}`;
      const res = await fetch('/api/v1/reviews', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReviews(data.data);
        const finalized = data.data.find((r: any) => r.status === 'FINALIZED');
        if (finalized) {
          fetchFinalizedReport(finalized.id);
        }
      }
    } catch (err) {
      console.error('Error fetching employee reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinalizedReport = async (reviewId: string) => {
    try {
      const token = `token-${currentUser.id}`;
      const res = await fetch(`/api/v1/reports/${reviewId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setActiveReport(data.data);
      }
    } catch (err) {
      console.error('Error fetching finalized report:', err);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
  }, [currentUser.id]);

  const latestCycle = reviews[0];

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Welcome, {currentUser.full_name}</h1>
            <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
              Active Employee
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Department: {currentUser.department} • Role: {currentUser.job_title} ({currentUser.employee_code})
          </p>
        </div>

        <button
          onClick={() => setShowSubmission(!showSubmission)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{showSubmission ? 'Close Submission' : 'Submit Self / Peer Feedback'}</span>
        </button>
      </div>

      {/* Submission Panel */}
      {showSubmission && (
        <FeedbackSubmissionModal
          currentUser={currentUser}
          employees={[]}
          onSubmitSuccess={() => {
            setShowSubmission(false);
            fetchEmployeeData();
          }}
        />
      )}

      {/* Active Cycle Progress */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Current Performance Review Status</span>
          </h2>
          <span className="text-xs text-slate-400">Cycle Period: 2026-Q2</span>
        </div>

        {latestCycle ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <div className="text-[10px] font-medium text-slate-400">Pipeline Stage</div>
              <div className="text-sm font-bold text-blue-300 mt-1">{latestCycle.pipeline_stage || 'COLLECTOR'}</div>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <div className="text-[10px] font-medium text-slate-400">Review Status</div>
              <div className="text-sm font-bold text-emerald-400 mt-1">{latestCycle.status}</div>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <div className="text-[10px] font-medium text-slate-400">Manager Assigned</div>
              <div className="text-sm font-bold text-slate-200 mt-1">{latestCycle.manager_name}</div>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <div className="text-[10px] font-medium text-slate-400">Privacy Protection</div>
              <div className="text-xs font-semibold text-purple-300 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                <span>Anonymized Peer Quotes</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-400">No active performance review cycle found.</div>
        )}
      </div>

      {/* Published Performance Report View */}
      {activeReport ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>Finalized 360° Performance Report</span>
              </h2>
              <p className="text-xs text-slate-400">Published on {new Date(activeReport.finalized_at || Date.now()).toLocaleDateString()}</p>
            </div>
            <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold rounded-lg">
              PUBLISHED & FINALIZED
            </span>
          </div>

          <div className="space-y-6">
            {activeReport.sections.map((section: any, idx: number) => (
              <div key={idx} className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider border-b border-slate-700/50 pb-2">
                  {section.section_type.replace('_', ' ')}
                </h3>
                <div className="space-y-2">
                  {section.claims.map((claim: any) => (
                    <div key={claim.claim_id} className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/80 space-y-2">
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        {claim.reviewer_edit_text || claim.text}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-700/50 pt-2">
                        <span>Confidence Score: {((claim.confidence || 0.8) * 100).toFixed(0)}%</span>
                        <span className="text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                          {claim.evidence_ids.length} Citation Ref(s)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <FileText className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">Final Report Under Human Review</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your performance draft report is currently undergoing manager human-in-the-loop audit and verification. It will become visible here once finalized.
          </p>
        </div>
      )}

    </div>
  );
};
