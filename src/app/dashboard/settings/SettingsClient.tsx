'use client';

import { useState } from 'react';
import { PublicUser } from '@/types';
import { useToast } from '@/components/ui/Toast';
import GithubPushModal from '@/components/ui/GithubPushModal';
import SavingOverlay from '@/components/ui/SavingOverlay';
import { SiGithub, SiCloudinary } from 'react-icons/si';
import { MdSettings, MdCloudUpload, MdInfo } from 'react-icons/md';
import { format } from 'date-fns';

interface Settings {
  githubRepo: string;
  githubOwner: string;
  lastPush: string;
}

interface SettingsClientProps {
  user: PublicUser;
  settings: Settings;
}

export default function SettingsClient({ user: _user, settings }: SettingsClientProps) {
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const { success } = useToast();

  const handlePushSuccess = () => {
    setIsPushing(false);
    setShowGithubModal(false);
    success('Data synced to GitHub!');
    window.location.reload();
  };

  const handlePushStart = () => {
    setIsPushing(true);
    setShowGithubModal(true);
  };

  // Helper component untuk Info Box agar konsisten
  const InfoBox = ({ label, value, isUrl = false }: { label: string; value: string; isUrl?: boolean }) => (
    <div className="bg-white/5 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
      <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5">{label}</p>
      <p 
        className={`text-slate-200 font-mono text-sm leading-relaxed ${isUrl ? 'break-all' : 'truncate'}`}
        title={value}
      >
        {value || '—'}
      </p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <SavingOverlay
        visible={isPushing && !showGithubModal}
        message="Pushing to GitHub…"
        submessage="Syncing your data files to the repository"
      />
      <div>
        <h1 className="font-orbitron text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-500 text-sm mt-1 font-nunito">System configuration (Owner only)</p>
      </div>

      {/* GitHub sync */}
      <div className="glass border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
            <SiGithub size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-orbitron text-base font-semibold text-white">GitHub Data Sync</h2>
            <p className="text-slate-400 text-xs mt-0.5">Push JSON data files to your GitHub repository</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <InfoBox label="Repository Owner" value={settings.githubOwner} />
          <InfoBox label="Repository URL" value={settings.githubRepo} isUrl={true} />
          <InfoBox label="Last Push" value={settings.lastPush ? format(new Date(settings.lastPush), 'MMM d, yyyy HH:mm') : 'Never'} />
          <InfoBox label="Files Synced" value="users.json, notes.json, settings.json" />
        </div>

        <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
          <MdInfo size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-slate-300 text-xs font-nunito leading-relaxed">
            Your GitHub token needs <code className="bg-black/30 px-1.5 py-0.5 rounded text-blue-300 font-mono text-[10px]">repo</code> scope. 
            Data is pushed as JSON files. Passwords are stored as bcrypt hashes.
            For Vercel deployment, set <code className="bg-black/30 px-1.5 py-0.5 rounded text-blue-300 font-mono text-[10px]">JWT_SECRET</code> in environment variables.
          </p>
        </div>

        <button 
          onClick={handlePushStart} 
          className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 group"
        >
          <MdCloudUpload size={18} className="group-hover:-translate-y-0.5 transition-transform" /> 
          Push to GitHub
        </button>
      </div>

      {/* Cloudinary info */}
      <div className="glass border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
            <SiCloudinary size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="font-orbitron text-base font-semibold text-white">Cloudinary Configuration</h2>
            <p className="text-slate-400 text-xs mt-0.5">Image hosting configuration</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoBox label="Cloud Name" value={process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dg3awuzug"} />
          <InfoBox label="Upload Preset" value={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default"} />
        </div>
      </div>

      {/* System info */}
      <div className="glass border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
            <MdSettings size={20} className="text-slate-400" />
          </div>
          <h2 className="font-orbitron text-base font-semibold text-white">System Information</h2>
        </div>
        <div className="space-y-1 divide-y divide-white/5">
          {[
            ['Version', 'v4.4.2'],
            ['Framework', 'Next.js 14 + TypeScript'],
            ['Auth', 'JWT (jose) + bcryptjs'],
            ['Storage', 'JSON files (local)'],
            ['Image CDN', 'Cloudinary'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
              <span className="text-slate-500 text-sm font-medium">{k}</span>
              <span className="text-slate-300 text-sm font-mono bg-white/5 px-2 py-1 rounded border border-white/5">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {showGithubModal && (
        <GithubPushModal onClose={() => setShowGithubModal(false)} onSuccess={handlePushSuccess} />
      )}
    </div>
  );
}