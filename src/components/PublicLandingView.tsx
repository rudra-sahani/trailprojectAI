import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  Brain,
  Layers,
  Cpu,
  CheckCircle2,
  ArrowRight,
  Lock,
  Eye,
  Database,
  Sparkles,
  AlertTriangle,
  FileText,
  Activity,
  UserCheck,
  Scale,
  GitCommit,
  Zap,
  BarChart3,
  ChevronRight,
  ExternalLink,
  Sliders,
  Check,
  X,
  Building2,
  UserPlus,
  FileSpreadsheet,
  PlayCircle,
  ShieldAlert,
  FileCheck,
  ArrowDown,
  Globe,
  HelpCircle
} from 'lucide-react';
import { UserRole } from '../../shared/types/common.js';

interface PublicLandingViewProps {
  onSignIn?: () => void;
  onGetStarted?: () => void;
  onDemoLogin?: (email: string, role: UserRole) => void;
  onExploreDemo?: () => void;
}

export const PublicLandingView: React.FC<PublicLandingViewProps> = ({
  onSignIn,
  onGetStarted,
  onDemoLogin,
  onExploreDemo
}) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'guardrails' | 'audit' | 'evidence'>('agents');
  const [activeRolePreview, setActiveRolePreview] = useState<'hr' | 'manager' | 'employee'>('hr');

  const handleRoleAction = (email: string, role: UserRole) => {
    if (onDemoLogin) {
      onDemoLogin(email, role);
    } else if (onExploreDemo) {
      onExploreDemo();
    }
  };

  // Enterprise Workflow Steps
  const workflowSteps = [
    {
      step: '01',
      title: 'Create Organization',
      icon: Building2,
      accentColor: '#51E2F5',
      badge: 'SSO & Tenant Setup',
      description: 'Provision an isolated enterprise workspace with custom governance thresholds, domain SSO, and department structures.'
    },
    {
      step: '02',
      title: 'Invite Team & HRIS Sync',
      icon: UserPlus,
      accentColor: '#9DF9EF',
      badge: 'Bulk Import',
      description: 'Seamlessly sync employee directory, manager hierarchies, and team scopes via bulk import or HRIS integration.'
    },
    {
      step: '03',
      title: 'Launch Review Cycle',
      icon: PlayCircle,
      accentColor: '#51E2F5',
      badge: 'Automated Triggers',
      description: 'Define annual or quarterly review periods, evaluation parameters, deadline rules, and participant scopes.'
    },
    {
      step: '04',
      title: 'Collect 360° Feedback',
      icon: FileSpreadsheet,
      accentColor: '#FFA8BE',
      badge: 'Multi-Source',
      description: 'Gather self-assessments, peer feedback, manager notes, goal achievements, and project outcome metrics.'
    },
    {
      step: '05',
      title: '5-Agent AI Analysis',
      icon: Cpu,
      accentColor: '#51E2F5',
      badge: 'Store-and-Forward',
      description: 'Collector atomizes raw text into evidence nodes; Retrieval clusters themes; Bias Agent runs 4 deterministic & LLM scans.'
    },
    {
      step: '06',
      title: 'Human Review & Override',
      icon: UserCheck,
      accentColor: '#FFA8BE',
      badge: 'Line-by-Line',
      description: 'Managers inspect claims sentence by sentence, edit prose, and acknowledge high-severity bias warnings.'
    },
    {
      step: '07',
      title: 'Final Report & Audit Ledger',
      icon: FileCheck,
      accentColor: '#9DF9EF',
      badge: 'Immutable SOC2',
      description: 'Publish transparent evaluations with line-item citations while logging cryptographic event streams for compliance.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col font-sans selection:bg-[#51E2F5] selection:text-slate-950 overflow-x-hidden">
      
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-[#0E1626] via-[#132238] to-[#0E1626] border-b border-[#A28089]/20 py-2.5 px-4 text-center text-xs font-medium text-slate-300">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#51E2F5]/10 text-[#51E2F5] font-semibold text-[11px] border border-[#51E2F5]/30">
            <Sparkles className="w-3 h-3 text-[#51E2F5]" /> Fortune 500 Standard
          </span>
          <span className="text-slate-200">Autonomous 5-Agent Pipeline with Line-by-Line Evidence Grounding.</span>
          <button
            onClick={() => handleRoleAction('hr.admin@verireview.ai', 'HR_ADMIN')}
            className="text-[#51E2F5] hover:text-[#9DF9EF] font-bold underline underline-offset-2 ml-1 inline-flex items-center gap-1 transition-colors group"
          >
            <span>Launch Command Center</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Main Enterprise Navigation */}
      <nav className="border-b border-[#A28089]/20 bg-[#080C14]/90 backdrop-blur-xl sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#51E2F5] via-[#38c1e8] to-[#131F33] p-[1px] shadow-lg shadow-[#51E2F5]/20">
              <div className="w-full h-full bg-[#0E1626] rounded-[11px] flex items-center justify-center text-[#51E2F5]">
                <Brain className="w-5 h-5 text-[#51E2F5]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white font-display">VeriReview AI</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 tracking-wider font-mono">
                  v1.0 Enterprise
                </span>
              </div>
            </div>
          </div>

          {/* Nav Anchors */}
          <div className="hidden lg:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#workflow" className="hover:text-[#51E2F5] transition-colors">How It Works</a>
            <a href="#pipeline" className="hover:text-[#51E2F5] transition-colors">5-Agent Pipeline</a>
            <a href="#guardrails" className="hover:text-[#51E2F5] transition-colors">Bias Guardrails</a>
            <a href="#roles" className="hover:text-[#51E2F5] transition-colors">Role Personas</a>
            <a href="#governance" className="hover:text-[#51E2F5] transition-colors">Audit Ledger</a>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSignIn ? onSignIn() : handleRoleAction('hr.admin@verireview.ai', 'HR_ADMIN')}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-[#131F33] hover:bg-[#182842] text-slate-200 border border-[#A28089]/30 hover:border-[#51E2F5]/50 transition-all focus-ring"
            >
              Sign In
            </button>
            <button
              onClick={() => onGetStarted ? onGetStarted() : handleRoleAction('hr.admin@verireview.ai', 'HR_ADMIN')}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 focus-ring"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 px-6 max-w-7xl mx-auto w-full text-center bg-hero-glow">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 space-y-8 max-w-4xl mx-auto"
        >
          
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#131F33] border border-[#51E2F5]/30 text-[#51E2F5] text-xs font-semibold tracking-wide shadow-lg shadow-[#51E2F5]/10">
            <Shield className="w-3.5 h-3.5 text-[#51E2F5]" />
            <span>Store-and-Forward AI Architecture • Zero Hallucination Guarantee</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.12] font-display">
            Bias-Aware Performance Intelligence with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#51E2F5] via-[#9DF9EF] to-[#FFA8BE]">
              Line-by-Line Evidence Grounding
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Eliminate recency bias, source imbalance, and subjective evaluations. VeriReview AI runs an autonomous 5-Agent pipeline that atomizes 360° feedback, enforces deterministic guardrails, and records immutable audit ledgers.
          </p>

          {/* CTA Group */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => handleRoleAction('hr.admin@verireview.ai', 'HR_ADMIN')}
              className="btn-primary px-6 py-3.5 text-sm flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-[#080C14]" />
              <span>Demo as HR Governance Admin</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleRoleAction('marcus.manager@verireview.ai', 'MANAGER')}
              className="btn-secondary px-6 py-3.5 text-sm flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-[#51E2F5]" />
              <span>Demo as Engineering Manager</span>
            </button>

            <button
              onClick={() => handleRoleAction('alex.employee@verireview.ai', 'EMPLOYEE')}
              className="btn-outline px-6 py-3.5 text-sm flex items-center gap-2"
            >
              <span>Demo as Employee View</span>
            </button>
          </div>

          {/* Enterprise Metrics Bar */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-[#A28089]/20 text-left max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-[#0E1626]/90 border border-[#A28089]/25 shadow-md">
              <div className="text-2xl font-extrabold text-[#51E2F5] font-display">100%</div>
              <div className="text-xs text-slate-400 font-medium">Evidence Grounded Claims</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0E1626]/90 border border-[#A28089]/25 shadow-md">
              <div className="text-2xl font-extrabold text-[#9DF9EF] font-display">4 Guardrails</div>
              <div className="text-xs text-slate-400 font-medium">Automated Bias Scans</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0E1626]/90 border border-[#A28089]/25 shadow-md">
              <div className="text-2xl font-extrabold text-[#FFA8BE] font-display">Immutable</div>
              <div className="text-xs text-slate-400 font-medium">SOC2 & GDPR Audit Trail</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0E1626]/90 border border-[#A28089]/25 shadow-md">
              <div className="text-2xl font-extrabold text-white font-display">Zero</div>
              <div className="text-xs text-slate-400 font-medium">Ungrounded Hallucinations</div>
            </div>
          </div>

        </motion.div>
      </section>

      {/* NEW: Complete Enterprise Workflow Section */}
      <section id="workflow" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-[#A28089]/20">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#51E2F5]/10 border border-[#51E2F5]/30 text-[#51E2F5] text-xs font-semibold">
            <Activity className="w-3.5 h-3.5" />
            <span>End-to-End Enterprise Lifecycle</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
            How VeriReview AI Works in Practice
          </h2>
          <p className="text-slate-400 text-sm md:text-base">
            From tenant provisioning to final cryptographic publication, follow the automated and human-governed review journey.
          </p>
        </div>

        {/* Horizontal Workflow Stepper Cards */}
        <div className="relative">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.slice(0, 4).map((step, idx) => {
              const IconComp = step.icon;
              return (
                <div 
                  key={idx}
                  className="enterprise-card p-6 space-y-4 relative group hover:border-[#51E2F5]/50 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#51E2F5] px-2 py-0.5 rounded bg-[#51E2F5]/10 border border-[#51E2F5]/30">
                        STEP {step.step}
                      </span>
                      <span className="text-[10px] font-mono font-medium text-slate-400 bg-[#080C14] px-2 py-0.5 rounded border border-[#A28089]/20">
                        {step.badge}
                      </span>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-[#182842] border border-[#A28089]/30 flex items-center justify-center text-[#51E2F5] group-hover:scale-105 transition-transform">
                      <IconComp className="w-5 h-5" style={{ color: step.accentColor }} />
                    </div>

                    <h3 className="text-base font-bold text-white font-display">{step.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
                  </div>

                  <div className="pt-2 text-[11px] font-semibold text-[#51E2F5] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Explore Step</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {workflowSteps.slice(4, 7).map((step, idx) => {
              const IconComp = step.icon;
              return (
                <div 
                  key={idx}
                  className="enterprise-card p-6 space-y-4 relative group hover:border-[#51E2F5]/50 transition-all duration-300 flex flex-col justify-between bg-gradient-to-b from-[#131F33] to-[#0E1626]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#51E2F5] px-2 py-0.5 rounded bg-[#51E2F5]/10 border border-[#51E2F5]/30">
                        STEP {step.step}
                      </span>
                      <span className="text-[10px] font-mono font-medium text-slate-400 bg-[#080C14] px-2 py-0.5 rounded border border-[#A28089]/20">
                        {step.badge}
                      </span>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-[#182842] border border-[#A28089]/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <IconComp className="w-5 h-5" style={{ color: step.accentColor }} />
                    </div>

                    <h3 className="text-base font-bold text-white font-display">{step.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
                  </div>

                  <div className="pt-2 text-[11px] font-semibold text-[#51E2F5] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Explore Step</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Problem Statement Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-[#A28089]/20">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFA8BE]/10 border border-[#FFA8BE]/30 text-[#FFA8BE] text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>The Enterprise Performance Problem</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
            Why Traditional Performance Reviews Fail
          </h2>
          <p className="text-slate-400 text-sm md:text-base">
            Unstructured performance evaluations cost enterprise organizations millions in attrition, bias lawsuits, and employee disengagement.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Traditional Way */}
          <div className="p-8 rounded-2xl bg-[#0E1626] border border-[#EF4444]/30 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#EF4444]/20">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base font-display">
                <X className="w-5 h-5" />
                <span>Traditional & Vague AI Reviews</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 uppercase font-semibold">
                High Risk
              </span>
            </div>

            <ul className="space-y-4 text-xs text-slate-300">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center shrink-0 text-xs font-bold">1</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">Recency Bias Dominance:</strong>
                  Managers over-index on the last 30 days while ignoring the preceding 11 months of achievement.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center shrink-0 text-xs font-bold">2</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">Source Imbalance:</strong>
                  Evaluations rely 90% on manager perception, completely discounting peer feedback and self-assessments.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center shrink-0 text-xs font-bold">3</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">Vague AI Prose & Hallucinations:</strong>
                  Generic LLM review tools generate flowery prose without referencing verifiable line-item feedback.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center shrink-0 text-xs font-bold">4</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">Unauditable Black Box:</strong>
                  Zero historical record of what the AI originally wrote vs. what human managers manually edited.
                </div>
              </li>
            </ul>
          </div>

          {/* VeriReview AI Way */}
          <div className="p-8 rounded-2xl bg-[#0E1626] border border-[#51E2F5]/40 shadow-xl shadow-[#51E2F5]/5 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#51E2F5]/20">
              <div className="flex items-center gap-2 text-[#51E2F5] font-bold text-base font-display">
                <Check className="w-5 h-5" />
                <span>VeriReview AI Governance System</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded badge-cyan uppercase font-semibold">
                Fortune 500 Standard
              </span>
            </div>

            <ul className="space-y-4 text-xs text-slate-300">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#51E2F5]/20 text-[#51E2F5] flex items-center justify-center shrink-0 text-xs font-bold">1</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">360° Time & Source Weighting:</strong>
                  Retrieval Agent balances peer, manager, and self-assessments across the entire annual cycle.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#51E2F5]/20 text-[#51E2F5] flex items-center justify-center shrink-0 text-xs font-bold">2</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">4 Automated Bias Guardrails:</strong>
                  Scans for recency weight, source imbalance, sentiment extremity, and uncited assertions.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#51E2F5]/20 text-[#51E2F5] flex items-center justify-center shrink-0 text-xs font-bold">3</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">100% Line-by-Line Evidence Grounding:</strong>
                  Every single review statement includes explicit clickable citations pointing to raw feedback nodes.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#51E2F5]/20 text-[#51E2F5] flex items-center justify-center shrink-0 text-xs font-bold">4</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">Immutable Audit Trail:</strong>
                  Every agent run, manager edit, claim rejection, and human override is recorded to an append-only ledger.
                </div>
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* Interactive Architectural Showcase Section */}
      <section id="pipeline" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-[#A28089]/20">
        <div className="bg-[#0E1626] border border-[#A28089]/30 rounded-3xl p-8 shadow-2xl space-y-8">
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-[#A28089]/20 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#51E2F5]/10 text-[#51E2F5] text-xs font-semibold mb-2">
                <Cpu className="w-3.5 h-3.5" />
                <span>Multi-Agent Architecture</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
                The 5-Agent Autonomous Pipeline
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Explore how VeriReview AI converts unstructured feedback into cited, bias-checked evaluations.
              </p>
            </div>

            {/* Pillar Selector Tabs */}
            <div className="flex items-center bg-[#131F33] p-1.5 rounded-xl border border-[#A28089]/30 text-xs overflow-x-auto max-w-full">
              <button
                onClick={() => setActiveTab('agents')}
                className={`px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
                  activeTab === 'agents' ? 'bg-[#51E2F5] text-[#080C14] shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                5-Agent Workflow
              </button>
              <button
                onClick={() => setActiveTab('guardrails')}
                className={`px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
                  activeTab === 'guardrails' ? 'bg-[#51E2F5] text-[#080C14] shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bias Guardrails
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
                  activeTab === 'audit' ? 'bg-[#51E2F5] text-[#080C14] shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Immutable Audit Log
              </button>
              <button
                onClick={() => setActiveTab('evidence')}
                className={`px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
                  activeTab === 'evidence' ? 'bg-[#51E2F5] text-[#080C14] shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Evidence Atomization
              </button>
            </div>
          </div>

          {/* Active Tab Panel */}
          {activeTab === 'agents' && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="p-5 bg-[#131F33]/80 border border-[#A28089]/30 rounded-2xl space-y-3 hover:border-[#51E2F5]/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 flex items-center justify-center font-bold text-xs font-mono">01</div>
                <h3 className="font-bold text-sm text-white font-display">Collector Agent</h3>
                <p className="text-xs text-slate-400 leading-relaxed">Atomizes peer, manager, and self-assessment notes into normalized, queryable evidence nodes.</p>
              </div>

              <div className="p-5 bg-[#131F33]/80 border border-[#A28089]/30 rounded-2xl space-y-3 hover:border-[#51E2F5]/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-[#9DF9EF]/10 text-[#9DF9EF] border border-[#9DF9EF]/30 flex items-center justify-center font-bold text-xs font-mono">02</div>
                <h3 className="font-bold text-sm text-white font-display">Retrieval Agent</h3>
                <p className="text-xs text-slate-400 leading-relaxed">Enforces a minimum 0.3 coverage floor across source feedback to prevent cherry-picking.</p>
              </div>

              <div className="p-5 bg-[#131F33]/80 border border-[#A28089]/30 rounded-2xl space-y-3 hover:border-[#FFA8BE]/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-[#FFA8BE]/10 text-[#FFA8BE] border border-[#FFA8BE]/30 flex items-center justify-center font-bold text-xs font-mono">03</div>
                <h3 className="font-bold text-sm text-white font-display">Bias Detection</h3>
                <p className="text-xs text-slate-400 leading-relaxed">Scans for recency weight, source imbalance, sentiment spikes, and uncited assertions.</p>
              </div>

              <div className="p-5 bg-[#131F33]/80 border border-[#A28089]/30 rounded-2xl space-y-3 hover:border-[#51E2F5]/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 flex items-center justify-center font-bold text-xs font-mono">04</div>
                <h3 className="font-bold text-sm text-white font-display">Synthesis Agent</h3>
                <p className="text-xs text-slate-400 leading-relaxed">Generates objective review drafts with strict citation mapping to evidence nodes.</p>
              </div>

              <div className="p-5 bg-[#131F33]/80 border border-[#A28089]/30 rounded-2xl space-y-3 hover:border-[#9DF9EF]/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-[#9DF9EF]/10 text-[#9DF9EF] border border-[#9DF9EF]/30 flex items-center justify-center font-bold text-xs font-mono">05</div>
                <h3 className="font-bold text-sm text-white font-display">Human Oversight</h3>
                <p className="text-xs text-slate-400 leading-relaxed">Allows managers to edit drafts while recording immutable human override diffs.</p>
              </div>
            </div>
          )}

          {activeTab === 'guardrails' && (
            <div id="guardrails" className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-[#131F33]/60 border border-[#A28089]/30 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-[#FFA8BE] font-bold text-sm font-display">
                  <AlertTriangle className="w-5 h-5 text-[#FFA8BE]" />
                  <span>Automated Bias Flags & Severity Categorization</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The Bias Detection Agent runs 4 deterministic and LLM-assisted guardrails against every draft assertion:
                </p>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#51E2F5] shrink-0" />
                    <span><strong>Recency Weight:</strong> Flags evaluations over-indexing on recent 30-day feedback.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#51E2F5] shrink-0" />
                    <span><strong>Source Imbalance:</strong> Detects missing peer perspective or manager dominance.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#51E2F5] shrink-0" />
                    <span><strong>Sentiment Extremity:</strong> Highlights emotive adjectives lacking quantitative backup.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#51E2F5] shrink-0" />
                    <span><strong>Unsupported Claims:</strong> Blocks claims that lack indexed atomic evidence nodes.</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-[#131F33]/60 border border-[#A28089]/30 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-[#51E2F5] font-bold text-sm font-display">
                  <Shield className="w-5 h-5 text-[#51E2F5]" />
                  <span>Mandatory Human Override Acknowledgment</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  High-severity bias flags cannot be ignored. Managers must explicitly acknowledge the flag and provide justification before finalizing the report.
                </p>
                <div className="p-4 bg-[#080C14] border border-[#FFA8BE]/40 rounded-xl text-xs font-mono text-[#FFA8BE] space-y-1">
                  <div className="text-[10px] uppercase font-bold text-[#FFA8BE]">ACK_REQUIRED: High Severity Flag</div>
                  <div>`Source Imbalance: 85% manager input vs 15% peer notes. Justification required.`</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div id="governance" className="p-6 bg-[#131F33]/60 border border-[#A28089]/30 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#51E2F5] font-bold text-sm font-display">
                  <Lock className="w-5 h-5 text-[#51E2F5]" />
                  <span>Immutable Cryptographic Audit Trail</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded badge-cyan uppercase">
                  Append-Only Ledger
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Every state transition, AI draft modification, manager edit, and feedback submission is permanently written to an append-only audit stream. No records can ever be altered or purged, guaranteeing SOC2 and GDPR compliance.
              </p>
            </div>
          )}

          {activeTab === 'evidence' && (
            <div id="explainable" className="p-6 bg-[#131F33]/60 border border-[#A28089]/30 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-[#9DF9EF] font-bold text-sm font-display">
                <Database className="w-5 h-5 text-[#9DF9EF]" />
                <span>Atomic Evidence Extraction & Citation Map</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Feedback isn't just processed as raw text. The Collector Agent segments inputs into distinct atomic facts tagged with sentiment, date, and source type, providing traceable line-by-line citations for every review assertion.
              </p>
            </div>
          )}

        </div>
      </section>

      {/* Role-Based Command Center Preview Section */}
      <section id="roles" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-[#A28089]/20">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#51E2F5]/10 text-[#51E2F5] text-xs font-semibold">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Interactive Enterprise Personas</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
            Role-Based Command Centers
          </h2>
          <p className="text-slate-400 text-sm md:text-base">
            Experience VeriReview AI from the perspective of HR Governance Admins, Engineering Managers, or Employees.
          </p>
        </div>

        {/* Role Preview Card */}
        <div className="bg-[#0E1626] border border-[#A28089]/30 rounded-3xl p-8 shadow-2xl space-y-8">
          
          {/* Role Tabs */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setActiveRolePreview('hr')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeRolePreview === 'hr' ? 'bg-[#51E2F5] text-[#080C14] shadow-lg' : 'bg-[#131F33] text-slate-400 border border-[#A28089]/30 hover:border-[#51E2F5]/40'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>HR Governance Admin</span>
            </button>

            <button
              onClick={() => setActiveRolePreview('manager')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeRolePreview === 'manager' ? 'bg-[#51E2F5] text-[#080C14] shadow-lg' : 'bg-[#131F33] text-slate-400 border border-[#A28089]/30 hover:border-[#51E2F5]/40'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Engineering Manager</span>
            </button>

            <button
              onClick={() => setActiveRolePreview('employee')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeRolePreview === 'employee' ? 'bg-[#51E2F5] text-[#080C14] shadow-lg' : 'bg-[#131F33] text-slate-400 border border-[#A28089]/30 hover:border-[#51E2F5]/40'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Employee View</span>
            </button>
          </div>

          {/* Role Detail Content */}
          {activeRolePreview === 'hr' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="p-6 bg-[#131F33] border border-[#A28089]/30 rounded-2xl space-y-3 hover:border-[#51E2F5]/40 transition-colors">
                <h3 className="font-bold text-sm text-white font-display flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#51E2F5]" />
                  <span>Org-Wide Bias Monitoring</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">Real-time heatmaps detecting systemic recency weight or manager bias across all engineering departments.</p>
              </div>
              <div className="p-6 bg-[#131F33] border border-[#A28089]/30 rounded-2xl space-y-3 hover:border-[#51E2F5]/40 transition-colors">
                <h3 className="font-bold text-sm text-white font-display flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#9DF9EF]" />
                  <span>Audit Ledger Inspector</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">Query complete cryptographic event logs showing every AI assertion draft and human manager edit.</p>
              </div>
              <div className="p-6 bg-[#131F33] border border-[#A28089]/30 rounded-2xl space-y-3 hover:border-[#51E2F5]/40 transition-colors">
                <h3 className="font-bold text-sm text-white font-display flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#FFA8BE]" />
                  <span>Operations Queue Control</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">Manage escalated reviews, re-trigger failed agent steps, and enforce org-wide compliance policies.</p>
              </div>
              <div className="md:col-span-3 text-center pt-2">
                <button
                  onClick={() => handleRoleAction('hr.admin@verireview.ai', 'HR_ADMIN')}
                  className="btn-primary px-8 py-3.5 text-xs inline-flex items-center gap-2 shadow-lg"
                >
                  <Shield className="w-4 h-4 text-[#080C14]" />
                  <span>Launch HR Governance Admin Command Center</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeRolePreview === 'manager' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="p-6 bg-[#131F33] border border-[#A28089]/30 rounded-2xl space-y-3 hover:border-[#51E2F5]/40 transition-colors">
                <h3 className="font-bold text-sm text-white font-display flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#51E2F5]" />
                  <span>Team Review Workspace</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">Review 360° direct report evaluations with line-by-line evidence mapping to raw feedback nodes.</p>
              </div>
              <div className="p-6 bg-[#131F33] border border-[#A28089]/30 rounded-2xl space-y-3 hover:border-[#51E2F5]/40 transition-colors">
                <h3 className="font-bold text-sm text-white font-display flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#9DF9EF]" />
                  <span>Claim-Level Decisions</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">Accept, edit, or reject individual assertions with original AI drafts preserved for compliance audit.</p>
              </div>
              <div className="p-6 bg-[#131F33] border border-[#A28089]/30 rounded-2xl space-y-3 hover:border-[#51E2F5]/40 transition-colors">
                <h3 className="font-bold text-sm text-white font-display flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FFA8BE]" />
                  <span>Bias Flag Acknowledgment</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">Acknowledge high-severity bias warnings and provide required manager justification before finalizing.</p>
              </div>
              <div className="md:col-span-3 text-center pt-2">
                <button
                  onClick={() => handleRoleAction('marcus.manager@verireview.ai', 'MANAGER')}
                  className="btn-primary px-8 py-3.5 text-xs inline-flex items-center gap-2 shadow-lg"
                >
                  <UserCheck className="w-4 h-4 text-[#080C14]" />
                  <span>Launch Engineering Manager Command Center</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeRolePreview === 'employee' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="p-6 bg-[#131F33] border border-[#A28089]/30 rounded-2xl space-y-3 hover:border-[#51E2F5]/40 transition-colors">
                <h3 className="font-bold text-sm text-[#51E2F5] font-display flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#51E2F5]" />
                  <span>Self-Assessment Portal</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">Submit annual achievements, project outcomes, and peer feedback with full GDPR privacy controls.</p>
              </div>
              <div className="p-6 bg-[#131F33] border border-[#A28089]/30 rounded-2xl space-y-3 hover:border-[#51E2F5]/40 transition-colors">
                <h3 className="font-bold text-sm text-[#9DF9EF] font-display flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#9DF9EF]" />
                  <span>Transparent Final Report</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">Inspect final published performance reviews with line-by-line citations to peer and project evidence.</p>
              </div>
              <div className="p-6 bg-[#131F33] border border-[#A28089]/30 rounded-2xl space-y-3 hover:border-[#51E2F5]/40 transition-colors">
                <h3 className="font-bold text-sm text-[#FFA8BE] font-display flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#FFA8BE]" />
                  <span>Anonymity Safeguards</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">Raw peer quotes are automatically redacted/aggregated outside authorized manager sessions.</p>
              </div>
              <div className="md:col-span-3 text-center pt-2">
                <button
                  onClick={() => handleRoleAction('alex.employee@verireview.ai', 'EMPLOYEE')}
                  className="btn-primary px-8 py-3.5 text-xs inline-flex items-center gap-2 shadow-lg"
                >
                  <FileText className="w-4 h-4 text-[#080C14]" />
                  <span>Launch Employee Portal Demo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* Redesigned Structured Enterprise 4-Column Footer */}
      <footer className="mt-auto border-t border-[#A28089]/20 py-16 px-6 bg-[#080C14] text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Column 1: Brand & Overview (Spans 2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4 pr-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#51E2F5]/10 border border-[#51E2F5]/30 flex items-center justify-center text-[#51E2F5]">
                <Brain className="w-4 h-4 text-[#51E2F5]" />
              </div>
              <div className="font-extrabold text-base text-white font-display">VeriReview AI</div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              The Fortune 500 standard for evidence-grounded, bias-free 360° performance intelligence. Combining autonomous 5-Agent processing with mandatory line-item human oversight and cryptographic audit logs.
            </p>

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0E1626] border border-[#A28089]/20 text-[11px] font-mono text-slate-300">
                <Shield className="w-3 h-3 text-[#51E2F5]" /> SOC2 Type II Certified
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0E1626] border border-[#A28089]/20 text-[11px] font-mono text-slate-300">
                <Globe className="w-3 h-3 text-[#9DF9EF]" /> GDPR & ISO 27001 Ready
              </span>
            </div>

            <div className="text-[11px] text-[#A28089] pt-2">
              © 2026 VeriReview AI Inc. All rights reserved. Enterprise Governance Engine.
            </div>
          </div>

          {/* Column 2: Product Architecture */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider font-mono">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#pipeline" className="hover:text-[#51E2F5] transition-colors">5-Agent Pipeline</a></li>
              <li><a href="#explainable" className="hover:text-[#51E2F5] transition-colors">Evidence Atomization</a></li>
              <li><a href="#guardrails" className="hover:text-[#51E2F5] transition-colors">Automated Bias Guardrails</a></li>
              <li><a href="#roles" className="hover:text-[#51E2F5] transition-colors">Human-in-the-Loop Review</a></li>
              <li><a href="#governance" className="hover:text-[#51E2F5] transition-colors">Audit Ledger & Compliance</a></li>
            </ul>
          </div>

          {/* Column 3: Enterprise Platform */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider font-mono">Company</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#workflow" className="hover:text-[#51E2F5] transition-colors">How It Works</a></li>
              <li><span className="text-slate-500 cursor-not-allowed">Enterprise Roadmap (Coming Soon)</span></li>
              <li><span className="text-slate-500 cursor-not-allowed">API Specification (v1.0 Ready)</span></li>
              <li><span className="text-slate-500 cursor-not-allowed">Security Whitepaper</span></li>
              <li><span className="text-slate-500 cursor-not-allowed">Contact Sales</span></li>
            </ul>
          </div>

          {/* Column 4: Legal & Standards */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider font-mono">Legal & Compliance</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="hover:text-[#51E2F5] cursor-pointer transition-colors">Privacy Policy</span></li>
              <li><span className="hover:text-[#51E2F5] cursor-pointer transition-colors">Terms of Service</span></li>
              <li><span className="hover:text-[#51E2F5] cursor-pointer transition-colors">GDPR Data Processing</span></li>
              <li><span className="hover:text-[#51E2F5] cursor-pointer transition-colors">Cryptographic Audit Rules</span></li>
              <li><span className="hover:text-[#51E2F5] cursor-pointer transition-colors">Responsible AI Standard</span></li>
            </ul>
          </div>

        </div>
      </footer>

    </div>
  );
};
