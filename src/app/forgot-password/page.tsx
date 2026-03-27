'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';
import { MdEmail, MdRocketLaunch, MdCheckCircle, MdArrowBack } from 'react-icons/md';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export default function ForgotPasswordPage() {
  const { error: toastErr } = useToast();
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [focus,   setFocus]   = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) { toastErr('Format email tidak valid'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (d.success) setSent(true);
      else toastErr(d.error || 'Gagal mengirim email');
    } catch { toastErr('Koneksi gagal'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#04040d', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', position:'relative' }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)' }} />
      </div>

      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} style={{ position:'relative', zIndex:1, width:'100%', maxWidth:420 }}>
        <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)', borderRadius:28, padding:'40px 36px' }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:32 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,#7c3aed,#0891b2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <MdRocketLaunch size={20} color="#fff" />
            </div>
            <span style={{ color:'#fff', fontFamily:'Orbitron, sans-serif', fontWeight:700, fontSize:16, letterSpacing:2 }}>SATURN</span>
          </div>

          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div key="form" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                <h1 style={{ color:'#fff', fontSize:22, fontWeight:800, margin:'0 0 6px' }}>Lupa Password?</h1>
                <p style={{ color:'rgba(255,255,255,.4)', fontSize:14, margin:'0 0 28px', lineHeight:1.6 }}>
                  Masukkan emailmu dan kami akan kirimkan link untuk reset password.
                </p>

                <form onSubmit={send} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div>
                    <label style={{ color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', display:'block', marginBottom:7 }}>Email</label>
                    <div style={{ position:'relative' }}>
                      <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color: focus ? '#a78bfa' : 'rgba(255,255,255,.3)', transition:'color .2s' }}>
                        <MdEmail size={17} />
                      </div>
                      <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                        onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
                        placeholder="nama@email.com" autoComplete="email"
                        style={{ width:'100%', paddingLeft:44, paddingRight:16, paddingTop:14, paddingBottom:14, background:focus?'rgba(124,58,237,.08)':'rgba(255,255,255,.04)', border:`1px solid ${focus?'rgba(124,58,237,.5)':'rgba(255,255,255,.08)'}`, borderRadius:14, color:'#fff', fontSize:15, outline:'none', transition:'all .2s', boxSizing:'border-box', boxShadow:focus?'0 0 20px rgba(124,58,237,.15)':'none' }} />
                    </div>
                  </div>

                  <motion.button type="submit" disabled={loading} whileHover={{ scale: loading?1:1.02 }} whileTap={{ scale: loading?1:0.98 }}
                    style={{ width:'100%', padding:'14px', borderRadius:14, border:'none', cursor:loading?'not-allowed':'pointer', background:loading?'rgba(124,58,237,.3)':'linear-gradient(135deg,#7c3aed,#0891b2)', color:'#fff', fontSize:15, fontWeight:700, boxShadow:loading?'none':'0 8px 24px rgba(124,58,237,.35)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    {loading ? <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }} />Mengirim…</> : 'Kirim Link Reset'}
                  </motion.button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="sent" initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }} style={{ textAlign:'center', padding:'10px 0' }}>
                <motion.div animate={{ scale:[1,1.1,1] }} transition={{ duration:.5 }}
                  style={{ width:64, height:64, background:'rgba(34,197,94,.15)', border:'1px solid rgba(34,197,94,.3)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
                  <MdCheckCircle size={32} style={{ color:'#4ade80' }} />
                </motion.div>
                <h2 style={{ color:'#4ade80', fontSize:20, fontWeight:800, margin:'0 0 8px' }}>Email Dikirim!</h2>
                <p style={{ color:'rgba(255,255,255,.45)', fontSize:13, margin:'0 0 4px' }}>Link reset telah dikirim ke:</p>
                <p style={{ color:'#a78bfa', fontFamily:'monospace', fontSize:14, fontWeight:700, margin:'0 0 20px' }}>{email}</p>
                <p style={{ color:'rgba(255,255,255,.25)', fontSize:11, margin:'0 0 20px', lineHeight:1.6 }}>
                  Cek inbox atau folder Spam. Link berlaku 15 menit.
                </p>
                <button onClick={()=>{ setSent(false); setEmail(''); }}
                  style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, padding:'10px 20px', color:'rgba(255,255,255,.6)', fontSize:13, cursor:'pointer' }}>
                  Kirim Ulang
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', marginTop:24, paddingTop:20 }}>
            <Link href="/login" style={{ display:'flex', alignItems:'center', gap:6, color:'rgba(255,255,255,.3)', fontSize:13, textDecoration:'none' }}>
              <MdArrowBack size={15}/> Kembali ke Login
            </Link>
          </div>
        </div>
      </motion.div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
