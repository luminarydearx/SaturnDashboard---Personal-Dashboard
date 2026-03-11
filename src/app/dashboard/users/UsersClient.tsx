"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { PublicUser } from "@/types";
import { roleBadgeClass } from "@/lib/auth.utils";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import SavingOverlay from "@/components/ui/SavingOverlay";
import Modal from "@/components/ui/Modal";
import {
  MdPeople, MdBlock, MdCheckCircle, MdDelete, MdSearch,
  MdArrowUpward, MdArrowDownward, MdEdit, MdClose, MdSave,
  MdPerson, MdBadge, MdEmail, MdPhone, MdAdd, MdWork,
  MdVisibility, MdVisibilityOff, MdLock, MdRefresh, MdCameraAlt,
} from "react-icons/md";
import { format } from "date-fns";
import ImageCropper from "@/components/ui/ImageCropper";

function useSessionState<T>(key: string, def: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => {
    if (typeof window === "undefined") return def;
    try { const s = sessionStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; }
  });
  const set = (v: T) => { setVal(v); try { sessionStorage.setItem(key, JSON.stringify(v)); } catch {} };
  return [val, set];
}


const CLOUD_NAME    = "dg3awuzug";
const UPLOAD_PRESET = "ml_default";

async function uploadToCloudinary(file: File, onProgress?: (p: number) => void): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  try {
    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
    if (!r.ok) return null;
    return (await r.json()).secure_url || null;
  } catch { return null; }
}

/* ── Shared Field ── */
function Field({ label, value, onChange, type = "text", placeholder = "", icon: Icon, children, maxLength, disabled }: {
  label: string; value?: string; onChange?: (v: string) => void; type?: string;
  placeholder?: string; icon?: React.ElementType; children?: React.ReactNode;
  maxLength?: number; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative group">
        {Icon && (
          <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none z-10">
            <Icon className="text-[var(--c-muted)] group-focus-within:text-violet-400 transition-colors" size={18} />
          </div>
        )}
        {children ?? (
          <input type={type} value={value} onChange={e => onChange?.(e.target.value)}
            placeholder={placeholder} maxLength={maxLength} disabled={disabled}
            autoComplete="off" name={`saturn_uf__${label.replace(/\s+/g,"_").toLowerCase()}`}
            className="saturn-input w-full pr-4 focus:outline-none disabled:opacity-50"
            style={{ paddingLeft: Icon ? "44px" : "16px" }} />
        )}
      </div>
      {maxLength !== undefined && value !== undefined && (
        <p className="text-right text-[10px] text-[var(--c-muted)] mt-0.5">{value.length}/{maxLength}</p>
      )}
    </div>
  );
}

