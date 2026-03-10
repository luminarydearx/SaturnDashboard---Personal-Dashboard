'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import StarBackground from '@/components/StarBackground';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  MdVisibility, MdVisibilityOff, MdEmail, MdPerson,
  MdLock, MdPhone, MdBadge,
} from 'react-icons/md';
import { IoRocketSharp } from 'react-icons/io5';

// ────────────────────────────────────────────────────────────────
// CRITICAL: Every sub-component MUST be defined OUTSIDE AuthForm.
// If defined inside, each keystroke creates a NEW component type
// → React unmounts the old one → input loses focus → "auto close"
// ────────────────────────────────────────────────────────────────

interface InputFieldProps {
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  /** Unique name prevents browser history bleed between unrelated inputs */
  name: string;
  autoComplete?: string;
  minLength?: number;
  rightEl?: React.ReactNode;
  disabled?: boolean;
}

function InputField({
  icon: Icon, type = 'text', value, onChange, placeholder,
  required, name, autoComplete, minLength, rightEl, disabled,
}: InputFieldProps) {
  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 w-12 flex items-center justify-center
        pointer-events-none z-10 text-[var(--c-muted)] group-focus-within:text-violet-400 transition-colors">
        <Icon size={20} />
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        name={name}
        autoComplete={autoComplete ?? 'off'}
        minLength={minLength}
        disabled={disabled}
        className="saturn-input w-full h-12 focus:outline-none text-sm font-medium"
        style={{ paddingLeft: '3rem', paddingRight: rightEl ? '3rem' : '1rem' }}
      />
      {rightEl && (
        <div className="absolute inset-y-0 right-0 w-12 flex items-center justify-center">
          {rightEl}
        </div>
      )}
    </div>
  );
}

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" tabIndex={-1} onClick={onToggle}
      className="text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors p-1">
      {show ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
    </button>
  );
}

// ── Main form ──
function AuthForm() {
  const [mode,     setMode]     = useState<'login' | 'register'>('login');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();
  const { success, error: toastError } = useToast();

  // Login fields
  const [lu, setLu] = useState('');
  const [lp, setLp] = useState('');

  // Register fields – single state object; functional updater avoids stale closure
  const [reg, setReg] = useState({
    username: '', password: '', firstName: '', lastName: '', email: '', phone: '',
  });
  const setR = (k: keyof typeof reg) => (v: string) => setReg(p => ({ ...p, [k]: v }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lu || !lp) { toastError('Fill all fields'); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: lu, password: lp }),
      });
      const data = await res.json();
      if (data.success) {
        success('Welcome back, ' + data.data.displayName + '!');
        setTimeout(() => router.push('/dashboard'), 700);
      } else {
        toastError(data.error || 'Login failed');
      }
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reg.username || !reg.password || !reg.email || !reg.firstName || !reg.lastName) {
      toastError('Fill all required fields'); return;
    }
    if (reg.password.length < 6) { toastError('Password min 6 characters'); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reg),
      });
      const data = await res.json();
      if (data.success) {
        success('Welcome, ' + data.data.displayName + '!');
        setTimeout(() => router.push('/dashboard'), 700);
      } else {
        toastError(data.error || 'Registration failed');
      }
    } finally { setLoading(false); }
  };

  const eye = <EyeToggle show={showPass} onToggle={() => setShowPass(p => !p)} />;

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4 overflow-hidden">
      <StarBackground />
      <div className="relative z-10 w-full max-w-md animate-fadeInUp">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4 relative">
            <div className="absolute inset-0 blur-2xl bg-violet-600/25 rounded-full animate-pulse" />
            <Image src="/logo.png" alt="Saturn" width={72} height={72}
              className="relative drop-shadow-[0_0_24px_rgba(124,58,237,0.7)] animate-float" priority />
          </div>
          <h1 className="font-orbitron text-3xl font-black gradient-text tracking-widest mb-1">SATURN</h1>
          <p className="font-orbitron text-xs text-[var(--c-muted)] tracking-[0.3em] uppercase">Dashboard</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-3xl p-8 shadow-2xl backdrop-blur-xl"
          style={{ border: '1px solid var(--c-border)', background: 'rgba(15,15,25,0.6)' }}>

          {/* Tabs */}
          <div className="flex rounded-2xl p-1 mb-8"
            style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-border)' }}>
            {(['login', 'register'] as const).map(tab => (
              <button key={tab} type="button"
                onClick={() => { setMode(tab); setShowPass(false); }}
                className={`flex-1 py-2.5 rounded-xl font-orbitron text-xs font-semibold tracking-wider
                  uppercase transition-all duration-300
                  ${mode === tab
                    ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg scale-[1.02]'
                    : 'text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-white/5'}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5" autoComplete="on">
              <InputField icon={MdPerson} value={lu} onChange={setLu}
                placeholder="Username" required autoComplete="username"
                name="saturn_login__user" disabled={loading} />
              <InputField icon={MdLock} type={showPass ? 'text' : 'password'}
                value={lp} onChange={setLp}
                placeholder="Password" required autoComplete="current-password"
                name="saturn_login__pass" disabled={loading} rightEl={eye} />
              <button type="submit" disabled={loading}
                className="btn-primary w-full h-12 mt-2 flex items-center justify-center gap-2 group relative overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">
                  <IoRocketSharp size={20} className="group-hover:rotate-45 transition-transform duration-300" />
                  {loading ? 'Signing in…' : 'Sign In'}
                </span>
                {loading && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
              </button>
            </form>
          )}

          {/* ── REGISTER ── */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4" autoComplete="off">
              <div className="grid grid-cols-2 gap-3">
                <InputField icon={MdBadge} value={reg.firstName} onChange={setR('firstName')}
                  placeholder="First Name *" required name="saturn_reg__first" disabled={loading} />
                {/* Last name – no icon */}
                <input type="text" value={reg.lastName}
                  onChange={e => setR('lastName')(e.target.value)}
                  placeholder="Last Name *" required disabled={loading}
                  autoComplete="off" name="saturn_reg__last"
                  className="saturn-input w-full h-12 px-4 focus:outline-none text-sm font-medium" />
              </div>
              <InputField icon={MdPerson}
                value={reg.username}
                onChange={v => setR('username')(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="Username *" required name="saturn_reg__user" disabled={loading} />
              <InputField icon={MdEmail} type="email" value={reg.email} onChange={setR('email')}
                placeholder="Email Address *" required name="saturn_reg__email" disabled={loading} />
              <InputField icon={MdPhone} type="tel" value={reg.phone} onChange={setR('phone')}
                placeholder="Phone (Optional)" name="saturn_reg__phone" disabled={loading} />
              <InputField icon={MdLock} type={showPass ? 'text' : 'password'}
                value={reg.password} onChange={setR('password')}
                placeholder="Password (Min 6) *" required minLength={6}
                autoComplete="new-password" name="saturn_reg__pass" disabled={loading} rightEl={eye} />
              <button type="submit" disabled={loading}
                className="btn-primary w-full h-12 mt-2 flex items-center justify-center gap-2 group">
                <IoRocketSharp size={20} className="group-hover:rotate-45 transition-transform duration-300" />
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[var(--c-muted)] text-[10px] mt-8 font-mono opacity-60">
          Saturn Dashboard © {new Date().getFullYear()} • Secured by Saturn Auth
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return <ToastProvider><AuthForm /></ToastProvider>;
}
