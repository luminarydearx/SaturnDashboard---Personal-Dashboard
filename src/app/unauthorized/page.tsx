import Link from 'next/link';
export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, #0a0a18 0%, #04040d 100%)" }}>
      <div className="text-center px-6 max-w-lg">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 border border-amber-500/20">
          <span className="font-orbitron text-2xl font-black text-amber-400">401</span>
        </div>
        <h1 className="font-orbitron text-2xl font-bold text-white mb-2">Unauthorized</h1>
        <p className="text-slate-400 mb-8 text-sm">You need to sign in to access this area.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #0891b2)" }}>
          Sign In
        </Link>
      </div>
    </div>
  );
}
