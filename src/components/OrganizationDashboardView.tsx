import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Building2, Users, Layers, Repeat, ShieldCheck, Mail, Plus, Sparkles,
  AlertTriangle, CheckCircle2, TrendingUp, UserCog, Activity, FileText, ArrowUpRight
} from 'lucide-react';
import { UserProfile } from '../../shared/types/api-contracts.js';

interface OrganizationDashboardViewProps {
  currentUser: UserProfile;
  authToken: string;
  onOpenInvitations: () => void;
  onNavigateToReviews: () => void;
}

export const OrganizationDashboardView: React.FC<OrganizationDashboardViewProps> = ({
  currentUser,
  authToken,
  onOpenInvitations,
  onNavigateToReviews
}) => {
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'departments' | 'reviews' | 'activity'>('overview');
  const [selectedRoleUser, setSelectedRoleUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('EMPLOYEE');
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/organization/dashboard', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setDashboardData(data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [authToken]);

  const handleRoleChange = async (userId: string) => {
    try {
      const res = await fetch('/api/v1/organization/users/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ userId, role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`Role updated to ${newRole}`);
        setSelectedRoleUser(null);
        fetchDashboard();
      }
    } catch (err) {
      console.error('Role update error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-64 flex items-center justify-center p-12 text-slate-400 text-sm">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-purple-400 animate-spin" />
          <span>Loading Enterprise Organization Workspace...</span>
        </div>
      </div>
    );
  }

  const overview = dashboardData?.overview || {};
  const health = dashboardData?.health || {};
  const employees = dashboardData?.employees || [];
  const departments = dashboardData?.departments || [];
  const teams = dashboardData?.teams || [];
  const reviewCycles = dashboardData?.reviewCycles || [];
  const pendingActions = dashboardData?.pendingActions || [];
  const aiPipelineStatus = dashboardData?.aiPipelineStatus || {};

  return (
    <div className="space-y-8">
      
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/30 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800/80 text-purple-300 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Organization Code: {overview.orgCode || 'ORG-DEV'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            {overview.organizationName || 'VeriReview AI Organization'}
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Enterprise management hub. Monitor review participation, manage RBAC roles, invite team members, and observe zero-hallucination AI pipeline health.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={onOpenInvitations}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            <span>Invite Team Members</span>
          </button>

          <button
            onClick={onNavigateToReviews}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-2"
          >
            <Repeat className="w-4 h-4 text-indigo-400" />
            <span>Review Cycles</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="font-bold">×</button>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-6 overflow-x-auto text-xs font-bold text-slate-400">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview' ? 'border-purple-500 text-purple-300' : 'border-transparent hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Overview & Health</span>
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'employees' ? 'border-purple-500 text-purple-300' : 'border-transparent hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Employees ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'departments' ? 'border-purple-500 text-purple-300' : 'border-transparent hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('teams')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'teams' ? 'border-purple-500 text-purple-300' : 'border-transparent hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-400" />
          <span>Teams ({teams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reviews' ? 'border-purple-500 text-purple-300' : 'border-transparent hover:text-white'
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>Review Cycles ({reviewCycles.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & HEALTH */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Employees</span>
              <div className="text-3xl font-black text-white">{overview.totalEmployees}</div>
              <span className="text-[11px] text-purple-400 font-semibold">{overview.totalManagers} Managers/Owners</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Departments</span>
              <div className="text-3xl font-black text-white">{overview.totalDepartments}</div>
              <span className="text-[11px] text-indigo-400 font-semibold">Active structure</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Review Cycles</span>
              <div className="text-3xl font-black text-white">{overview.activeReviewCycles}</div>
              <span className="text-[11px] text-emerald-400 font-semibold">Under evaluation</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">AI Grounding Score</span>
              <div className="text-3xl font-black text-emerald-400">{(health.averageConfidence * 100).toFixed(0)}%</div>
              <span className="text-[11px] text-slate-400">Zero-hallucination verified</span>
            </div>
          </div>

          {/* AI Pipeline Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-white">AI Pipeline Health & Operational Status</h3>
                <p className="text-xs text-slate-400">Live monitoring of the 5-stage VeriReview AI architecture.</p>
              </div>
              <span className="px-3 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-full flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>All Agents Online</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(aiPipelineStatus).map(([agentKey, agentVal]: [string, any]) => (
                <div key={agentKey} className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-300">{agentKey} AGENT</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                      {agentVal.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{agentVal.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Pending Organization Actions ({pendingActions.length})</h3>
            
            {pendingActions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-800/30 rounded-2xl">
                No pending actions. All invitations and review cycles are up to date!
              </div>
            ) : (
              <div className="space-y-2">
                {pendingActions.map((action: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{action.title}</div>
                      <div className="text-[11px] text-slate-400">{action.subtitle}</div>
                    </div>
                    <button
                      onClick={action.type === 'INVITATION' ? onOpenInvitations : onNavigateToReviews}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs"
                    >
                      Action
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: EMPLOYEES & ROLES */}
      {activeTab === 'employees' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-white">Organization Employees</h3>
              <p className="text-xs text-slate-400">Manage user roles and department allocations.</p>
            </div>

            <button
              onClick={onOpenInvitations}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Invite Member</span>
            </button>
          </div>

          {employees.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-slate-800/30 rounded-2xl border border-slate-700 space-y-3">
              <Users className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="font-bold text-slate-200">No employees found in this organization yet</p>
              <p>Invite employees or managers to get started with VeriReview AI.</p>
              <button onClick={onOpenInvitations} className="px-4 py-2 bg-purple-600 text-white font-bold rounded-xl text-xs">
                Send Invitation
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-xl">Employee</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 rounded-r-xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {employees.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{emp.full_name}</td>
                      <td className="p-3 text-slate-400">{emp.email}</td>
                      <td className="p-3 text-slate-300">{emp.department_name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          emp.role === 'OWNER' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                          emp.role === 'HR_ADMIN' ? 'bg-indigo-950 text-indigo-300 border-indigo-800' :
                          emp.role === 'MANAGER' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                          'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {emp.role}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {(currentUser.role === 'OWNER' || currentUser.role === 'HR_ADMIN') && (
                          selectedRoleUser === emp.id ? (
                            <div className="inline-flex items-center gap-1">
                              <select
                                value={newRole}
                                onChange={e => setNewRole(e.target.value)}
                                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                              >
                                <option value="EMPLOYEE">EMPLOYEE</option>
                                <option value="MANAGER">MANAGER</option>
                                <option value="HR_ADMIN">HR_ADMIN</option>
                                <option value="OWNER">OWNER</option>
                              </select>
                              <button onClick={() => handleRoleChange(emp.id)} className="px-2 py-1 bg-emerald-600 text-white font-bold rounded text-xs">Save</button>
                              <button onClick={() => setSelectedRoleUser(null)} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">Cancel</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setSelectedRoleUser(emp.id); setNewRole(emp.role); }}
                              className="text-purple-400 hover:text-purple-300 font-bold underline"
                            >
                              Change Role
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-white">Departments Directory</h3>
              <p className="text-xs text-slate-400">Organizational units for review feedback routing.</p>
            </div>
          </div>

          {departments.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-slate-800/30 rounded-2xl border border-slate-700 space-y-3">
              <Building2 className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="font-bold text-slate-200">No departments found</p>
              <p>Add departments to categorize feedback collections.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {departments.map((dept: any) => (
                <div key={dept.id} className="p-5 bg-slate-800/50 border border-slate-700/60 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-white text-sm">{dept.name}</h4>
                    <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] rounded font-bold">
                      {dept.employee_count || 0} Members
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{dept.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TEAMS */}
      {activeTab === 'teams' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-white">Teams Directory</h3>
              <p className="text-xs text-slate-400">Cross-functional groups and working teams across departments.</p>
            </div>
          </div>

          {teams.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-slate-800/30 rounded-2xl border border-slate-700 space-y-3">
              <Users className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="font-bold text-slate-200">No teams found</p>
              <p>Create teams to group employees for targeted review workflows.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {teams.map((team: any) => (
                <div key={team.id} className="p-5 bg-slate-800/50 border border-slate-700/60 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-white text-sm">{team.name}</h4>
                    <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] rounded font-bold">
                      {team.member_count || 0} Members
                    </span>
                  </div>
                  <div className="text-[10px] text-indigo-300 font-semibold">{team.department_name}</div>
                  <p className="text-xs text-slate-400">{team.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REVIEW CYCLES */}
      {activeTab === 'reviews' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-white">Active & Historical Review Cycles</h3>
              <p className="text-xs text-slate-400">AI-powered performance review execution tracking.</p>
            </div>

            <button
              onClick={onNavigateToReviews}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <span>Go to Reviews</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {reviewCycles.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-slate-800/30 rounded-2xl border border-slate-700 space-y-3">
              <Repeat className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="font-bold text-slate-200">No review cycles created yet</p>
              <p>Navigate to the Review Cycles module to launch your first performance evaluation.</p>
              <button onClick={onNavigateToReviews} className="px-4 py-2 bg-purple-600 text-white font-bold rounded-xl text-xs">
                Launch Review Cycle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewCycles.map((cycle: any) => (
                <div key={cycle.id} className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white text-sm">{cycle.review_period}</div>
                    <div className="text-[11px] text-slate-400">Employee ID: {cycle.employee_id}</div>
                  </div>
                  <span className="px-3 py-1 bg-purple-950 border border-purple-800 text-purple-300 font-bold rounded-full text-[10px]">
                    {cycle.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
