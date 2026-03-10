# 🪐 SaturnDashboard

**Cosmic-themed versatile admin dashboard** built with Next.js 14 + TypeScript.

---

## ✨ Features

- 🔐 **Authentication** — Login/Register with JWT sessions
- 👥 **Role System** — Owner, Admin, User with permission hierarchy
- 📝 **Notes** — Create, edit, delete notes with image support
- 🚫 **Ban System** — Ban users with restricted access screen
- 📸 **Cloudinary** — Image upload and management
- 🐙 **GitHub Sync** — Push JSON data to your GitHub repo
- 👤 **Profile** — Avatar, display name, bio, contact info
- 🌌 **Cosmic UI** — Star background, glass morphism, aurora effects
- 📱 **PWA** — Installable as mobile app
- 🖥️ **Electron** — Run as desktop application

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Default Owner Account

```
Username: saturn_owner
Password: owner123
```

> **Change this password immediately after first login!**

---

## ⚙️ Configuration

### Environment Variables

Create `.env.local`:

```env
JWT_SECRET=your-super-secret-key-change-this
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
```

### GitHub Sync

1. Go to **Dashboard → Settings** (Owner only)
2. Click **Push to GitHub**
3. Enter your GitHub Personal Access Token (needs `repo` scope)
4. Enter your GitHub username and repository name
5. Click **Push Data**

### Cloudinary

Already configured with:
- Cloud Name: `dg3awuzug`
- Upload Preset: `ml_default`

---

## 📦 Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variable: `JWT_SECRET`
4. Deploy!

---

## 🖥️ Desktop App (Electron)

```bash
# Development
npm run electron

# Build for production
npm run build
npm run electron:build
```

---

## 👤 Role Permissions

| Feature | User | Admin | Owner |
|---------|------|-------|-------|
| Create notes | ✅ | ✅ | ✅ |
| Edit own notes | ✅ | ✅ | ✅ |
| Delete own notes | ✅ | ✅ | ✅ |
| See all notes | ❌ | ✅ | ✅ |
| Delete any note | ❌ | ✅ (users) | ✅ |
| Hide notes | ❌ | ❌ | ✅ |
| Manage users | ❌ | ✅ | ✅ |
| Ban users | ❌ | ✅ (users) | ✅ |
| Promote users | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ✅ |
| GitHub sync | ❌ | ❌ | ✅ |

---

## 📁 Data Structure

Data is stored in `/data/*.json`:
- `users.json` — User accounts (passwords are bcrypt hashed)
- `notes.json` — All notes
- `settings.json` — App settings (GitHub config)

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth**: jose (JWT) + bcryptjs
- **Images**: Cloudinary
- **Desktop**: Electron
- **Icons**: React Icons (Material Design)

---

*SaturnDashboard v1.0.0 — Reach for the stars 🌟*
