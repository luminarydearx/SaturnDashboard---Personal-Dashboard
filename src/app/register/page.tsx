'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';
import QRSuccessModal from '@/components/ui/QRSuccessModal';
import {
  MdPerson, MdLock, MdEmail, MdPhone, MdBadge,
  MdVisibility, MdVisibilityOff, MdRocketLaunch,
  MdCheckCircle, MdMarkEmailRead, MdAutorenew,
} from 'react-icons/md';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = (value + '      ').split('').slice(0, 6);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = chars.map(c => c.trim());
      arr[i] = '';
      const next = arr.join('').slice(0, arr.join('').length);
      onChange(arr.slice(0, i + (arr[i] === '' ? 0 : 1)).join('').trimEnd());
      if (i > 0 && !chars[i]?.trim()) refs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i: number, raw: string) => {
    const clean = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-1);
    const arr = chars.map(c => c.trim());
    arr[i] = clean;
    onChange(arr.join('').trimEnd());
    if (clean && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    onChange(p);
    refs.current[Math.min(p.length, 5)]?.focus();
  };

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: 6 }).map((_, i) => {
        const val = chars[i]?.trim() || '';
        return (
          <input key={i} ref={el => { refs.current[i] = el; }}
            type="text" inputMode="text" maxLength={1}
            value={val}
            onKeyDown={e => handleKey(i, e)}
            onChange={e => handleChange(i, e.target.value)}
            onPaste={handlePaste}
            onFocus={e => e.target.select()}
            style={{
              width: 48, height: 60, textAlign: 'center', fontSize: 22, fontWeight: 700,
              fontFamily: 'monospace', borderRadius: 12, outline: 'none',
              background: val ? 'rgba(124,58,237,.15)' : 'rgba(255,255,255,.04)',
              border: `2px solid ${val ? 'rgba(124,58,237,.5)' : 'rgba(255,255,255,.1)'}`,
              color: '#a78bfa', caretColor: '#a78bfa', transition: 'all .15s',
              boxShadow: val ? '0 0 16px rgba(124,58,237,.25)' : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

function RegisterInner() {
  const router = useRouter();
  const { success: toastSuccess, error: toastErr } = useToast();

  const [step,     setStep]     = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [mounted,  setMounted]  = useState(false);
  const [focus,    setFocus]    = useState<string | null>(null);
  const [newUser,  setNewUser]  = useState<any>(null);
  const [otp,      setOtp]      = useState('');
  const [otpToken, setOtpToken] = useState(''); // JWT from server
  const otpTokenRef = useRef('');                    // ref = always fresh, no stale closure
  const [otpErr,   setOtpErr]   = useState('');
  const [resendCd, setResendCd] = useState(0);
  const [verifyOk, setVerifyOk] = useState(false);

  const [reg, setReg] = useState({
    username: '', password: '', firstName: '', lastName: '', email: '', phone: '',
  });
  const sr = (k: keyof typeof reg) => (v: string) => setReg(p => ({ ...p, [k]: v }));

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (resendCd <= 0) return;
    const t = setInterval(() => setResendCd(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [resendCd]);

  const sendOTP = async () => {
    setLoading(true); setOtpErr('');
    try {
      const r = await fetch('/api/auth/send-verification', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: reg.email }),
      });
      const d = await r.json();
      if (d.success) {
        setStep(3); setResendCd(60);
        if (d.token) {
          setOtpToken(d.token);
          otpTokenRef.current = d.token; // always-fresh ref
        }
        toastSuccess('Kode dikirim ke ' + reg.email + '!');
      }
      else toastErr(d.error || 'Gagal kirim kode');
    } catch { toastErr('Koneksi gagal'); }
    finally { setLoading(false); }
  };

  const verifyOTP = async () => {
    if (otp.replace(/\s/g, '').length < 6) { setOtpErr('Masukkan 6 karakter kode'); return; }
    setLoading(true); setOtpErr('');
    try {
      const r = await fetch('/api/auth/verify-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: otpTokenRef.current || otpToken, code: otp.trim() }),
      });
      const d = await r.json();
      if (d.success) {
        setVerifyOk(true);
        setTimeout(() => doRegister(), 3000);
      } else { setOtpErr(d.error || 'Kode tidak valid'); }
    } catch { setOtpErr('Koneksi gagal'); }
    finally { setLoading(false); }
  };

  const doRegister = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reg, displayName: `${reg.firstName} ${reg.lastName}`.trim(), otpToken: otpTokenRef.current || otpToken, otpCode: otp.trim() }),
      });
      const d = await r.json();
      if (d.success) {
        toastSuccess('Akun berhasil dibuat! 🎉');
        if (d.data?.id) setNewUser(d.data);
        else router.push('/dashboard');
      } else { toastErr(d.error || 'Registrasi gagal'); setVerifyOk(false); }
    } catch { toastErr('Koneksi gagal'); setVerifyOk(false); }
    finally { setLoading(false); }
  };

  const step1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reg.firstName || !reg.lastName) { toastErr('Isi nama lengkap'); return; }
    if (!reg.email || !EMAIL_RE.test(reg.email)) { toastErr('Format email tidak valid (contoh: nama@gmail.com)'); return; }
    setStep(2);
  };

  const step2Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reg.username || reg.username.length < 3) { toastErr('Username min 3 karakter'); return; }
    if (!reg.password || reg.password.length < 6) { toastErr('Password min 6 karakter'); return; }
    sendOTP();
  };

  const IS = (k: string): React.CSSProperties => ({
    width: '100%', paddingLeft: 44, paddingRight: 16, paddingTop: 14, paddingBottom: 14,
    background: focus === k ? 'rgba(124,58,237,.08)' : 'rgba(255,255,255,.04)',
    border: `1px solid ${focus === k ? 'rgba(124,58,237,.5)' : 'rgba(255,255,255,.08)'}`,
    borderRadius: 14, color: '#fff', fontSize: 15, outline: 'none', transition: 'all .2s',
    boxSizing: 'border-box', boxShadow: focus === k ? '0 0 20px rgba(124,58,237,.15)' : 'none',
  });

  const LB: React.CSSProperties = { color: 'rgba(255,255,255,.5)', fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 7 };
  const IC = (k: string): React.CSSProperties => ({ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focus === k ? '#a78bfa' : 'rgba(255,255,255,.3)', transition: 'color .2s', pointerEvents: 'none' });

  const STEPS = ['Info Pribadi', 'Akun', 'Verifikasi'];

  return (
    <div style={{ minHeight: '100vh', background: '#04040d', display: 'flex', alignItems: 'stretch', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', top: '-200px', right: '-200px', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', animation: 'pulse 9s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', bottom: '-100px', left: '-100px', background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', animation: 'pulse 7s ease-in-out infinite reverse' }} />
        {mounted && Array.from({ length: 35 }).map((_, i) => <div key={i} style={{ position: 'absolute', width: Math.random() * 2 + 1, height: Math.random() * 2 + 1, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, animation: `twinkle ${Math.random() * 4 + 3}s ease-in-out infinite`, animationDelay: `${Math.random() * 5}s` }} />)}
      </div>

      <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: [0.16,1,0.3,1] }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 48px', position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto', width: '100%' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(124,58,237,.4)' }}><MdRocketLaunch size={21} color="#fff" /></div>
          <span style={{ color: '#fff', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 18, letterSpacing: 2 }}>SATURN</span>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 4px', fontFamily: 'Nunito, sans-serif' }}>Buat Akun Baru</h1>
          <p style={{ color: 'rgba(255,255,255,.4)', margin: 0, fontSize: 14 }}>Daftarkan dirimu ke Saturn Dashboard</p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          {STEPS.map((label, i) => {
            const s = i + 1; const done = step > s; const active = step === s;
            return <div key={s} style={{ display: 'flex', alignItems: 'center', flex: s < 3 ? 1 : 'unset' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                <motion.div animate={{ background: done ? 'linear-gradient(135deg,#22c55e,#16a34a)' : active ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'rgba(255,255,255,.06)' }}
                  style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: done || active ? '#fff' : 'rgba(255,255,255,.3)', border: `2px solid ${active ? 'rgba(124,58,237,.6)' : 'transparent'}`, flexShrink: 0, transition: 'all .3s' }}>
                  {done ? <MdCheckCircle size={15} /> : s}
                </motion.div>
                <span style={{ fontSize: 11, color: active ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.3)', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>{label}</span>
              </div>
              {s < 3 && <div style={{ flex: 1, height: 1, margin: '0 10px', background: done ? 'linear-gradient(90deg,#22c55e,#7c3aed)' : 'rgba(255,255,255,.08)', transition: 'background .3s' }} />}
            </div>;
          })}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form key="s1" onSubmit={step1Next} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                style={{ display:'grid', gap:12 }}>
                {(['firstName','lastName'] as const).map((k, fi) => (
                  <div key={k}>
                    <label style={LB}>{fi===0?'First':'Last'} Name *</label>
                    <div style={{ position:'relative' }}>
                      <div style={IC(k)}><MdBadge size={17} /></div>
                      <input value={reg[k]} onChange={e=>sr(k)(e.target.value)} onFocus={()=>setFocus(k)} onBlur={()=>setFocus(null)} style={IS(k)} placeholder={fi===0?'John':'Doe'} />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label style={LB}>Email * <span style={{ color:'rgba(255,255,255,.25)', fontWeight:400, textTransform:'none' }}>(akan diverifikasi)</span></label>
                <div style={{ position:'relative' }}>
                  <div style={{ ...IC('em'), color: reg.email && !EMAIL_RE.test(reg.email) ? '#f87171' : reg.email && EMAIL_RE.test(reg.email) ? '#4ade80' : focus==='em'?'#a78bfa':'rgba(255,255,255,.3)' }}><MdEmail size={17} /></div>
                  <input type="email" value={reg.email} onChange={e=>sr('email')(e.target.value)} onFocus={()=>setFocus('em')} onBlur={()=>setFocus(null)}
                    style={{ ...IS('em'), border:`1px solid ${reg.email&&!EMAIL_RE.test(reg.email)?'rgba(239,68,68,.5)':focus==='em'?'rgba(124,58,237,.5)':'rgba(255,255,255,.08)'}` }} placeholder="nama@gmail.com" />
                  {reg.email && EMAIL_RE.test(reg.email) && <div style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', color:'#4ade80' }}><MdCheckCircle size={16} /></div>}
                </div>
                {reg.email && !EMAIL_RE.test(reg.email) && <p style={{ color:'#f87171', fontSize:11, margin:'6px 0 0', paddingLeft:4 }}>Format: nama@domain.com / .id / .net dst.</p>}
              </div>
              <div>
                <label style={LB}>Phone <span style={{ color:'rgba(255,255,255,.25)', fontWeight:400, textTransform:'none' }}>(opsional)</span></label>
                <div style={{ position:'relative' }}>
                  <div style={IC('ph')}><MdPhone size={17} /></div>
                  <input type="tel" value={reg.phone} onChange={e=>sr('phone')(e.target.value)} onFocus={()=>setFocus('ph')} onBlur={()=>setFocus(null)} style={IS('ph')} placeholder="+62..." />
                </div>
              </div>
              <motion.button type="submit" whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                style={{ width:'100%', padding:'15px', borderRadius:14, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#7c3aed,#0891b2)', color:'#fff', fontSize:15, fontWeight:700, fontFamily:'Nunito, sans-serif', boxShadow:'0 8px 28px rgba(124,58,237,.35)', marginTop:4 }}>
                Lanjut →
              </motion.button>
            </motion.form>
          )}

          {step === 2 && (
            <>
              {(() => {
                // Validation
                const usernameValid = reg.username && reg.username.length >= 5;
                const passwordValid =
                  reg.password.length >= 8 &&
                  /[A-Z]/.test(reg.password) &&
                  /\d/.test(reg.password);

                const canProceed = usernameValid && passwordValid;

                return (
                  <motion.form
                    key="s2"
                    onSubmit={e => {
                      if (!canProceed) {
                        e.preventDefault();
                        return;
                      }
                      step2Next(e);
                    }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                  >
                    <div>
                      <label style={LB}>Username *</label>
                      <div style={{ position: 'relative' }}>
                        <div style={IC('un')}>
                          <MdPerson size={17} />
                        </div>
                        <input
                          value={reg.username}
                          onChange={e =>
                            sr('username')(
                              e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                            )
                          }
                          autoComplete="username"
                          onFocus={() => setFocus('un')}
                          onBlur={() => setFocus(null)}
                          style={IS('un')}
                          placeholder="username_unik"
                        />
                      </div>
                      {reg.username && reg.username.length < 5 && (
                        <p style={{ color: '#f87171', fontSize: 11, margin: '6px 0 0', paddingLeft: 4 }}>
                          Min. 5 karakter
                        </p>
                      )}
                    </div>
                    <div>
                      <label style={LB}>Password *</label>
                      <div style={{ position: 'relative' }}>
                        <div style={IC('pw')}>
                          <MdLock size={17} />
                        </div>
                        <input
                          type={showPw ? 'text' : 'password'}
                          className="no-password-toggle w-full pl-[54px] pr-[44px] py-4 bg-transparent border-none text-white text-[16px] rounded-[14px] outline-none font-medium tracking-[1px]"
                          value={reg.password}
                          onChange={e => sr('password')(e.target.value)}
                          autoComplete="new-password"
                          onFocus={() => setFocus('pw')}
                          onBlur={() => setFocus(null)}
                          style={{ ...IS('pw'), paddingRight: 48 }}
                          placeholder="Password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((p) => !p)}
                          style={{
                            position: 'absolute',
                            right: 14,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255,255,255,.35)',
                            cursor: 'pointer',
                            padding: 4,
                          }}
                        >
                          {showPw ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                        </button>
                      </div>
                      {/* Persyaratan password */}
                      <ul style={{ color: '#f87171', fontSize: 12, marginTop: 8, marginBottom: 0, listStyle: 'disc', paddingLeft: 20 }}>
                        <li style={{ color: reg.password.length >= 8 ? '#4ade80' : '#f87171' }}>
                          Minimal 8 karakter
                        </li>
                        <li style={{ color: /[A-Z]/.test(reg.password) ? '#4ade80' : '#f87171' }}>
                          Mengandung setidaknya 1 huruf besar
                        </li>
                        <li style={{ color: /\d/.test(reg.password) ? '#4ade80' : '#f87171' }}>
                          Mengandung setidaknya 1 angka
                        </li>
                      </ul>
                      {/* Progress bar sesuai validasi */}
                      {reg.password.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                          {[
                            reg.password.length >= 8,
                            /[A-Z]/.test(reg.password),
                            /\d/.test(reg.password),
                          ].map((isValid, idx) => (
                            <div
                              key={idx}
                              style={{
                                flex: 1,
                                height: 3,
                                borderRadius: 2,
                                background: isValid ? '#4ade80' : 'rgba(255,255,255,.1)',
                                transition: 'background .3s',
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(6,182,212,.06)', border: '1px solid rgba(6,182,212,.2)' }}>
                      <p style={{ color: 'rgba(6,182,212,.9)', fontSize: 12, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MdMarkEmailRead size={15} /> Kode verifikasi akan dikirim ke <strong>{reg.email}</strong>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <motion.button
                        type="button"
                        onClick={() => setStep(1)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          flex: 1,
                          padding: '15px',
                          borderRadius: 14,
                          border: '1px solid rgba(255,255,255,.1)',
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,.04)',
                          color: 'rgba(255,255,255,.6)',
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        ← Kembali
                      </motion.button>
                      <motion.button
                        type="submit"
                        disabled={loading || !canProceed}
                        whileHover={{ scale: loading || !canProceed ? 1 : 1.02 }}
                        whileTap={{ scale: loading || !canProceed ? 1 : 0.97 }}
                        style={{
                          flex: 2,
                          padding: '15px',
                          borderRadius: 14,
                          border: 'none',
                          cursor: loading || !canProceed ? 'not-allowed' : 'pointer',
                          background: loading || !canProceed
                            ? 'rgba(124,58,237,.3)'
                            : 'linear-gradient(135deg,#7c3aed,#0891b2)',
                          color: '#fff',
                          fontSize: 14,
                          fontWeight: 700,
                          boxShadow: loading || !canProceed ? 'none' : '0 8px 25px rgba(124,58,237,.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                        }}
                      >
                        {loading
                          ? (
                            <>
                              <div
                                style={{
                                  width: 16,
                                  height: 16,
                                  border: '2px solid rgba(255,255,255,.3)',
                                  borderTopColor: '#fff',
                                  borderRadius: '50%',
                                  animation: 'spin .7s linear infinite'
                                }}
                              />
                              Mengirim…
                            </>
                          )
                          : (
                            <>
                              <MdMarkEmailRead size={16} />
                              Kirim Kode Verifikasi
                            </>
                          )
                        }
                      </motion.button>
                    </div>
                  </motion.form>
                );
              })()}
            </>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}>
              <AnimatePresence mode="wait">
                {verifyOk ? (
                  <motion.div key="ok" initial={{ opacity:0, scale:.8 }} animate={{ opacity:1, scale:1 }} style={{ textAlign:'center', padding:'20px 0' }}>
                    <motion.div animate={{ scale:[1,1.15,1], rotate:[0,5,-5,0] }} transition={{ duration:.6 }} style={{ fontSize:72, marginBottom:16 }}>✅</motion.div>
                    <h2 style={{ color:'#4ade80', fontSize:22, fontWeight:800, margin:'0 0 8px' }}>Email Terverifikasi!</h2>
                    <p style={{ color:'rgba(255,255,255,.5)', fontSize:14, margin:'0 0 24px' }}>Membuat akun…</p>
                    <div style={{ background:'rgba(255,255,255,.06)', borderRadius:8, height:6, overflow:'hidden', margin:'0 auto', maxWidth:200 }}>
                      <motion.div initial={{ width:'100%' }} animate={{ width:'0%' }} transition={{ duration:3, ease:'linear' }} style={{ height:'100%', background:'linear-gradient(90deg,#22c55e,#16a34a)', borderRadius:8 }} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="form" style={{ display:'flex', flexDirection:'column', gap:20 }}>
                    <div style={{ textAlign:'center' }}>
                      <motion.div animate={{ y:[0,-4,0] }} transition={{ duration:2, repeat:Infinity }} style={{ fontSize:52, marginBottom:12 }}>📬</motion.div>
                      <p style={{ color:'rgba(255,255,255,.6)', fontSize:14, margin:'0 0 4px' }}>Kode dikirim ke:</p>
                      <p style={{ color:'#a78bfa', fontSize:15, fontWeight:700, margin:0, fontFamily:'monospace' }}>{reg.email}</p>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <p style={{ color:'rgba(255,255,255,.4)', fontSize:12, margin:'0 0 16px' }}>Masukkan 6 karakter kode dari email kamu</p>
                      <OTPInput value={otp} onChange={v=>{ setOtp(v); setOtpErr(''); }} />
                      {otpErr && <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} style={{ color:'#f87171', fontSize:12, margin:'10px 0 0' }}>{otpErr}</motion.p>}
                    </div>
                    <motion.button onClick={verifyOTP} disabled={loading || otp.replace(/\s/g,'').length < 6}
                      whileHover={{ scale: loading || otp.replace(/\s/g,'').length < 6 ? 1 : 1.02 }} whileTap={{ scale:.97 }}
                      style={{ width:'100%', padding:'15px', borderRadius:14, border:'none', cursor: otp.replace(/\s/g,'').length<6?'not-allowed':'pointer', background: otp.replace(/\s/g,'').length<6?'rgba(124,58,237,.2)':'linear-gradient(135deg,#7c3aed,#0891b2)', color:'#fff', fontSize:15, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow: otp.replace(/\s/g,'').length<6?'none':'0 8px 25px rgba(124,58,237,.35)', transition:'all .2s' }}>
                      {loading ? <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }} />Memverifikasi…</> : <><MdCheckCircle size={16} />Verifikasi Kode</>}
                    </motion.button>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <button onClick={()=>setStep(2)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.3)', fontSize:13, cursor:'pointer', padding:0 }}>← Kembali</button>
                      <button onClick={()=>{ setOtp(''); setOtpErr(''); sendOTP(); }} disabled={resendCd>0||loading}
                        style={{ background:'none', border:'none', color:resendCd>0?'rgba(255,255,255,.25)':'#a78bfa', fontSize:13, cursor:resendCd>0?'not-allowed':'pointer', padding:0, display:'flex', alignItems:'center', gap:5 }}>
                        <MdAutorenew size={14} /> {resendCd>0?`Kirim ulang (${resendCd}s)`:'Kirim ulang kode'}
                      </button>
                    </div>
                    <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(124,58,237,.06)', border:'1px solid rgba(124,58,237,.2)' }}>
                      <p style={{ color:'rgba(167,139,250,.8)', fontSize:12, margin:0, lineHeight:1.6 }}>
                        💡 Cek folder <strong>Spam/Junk</strong> jika email tidak masuk. Atau klik <strong>"VERIFY HERE"</strong> di email untuk verifikasi otomatis tanpa mengetik kode.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <p style={{ color:'rgba(255,255,255,.25)', fontSize:13, textAlign:'center', marginTop:20 }}>
          Sudah punya akun? <Link href="/login" style={{ color:'#a78bfa', fontWeight:600, textDecoration:'none' }}>Masuk</Link>
        </p>
      </motion.div>

      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.3 }}
        className="hidden lg:flex"
        style={{ flex:1, alignItems:'center', justifyContent:'center', position:'relative', zIndex:1, borderLeft:'1px solid rgba(255,255,255,.05)', padding:60 }}>
        <div style={{ textAlign:'center', maxWidth:360 }}>
          <motion.div animate={{ y:[0,-8,0] }} transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }}>
            <div style={{ width:120, height:120, borderRadius:32, background:'linear-gradient(135deg,rgba(124,58,237,.3),rgba(6,182,212,.2))', border:'1px solid rgba(124,58,237,.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 32px', boxShadow:'0 0 60px rgba(124,58,237,.2)', fontSize:56 }}>🚀</div>
          </motion.div>
          <h2 style={{ color:'#fff', fontSize:24, fontWeight:800, margin:'0 0 12px', fontFamily:'Orbitron, sans-serif' }}>Join Saturn</h2>
          <p style={{ color:'rgba(255,255,255,.35)', fontSize:14, lineHeight:1.7, margin:0 }}>Verifikasi email melindungi akun kamu dan memastikan keamanan tim dari akses tidak sah.</p>
        </div>
      </motion.div>

      {newUser && <QRSuccessModal user={newUser} onClose={()=>{ setNewUser(null); router.push('/dashboard'); }} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes twinkle { 0%,100%{opacity:.15} 50%{opacity:.8} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'#04040d' }} />}>
      <RegisterInner />
    </Suspense>
  );
}
