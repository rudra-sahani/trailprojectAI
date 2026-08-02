import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Edit3, XCircle, FileText, Search, Filter, Sparkles, RefreshCw, CheckSquare, Layers } from 'lucide-react';
import { SeverityBadge } from './ui/severity-badge.tsx';
import { UserProfile } from '../../shared/types/api-contracts.js';

interface ReviewWorkspaceProps {
  reviewId: string;
  currentUser: UserProfile;
  onFinalized?: () => void;
}

export const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({
  reviewId,
  currentUser,
  onFinalized
}) => {
  const [review, setReview] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [biasFlags, setBiasFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'claims' | 'evidence' | 'bias'>('claims');

  // Edit / Reject modal state
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [rejectClaimId, setRejectClaimId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  // Bias Acknowledgment gate
  const [acknowledgedFlags, setAcknowledgedFlags] = useState<Record<string, boolean>>({});

  const token = `token-${currentUser.id}`;

  const fetchWorkspaceData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Review Cycle
      const rRes = await fetch(`/api/v1/reviews/${reviewId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const rData = await rRes.json();
      if (rData.success) setReview(rData.data);

      // 2. Fetch Draft Report
      const repRes = await fetch(`/api/v1/reports/${reviewId}/draft`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const repData = await repRes.json();
      if (repData.success) setReport(repData.data);

      // 3. Fetch Evidence
      const evRes = await fetch(`/api/v1/evidence/${reviewId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const evData = await evRes.json();
      if (evData.success) setEvidence(evData.data.items || []);

      // 4. Fetch Bias
      const biasRes = await fetch(`/api/v1/bias/${reviewId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const biasData = await biasRes.json();
      if (biasData.success) setBiasFlags(biasData.data.flags || []);

    } catch (err) {
      console.error('Error fetching workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [reviewId]);

  const handleClaimDecision = async (claimId: string, action: 'APPROVE' | 'REJECT' | 'EDIT', text?: string, comment?: string) => {
    try {
      const res = await fetch(`/api/v1/claims/${claimId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          editedText: text,
          comment
        })
      });

      const data = await res.json();
      if (data.success) {
        setEditingClaimId(null);
        setRejectClaimId(null);
        fetchWorkspaceData();
      } else {
        alert(data.error?.message || 'Failed to update claim decision');
      }
    } catch (err: any) {
      alert('Error saving decision: ' + err.message);
    }
  };

  const handleFinalizeReport = async () => {
    try {
      const res = await fetch(`/api/v1/reviews/${reviewId}/finalize`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success) {
        alert('Review finalized and report published successfully!');
        if (onFinalized) onFinalized();
        fetchWorkspaceData();
      } else {
        alert(data.error?.message || 'Cannot finalize report');
      }
    } catch (err: any) {
      alert('Finalization failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
        <p className="text-xs font-semibold">Loading VeriReview AI Workspace...</p>
      </div>
    );
  }

  // Calculate pending claims count
  let allClaims: any[] = [];
  if (report?.sections) {
    report.sections.forEach((s: any) => {
      allClaims = allClaims.concat(s.claims);
    });
  }

  const pendingClaimsCount = allClaims.filter(c => c.reviewer_decision === 'PENDING').length;
  const highSeverityFlags = biasFlags.filter(f => f.severity === 'high' || f.severity === 'critical');
  const unacknowledgedHighFlags = highSeverityFlags.filter(f => !acknowledgedFlags[f.flag_id]);

  const canFinalize = pendingClaimsCount === 0 && unacknowledgedHighFlags.length === 0;

  return (
    <div className="space-y-6">
      
      {/* Workspace Header & Action Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Review Workspace: {review?.employee_name}
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 uppercase">
              {review?.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Period: {review?.review_period} • Manager: {review?.manager_name}
          </p>
        </div>

        {/* Finalize Button & Gate Alerts */}
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleFinalizeReport}
            disabled={!canFinalize}
            className={`px-5 py-2.5 rounded-lg font-bold text-xs shadow-lg transition-all flex items-center gap-2 ${
              canFinalize
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Finalize & Publish Report</span>
          </button>

          {!canFinalize && (
            <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {pendingClaimsCount > 0 ? `${pendingClaimsCount} claims pending decision` : `${unacknowledgedHighFlags.length} high bias flags require acknowledgment`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="flex items-center border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'claims'
              ? 'border-blue-500 text-blue-400 bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>AI Claims & Synthesis ({allClaims.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'evidence'
              ? 'border-blue-500 text-blue-400 bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Evidence Explorer ({evidence.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bias')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'bias'
              ? 'border-blue-500 text-blue-400 bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4 text-yellow-400" />
          <span>Bias Analysis ({biasFlags.length})</span>
        </button>
      </div>

      {/* Tab 1: AI Claims & Synthesis Review */}
      {activeTab === 'claims' && (
        <div className="space-y-6">
          {report?.sections?.map((section: any, secIdx: number) => (
            <div key={secIdx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <h2 className="text-sm font-bold text-blue-300 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center justify-between">
                <span>{section.section_type.replace('_', ' ')}</span>
                <span className="text-xs text-slate-400 lowercase font-normal">
                  {section.claims?.length || 0} claim candidate(s)
                </span>
              </h2>

              <div className="space-y-4">
                {section.claims?.map((claim: any) => {
                  const claimFlags = biasFlags.filter(f => f.claim_id === claim.claim_id);
                  const isEditing = editingClaimId === claim.claim_id;
                  const isRejecting = rejectClaimId === claim.claim_id;

                  return (
                    <div key={claim.claim_id} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-3">
                      
                      {/* Claim Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                            claim.reviewer_decision === 'ACCEPTED'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : claim.reviewer_decision === 'REJECTED'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : claim.reviewer_decision === 'EDITED'
                              ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}>
                            {claim.reviewer_decision}
                          </span>
                          <span className="text-xs text-slate-400">
                            Confidence: {((claim.confidence || 0.8) * 100).toFixed(0)}%
                          </span>
                        </div>

                        {/* Bias Badges */}
                        <div className="flex items-center gap-1.5">
                          {claimFlags.map(f => (
                            <SeverityBadge key={f.flag_id} severity={f.severity} />
                          ))}
                        </div>
                      </div>

                      {/* Claim Body / Edit Mode */}
                      {isEditing ? (
                        <div className="space-y-3 bg-slate-900 p-3 rounded-lg border border-indigo-500/50">
                          <div className="text-[11px] text-slate-400 font-semibold">Original Synthesis Text:</div>
                          <p className="text-xs text-slate-400 line-through italic">{claim.text}</p>
                          <label className="block text-xs font-semibold text-indigo-300">Human Edited Text:</label>
                          <textarea
                            rows={3}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingClaimId(null)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleClaimDecision(claim.claim_id, 'EDIT', editText)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg font-bold shadow"
                            >
                              Save Human Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-100 leading-relaxed font-medium">
                            {claim.reviewer_edit_text || claim.text}
                          </p>
                          {claim.reviewer_edit_text && (
                            <div className="text-[10px] text-slate-400 italic">
                              Originally synthesized as: "{claim.text}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reject Modal inline */}
                      {isRejecting && (
                        <div className="space-y-3 bg-slate-900 p-3 rounded-lg border border-rose-500/50">
                          <label className="block text-xs font-semibold text-rose-300">Mandatory Rejection Reason:</label>
                          <textarea
                            rows={2}
                            required
                            placeholder="State reason for rejecting this synthesized claim..."
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setRejectClaimId(null)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleClaimDecision(claim.claim_id, 'REJECT', undefined, rejectComment)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-lg font-bold shadow"
                            >
                              Confirm Rejection
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Evidence Citations */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-700/50">
                        <span className="text-purple-300 font-medium">
                          Citations: {claim.evidence_ids?.length || 0} node(s)
                        </span>

                        {/* Decision Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleClaimDecision(claim.claim_id, 'APPROVE')}
                            className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-md text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Accept</span>
                          </button>

                          <button
                            onClick={() => {
                              setEditingClaimId(claim.claim_id);
                              setEditText(claim.reviewer_edit_text || claim.text);
                            }}
                            className="px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 rounded-md text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => {
                              setRejectClaimId(claim.claim_id);
                              setRejectComment('');
                            }}
                            className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-md text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Evidence Explorer */}
      {activeTab === 'evidence' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Normalized Evidence Items ({evidence.length})</h2>
            <div className="text-xs text-slate-400">Indexed & Tagged by Collector Agent</div>
          </div>

          <div className="space-y-3">
            {evidence.map((node: any) => (
              <div key={node.evidence_id} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-300 uppercase px-2 py-0.5 rounded bg-blue-950 border border-blue-800">
                      {node.source_type}
                    </span>
                    <span>Role: {node.author_role}</span>
                  </div>
                  <span>{new Date(node.submitted_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">{node.text_unit}</p>
                <div className="flex items-center gap-1 pt-1">
                  {node.tags.map((tag: string, tIdx: number) => (
                    <span key={tIdx} className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Bias Analysis & Gate */}
      {activeTab === 'bias' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-yellow-400" />
              <span>Bias Audit & Detection Flags ({biasFlags.length})</span>
            </h2>
            <div className="text-xs text-slate-400">Source Imbalance • Recency Weight • Sentiment Extremity</div>
          </div>

          <div className="space-y-3">
            {biasFlags.map((flag: any) => {
              const isAcked = acknowledgedFlags[flag.flag_id];
              return (
                <div key={flag.flag_id} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={flag.severity} />
                      <span className="text-xs font-bold text-slate-200 uppercase">{flag.flag_type.replace('_', ' ')}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {flag.flag_id.slice(0, 8)}</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{flag.explanation}</p>

                  {(flag.severity === 'high' || flag.severity === 'critical') && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          setAcknowledgedFlags(prev => ({ ...prev, [flag.flag_id]: !isAcked }));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isAcked
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{isAcked ? 'Acknowledged' : 'Acknowledge High-Severity Flag'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
