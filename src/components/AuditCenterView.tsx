import React, { useState, useEffect } from 'react';
import { History, Shield, Filter, Download, ArrowRight, UserCheck, Bot } from 'lucide-react';
import { UserProfile } from '../../shared/types/api-contracts.js';

interface AuditCenterViewProps {
  currentUser: UserProfile;
}

export const AuditCenterView: React.FC<AuditCenterViewProps> = ({ currentUser }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const token = `token-${currentUser.id}`;

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/audit', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [currentUser.id]);

  const filteredLogs = logs.filter(log => {
    if (filterType === 'ALL') return true;
    if (filterType === 'HUMAN') return log.actor?.actor_type === 'human';
    if (filterType === 'AGENT') return log.actor?.actor_type === 'agent';
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              <span>Immutable Audit & Compliance Center</span>
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 uppercase">
              Append-Only Ledger
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete cryptographic audit trail recording all AI agent executions and human review overrides.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 flex items-center gap-1 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded font-semibold transition-all ${
                filterType === 'ALL' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Events ({logs.length})
            </button>
            <button
              onClick={() => setFilterType('HUMAN')}
              className={`px-3 py-1 rounded font-semibold transition-all ${
                filterType === 'HUMAN' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Human Overrides
            </button>
            <button
              onClick={() => setFilterType('AGENT')}
              className={`px-3 py-1 rounded font-semibold transition-all ${
                filterType === 'AGENT' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Agent Pipeline
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Audit Log Records</h2>
          <span className="text-xs text-slate-400">Strictly Append-Only (NO UPDATE / DELETE)</span>
        </div>

        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isAgent = log.actor?.actor_type === 'agent';
            return (
              <div key={log.log_id} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase flex items-center gap-1 ${
                      isAgent
                        ? 'bg-blue-950 text-blue-300 border-blue-800'
                        : 'bg-purple-950 text-purple-300 border-purple-800'
                    }`}>
                      {isAgent ? <Bot className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                      <span>{log.actor?.actor_type}: {log.actor?.actor_id}</span>
                    </span>
                    <span className="text-xs font-bold text-slate-200 uppercase">{log.event_type}</span>
                  </div>
                  <span className="font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                </div>

                {/* Event Details & Diff */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {log.before_state && (
                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px] space-y-1">
                      <div className="font-bold text-rose-400 uppercase text-[10px]">Before State</div>
                      <pre className="font-mono text-[10px] text-slate-300 whitespace-pre-wrap">
                        {JSON.stringify(log.before_state, null, 2)}
                      </pre>
                    </div>
                  )}

                  {log.after_state && (
                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px] space-y-1">
                      <div className="font-bold text-emerald-400 uppercase text-[10px]">After State</div>
                      <pre className="font-mono text-[10px] text-slate-300 whitespace-pre-wrap">
                        {JSON.stringify(log.after_state, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-500 font-mono pt-1">Log UUID: {log.log_id}</div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