/* ── Avatar Uploader with crop ── */
function AvatarUploader({ value, onChange, disabled }: { value: string; onChange: (u: string) => void; disabled?: boolean }) {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [cropSrc,   setCropSrc]   = useState<string | null>(null);
  const [cropName,  setCropName]  = useState("avatar.jpg");
  const fileRef = useRef<HTMLInputElement>(null);
  const { error: toastError } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toastError("Image files only"); return; }
    setCropName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) setCropSrc(ev.target.result as string); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropDone = async (dataUrl: string) => {
    setCropSrc(null);
    const arr = dataUrl.split(","); const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]); const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    const file = new File([u8], cropName, { type: mime });
    setUploading(true); setProgress(0);
    const url = await uploadToCloudinary(file, setProgress);
    setUploading(false); setProgress(0);
    if (url) onChange(url); else toastError("Upload failed");
  };

  return (
    <>
      <div>
        <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5">Profile Photo</label>
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 to-cyan-600 flex-shrink-0 border-2 border-[var(--c-border)]">
            {value
              ? <Image src={value} alt="avatar" fill className="object-cover" sizes="64px" />
              : <div className="w-full h-full flex items-center justify-center"><MdPerson size={28} className="text-white/60" /></div>
            }
            {uploading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{progress}%</span>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-1.5">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || disabled}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
              {uploading ? <><MdRefresh className="animate-spin" size={15} /> {progress}%</> : <><MdCameraAlt size={15} /> Upload &amp; Crop</>}
            </button>
            {value && (
              <button type="button" onClick={() => onChange("")} disabled={disabled}
                className="w-full py-1.5 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                Remove
              </button>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>
      {cropSrc && (
        <ImageCropper src={cropSrc} shape="round" onCancel={() => setCropSrc(null)} onCrop={handleCropDone} />
      )}
    </>
  );
}

/* ── User Preview Panel ── */
const ROLE_COLORS: Record<string, string> = {
  owner:     "text-amber-400 border-amber-500/30 bg-amber-500/10",
  admin:     "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  developer: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  user:      "text-slate-400 border-slate-500/30 bg-slate-500/10",
};

function UserPreviewPanel({ form }: {
  form: { username: string; firstName?: string; lastName?: string; displayName?: string;
          email: string; phone: string; bio: string; role: string; avatar: string; };
}) {
  const displayName = form.displayName?.trim()
    || `${form.firstName || ""} ${form.lastName || ""}`.trim()
    || form.username || "New User";

  return (
    <div className="flex flex-col p-4 h-full overflow-y-auto"
      style={{ background: "var(--c-surface)", borderRight: "1px solid var(--c-border)" }}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--c-muted)] mb-4 text-center">Preview</p>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 to-cyan-600 border-2 border-violet-500/30">
          {form.avatar
            ? <Image src={form.avatar} alt={displayName} fill className="object-cover" sizes="80px" />
            : <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl select-none">
                {displayName[0]?.toUpperCase() || "?"}
              </div>
          }
        </div>
        <div className="text-center">
          <p className="font-bold text-[var(--c-text)] text-sm leading-tight truncate max-w-[130px]">{displayName}</p>
          <p className="text-[var(--c-muted)] text-xs font-mono mt-0.5 truncate max-w-[130px]">@{form.username || "username"}</p>
          <span className={`mt-1.5 inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${ROLE_COLORS[form.role] || ROLE_COLORS.user}`}>
            {form.role || "user"}
          </span>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {[["📧 Email", form.email], ["📞 Phone", form.phone], ["💬 Bio", form.bio]].map(([label, val]) =>
          val ? (
            <div key={label} className="rounded-xl p-2" style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)" }}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--c-muted)] mb-0.5">{label}</p>
              <p className="text-[var(--c-text)] text-xs font-mono truncate">{val}</p>
            </div>
          ) : null
        )}
      </div>

      {/* Limits */}
      <div className="mt-3 rounded-xl p-2.5 text-[10px] space-y-1"
        style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)" }}>
        <p className="font-bold uppercase tracking-wider text-[var(--c-muted)] mb-1.5">Limits</p>
        {[["Username","3–20 chars"],["Password","Min 6 chars"],["Bio","Max 160 chars"],["Photo","Max 5MB"]].map(([k,v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-[var(--c-muted)]">{k}</span>
            <span className="text-[var(--c-text)] font-mono">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Add User Modal ── */
function AddUserModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    username: "", password: "", firstName: "", lastName: "",
    email: "", phone: "", bio: "", avatar: "", role: "user",
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { success, error: toastError } = useToast();
  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.username || !form.password || !form.email) { toastError("Username, password & email required"); return; }
    if (form.username.length < 3) { toastError("Username min 3 chars"); return; }
    if (form.password.length < 6) { toastError("Password min 6 chars"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, displayName: `${form.firstName} ${form.lastName}`.trim() || form.username }),
      });
      const data = await res.json();
      if (data.success) { success("User created!"); await onAdded(); onClose(); }
      else throw new Error(data.error || "Failed");
    } catch (err: any) { toastError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={loading ? undefined : onClose}>
      <SavingOverlay visible={loading} message="Creating Account…" submessage="Setting up & syncing to GitHub" />
      <div className="w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ background: "var(--dropdown-bg)", border: "1px solid var(--c-border)", maxHeight: "90dvh", maxWidth: "min(860px,98vw)" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b flex-shrink-0"
          style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
          <div className="w-8 h-8 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center"><MdAdd size={18} /></div>
          <div className="flex-1">
            <h2 className="font-orbitron text-sm font-bold text-[var(--c-text)]">Add New User</h2>
            <p className="text-[var(--c-muted)] text-xs">Create a new team member account</p>
          </div>
          {!loading && <button onClick={onClose} className="text-[var(--c-muted)] hover:text-[var(--c-text)] p-1.5 rounded-lg transition-colors"><MdClose size={18} /></button>}
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="w-44 flex-shrink-0 hidden sm:flex flex-col overflow-hidden">
            <UserPreviewPanel form={form} />
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <AvatarUploader value={form.avatar} onChange={set("avatar")} disabled={loading} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" value={form.firstName} onChange={set("firstName")} icon={MdBadge} placeholder="First" maxLength={30} disabled={loading} />
              <Field label="Last Name"  value={form.lastName}  onChange={set("lastName")}  placeholder="Last"  maxLength={30} disabled={loading} />
            </div>
            <Field label="Username" value={form.username}
              onChange={v => set("username")(v.toLowerCase().replace(/[^a-z0-9_]/g,""))}
              icon={MdPerson} placeholder="lowercase_only" maxLength={20} disabled={loading} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" value={form.email} onChange={set("email")} type="email" icon={MdEmail} placeholder="email@..." disabled={loading} />
              <Field label="Phone" value={form.phone} onChange={set("phone")} type="tel"   icon={MdPhone} placeholder="+62 ..." disabled={loading} />
            </div>
            <Field label="Bio" value={form.bio} onChange={set("bio")} maxLength={160} disabled={loading}>
              <textarea value={form.bio} onChange={e => set("bio")(e.target.value)} maxLength={160} rows={2}
                disabled={loading} placeholder="Short bio (optional)"
                autoComplete="off" name="saturn_addusr__bio"
                className="saturn-input resize-none w-full pl-4 pr-4 focus:outline-none disabled:opacity-50" />
            </Field>
            <div>
              <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5">Role</label>
              <div className="relative group">
                <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none z-10">
                  <MdWork className="text-[var(--c-muted)]" size={18} />
                </div>
                <select value={form.role} onChange={e => set("role")(e.target.value)} disabled={loading}
                  className="saturn-input w-full pr-4 focus:outline-none appearance-none cursor-pointer disabled:opacity-50"
                  style={{ paddingLeft: "44px" }}>
                  <option value="user">User</option>
                  <option value="developer">Developer</option>
                  <option value="admin">Admin</option>
                  <option value="co-owner">Co-Owner</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--c-muted)]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative group">
                <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none z-10">
                  <MdLock className="text-[var(--c-muted)]" size={18} />
                </div>
                <input type={showPass ? "text" : "password"} value={form.password}
                  onChange={e => set("password")(e.target.value)} disabled={loading}
                  placeholder="Min 6 characters" autoComplete="new-password"
                  name="saturn_addusr__pw"
                  className="saturn-input w-full pr-11 focus:outline-none disabled:opacity-50"
                  style={{ paddingLeft: "44px" }} />
                <button type="button" onClick={() => setShowPass(p => !p)} disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)] hover:text-[var(--c-text)] p-1 disabled:opacity-50">
                  {showPass ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-3.5 border-t flex-shrink-0"
          style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 btn-primary justify-center py-2.5 disabled:opacity-70">
            <MdSave size={17} /> Create User
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Edit User Modal ── */
interface EditModalProps { target: PublicUser; onClose: () => void; onSaved: () => void; }
function EditUserModal({ target, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    displayName: target.displayName || "", firstName: target.firstName || "",
    lastName:    target.lastName    || "", username:  target.username  || "",
    email:       target.email       || "", phone:     target.phone     || "",
    bio:         target.bio         || "", avatar:    target.avatar    || "",
    role:        target.role        || "user",
  });
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();
  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${target.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { success("User updated & synced ✓"); await onSaved(); onClose(); }
      else throw new Error(data.error || "Update failed");
    } catch (err: any) { toastError(err.message || "Error saving"); }
    finally { setSaving(false); }
  };

  return (
    <Modal open onClose={saving ? undefined : onClose}>
      <SavingOverlay visible={saving} message="Saving & Syncing…" submessage="Updating user & pushing to GitHub" />
      <div className="w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ background: "var(--dropdown-bg)", border: "1px solid var(--c-border)", maxHeight: "90dvh", maxWidth: "min(860px,98vw)" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b flex-shrink-0"
          style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-violet-600 to-cyan-600 flex-shrink-0">
            {target.avatar
              ? <Image src={target.avatar} alt={target.displayName} width={36} height={36} className="object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-white font-bold">
                  {(target.displayName || target.username)[0].toUpperCase()}
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-orbitron text-sm font-bold text-[var(--c-text)]">Edit User</h2>
            <p className="text-[var(--c-muted)] text-xs">@{target.username} · <span className="capitalize">{target.role}</span></p>
          </div>
          {!saving && (
            <button onClick={onClose} className="text-[var(--c-muted)] hover:text-[var(--c-text)] p-1.5 rounded-lg transition-colors">
              <MdClose size={20} />
            </button>
          )}
        </div>

        {/* Body: left preview | right form */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="w-44 flex-shrink-0 hidden sm:flex flex-col overflow-hidden">
            <UserPreviewPanel form={form} />
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <AvatarUploader value={form.avatar} onChange={set("avatar")} disabled={saving} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name"   value={form.firstName}   onChange={set("firstName")}   placeholder="First"   icon={MdBadge}  disabled={saving} />
              <Field label="Last Name"    value={form.lastName}    onChange={set("lastName")}    placeholder="Last"    icon={MdBadge}  disabled={saving} />
              <Field label="Display Name" value={form.displayName} onChange={set("displayName")} placeholder="Display" icon={MdPerson} disabled={saving} />
              <Field label="Username"     value={form.username}    onChange={set("username")}    placeholder="username" icon={MdPerson} disabled={saving} />
            </div>
            <Field label="Email" value={form.email} onChange={set("email")} type="email" placeholder="email@..." icon={MdEmail} disabled={saving} />
            <Field label="Phone" value={form.phone} onChange={set("phone")} type="tel"   placeholder="+62 xxx"  icon={MdPhone} disabled={saving} />
            <Field label="Bio" value={form.bio} onChange={set("bio")} maxLength={160} disabled={saving}>
              <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                maxLength={160} rows={3} disabled={saving}
                placeholder="User bio" autoComplete="off" name="saturn_editusr__bio"
                className="saturn-input resize-none w-full pl-4 pr-4 focus:outline-none disabled:opacity-50" />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-3.5 border-t flex-shrink-0"
          style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="flex-1 btn-primary justify-center py-2.5">
            {saving ? <><MdRefresh className="animate-spin" size={17} /> Saving…</> : <><MdSave size={17} /> Save Changes</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Edit Ban Reason Modal ── */
function EditBanReasonModal({ target, onClose, onSaved }: { target: PublicUser; onClose: () => void; onSaved: () => void }) {
  const [reason,  setReason]  = useState(target.bannedReason || "");
  const [loading, setLoading] = useState(false);
  const { success, error: toastError } = useToast();

  const handle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${target.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateBanReason", reason }),
      });
      const d = await res.json();
      if (d.success) { success("Ban reason updated ✓"); onSaved(); }
      else throw new Error(d.error || "Failed");
    } catch (err: any) { toastError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={loading ? undefined : onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "var(--dropdown-bg)", border: "1px solid var(--c-border)" }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--c-border)" }}>
          <MdEdit size={18} className="text-amber-400" />
          <h2 className="font-orbitron text-sm font-bold text-[var(--c-text)] flex-1">Edit Ban Reason</h2>
          <p className="text-xs text-[var(--c-muted)]">@{target.username}</p>
          <button onClick={onClose} disabled={loading} className="text-[var(--c-muted)] hover:text-[var(--c-text)] p-1 ml-2"><MdClose size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-2">Ban Reason</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Enter reason for ban…"
              className="saturn-input resize-none w-full focus:outline-none"
              style={{ paddingLeft: "16px" }} />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handle} disabled={loading} className="btn-primary flex-1">
              {loading ? <><MdRefresh className="animate-spin" size={16} /> Saving…</> : <><MdSave size={16} /> Save Reason</>}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ── Ban Modal ── */
function BanModal({ target, onClose, onConfirm }: {
  target: PublicUser; onClose: () => void; onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason]   = useState("");
  const [loading, setLoading] = useState(false);
  const handle = async () => { setLoading(true); await onConfirm(reason); setLoading(false); };

  return (
    <Modal open onClose={loading ? undefined : onClose}>
      <SavingOverlay visible={loading} message="Banning User…" submessage="Syncing to GitHub" />
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "var(--dropdown-bg)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--c-border)" }}>
          <MdBlock size={20} className="text-red-400" />
          <h3 className="font-orbitron text-sm font-bold text-red-400 flex-1">Ban @{target.username}</h3>
          {!loading && <button onClick={onClose} className="text-[var(--c-muted)] hover:text-[var(--c-text)] p-1"><MdClose size={18} /></button>}
        </div>
        <div className="p-5">
          <p className="text-[var(--c-muted)] text-sm mb-4 font-nunito">They will see a banned screen on next login.</p>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="Reason for ban (optional)"
            autoComplete="off" name="saturn_ban__reason"
            className="saturn-input resize-none w-full" disabled={loading} />
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>
            Cancel
          </button>
          <button onClick={handle} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2
              bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 transition-all disabled:opacity-50">
            {loading ? <><MdRefresh className="animate-spin" size={16} /> Banning…</> : <><MdBlock size={16} /> Confirm Ban</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function canManage(a: string, b: string) {
  const h: Record<string, number> = { owner: 5, "co-owner": 4, admin: 3, developer: 2, user: 1 };
  return (h[a] || 0) > (h[b] || 0);
}

/* ── Main ── */
export default function UsersClient({ currentUser, highlightId }: { currentUser: PublicUser; highlightId?: string }) {
  const [users,         setUsers]         = useState<PublicUser[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useSessionState<string>("users_search", "");
  const [banTarget,     setBanTarget]     = useState<PublicUser | null>(null);
  const [editTarget,    setEditTarget]    = useState<PublicUser | null>(null);
  const [addUserOpen,   setAddUserOpen]   = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState<PublicUser | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<PublicUser | null>(null);
  const [demoteTarget,  setDemoteTarget]  = useState<PublicUser | null>(null);
  const [unbanTarget,   setUnbanTarget]   = useState<PublicUser | null>(null);
  const [editReasonTarget, setEditReasonTarget] = useState<PublicUser | null>(null);
  const [actionConfirmLoading, setActionConfirmLoading] = useState(false);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId ?? null);
  const { success, error: toastError }   = useToast();

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const d   = await res.json();
      if (d.success) setUsers(d.data);
    } catch { toastError("Failed to load users"); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Scroll + highlight user row from ?highlight=ID (search nav)
  useEffect(() => {
    if (!highlightedId || loading) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`user-row-${highlightedId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setHighlightedId(null), 3500);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [highlightedId, loading]);

  const doAction = async (uid: string, action: string, extra: object = {}) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/users/${uid}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json();
      if (d.success) { success(`✓ ${action}`); await fetchUsers(); }
      else throw new Error(d.error || "Action failed");
    } catch (err: any) { toastError(err.message); }
    finally { setActionLoading(null); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      const d   = await res.json();
      if (d.success) { success("User deleted"); await fetchUsers(); }
      else throw new Error(d.error || "Failed");
    } catch (err: any) { toastError(err.message); }
    finally { setDeleteTarget(null); setDeletingId(null); }
  };

  const filtered = users.filter(u => u.id !== currentUser.id && (
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.displayName || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  ));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <SavingOverlay visible={!!actionLoading || !!deletingId}
        message={actionLoading ? `Processing: ${actionLoading}…` : "Deleting User…"}
        submessage="Updating data & syncing to GitHub" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">User Management</h1>
          <p className="text-[var(--c-muted)] text-sm mt-1 font-nunito">{users.length} total users</p>
        </div>
        {(currentUser.role === "owner" || currentUser.role === "co-owner") && (
          <button onClick={() => setAddUserOpen(true)} className="btn-primary flex items-center gap-2">
            <MdAdd size={20} /> Add User
          </button>
        )}
      </div>

      <div className="relative group">
        <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none z-10">
          <MdSearch className="text-[var(--c-muted)] group-focus-within:text-violet-400 transition-colors" size={18} />
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, username, email…"
          autoComplete="off" name="saturn_users__search"
          className="saturn-input w-full pr-4 focus:outline-none" style={{ paddingLeft: "44px" }} />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px]">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--c-border)" }}>
                {["User","Email","Role","Joined","Status","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3">
                    <div className="h-4 rounded animate-pulse" style={{ background: "var(--c-border)" }} />
                  </td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-[var(--c-muted)]">
                  <MdPeople size={32} className="mx-auto mb-2 opacity-30" />No users found
                </td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} id={`user-row-${u.id}`}
                className={`border-t transition-colors ${highlightedId === u.id ? "bg-violet-500/10 ring-1 ring-inset ring-violet-500/30" : "hover:bg-[var(--c-surface2)]"}`}
                style={{ borderColor: "var(--c-border)" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-violet-600 to-cyan-600 flex-shrink-0">
                        {u.avatar
                          ? <Image src={u.avatar} alt={u.displayName} width={32} height={32} className="object-cover w-full h-full" />
                          : <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm select-none">
                              {(u.displayName || u.username)[0].toUpperCase()}
                            </div>
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-[var(--c-text)] text-sm font-semibold truncate">{u.displayName || u.username}</p>
                        <p className="text-[var(--c-muted)] text-xs">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--c-muted)] text-xs font-mono hidden sm:table-cell">
                    <span className="truncate max-w-[140px] block">{u.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${roleBadgeClass(u.role as any)}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--c-muted)] text-xs hidden lg:table-cell">
                    {format(new Date(u.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    {u.banned
                      ? <span className="flex items-center gap-1 text-red-400 text-xs font-semibold"><MdBlock size={13} /> Banned</span>
                      : <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold"><MdCheckCircle size={13} /> Active</span>}
                  </td>
                  <td className="px-4 py-3">
                    {canManage(currentUser.role, u.role) ? (
                      <div className="flex items-center gap-0.5">
                        {currentUser.role === "owner" && (
                          <button onClick={() => setEditTarget(u)} title="Edit" className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"><MdEdit size={15} /></button>
                        )}
                        {currentUser.role === "owner" && u.role === "user" && (
                          <button onClick={() => setPromoteTarget(u)} title="Promote to Admin" className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-colors"><MdArrowUpward size={15} /></button>
                        )}
                        {currentUser.role === "owner" && u.role === "admin" && (
                          <button onClick={() => setDemoteTarget(u)} title="Demote to User" className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"><MdArrowDownward size={15} /></button>
                        )}
                        {!u.banned
                          ? <button onClick={() => setBanTarget(u)} title="Ban" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"><MdBlock size={15} /></button>
                          : <div className="flex items-center gap-0.5">
                              <button onClick={() => setUnbanTarget(u)} title="Unban" className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"><MdCheckCircle size={15} /></button>
                              <button onClick={() => setEditReasonTarget(u)} title="Edit Ban Reason" className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"><MdEdit size={15} /></button>
                            </div>}
                        {currentUser.role === "owner" && (
                          <button onClick={() => setDeleteTarget(u)} title="Delete" className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"><MdDelete size={15} /></button>
                        )}
                      </div>
                    ) : (
                      <MdPerson size={15} className="text-[var(--c-muted)] opacity-30" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {banTarget   && <BanModal target={banTarget} onClose={() => setBanTarget(null)}
        onConfirm={async reason => { await doAction(banTarget.id, "ban", { reason }); setBanTarget(null); }} />}
      {editTarget  && <EditUserModal target={editTarget} onClose={() => setEditTarget(null)} onSaved={fetchUsers} />}
      {addUserOpen && <AddUserModal onClose={() => setAddUserOpen(false)} onAdded={fetchUsers} />}

      <ConfirmModal isOpen={deleteTarget !== null}
        title={`Delete ${deleteTarget?.displayName || deleteTarget?.username}?`}
        message="This account will be permanently deleted."
        type="danger" confirmText="Delete User" cancelText="Keep"
        onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} isLoading={deletingId !== null} />

      <ConfirmModal isOpen={promoteTarget !== null}
        title={`Promote ${promoteTarget?.displayName}?`}
        message={`${promoteTarget?.username} will be promoted from User to Admin.`}
        type="info" confirmText="Promote" cancelText="Cancel"
        onConfirm={async () => {
          if (!promoteTarget) return;
          setActionConfirmLoading(true);
          await doAction(promoteTarget.id, "promote");
          setPromoteTarget(null); setActionConfirmLoading(false);
        }}
        onCancel={() => setPromoteTarget(null)} isLoading={actionConfirmLoading} />

      <ConfirmModal isOpen={demoteTarget !== null}
        title={`Demote ${demoteTarget?.displayName}?`}
        message={`${demoteTarget?.username} will be demoted from Admin to User.`}
        type="warning" confirmText="Demote" cancelText="Cancel"
        onConfirm={async () => {
          if (!demoteTarget) return;
          setActionConfirmLoading(true);
          await doAction(demoteTarget.id, "demote");
          setDemoteTarget(null); setActionConfirmLoading(false);
        }}
        onCancel={() => setDemoteTarget(null)} isLoading={actionConfirmLoading} />

      <ConfirmModal isOpen={unbanTarget !== null}
        title={`Unban ${unbanTarget?.displayName}?`}
        message={`${unbanTarget?.username} will regain full access to the dashboard.`}
        type="success" confirmText="Unban" cancelText="Cancel"
        onConfirm={async () => {
          if (!unbanTarget) return;
          setActionConfirmLoading(true);
          await doAction(unbanTarget.id, "unban");
          setUnbanTarget(null); setActionConfirmLoading(false);
        }}
        onCancel={() => setUnbanTarget(null)} isLoading={actionConfirmLoading} />

      {editReasonTarget && <EditBanReasonModal
        target={editReasonTarget}
        onClose={() => setEditReasonTarget(null)}
        onSaved={() => { setEditReasonTarget(null); fetchUsers(); }} />}
    </div>
  );
}
