"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import ImageCropper from "@/components/ui/ImageCropper";
import { useRouter } from "next/navigation";
import { PublicUser } from "@/types";
import { roleBadgeClass } from "@/lib/auth.utils";
import { useToast } from "@/components/ui/Toast";
import SavingOverlay from "@/components/ui/SavingOverlay";
import {
  MdPerson, MdEmail, MdPhone, MdBadge, MdSave,
  MdCalendarToday, MdCameraAlt, MdRefresh, MdShield, MdLink,
} from "react-icons/md";
import { format } from "date-fns";

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

const ROLE_COLORS: Record<string, string> = {
  owner:     "text-amber-400 bg-amber-500/10 border-amber-500/30",
  admin:     "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  developer: "text-violet-400 bg-violet-500/10 border-violet-500/30",
  user:      "text-slate-400 bg-slate-500/10 border-slate-500/30",
};

function ProfileField({ label, icon: Icon, value, onChange, type = "text", placeholder = "", name }: {
  label: string; icon: React.ElementType; value: string;
  onChange: (v: string) => void; type?: string; placeholder?: string; name: string;
}) {
  return (
    <div>
      <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-2">{label}</label>
      <div className="relative group">
        <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none z-10">
          <Icon className="text-[var(--c-muted)] group-focus-within:text-violet-400 transition-colors" size={18} />
        </div>
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} autoComplete="off" name={name}
          className="saturn-input w-full pr-4 focus:outline-none" style={{ paddingLeft: "44px" }} />
      </div>
    </div>
  );
}

/* ── Live Profile Preview ── */
function ProfilePreviewPanel({ form, user }: {
  form: { displayName: string; username: string; bio: string; avatar: string; email: string; phone: string; };
  user: PublicUser;
}) {
  const name = form.displayName || form.username || "Your Name";
  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto"
      style={{ background: "var(--c-surface)", borderRight: "1px solid var(--c-border)" }}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--c-muted)] mb-4 text-center">Preview</p>

      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 to-cyan-600 border-2 border-violet-500/30">
          {form.avatar
            ? <Image src={form.avatar} alt={name} fill className="object-cover" sizes="80px" />
            : <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl select-none">
                {name[0]?.toUpperCase() || "?"}
              </div>
          }
        </div>
        <div className="text-center">
          <p className="font-bold text-[var(--c-text)] text-sm truncate max-w-[130px]">{name}</p>
          <p className="text-[var(--c-muted)] text-xs font-mono mt-0.5 truncate max-w-[130px]">@{form.username || "username"}</p>
          <span className={`mt-1.5 inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${ROLE_COLORS[user.role] || ROLE_COLORS.user}`}>
            {user.role}
          </span>
        </div>
      </div>

      {form.bio && (
        <div className="rounded-xl p-2 mb-2" style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)" }}>
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--c-muted)] mb-1">💬 Bio</p>
          <p className="text-[var(--c-text)] text-xs leading-relaxed line-clamp-4">{form.bio}</p>
        </div>
      )}
      {form.email && (
        <div className="rounded-xl p-2 mb-2" style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)" }}>
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--c-muted)] mb-0.5">📧 Email</p>
          <p className="text-[var(--c-text)] text-xs font-mono truncate">{form.email}</p>
        </div>
      )}
      {form.phone && (
        <div className="rounded-xl p-2 mb-2" style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)" }}>
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--c-muted)] mb-0.5">📞 Phone</p>
          <p className="text-[var(--c-text)] text-xs font-mono">{form.phone}</p>
        </div>
      )}

      <div className="mt-auto rounded-xl p-2" style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--c-muted)] mb-0.5">📅 Member Since</p>
        <p className="text-[var(--c-text)] text-xs font-mono">{format(new Date(user.createdAt), "MMM d, yyyy")}</p>
      </div>
    </div>
  );
}

