import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, #0a0a18 0%, #04040d 100%)" }}>
      <div className="text-center px-6 max-w-lg">
        <div className="relative mx-auto w-40 h-40 mb-8">
          <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 animate-spin" style={{ animationDuration: "12s" }} />
          <div className="absolute inset-4 rounded-full border border-cyan-500/15 animate-spin" style={{ animationDuration: "8s", animationDirection: "reverse" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-orbitron text-5xl font-black text-violet-400" style={{ textShadow: "0 0 40px rgba(139,92,246,0.6)" }}>404</span>
          </div>
        </div>
        <h1 className="font-orbitron text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-slate-400 mb-8 text-sm">This orbit doesn&apos;t exist. The page you&apos;re looking for has drifted into deep space.</p>
        <Link href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all"
          style={{ background: "linear-gradient(135deg, #7c3aed, #0891b2)" }}>
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
