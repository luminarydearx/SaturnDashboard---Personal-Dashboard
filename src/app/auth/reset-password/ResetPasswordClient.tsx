'use client';
import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MdLock, MdVisibility, MdVisibilityOff, MdRocketLaunch, MdCheckCircle, MdAutorenew } from 'react-icons/md';

function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement|null)[]>([]);
  const chars = (value + '      ').split('').slice(0,6);
  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') { e.preventDefault(); const arr = chars.map(c=>c.trim()); arr[i]=''; onChange(arr.join('').trimEnd()); if(i>0&&!chars[i]?.trim()) refs.current[i-1]?.focus(); }
  };
  const handleChange = (i: number, raw: string) => {
    const clean = raw.replace(/[^a-zA-Z0-9]/g,'').toUpperCase().slice(-1);
    const arr = chars.map(c=>c.trim()); arr[i]=clean; onChange(arr.join('').trimEnd()); if(clean&&i<5) refs.current[i+1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault(); const p = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g,'').toUpperCase().slice(0,6); onChange(p); refs.current[Math.min(p.length,5)]?.focus();
  };
  return (
    <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
      {Array.from({length:6}).map((_,i) => {
        const val = chars[i]?.trim() || '';
        return <input key={i} ref={el=>{refs.current[i]=el;}} type="text" inputMode="text" maxLength={1} value={val} onKeyDown={e=>handleKey(i,e)} onChange={e=>handleChange(i,e.target.value)} onPaste={handlePaste} onFocus={e=>e.target.select()}
          style={{ width:44, height:56, textAlign:'center', fontSize:20, fontWeight:700, fontFamily:'monospace', borderRadius:12, outline:'none', background: val?'rgba(220,38,38,.15)':'rgba(255,255,255,.04)', border:`2px solid ${val?'rgba(239,68,68,.5)':'rgba(255,255,255,.1)'}`, color:'#fca5a5', caretColor:'#fca5a5', transition:'all .15s', boxShadow: val?'0 0 14px rgba(239,68,68,.25)':'none' }} />;
      })}
    </div>
  );
}

