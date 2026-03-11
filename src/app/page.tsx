'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import StarBackground from '@/components/StarBackground';
import { useToast } from '@/components/ui/Toast';
import {
  MdVisibility, MdVisibilityOff, MdPerson, MdLock,
  MdEmail, MdPhone, MdBadge,
} from 'react-icons/md';
import { IoRocketSharp } from 'react-icons/io5';

// ── Sub-components defined OUTSIDE AuthForm ──────────────────────────────
// If defined inside, every state change re-creates the component type,
// React unmounts+remounts it → input loses focus on every keystroke.

interface FieldProps {
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  name: string;
  autoComplete?: string;
  minLength?: number;
  disabled?: boolean;
  rightEl?: React.ReactNode;
}

function Field({
  icon: Icon, type = 'text', value, onChange, placeholder,
  required, name, autoComplete, minLength, disabled, rightEl,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '3rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 2,
        color: focused ? '#a78bfa' : '#64748b',
        transition: 'color .15s',
      }}>
        <Icon size={19} />
      </span>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        required={required} name={name}
        autoComplete={autoComplete ?? 'off'}
        minLength={minLength} disabled={disabled}
        style={{
          display: 'block', width: '100%', height: '48px',
          paddingLeft: '3rem', paddingRight: rightEl ? '3rem' : '1rem',
          borderRadius: '12px', fontSize: '14px',
          fontFamily: "'Nunito', sans-serif", fontWeight: 600,
          background: focused ? 'rgba(15,15,30,0.9)' : 'rgba(10,10,24,0.8)',
          border: `1px solid ${focused ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.1)'}`,
          color: '#e2e8f0',
          outline: 'none',
          boxShadow: focused ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
          transition: 'all .15s ease',
          opacity: disabled ? 0.6 : 1,
        }}
      />
      {rightEl && (
        <span style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '3rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
        }}>
          {rightEl}
        </span>
      )}
    </div>
  );
}

function EyeBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" tabIndex={-1} onClick={onToggle}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#64748b', padding: '4px', display: 'flex',
      }}>
      {show ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode,     setMode]     = useState<'login'|'register'>('login');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();
  // useToast works because layout.tsx → providers.tsx → AppProviders wraps everything
  const { success, error: toastErr } = useToast();

  // Login state
  const [lu, setLu] = useState('');
  const [lp, setLp] = useState('');

  // Register state
  const [reg, setReg] = useState({
    username: '', password: '', firstName: '',
    lastName: '', email: '', phone: '',
  });
  const sr = (k: keyof typeof reg) => (v: string) => setReg(p => ({ ...p, [k]: v }));

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
        success('Welcome back, ' + d.data.displayName + '!');
        setTimeout(() => router.push('/dashboard'), 600);
      } else { toastErr(d.error || 'Login gagal'); }
    } finally { setLoading(false); }
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reg.username || !reg.password || !reg.email || !reg.firstName || !reg.lastName) {
      toastErr('Isi semua field wajib'); return;
    }
    if (reg.password.length < 6) { toastErr('Password min 6 karakter'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reg),
      });
      const d = await r.json();
      if (d.success) {
        success('Welcome, ' + d.data.displayName + '!');
        setTimeout(() => router.push('/dashboard'), 600);
      } else { toastErr(d.error || 'Registrasi gagal'); }
    } finally { setLoading(false); }
  };

  const eye = <EyeBtn show={showPass} onToggle={() => setShowPass(p => !p)} />;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '1rem', overflow: 'hidden',
      position: 'relative', background: '#04040d',
    }}>
      <StarBackground />

      <div style={{
        position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px',
        animation: 'fadeInUp .4s ease-out forwards',
      }}>

        {/* ─── Logo ─── */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'flex', justifyContent: 'center',
            marginBottom: '1rem', position: 'relative',
          }}>
            {/* glow blob */}
            <div style={{
              position: 'absolute', width: '120px', height: '120px',
              background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)',
              filter: 'blur(20px)', borderRadius: '50%', top: '-20px',
            }} />
            <Image src="/logo.png" alt="Saturn" width={80} height={80}
              priority
              style={{
                position: 'relative', zIndex: 1,
                filter: 'drop-shadow(0 0 20px rgba(124,58,237,0.65))',
                animation: 'float 6s ease-in-out infinite',
              }} />
          </div>
          <h1 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '2.2rem', fontWeight: 900,
            letterSpacing: '0.25em', margin: '0 0 6px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 50%, #f472b6 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>SATURN</h1>
          <p style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '0.6rem', letterSpacing: '0.4em',
            color: '#64748b', textTransform: 'uppercase', margin: 0,
          }}>Dashboard</p>
        </div>

        {/* ─── Card ─── */}
        <div style={{
          background: 'rgba(8,8,20,0.82)',
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '28px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(124,58,237,0.07)',
        }}>

          {/* ─── Tabs ─── */}
          <div style={{
            display: 'flex', gap: '6px', marginBottom: '24px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px', padding: '5px',
          }}>
            {(['login', 'register'] as const).map(tab => (
              <button key={tab} type="button"
                onClick={() => { setMode(tab); setShowPass(false); }}
                style={{
                  flex: 1, padding: '9px 0',
                  borderRadius: '9px', border: 'none', cursor: 'pointer',
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '0.68rem', fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  transition: 'all .2s ease',
                  ...(mode === tab ? {
                    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                    color: '#fff',
                    boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
                    transform: 'scale(1.02)',
                  } : {
                    background: 'transparent',
                    color: '#64748b',
                  }),
                }}>
                {tab === 'login' ? 'Login' : 'Register'}
              </button>
            ))}
          </div>

          {/* ─── Login Form ─── */}
          {mode === 'login' && (
            <form onSubmit={login} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              autoComplete="on">
              <Field icon={MdPerson} value={lu} onChange={setLu}
                placeholder="Username" required name="s_lu"
                autoComplete="username" disabled={loading} />
              <Field icon={MdLock} type={showPass ? 'text' : 'password'}
                value={lp} onChange={setLp}
                placeholder="Password" required name="s_lp"
                autoComplete="current-password" disabled={loading} rightEl={eye} />

              <button type="submit" disabled={loading} style={{
                width: '100%', height: '48px', marginTop: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: '15px',
                color: '#fff', opacity: loading ? 0.7 : 1,
                background: 'linear-gradient(to right, #7c3aed, #06b6d4)',
                boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
                transition: 'all .2s ease',
              }}>
                <IoRocketSharp size={18} />
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          {/* ─── Register Form ─── */}
          {mode === 'register' && (
            <form onSubmit={register}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              autoComplete="off">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field icon={MdBadge} value={reg.firstName} onChange={sr('firstName')}
                  placeholder="First Name *" required name="s_fn" disabled={loading} />
                {/* Last name — simple input without icon */}
                <SimpleInput value={reg.lastName} onChange={sr('lastName')}
                  placeholder="Last Name *" name="s_ln" required disabled={loading} />
              </div>
              <Field icon={MdPerson}
                value={reg.username}
                onChange={v => sr('username')(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="Username *" required name="s_ru" disabled={loading} />
              <Field icon={MdEmail} type="email" value={reg.email} onChange={sr('email')}
                placeholder="Email Address *" required name="s_re" disabled={loading} />
              <Field icon={MdPhone} type="tel" value={reg.phone} onChange={sr('phone')}
                placeholder="Phone (optional)" name="s_rp" disabled={loading} />
              <Field icon={MdLock}
                type={showPass ? 'text' : 'password'}
                value={reg.password} onChange={sr('password')}
                placeholder="Password (min 6) *" required minLength={6}
                autoComplete="new-password" name="s_rw" disabled={loading} rightEl={eye} />

              <button type="submit" disabled={loading} style={{
                width: '100%', height: '48px', marginTop: '4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: '15px',
                color: '#fff', opacity: loading ? 0.7 : 1,
                background: 'linear-gradient(to right, #7c3aed, #06b6d4)',
                boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
                transition: 'all .2s ease',
              }}>
                <IoRocketSharp size={18} />
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        {/* ─── Footer ─── */}
        <p style={{
          textAlign: 'center', marginTop: '20px',
          fontFamily: 'monospace', fontSize: '10px',
          color: '#475569', letterSpacing: '0.05em',
        }}>
          Saturn Dashboard © {new Date().getFullYear()} · Secured by Saturn Auth
        </p>
      </div>
    </div>
  );
}

// Last-name standalone input (no icon, same style)
function SimpleInput({
  value, onChange, placeholder, name, required, disabled,
}: {
  value: string; onChange: (v: string) => void; placeholder: string;
  name: string; required?: boolean; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text" value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      required={required} name={name} disabled={disabled}
      style={{
        display: 'block', width: '100%', height: '48px',
        padding: '0 1rem', borderRadius: '12px', fontSize: '14px',
        fontFamily: "'Nunito', sans-serif", fontWeight: 600,
        background: focused ? 'rgba(15,15,30,0.9)' : 'rgba(10,10,24,0.8)',
        border: `1px solid ${focused ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.1)'}`,
        color: '#e2e8f0', outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
        transition: 'all .15s ease',
        opacity: disabled ? 0.6 : 1,
      }}
    />
  );
}
