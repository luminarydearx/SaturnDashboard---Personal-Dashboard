export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, #0a0a18 0%, #04040d 100%)" }}>
      <div className="text-center px-6 max-w-lg">
        <div className="mx-auto w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-6 border border-cyan-500/20">
          <span className="text-3xl">🛸</span>
        </div>
        <h1 className="font-orbitron text-2xl font-bold text-white mb-2">Under Maintenance</h1>
        <p className="text-slate-400 text-sm">The system is currently undergoing maintenance. Please check back soon.</p>
      </div>
    </div>
  );
}