/* ── Avatar Uploader with crop ── */
function AvatarSection({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [cropSrc,   setCropSrc]   = useState<string | null>(null);
  const [cropName,  setCropName]  = useState("avatar.jpg");
  const fileRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();

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
    if (url) { onChange(url); success("Photo updated! Save to apply."); }
    else toastError("Upload failed");
  };

  return (
    <>
      <div className="flex items-center gap-4 p-4 rounded-2xl"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
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
        <div className="flex-1 space-y-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
            {uploading ? <><MdRefresh className="animate-spin" size={15} /> Uploading {progress}%</>
                       : <><MdCameraAlt size={15} /> Upload &amp; Crop</>}
          </button>
          {value && (
            <button type="button" onClick={() => onChange("")}
              className="w-full py-1.5 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-colors">
              Remove Photo
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>
      {cropSrc && (
        <ImageCropper src={cropSrc} shape="round" onCancel={() => setCropSrc(null)} onCrop={handleCropDone} />
      )}
    </>
  );
}

export default function ProfileClient({ user }: { user: PublicUser }) {
  const [form, setForm] = useState({
    displayName: user.displayName || "",
    firstName:   user.firstName   || "",
    lastName:    user.lastName    || "",
    username:    user.username    || "",
    email:       user.email       || "",
    phone:       user.phone       || "",
    bio:         user.bio         || "",
    avatar:      user.avatar      || "",
  });
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();
  const router = useRouter();
  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`/api/users/${user.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { success("Profile saved & synced ✓"); router.refresh(); }
      else toastError(data.error || "Update failed");
    } finally { setSaving(false); }
  };

  return (
    <>
      <SavingOverlay visible={saving} message="Saving Profile…" submessage="Updating & pushing to GitHub…" />

      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">My Profile</h1>
          <p className="text-[var(--c-muted)] text-sm mt-1 font-nunito">Manage your personal information</p>
        </div>

        {/* Card: left preview | right form */}
        <div className="rounded-2xl overflow-hidden shadow-xl" style={{ border: "1px solid var(--c-border)" }}>
          <div className="flex flex-col sm:flex-row" style={{ minHeight: "500px" }}>

            {/* LEFT: Live preview */}
            <div className="sm:w-52 flex-shrink-0 border-b sm:border-b-0" style={{ borderColor: "var(--c-border)" }}>
              <ProfilePreviewPanel form={form} user={user} />
            </div>

            {/* RIGHT: Form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ background: "var(--dropdown-bg)" }}>

              {/* Role + join date (read-only) */}
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
                <MdShield size={18} className="text-violet-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-[var(--c-muted)] font-semibold uppercase tracking-wider">Your Role</p>
                  <span className={`text-xs font-bold capitalize px-2 py-0.5 rounded-full border ${ROLE_COLORS[user.role] || ROLE_COLORS.user}`}>{user.role}</span>
                </div>
                <div className="ml-auto text-[var(--c-muted)] text-xs flex items-center gap-1">
                  <MdCalendarToday size={12} /> Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
                </div>
              </div>

              {/* Photo upload */}
              <AvatarSection value={form.avatar} onChange={set("avatar")} />

              {/* Avatar URL manual */}
              <div>
                <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-2">
                  Avatar URL (Manual)
                </label>
                <div className="relative group">
                  <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none z-10">
                    <MdLink className="text-[var(--c-muted)] group-focus-within:text-violet-400 transition-colors" size={18} />
                  </div>
                  <input type="url" value={form.avatar} onChange={e => set("avatar")(e.target.value)}
                    placeholder="https://..." autoComplete="off" name="saturn_prof__avatar_url"
                    className="saturn-input w-full pr-4 focus:outline-none" style={{ paddingLeft: "44px" }} />
                </div>
              </div>

              {/* Name grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ProfileField label="First Name"   icon={MdBadge}  value={form.firstName}   onChange={set("firstName")}   placeholder="First name"   name="saturn_prof__firstName" />
                <ProfileField label="Last Name"    icon={MdBadge}  value={form.lastName}    onChange={set("lastName")}    placeholder="Last name"    name="saturn_prof__lastName" />
                <ProfileField label="Display Name" icon={MdPerson} value={form.displayName} onChange={set("displayName")} placeholder="Display name" name="saturn_prof__displayName" />
                <ProfileField label="Username"     icon={MdPerson} value={form.username}    onChange={set("username")}    placeholder="username"     name="saturn_prof__username" />
                <ProfileField label="Email"        icon={MdEmail}  value={form.email}       onChange={set("email")}       placeholder="your@email.com" type="email" name="saturn_prof__email" />
                <ProfileField label="Phone"        icon={MdPhone}  value={form.phone}       onChange={set("phone")}       placeholder="+62 xxx xxxx" type="tel" name="saturn_prof__phone" />
              </div>

              {/* Bio */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider">Bio</label>
                  <span className={`text-[10px] ${form.bio.length > 130 ? "text-amber-400" : "text-[var(--c-muted)]"}`}>{form.bio.length}/160</span>
                </div>
                <textarea value={form.bio} onChange={e => set("bio")(e.target.value.slice(0, 160))}
                  rows={3} placeholder="Write a short bio…"
                  autoComplete="off" name="saturn_prof__bio"
                  className="saturn-input resize-none w-full pl-4 pr-4 focus:outline-none" />
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="btn-primary min-w-36 flex items-center justify-center gap-2 disabled:opacity-50">
                  <MdSave size={18} />
                  {saving ? <span className="animate-pulse">Saving…</span> : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
