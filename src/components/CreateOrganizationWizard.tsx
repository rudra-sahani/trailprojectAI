import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Settings2, Users, CheckCircle2, ArrowRight, ArrowLeft, Plus, Trash2, Globe, Clock, ShieldCheck } from 'lucide-react';
import { UserProfile, CreateOrganizationRequest } from '../../shared/types/api-contracts.js';

interface CreateOrganizationWizardProps {
  currentUser: UserProfile;
  authToken: string;
  onSuccess: (orgData: any, updatedUser: UserProfile) => void;
  onCancel: () => void;
}

export const CreateOrganizationWizard: React.FC<CreateOrganizationWizardProps> = ({
  currentUser,
  authToken,
  onSuccess,
  onCancel
}) => {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1 State
  const [orgName, setOrgName] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [industry, setIndustry] = useState<string>('Technology');
  const [companySize, setCompanySize] = useState<string>('10-50');
  const [website, setWebsite] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('UTC (GMT+0)');

  // Step 2 State
  const [defaultReviewCycle, setDefaultReviewCycle] = useState<string>('Q2 2026');
  const [language, setLanguage] = useState<string>('English (US)');
  const [reviewFrequency, setReviewFrequency] = useState<string>('Quarterly');

  // Step 3 State: Departments & Teams
  const [departments, setDepartments] = useState<{ id: string; name: string; description: string }[]>([
    { id: '1', name: 'Engineering', description: 'Software Development & Systems Architecture' },
    { id: '2', name: 'Product Management', description: 'Product Strategy, Roadmap & Execution' },
    { id: '3', name: 'Design', description: 'User Experience & Industrial Design' }
  ]);
  const [newDeptName, setNewDeptName] = useState<string>('');
  const [newDeptDesc, setNewDeptDesc] = useState<string>('');

  const [teams, setTeams] = useState<{ id: string; name: string; departmentName: string }[]>([
    { id: '1', name: 'Backend Engineering', departmentName: 'Engineering' },
    { id: '2', name: 'Frontend Web', departmentName: 'Engineering' },
    { id: '3', name: 'Core Product', departmentName: 'Product Management' }
  ]);
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [newTeamDept, setNewTeamDept] = useState<string>('Engineering');

  const addDepartment = () => {
    if (!newDeptName.trim()) return;
    setDepartments([
      ...departments,
      { id: Date.now().toString(), name: newDeptName.trim(), description: newDeptDesc.trim() || 'Custom Department' }
    ]);
    setNewDeptName('');
    setNewDeptDesc('');
  };

  const removeDepartment = (id: string) => {
    setDepartments(departments.filter(d => d.id !== id));
  };

  const addTeam = () => {
    if (!newTeamName.trim()) return;
    setTeams([
      ...teams,
      { id: Date.now().toString(), name: newTeamName.trim(), departmentName: newTeamDept }
    ]);
    setNewTeamName('');
  };

  const removeTeam = (id: string) => {
    setTeams(teams.filter(t => t.id !== id));
  };

  const handleComplete = async () => {
    if (!orgName.trim()) {
      setErrorMsg('Organization name is required');
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: CreateOrganizationRequest = {
      name: orgName.trim(),
      logo_url: logoUrl.trim() || undefined,
      industry,
      company_size: companySize,
      website: website.trim() || undefined,
      timezone,
      default_review_cycle: defaultReviewCycle,
      language,
      review_frequency: reviewFrequency,
      departments: departments.map(d => ({ name: d.name, description: d.description })),
      teams: teams.map(t => ({ name: t.name, department_name: t.departmentName }))
    };

    try {
      const res = await fetch('/api/v1/organization/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && data.data) {
        onSuccess(data.data.organization, data.data.user);
      } else {
        setErrorMsg(data.error?.message || 'Failed to create organization');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error creating organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 md:p-8">
      
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl space-y-8">
        
        {/* Wizard Progress Bar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Step {step} of 4</span>
            <span className="text-purple-400">
              {step === 1 && '1. Company Profile'}
              {step === 2 && '2. Review Preferences'}
              {step === 3 && '3. Organization Structure'}
              {step === 4 && '4. Confirmation & Launch'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-purple-500 shadow-md shadow-purple-500/30' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="font-bold ml-2">×</button>
          </div>
        )}

        {/* Wizard Step Content */}
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Company Profile */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Organization Profile</h2>
                  <p className="text-xs text-slate-400">Basic enterprise information for your VeriReview workspace.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Organization Name <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Corporation, Tech Corp"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Industry</label>
                  <select
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-purple-500 focus:outline-none"
                  >
                    <option value="Technology">Technology & Software</option>
                    <option value="Finance">Financial Services</option>
                    <option value="Healthcare">Healthcare & Life Sciences</option>
                    <option value="Consulting">Professional Services & Consulting</option>
                    <option value="Retail">Retail & E-commerce</option>
                    <option value="Manufacturing">Manufacturing & Industrial</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Company Size</label>
                  <select
                    value={companySize}
                    onChange={e => setCompanySize(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-purple-500 focus:outline-none"
                  >
                    <option value="1-10">1 - 10 employees</option>
                    <option value="10-50">10 - 50 employees</option>
                    <option value="50-250">50 - 250 employees</option>
                    <option value="250-1000">250 - 1,000 employees</option>
                    <option value="1000+">1,000+ employees</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Company Website</label>
                  <input
                    type="url"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Timezone</label>
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-purple-500 focus:outline-none"
                  >
                    <option value="UTC (GMT+0)">UTC (GMT+0)</option>
                    <option value="US/Eastern (GMT-5)">US/Eastern (GMT-5)</option>
                    <option value="US/Pacific (GMT-8)">US/Pacific (GMT-8)</option>
                    <option value="Europe/London (GMT+0)">Europe/London (GMT+0)</option>
                    <option value="Asia/Singapore (GMT+8)">Asia/Singapore (GMT+8)</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Logo Image URL (Optional)</label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Review Preferences */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Review Preferences</h2>
                  <p className="text-xs text-slate-400">Configure default evaluation periods and AI pipeline language parameters.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Default Review Period</label>
                  <input
                    type="text"
                    value={defaultReviewCycle}
                    onChange={e => setDefaultReviewCycle(e.target.value)}
                    placeholder="e.g. Q2 2026, FY 2026"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Review Frequency</label>
                  <select
                    value={reviewFrequency}
                    onChange={e => setReviewFrequency(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Quarterly">Quarterly (4x / Year)</option>
                    <option value="Bi-Annual">Bi-Annual (2x / Year)</option>
                    <option value="Annual">Annual (1x / Year)</option>
                    <option value="Continuous">Continuous Feedback Mode</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Primary Report Language</label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="English (US)">English (US)</option>
                    <option value="Spanish">Spanish (Español)</option>
                    <option value="French">French (Français)</option>
                    <option value="German">German (Deutsch)</option>
                    <option value="Japanese">Japanese (日本語)</option>
                  </select>
                  <p className="text-[11px] text-slate-400">VeriReview's Gemini Synthesis agent automatically standardizes raw multilingual feedback into this report language.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Organization Structure */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Organization Structure</h2>
                  <p className="text-xs text-slate-400">Define initial departments and team units.</p>
                </div>
              </div>

              {/* Departments Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Departments</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {departments.map(d => (
                    <div key={d.id} className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{d.name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{d.description}</div>
                      </div>
                      <button onClick={() => removeDepartment(d.id)} className="text-slate-400 hover:text-red-400 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Dept Form */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newDeptName}
                    onChange={e => setNewDeptName(e.target.value)}
                    placeholder="New Dept Name (e.g. Marketing)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                  />
                  <button
                    onClick={addDepartment}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Teams Section */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Teams</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {teams.map(t => (
                    <div key={t.id} className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{t.name}</div>
                        <div className="text-[11px] text-indigo-400">{t.departmentName}</div>
                      </div>
                      <button onClick={() => removeTeam(t.id)} className="text-slate-400 hover:text-red-400 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    placeholder="New Team Name (e.g. Infrastructure)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                  />
                  <select
                    value={newTeamDept}
                    onChange={e => setNewTeamDept(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={addTeam}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Confirmation */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Review & Create Organization</h2>
                  <p className="text-xs text-slate-400">Confirm your enterprise configuration before launching.</p>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 border-b border-slate-700/60 pb-3">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Organization Name</span>
                    <span className="font-extrabold text-white text-sm">{orgName || 'Acme Inc'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Assigned Role</span>
                    <span className="font-bold text-purple-400 uppercase">OWNER</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Industry</span>
                    <span className="text-slate-200">{industry}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Company Size</span>
                    <span className="text-slate-200">{companySize}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-700/60 pb-3">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Default Review Period</span>
                    <span className="text-slate-200 font-semibold">{defaultReviewCycle}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Frequency</span>
                    <span className="text-slate-200 font-semibold">{reviewFrequency}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Configured Structure</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 bg-purple-950/80 border border-purple-800 text-purple-300 rounded-md font-semibold">
                      {departments.length} Departments
                    </span>
                    <span className="px-2.5 py-1 bg-indigo-950/80 border border-indigo-800 text-indigo-300 rounded-md font-semibold">
                      {teams.length} Teams
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center gap-3 text-xs text-emerald-300">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>Creating this organization will automatically generate an immutable audit record and grant you full Owner RBAC administrative controls.</span>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={() => {
              if (step === 1) onCancel();
              else setStep(step - 1);
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{step === 1 ? 'Cancel' : 'Back'}</span>
          </button>

          {step < 4 ? (
            <button
              onClick={() => {
                if (step === 1 && !orgName.trim()) {
                  setErrorMsg('Organization name is required');
                  return;
                }
                setErrorMsg(null);
                setStep(step + 1);
              }}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? 'Creating Organization...' : 'Create Organization & Open Dashboard'}
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
