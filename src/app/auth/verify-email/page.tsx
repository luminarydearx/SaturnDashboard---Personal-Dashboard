'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

function Inner() {
  const sp    = useSearchParams();
  const router = useRouter();
  const jwt    = sp.get('jwt')   || '';
  const magic  = sp.get('magic') || '';

  type Status = 'verifying' | 'success' | 'error';
  const [status,  setStatus]  = useState<Status>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!jwt || !magic) { setStatus('error'); setMessage('Link tidak valid — parameter hilang'); return; }

    fetch('/api/auth/verify-code', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token: jwt, magicToken: magic }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setStatus('success');
          // Auto-redirect to registration complete or login after 3 seconds
          // Store verified state so register page can use it
          try { sessionStorage.setItem('saturn_otp_magic_verified', 'true'); } catch {}
          setTimeout(() => router.push('/login?verified=1'), 3000);
        } else {
          setStatus('error');
          setMessage(d.error || 'Verifikasi gagal');
        }
      })
      .catch(() => { setStatus('error'); setMessage('Koneksi gagal'); });
  }, [jwt, magic, router]);

  return (
    <div style={{
      minHeight: '100vh', background: '#04040d', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative',
    }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: status === 'success' ? 'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)' : status === 'error' ? 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', transition: 'background 1s' }} />
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: `1px solid ${status === 'success' ? 'rgba(34,197,94,.3)' : status === 'error' ? 'rgba(239,68,68,.3)' : 'rgba(124,58,237,.3)'}`,
          borderRadius: 28, padding: '48px 40px', backdropFilter: 'blur(20px)', transition: 'border-color .5s',
        }}>
          <AnimatePresence mode="wait">
            {status === 'verifying' && (
              <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <div style={{ width: 32, height: 32, border: '3px solid rgba(167,139,250,.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                </div>
                <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Memverifikasi…</h2>
                <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, margin: 0 }}>Sedang memproses link verifikasi kamu</p>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', bounce: 0.4 }}>
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', bounce: 0.5 }}
                  style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,.15)', border: '2px solid rgba(34,197,94,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 36 }}>
                  ✅
                </motion.div>
                <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  style={{ color: '#4ade80', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
                  Email Terverifikasi!
                </motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  style={{ color: 'rgba(255,255,255,.5)', fontSize: 14, margin: '0 0 24px' }}>
                  Verifikasi berhasil. Kamu akan diarahkan ke halaman login…
                </motion.p>
                {/* Countdown bar */}
                <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 8, height: 6, overflow: 'hidden', margin: '0 auto', maxWidth: 200 }}>
                  <motion.div
                    initial={{ width: '100%' }} animate={{ width: '0%' }}
                    transition={{ duration: 3, ease: 'linear' }}
                    style={{ height: '100%', background: 'linear-gradient(90deg,#22c55e,#16a34a)', borderRadius: 8 }} />
                </div>
                <p style={{ color: 'rgba(255,255,255,.25)', fontSize: 12, marginTop: 10 }}>Mengalihkan dalam 3 detik…</p>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                <div style={{ fontSize: 52, margin: '0 0 16px' }}>❌</div>
                <h2 style={{ color: '#f87171', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Verifikasi Gagal</h2>
                <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, margin: '0 0 24px' }}>{message}</p>
                <button onClick={() => router.push('/register')}
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#0891b2)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Kembali ke Register
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'#04040d', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:32, height:32, border:'2px solid rgba(167,139,250,.3)', borderTopColor:'#a78bfa', borderRadius:'50%', animation:'spin .7s linear infinite' }} /></div>}>
      <Inner />
    </Suspense>
  );
}
