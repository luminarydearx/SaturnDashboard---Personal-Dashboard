'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, #0a0a18 0%, #04040d 100%)" }}>
      <div className="text-center px-6 max-w-lg">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
          <span className="font-orbitron text-2xl font-black text-red-400">500</span>
        </div>
        <h1 className="font-orbitron text-2xl font-bold text-white mb-2">System Error</h1>
        <p className="text-slate-400 mb-2 text-sm">Something went wrong in the engine room.</p>
        {error?.message && <p className="text-red-400/60 text-xs font-mono mb-6 break-words bg-red-500/5 px-3 py-2 rounded-lg border border-red-500/10">{error.message}</p>}
        <button onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all"
          style={{ background: "linear-gradient(135deg, #7c3aed, #0891b2)" }}>
          Try Again
        </button>
      </div>
    </div>
  );
}
