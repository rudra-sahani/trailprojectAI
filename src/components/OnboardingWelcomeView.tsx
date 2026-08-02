import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Building2, UserPlus, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { UserProfile } from '../../shared/types/api-contracts.js';

interface OnboardingWelcomeViewProps {
  currentUser: UserProfile;
  onCreateOrg: () => void;
  onJoinOrg: () => void;
  onLogout: () => void;
}

export const OnboardingWelcomeView: React.FC<OnboardingWelcomeViewProps> = ({
  currentUser,
  onCreateOrg,
  onJoinOrg,
  onLogout
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 selection:bg-purple-500 selection:text-white">
      
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_30%,rgba(120,119,198,0.12),rgba(255,255,255,0))] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl space-y-8 relative z-10"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 me-2 py-1 rounded-full bg-purple-950/80 border border-purple-800/80 text-purple-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Enterprise Account Setup</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">VeriReview AI</span>
          </h1>

          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Logged in as <strong className="text-slate-200">{currentUser.email}</strong>. To access the AI-powered review pipeline and governance dashboards, choose how you would like to proceed.
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          
          {/* Create Organization Card */}
          <button
            onClick={onCreateOrg}
            className="group text-left p-6 rounded-2xl bg-slate-800/60 hover:bg-purple-950/40 border border-slate-700/80 hover:border-purple-500/80 transition-all duration-200 space-y-4 hover:shadow-xl hover:shadow-purple-900/20 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white group-hover:text-purple-300 transition-colors">
                  Create Organization
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Set up a new workspace for your company, define departments, review preferences, and become the Organization Owner.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 pt-2">
              <span>Start Setup Wizard</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Join Organization Card */}
          <button
            onClick={onJoinOrg}
            className="group text-left p-6 rounded-2xl bg-slate-800/60 hover:bg-indigo-950/40 border border-slate-700/80 hover:border-indigo-500/80 transition-all duration-200 space-y-4 hover:shadow-xl hover:shadow-indigo-900/20 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 group-hover:scale-110 transition-transform">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors">
                  Join Organization
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Enter an invitation link, 6-character invitation code, or company organization code sent by your HR Admin or Manager.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 pt-2">
              <span>Enter Code or Link</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>

        {/* Footer info & Logout */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Role-Based RBAC & Immutable Audit Enabled</span>
          </div>

          <button
            onClick={onLogout}
            className="text-slate-400 hover:text-white underline transition-colors"
          >
            Sign Out
          </button>
        </div>

      </motion.div>
    </div>
  );
};
