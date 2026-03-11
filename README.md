<div align="center">

# 🪐 Saturn Dashboard

**Cosmic-themed multi-role admin dashboard**  
Built with Next.js 16 · React 19 · Tailwind CSS v4 · TypeScript

![Version](https://img.shields.io/badge/version-4.5.1-violet)
![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v4-06b6d4)
![React](https://img.shields.io/badge/React-19-61dafb)

</div>

---

## 📋 Daftar Isi

- [Cara Kerja Proyek](#cara-kerja-proyek)
- [Tech Stack](#tech-stack)
- [Struktur Folder](#struktur-folder)
- [Sistem Role & Izin](#sistem-role--izin)
- [Fitur Lengkap](#fitur-lengkap)
- [Instalasi & Menjalankan](#instalasi--menjalankan)
- [Cara Menambahkan Web Server Items](#cara-menambahkan-web-server-items)
- [Konfigurasi Cloudinary](#konfigurasi-cloudinary)
- [Konfigurasi GitHub Sync](#konfigurasi-github-sync)
- [Electron Desktop App](#electron-desktop-app)
- [Data & File JSON](#data--file-json)
- [Changelog](#changelog)

---

## Cara Kerja Proyek

Saturn Dashboard adalah admin panel berbasis web yang berjalan di **Next.js 16** (App Router) dengan **Turbopack** sebagai bundler default. Proyek ini menggunakan **file JSON** sebagai database sederhana (tidak butuh MySQL/PostgreSQL), cocok untuk penggunaan internal atau tim kecil.

### Alur Kerja Utama

```
Browser → Next.js App Router (Server Components) → API Routes → JSON Files (data/)
                                                              → Cloudinary (gambar)
                                                              → GitHub (backup)
```

1. **Autentikasi** — Login via `POST /api/auth/login`, token JWT disimpan di cookie `saturn_session` (HttpOnly, 7 hari).
2. **Session** — Setiap server component memanggil `getSession()` yang membaca cookie dan memverifikasi JWT.
3. **Data** — Semua data disimpan di `data/users.json`, `data/notes.json`, `data/settings.json`, `data/backups.json`.
4. **Gambar** — Di-upload ke Cloudinary via preset `ml_default`, URL disimpan di JSON.
5. **Backup** — Data bisa di-sync ke GitHub repo secara otomatis setiap 24 jam atau manual.

### Struktur Halaman

```
/ (Login page)
└── /dashboard
    ├── Main Dashboard (statistik & recent notes)
    ├── All Notes (semua notes tim)
    ├── User Management (tambah/edit/ban user)
    ├── Settings (GitHub token, Cloudinary)
    └── /dashboard/settings
        ├── My Notes (notes pribadi)
        ├── Profile (edit profil & avatar)
        ├── Artifact (canvas kosong — customizable)
        └── Theme (Dark / Light / Auto)
```

---

## Tech Stack

| Paket | Versi | Fungsi |
|-------|-------|--------|
| `next` | 16.1.6 | Framework (App Router + Turbopack) |
| `react` | 19.0 | UI Library |
| `tailwindcss` | 4.x | Styling (CSS-first config) |
| `framer-motion` | 12.x | Animasi |
| `jose` | 5.x | JWT sign & verify |
| `bcryptjs` | 2.4 | Hash password |
| `uuid` | 11.x | ID generator |
| `date-fns` | 4.x | Format tanggal |
| `react-icons` | 5.x | Icon library |
| `sharp` | 0.33 | Image optimization |
| `electron` | 35.x | Desktop app wrapper |

---

## Struktur Folder

```
saturn-dashboard/
├── data/                    ← Database JSON (auto-created)
│   ├── users.json
│   ├── notes.json
│   ├── settings.json
│   └── backups.json
├── electron/
│   ├── main.js              ← Electron entry point
│   ├── preload.js
│   └── loading.html         ← Splash screen
├── public/
│   └── logo.png
├── src/
│   ├── app/
│   │   ├── api/             ← API Routes (Next.js Route Handlers)
│   │   │   ├── auth/        ← login, logout, me, register
│   │   │   ├── notes/       ← CRUD notes
│   │   │   ├── users/       ← CRUD users
│   │   │   ├── backup/      ← Download zip / push to GitHub
│   │   │   ├── backups/     ← Registry backup entries
│   │   │   ├── search/      ← Global search
│   │   │   └── github/push  ← SSE GitHub sync
│   │   ├── dashboard/       ← Protected pages
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/          ← Sidebar, Navbar, Footer
│   │   ├── notes/           ← NoteCard, NoteForm
│   │   └── ui/              ← Modal, Toast, ImageCropper, dll
│   ├── lib/
│   │   ├── auth.ts          ← JWT + cookie helpers
│   │   ├── auth.utils.ts    ← canManage(), roleBadgeClass()
│   │   ├── db.ts            ← File JSON read/write
│   │   ├── github.ts        ← GitHub API push
│   │   ├── github-auto.ts   ← Auto sync trigger
│   │   └── autoBackup.ts    ← Client-side backup scheduler
│   └── types/index.ts       ← TypeScript types
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## Sistem Role & Izin

Terdapat 5 role dengan hierarki ketat:

```
Owner (5) > Co-Owner (4) > Admin (3) > Developer (2) > User (1)
```

| Aksi | User | Developer | Admin | Co-Owner | Owner |
|------|------|-----------|-------|----------|-------|
| Lihat dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Buat/edit notes sendiri | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lihat semua notes | ❌ | ❌ | ✅ | ✅ | ✅ |
| Sembunyikan notes | ❌ | ❌ | ❌ | ✅ | ✅ |
| Kelola user | ❌ | ❌ | ✅* | ✅ | ✅ |
| Buat user baru | ❌ | ❌ | ❌ | ✅† | ✅ |
| Buat Co-Owner | ❌ | ❌ | ❌ | ❌ | ✅ |
| Akses backup | ❌ | ✅ | ✅ | ✅ | ✅ |
| GitHub sync | ❌ | ❌ | ❌ | ✅ | ✅ |
| Server Settings | ❌ | ❌ | ❌ | ✅ | ✅ |

> *Admin hanya bisa kelola user dengan role di bawahnya  
> †Co-Owner hanya bisa buat user sampai role Admin (tidak bisa buat Co-Owner)

---

## Fitur Lengkap

### 🔐 Autentikasi
- Login dengan username + password (bcrypt hash)
- Session JWT 7 hari via HttpOnly cookie
- Auto-redirect ke login jika session expired
- Banned screen dengan efek glitch untuk user yang diblokir

### 📝 Notes
- **All Notes** — lihat semua notes tim (sesuai role)
- **My Notes** — hanya notes milik sendiri
- Rich notes: judul, konten, tags, warna, gambar (Cloudinary)
- Pin notes, tandai selesai (auto-hapus setelah 24 jam), sembunyikan
- Image cropper terintegrasi (crop + rotate + zoom)
- Recent done notes panel

### 👥 User Management
- Tambah user dengan role pilihan (Owner bisa buat Co-Owner)
- Edit profil, upload avatar dengan image cropper (round crop)
- Ban/unban user dengan alasan
- Promote/demote role
- Session persistence — state tersimpan di sessionStorage

### ⚙️ Settings
- **Profile** — edit nama, email, bio, avatar
- **Theme** — Dark / Light / Auto (ikut sistem)
- **Artifact** — halaman kosong untuk kustomisasi bebas
- **My Notes** — lihat & kelola notes pribadi
- **Server Settings** — konfigurasi GitHub token & Cloudinary

### 🔒 Backup & Sync
- Download backup zip (users + notes + settings)
- Push ke GitHub repo secara otomatis setiap 24 jam
- Manual sync kapan saja dari halaman Backup
- Progress bar realtime via Server-Sent Events (SSE)

### 🎨 UI/UX
- Cosmic dark theme + light mode yang bersih
- Animasi bintang di background
- Sidebar collapsible dengan section: Navigation, Web Server, Server, Settings
- Responsive (mobile + desktop)
- Global search (F untuk focus): notes + users
- Keyboard shortcuts (F = search, / = toggle sidebar)

---

## Instalasi & Menjalankan

### Prasyarat
- Node.js 20+ 
- npm 9+

### Langkah

```bash
# 1. Clone / ekstrak project
cd saturn-dashboard

# 2. Install dependencies
npm install

# 3. Jalankan development server
npm run dev

# 4. Buka browser
open http://localhost:3000
```

### Login Pertama

Jika `data/users.json` kosong, buat file ini secara manual:

```json
[
  {
    "id": "owner-001",
    "username": "dearly",
    "displayName": "Dearly Febriano Irwansah",
    "firstName": "Dearly",
    "lastName": "Febriano Irwansah",
    "email": "owner@saturn.dev",
    "phone": "",
    "bio": "Owner Saturn Dashboard",
    "avatar": "",
    "role": "owner",
    "password": "$2a$10$xxxxxxxxxxx",
    "banned": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

> Generate password hash dengan: `node -e "const b=require('bcryptjs'); console.log(b.hashSync('passwordkamu', 10))"`

### Build untuk Production

```bash
npm run build
npm start
```

---

## Cara Menambahkan Web Server Items

Buka `src/components/layout/Sidebar.tsx` dan edit array `WEB_SERVER_ITEMS`:

```typescript
const WEB_SERVER_ITEMS = [
  {
    href: '/dashboard/server/status',
    label: 'Status',
    icon: MdDns,
    roles: ['owner', 'co-owner', 'admin'],
  },
  {
    href: '/dashboard/server/logs',
    label: 'Logs',
    icon: MdStorage,
    roles: ['owner', 'co-owner'],
  },
];
```

Kemudian buat route-nya di `src/app/dashboard/server/status/page.tsx`.

---

## Konfigurasi Cloudinary

1. Buat akun di [cloudinary.com](https://cloudinary.com)
2. Catat **Cloud Name** kamu
3. Buat **Upload Preset** dengan mode `Unsigned`
4. Edit di `src/components/ui/ImageUploader.tsx` (atau ImageCropper.tsx):
   ```typescript
   const CLOUD_NAME = 'YOUR_CLOUD_NAME';
   const UPLOAD_PRESET = 'YOUR_PRESET';
   ```

---

## Konfigurasi GitHub Sync

1. Buat **Personal Access Token** di GitHub (scope: `repo`)
2. Login sebagai Owner/Co-Owner
3. Buka **Settings** → masukkan:
   - GitHub Token
   - GitHub Owner (username)
   - GitHub Repo (nama repo)
4. Klik **Sync Now** untuk test

Data akan di-push sebagai file di `/data/` dalam repo tersebut.

---

## Electron Desktop App

```bash
# Jalankan sebagai desktop app (dev mode)
npm run electron

# Build installer
npm run electron:build
```

File installer akan ada di folder `dist-electron/`.

> **Tips:** Untuk production, jalankan `npm run build` dulu, baru `npm run electron:build`.

---

## Data & File JSON

Semua data disimpan di folder `data/` (auto-created):

| File | Isi |
|------|-----|
| `users.json` | Semua data user (password di-hash bcrypt) |
| `notes.json` | Semua notes |
| `settings.json` | GitHub token, repo, last push |
| `backups.json` | Registry history backup |

### Restore Data

1. Stop server
2. Ganti isi folder `data/` dengan backup kamu
3. Jalankan lagi `npm run dev`

---

## Changelog

### v4.5.1 (Latest)
- ✅ **FIX: Bug Co-Owner** — role co-owner sekarang tersimpan dengan benar saat Add User
- ✅ **Next.js 16 compatible** — `cookies()` sekarang di-await (breaking change Next.js 15+)
- ✅ **Turbopack** — `next.config.js` diperbarui, webpack config diganti `turbopack: {}`
- ✅ **Dynamic params** — `params` di route handlers sekarang `Promise<{id}>` (Next.js 15+)
- ✅ **searchParams** — halaman dengan searchParams sekarang pakai `Promise<>` type
- ✅ **Tailwind v4** — postcss.config.js pakai `@tailwindcss/postcss`, globals.css pakai `@import "tailwindcss"`
- ✅ **PATCH alias** — `notes/[id]` sekarang support `PUT` dan `PATCH`
- ✅ **Co-Owner di notes** — co-owner bisa lihat semua notes termasuk hidden
- ✅ Updated all dependencies to latest versions

### v4.5.0
- Sidebar redesign: Navigation, Web Server, Server, Settings sections
- Settings section: My Notes, Profile, Artifact, Theme
- Dynamic browser title per halaman
- Improved light mode theme

### v4.4.3
- ImageCropper rewrite (portal-based)
- MdChevronDown → MdExpandMore fix
- JSX comment fix di DashboardShell

---

<div align="center">
Made with ☕ and ✨ by <strong>Dearly Febriano Irwansah</strong>
</div>
