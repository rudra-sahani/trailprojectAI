import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { FeedbackSource, UserRole } from '../../shared/types/common.js';
import { UserProfile } from '../../shared/types/api-contracts.js';

interface FeedbackSubmissionProps {
  currentUser: UserProfile;
  employees: UserProfile[];
  onSubmitSuccess: () => void;
}

export const FeedbackSubmissionModal: React.FC<FeedbackSubmissionProps> = ({
  currentUser,
  employees,
  onSubmitSuccess
}) => {
  const [sourceType, setSourceType] = useState<FeedbackSource>('SELF_ASSESSMENT');
  const [subjectEmployeeId, setSubjectEmployeeId] = useState<string>(
    currentUser.role === 'EMPLOYEE' ? currentUser.id : (employees[0]?.id || currentUser.id)
  );
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setSuccessMsg('');

    let endpoint = '/api/v1/feedback/self';
    if (sourceType === 'PEER_FEEDBACK') endpoint = '/api/v1/feedback/peer';
    else if (sourceType === 'MANAGER_FEEDBACK') endpoint = '/api/v1/feedback/manager';
    else if (sourceType === 'GOALS') endpoint = '/api/v1/feedback/goals';
    else if (sourceType === 'PROJECT_OUTCOMES') endpoint = '/api/v1/feedback/projects';
    else if (sourceType === 'MEETING_NOTES') endpoint = '/api/v1/feedback/meetings';

    try {
      const token = `token-${currentUser.id}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sourceType,
          subjectEmployeeId,
          title: title || `${sourceType} Feedback`,
          content
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Feedback submitted successfully! Normalized into evidence nodes.');
        setContent('');
        setTitle('');
        onSubmitSuccess();
      } else {
        alert(data.error?.message || 'Feedback submission failed');
      }
    } catch (err: any) {
      alert('Error submitting feedback: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Submit Performance Feedback</h2>
        <p className="text-xs text-slate-400">All submitted feedback is normalized into atomic evidence nodes by the Collector Agent.</p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Source Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Feedback Source Type</label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as FeedbackSource)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="SELF_ASSESSMENT">Self Assessment</option>
            <option value="PEER_FEEDBACK">Peer Feedback</option>
            <option value="MANAGER_FEEDBACK">Manager Feedback</option>
            <option value="GOALS">Goals & KPIs</option>
            <option value="PROJECT_OUTCOMES">Project Outcomes</option>
            <option value="MEETING_NOTES">Meeting Notes</option>
          </select>
        </div>

        {/* Target Employee */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Subject Employee</label>
          {currentUser.role === 'EMPLOYEE' ? (
            <input
              type="text"
              readOnly
              value={currentUser.full_name}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
            />
          ) : (
            <select
              value={subjectEmployeeId}
              onChange={(e) => setSubjectEmployeeId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_code})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Title / Context (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Q2 Database Migration Project Outcome"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Feedback Content */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Feedback Content & Observations</label>
          <textarea
            rows={5}
            required
            placeholder="Provide specific, observable feedback, achievements, challenges, or goals..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-5 rounded-lg text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
