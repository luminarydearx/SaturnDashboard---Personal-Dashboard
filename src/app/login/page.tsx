'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';
import { MdPerson, MdLock, MdVisibility, MdVisibilityOff, MdQrCode2, MdRocketLaunch } from 'react-icons/md';

export default function LoginPage() {
  const router  = useRouter();
  const { success, error: toastErr } = useToast();
  const [loading, setLoading]  = useState(false);
  const [showPw,  setShowPw]   = useState(false);
  const [lu, setLu] = useState('');
  const [lp, setLp] = useState('');
  const [mounted, setMounted]  = useState(false);
  const [focus,   setFocus]    = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lu || !lp) { toastErr('Isi semua field'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: lu, password: lp }),
      });
      const d = await r.json();
      if (d.success) {
        success('Welcome back, ' + d.data.displayName + '! 🚀');
        setTimeout(() => router.push('/dashboard'), 600);
      } else { toastErr(d.error || 'Login gagal'); }
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#04040d', display: 'flex', overflow: 'hidden', position: 'relative' }}>
      {/* Animated background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', top: '-200px', left: '-100px', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', animation: 'pulse 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', bottom: '-150px', right: '-100px', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', animation: 'pulse 10s ease-in-out infinite reverse' }} />
        {mounted && Array.from({ length: 40 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: Math.random() * 2 + 1,
            height: Math.random() * 2 + 1,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `twinkle ${Math.random() * 4 + 3}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }} />
        ))}
      </div>

      {/* Left panel - branding */}
      <motion.div
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex flex-col items-center justify-center"
        style={{
          flex: 1, padding: '60px', position: 'relative', zIndex: 1,
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(124,58,237,0.5)' }}>
                <MdRocketLaunch size={26} color="#fff" />
              </div>
              <div>
                <p style={{ color: '#fff', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 22, letterSpacing: 2, margin: 0 }}>SATURN</p>
                <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 11, letterSpacing: 3, margin: 0 }}>DASHBOARD</p>
              </div>
            </div>
          </motion.div>

          {[
            { delay: 0.4, text: 'Control everything', sub: 'Manage your servers, users, content, and more from one place.' },
            { delay: 0.5, text: 'Real-time monitoring', sub: 'Live server status, activity logs, and attendance tracking.' },
            { delay: 0.6, text: 'QR Code login', sub: 'Generate QR codes for instant, secure access without passwords.' },
          ].map(({ delay, text, sub }) => (
            <motion.div key={text} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 28 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', marginTop: 7, flexShrink: 0 }} />
              <div>
                <p style={{ color: '#fff', fontWeight: 700, margin: '0 0 3px', fontSize: 15 }}>{text}</p>
                <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Right panel - form */}
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '40px 48px', position: 'relative', zIndex: 1,
        }}
        className="lg:max-w-[520px] lg:min-h-screen"
      >
        {/* Mobile logo */}
        <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,#7c3aed,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MdRocketLaunch size={20} color="#fff" />
          </div>
          <span style={{ color: '#fff', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 18, letterSpacing: 2 }}>SATURN</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 800, margin: '0 0 6px', fontFamily: 'Nunito, sans-serif' }}>
            Selamat datang kembali
          </h1>
          <p style={{ color: 'rgba(255,255,255,.4)', margin: '0 0 40px', fontSize: 15 }}>
            Masuk ke akun Saturn Dashboard kamu
          </p>
        </motion.div>

        <motion.form onSubmit={login} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Username */}
          {[
            { label: 'Username', val: lu, set: setLu, icon: MdPerson, type: 'text', key: 'un', autoComplete: 'username' },
          ].map(({ label, val, set, icon: Icon, type, key, autoComplete }) => (
            <motion.div key={key} animate={{ scale: focus === key ? 1.01 : 1 }} transition={{ duration: 0.15 }}>
              <label style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>{label}</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focus === key ? '#a78bfa' : 'rgba(255,255,255,.3)', transition: 'color .2s' }}>
                  <Icon size={18} />
                </div>
                <input type={type} value={val} onChange={e => set(e.target.value)} autoComplete={autoComplete}
                  onFocus={() => setFocus(key)} onBlur={() => setFocus(null)}
                  style={{
                    width: '100%', paddingLeft: 44, paddingRight: 16, paddingTop: 14, paddingBottom: 14,
                    background: focus === key ? 'rgba(124,58,237,.08)' : 'rgba(255,255,255,.04)',
                    border: focus === key ? '1px solid rgba(124,58,237,.5)' : '1px solid rgba(255,255,255,.08)',
                    borderRadius: 14, color: '#fff', fontSize: 15, outline: 'none',
                    transition: 'all .2s', boxSizing: 'border-box',
                    boxShadow: focus === key ? '0 0 20px rgba(124,58,237,.15)' : 'none',
                  }} />
              </div>
            </motion.div>
          ))}

          {/* Password */}
          <motion.div animate={{ scale: focus === 'pw' ? 1.01 : 1 }} transition={{ duration: 0.15 }}>
            <label style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Password</label>
            <div style={{
              position: 'relative',
              border: focus === 'pw' ? '1.5px solid #a78bfa' : '1.5px solid rgba(124,58,237,0.4)',
              borderRadius: 14,
              background: 'rgba(124,58,237,0.03)',
              padding: '0px 0px',
              boxShadow: focus === 'pw' ? '0 0 10px #a78bfa33' : 'none',
              transition: 'border .2s, box-shadow .2s'
            }}>
              <div style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: '#a78bfa' }}>
                <MdLock size={22} />
              </div>
              <input
                type={showPw ? 'text' : 'password'}
                value={lp}
                onChange={e => setLp(e.target.value)}
                autoComplete="current-password"
                onFocus={() => setFocus('pw')}
                onBlur={() => setFocus(null)}
                className="no-password-toggle w-full pl-[54px] pr-[44px] py-4 bg-transparent border-none text-white text-[16px] rounded-[14px] outline-none font-medium tracking-[1px]"
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{
                  position: 'absolute',
                  right: 18,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(167,139,250,.95)',
                  cursor: 'pointer',
                  padding: 4,
                  outline: 'none'
                }}
                tabIndex={-1}
                aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPw ? <MdVisibilityOff size={22} /> : <MdVisibility size={22} />}
              </button>
            </div>
          </motion.div>

          {/* Submit */}
          <motion.button type="submit" disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}
            style={{
              width: '100%', padding: '15px', borderRadius: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'rgba(124,58,237,.3)' : 'linear-gradient(135deg,#7c3aed,#0891b2)',
              color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'Nunito, sans-serif',
              boxShadow: loading ? 'none' : '0 8px 30px rgba(124,58,237,.4)',
              transition: 'all .2s', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {loading
              ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Masuk…</>
              : <><MdRocketLaunch size={18} /> Sign In</>}
          </motion.button>

          {/* QR login */}
          <motion.button type="button" onClick={() => router.push('/auth/qr-scan?prompt=1')}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', padding: '13px', borderRadius: 14, cursor: 'pointer',
              background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.2)',
              color: '#a78bfa', fontSize: 14, fontWeight: 600, fontFamily: 'Nunito, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s',
            }}>
            <MdQrCode2 size={18} /> Login dengan QR Code
          </motion.button>
        </motion.form>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ color: 'rgba(255,255,255,.3)', fontSize: 14, textAlign: 'center', marginTop: 28 }}>
          Belum punya akun?{' '}
          <Link href="/register" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>
            Daftar sekarang
          </Link>
        </motion.p>
      </motion.div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes twinkle { 0%,100%{opacity:.2} 50%{opacity:.9} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