function Inner() {
  const sp    = useSearchParams();
  const router = useRouter();
  const jwt   = sp.get('jwt')   || '';
  const magic = sp.get('magic') || '';
  const fromEmail = !!(jwt && magic);

  type Step = 'email'|'otp'|'newpass'|'done';
  const [step,     setStep]     = useState<Step>(fromEmail ? 'newpass' : 'email');
  const [email,    setEmail]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [newPw,    setNewPw]    = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [resendCd, setResendCd] = useState(0);
  const tokenRef = useRef('');

  // Auto-verify magic link
  useEffect(() => {
    if (fromEmail && step === 'newpass') {} // stays on newpass, uses jwt+magic
  }, [fromEmail, step]);

  useEffect(() => {
    if (resendCd <= 0) return;
    const t = setInterval(() => setResendCd(p => p-1), 1000);
    return () => clearInterval(t);
  }, [resendCd]);

  const sendCode = async () => {
    if (!email) { setError('Masukkan email'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/auth/forgot-password', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email }) });
      const d = await r.json();
      if (d.success) {
        if (d.token) tokenRef.current = d.token;
        setStep('otp'); setResendCd(60);
      } else setError(d.error || 'Gagal');
    } finally { setLoading(false); }
  };

  const verifyAndReset = async () => {
    const pw = newPw;
    if (pw.length < 6) { setError('Password min 6 karakter'); return; }
    setLoading(true); setError('');
    try {
      const body = fromEmail
        ? { token:jwt, magicToken:magic, newPassword:pw }
        : { token:tokenRef.current, code:otp.trim(), email, newPassword:pw };
      const r = await fetch('/api/auth/reset-password', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { setStep('done'); setTimeout(() => router.push('/login'), 3000); }
      else setError(d.error || 'Gagal reset password');
    } finally { setLoading(false); }
  };

  const inputBase: React.CSSProperties = { width:'100%', padding:'14px 44px 14px 44px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, color:'#fff', fontSize:15, outline:'none', boxSizing:'border-box', transition:'all .2s' };

  return (
    <div style={{ minHeight:'100vh', background:'#04040d', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)' }} />
      </div>

      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} style={{ position:'relative', zIndex:1, width:'100%', maxWidth:420 }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28, justifyContent:'center' }}>
          <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,#dc2626,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <MdRocketLaunch size={20} color="#fff" />
          </div>
          <span style={{ color:'#fff', fontFamily:'Orbitron, sans-serif', fontWeight:700, fontSize:17, letterSpacing:2 }}>SATURN</span>
        </div>

        <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(239,68,68,.2)', borderRadius:24, padding:'36px 32px', backdropFilter:'blur(20px)' }}>
          <AnimatePresence mode="wait">
            {/* STEP EMAIL */}
            {step === 'email' && (
              <motion.div key="email" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                <h2 style={{ color:'#fff', fontSize:22, fontWeight:800, margin:'0 0 6px', textAlign:'center' }}>Lupa Password?</h2>
                <p style={{ color:'rgba(255,255,255,.4)', fontSize:13, margin:'0 0 28px', textAlign:'center', lineHeight:1.6 }}>Masukkan emailmu dan kami akan mengirimkan kode reset.</p>
                <div style={{ position:'relative', marginBottom:16 }}>
                  <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,.3)' }}>✉️</div>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendCode()} placeholder="email@domain.com" style={inputBase} />
                </div>
                {error && <p style={{ color:'#f87171', fontSize:12, margin:'0 0 12px', textAlign:'center' }}>{error}</p>}
                <motion.button onClick={sendCode} disabled={loading} whileHover={{ scale:loading?1:1.02 }} whileTap={{ scale:.97 }}
                  style={{ width:'100%', padding:15, borderRadius:14, border:'none', cursor:loading?'not-allowed':'pointer', background:loading?'rgba(220,38,38,.3)':'linear-gradient(135deg,#dc2626,#7c3aed)', color:'#fff', fontSize:15, fontWeight:700, marginBottom:16, display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:loading?'none':'0 8px 24px rgba(220,38,38,.35)' }}>
                  {loading?<><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }} />Mengirim…</>:'Kirim Kode Reset'}
                </motion.button>
                <button onClick={() => router.push('/login')} style={{ width:'100%', background:'none', border:'none', color:'rgba(255,255,255,.3)', fontSize:13, cursor:'pointer' }}>← Kembali ke Login</button>
              </motion.div>
            )}

            {/* STEP OTP */}
            {step === 'otp' && (
              <motion.div key="otp" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <div style={{ textAlign:'center' }}>
                  <p style={{ color:'#fff', fontSize:20, fontWeight:800, margin:'0 0 6px' }}>Masukkan Kode</p>
                  <p style={{ color:'rgba(255,255,255,.4)', fontSize:13, margin:'0 0 4px' }}>Kode dikirim ke:</p>
                  <p style={{ color:'#fca5a5', fontSize:14, fontWeight:700, fontFamily:'monospace', margin:0 }}>{email}</p>
                </div>
                <OTPInput value={otp} onChange={v=>{ setOtp(v); setError(''); }} />
                {error && <p style={{ color:'#f87171', fontSize:12, textAlign:'center', margin:0 }}>{error}</p>}
                <div style={{ position:'relative' }}>
                  <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,.3)' }}><MdLock size={17} /></div>
                  <div style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', cursor:'pointer', color:'rgba(255,255,255,.35)' }} onClick={() => setShowPw(p=>!p)}>{showPw?<MdVisibilityOff size={18}/>:<MdVisibility size={18}/>}</div>
                  <input type={showPw?'text':'password'} value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Password baru (min. 6)" style={{ ...inputBase, paddingRight:48 }} />
                </div>
                <motion.button onClick={verifyAndReset} disabled={loading||otp.trim().length<6||newPw.length<6} whileHover={{ scale: loading?1:1.02 }} whileTap={{ scale:.97 }}
                  style={{ width:'100%', padding:15, borderRadius:14, border:'none', cursor: otp.trim().length<6||newPw.length<6?'not-allowed':'pointer', background: otp.trim().length<6||newPw.length<6?'rgba(220,38,38,.2)':'linear-gradient(135deg,#dc2626,#7c3aed)', color:'#fff', fontSize:15, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  {loading?<><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }} />Mereset…</>:'Reset Password'}
                </motion.button>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <button onClick={() => setStep('email')} style={{ background:'none', border:'none', color:'rgba(255,255,255,.3)', fontSize:13, cursor:'pointer' }}>← Kembali</button>
                  <button onClick={() => { setOtp(''); setError(''); setResendCd(60); sendCode(); }} disabled={resendCd>0||loading}
                    style={{ background:'none', border:'none', color:resendCd>0?'rgba(255,255,255,.25)':'#fca5a5', fontSize:13, cursor:resendCd>0?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:5 }}>
                    <MdAutorenew size={14} /> {resendCd>0?`Kirim ulang (${resendCd}s)`:'Kirim ulang'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP NEW PASSWORD (from magic link) */}
            {step === 'newpass' && fromEmail && (
              <motion.div key="newpass" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <h2 style={{ color:'#fff', fontSize:20, fontWeight:800, margin:'0 0 6px', textAlign:'center' }}>Buat Password Baru</h2>
                <p style={{ color:'rgba(255,255,255,.4)', fontSize:13, margin:'0 0 8px', textAlign:'center' }}>Link verifikasi valid. Masukkan password barumu.</p>
                <div style={{ position:'relative' }}>
                  <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,.3)' }}><MdLock size={17} /></div>
                  <div style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', cursor:'pointer', color:'rgba(255,255,255,.35)' }} onClick={()=>setShowPw(p=>!p)}>{showPw?<MdVisibilityOff size={18}/>:<MdVisibility size={18}/>}</div>
                  <input type={showPw?'text':'password'} value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Password baru (min. 6)" style={{ ...inputBase, paddingRight:48 }} />
                </div>
                {newPw.length>0 && (
                  <div style={{ display:'flex', gap:4 }}>
                    {[2,4,6,8].map(n => <div key={n} style={{ flex:1, height:3, borderRadius:2, background:newPw.length>=n?(n<=4?'#f87171':n<=6?'#fbbf24':'#4ade80'):'rgba(255,255,255,.1)', transition:'background .3s' }} />)}
                  </div>
                )}
                {error && <p style={{ color:'#f87171', fontSize:12, textAlign:'center', margin:0 }}>{error}</p>}
                <motion.button onClick={verifyAndReset} disabled={loading||newPw.length<6} whileHover={{ scale: loading?1:1.02 }} whileTap={{ scale:.97 }}
                  style={{ width:'100%', padding:15, borderRadius:14, border:'none', cursor:newPw.length<6?'not-allowed':'pointer', background:newPw.length<6?'rgba(220,38,38,.2)':'linear-gradient(135deg,#dc2626,#7c3aed)', color:'#fff', fontSize:15, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:newPw.length<6?'none':'0 8px 24px rgba(220,38,38,.35)' }}>
                  {loading?<><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }} />Mereset…</>:<><MdLock size={16} />Simpan Password Baru</>}
                </motion.button>
              </motion.div>
            )}

            {/* DONE */}
            {step === 'done' && (
              <motion.div key="done" initial={{ opacity:0, scale:.8 }} animate={{ opacity:1, scale:1 }} style={{ textAlign:'center', padding:'20px 0' }}>
                <motion.div animate={{ scale:[1,1.15,1] }} transition={{ duration:.6 }} style={{ fontSize:64, marginBottom:16 }}>✅</motion.div>
                <h2 style={{ color:'#4ade80', fontSize:22, fontWeight:800, margin:'0 0 8px' }}>Password Direset!</h2>
                <p style={{ color:'rgba(255,255,255,.4)', fontSize:14, margin:0 }}>Mengalihkan ke halaman login…</p>
                <div style={{ background:'rgba(255,255,255,.06)', borderRadius:8, height:5, overflow:'hidden', margin:'20px auto 0', maxWidth:180 }}>
                  <motion.div initial={{ width:'100%' }} animate={{ width:'0%' }} transition={{ duration:3, ease:'linear' }} style={{ height:'100%', background:'linear-gradient(90deg,#22c55e,#16a34a)', borderRadius:8 }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ResetPasswordClient() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'#04040d' }} />}>
      <Inner />
    </Suspense>
  );
}
