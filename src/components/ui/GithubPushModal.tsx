'use client';

import { useState } from 'react';
import { MdClose, MdCloudUpload, MdCheckCircle, MdError } from 'react-icons/md';
import { SiGithub } from 'react-icons/si';

interface GithubPushModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function GithubPushModal({ onClose, onSuccess }: GithubPushModalProps) {
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [message, setMessage] = useState('SaturnDashboard: data sync');
  const [status, setStatus] = useState<'idle' | 'pushing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handlePush = async () => {
    if (!token || !owner || !repo) {
      setError('All fields are required');
      return;
    }
    setStatus('pushing');
    setLogs([]);
    setProgress(0);
    setError('');

    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, owner, repo, message }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.progress !== undefined) setProgress(data.progress);
              if (data.log) setLogs((prev) => [...prev, data.log]);
              if (data.done) {
                if (data.success) {
                  setStatus('done');
                  setTimeout(() => { onSuccess(); }, 1500);
                } else {
                  setStatus('error');
                  setError(data.error || 'Push failed');
                }
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setStatus('error');
      setError('Network error: ' + String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-strong border border-white/10 rounded-2xl w-full max-w-lg animate-scaleIn shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-white/8">
          <SiGithub size={22} className="text-slate-300" />
          <h2 className="font-orbitron text-base font-semibold text-white flex-1">Push to GitHub</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><MdClose size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          {status === 'idle' || status === 'error' ? (
            <>
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  GitHub Token (ghp_...)
                </label>
                <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
                  className="saturn-input" placeholder="ghp_xxxxxxxxxxxx" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    GitHub Username
                  </label>
                  <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)}
                    className="saturn-input" placeholder="yourusername" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Repository
                  </label>
                  <input type="text" value={repo} onChange={(e) => setRepo(e.target.value)}
                    className="saturn-input" placeholder="repo-name" />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Commit Message
                </label>
                <input type="text" value={message} onChange={(e) => setMessage(e.target.value)}
                  className="saturn-input" />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <MdError size={18} /> {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handlePush} className="btn-primary flex-1">
                  <MdCloudUpload size={18} /> Push Data
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Pushing files...</span>
                  <span className="font-mono text-violet-400">{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* Logs */}
              <div className="bg-space-800 border border-white/5 rounded-xl p-4 h-40 overflow-y-auto">
                {logs.map((log, i) => (
                  <p key={i} className="font-mono text-xs text-slate-400 mb-1">{log}</p>
                ))}
                {status === 'pushing' && (
                  <span className="font-mono text-xs text-cyan-400 animate-pulse">▌</span>
                )}
              </div>

              {status === 'done' && (
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <MdCheckCircle size={24} className="text-emerald-400" />
                  <div>
                    <p className="text-emerald-400 font-semibold">Push successful!</p>
                    <p className="text-slate-500 text-sm">Reloading data...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
