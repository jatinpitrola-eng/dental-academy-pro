# 🦷 Dental Academy Pro — Secure PWA

A world-class, fully-secure Progressive Web App for dental academies. Students get
time-limited, device-bound access to protected video courses. Every login is
OTP-gated and approved by the academy owner.

**Built with:** Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma · SQLite

---

## ✨ Features

### 🔐 Security
- **OTP-gated login** — every login needs a 6-digit code that only the owner can generate
- **Single-device binding** — one account = one device (auto logout on second device)
- **Time-limited access** — courses auto-lock after N days (set by owner)
- **Screenshot/screen-record blocking** — blackout overlay on tab blur, F12/right-click/copy/save all blocked
- **Auto-disable** — any violation instantly disables the account (owner can reactivate)
- **Watermarks** — student name + email + live timestamp overlaid on every video

### 🎬 Video player
- **Custom controls only** — play/pause + ±10s skip + restart (no seekbar, no download)
- **YouTube hosting (FREE)** — admin pastes a YouTube URL, student sees our branded player (no YouTube UI visible)
- **Direct MP4 URL** — admin can also use S3/Cloudflare R2/Backblaze B2 URLs
- **File upload** — admin can upload a local video file

### 🎓 Student experience
- **Branded intro video** — plays every time the PWA is opened (cannot be skipped)
- **Live dashboard** — newly-granted courses appear without refresh (4s polling)
- **Responsive** — works on phone, tablet, laptop, desktop

### 👑 Master Admin portal (secret)
- **Hidden access** — click the logo 5 times → 2-step modal (email+password → access code)
- **Live alerts** — sound + browser notifications when students register/request login
- **Approve + grant** — pick course(s) + duration while approving a login
- **Student management** — activate/disable/revoke device
- **Course/video management** — create courses, add videos via YouTube/URL/upload
- **Activity logs** — full audit trail of every action + violations

---

## 🚀 Quick start (local dev)

```bash
# 1. Install dependencies
bun install

# 2. Set up the database
bun run db:push

# 3. Seed the demo data (admin + courses + demo student)
bun run scripts/seed.ts

# 4. Start the dev server
bun run dev
```

Open `http://localhost:3000` (in production you'll use the deployed URL).

---

## 🔑 Demo credentials

| Role | How to access |
|------|---------------|
| **Student** | Sign in → `demo@student.com` / `student123` (no courses by default — owner must approve + select course) |
| **Admin** | Click the logo **5 times** → Email: `owner@dentalacademy.com` → Password: `Admin@Dental#2024` → Access code: `dental-master-2024` |

> ⚠️ **Change all credentials before going live.** Edit `scripts/seed.ts` and re-run it.

---

## 📦 Deploy to Vercel + GitHub (FREE)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Dental Academy Pro"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dental-academy.git
git push -u origin main
```

### Step 2 — Import on Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Vercel auto-detects Next.js — keep defaults
4. Add environment variable:
   - `DATABASE_URL` = `file:./db/custom.db` (SQLite, free)
5. Click **Deploy**

### Step 3 — Set up the database on Vercel
Vercel doesn't persist SQLite across serverless calls, so for production use **Vercel Postgres** (free tier):
1. In your Vercel project → **Storage** → **Create** → **Postgres** (free)
2. Copy the `DATABASE_URL` and `DIRECT_URL` into your env vars
3. Update `prisma/schema.prisma` datasource provider from `sqlite` to `postgresql`
4. Run `bun run db:push` locally with the production DATABASE_URL
5. Run `bun run scripts/seed.ts` locally with the production DATABASE_URL
6. Redeploy

---

## 🎥 Free video hosting (1TB+)

This app uses **YouTube Unlisted** by default — **100% free, unlimited storage**:

1. Upload your dental course videos to YouTube
2. Set each video to **"Unlisted"** (not public, not in search)
3. Copy the YouTube URL
4. In the admin panel → **Courses → Add video** → paste the URL

The student sees the video in **our branded secure player** — no YouTube logo, no
"related videos", no YouTube UI. Just your academy's player with watermark +
screenshot protection.

### Alternative (for premium courses)
- **Cloudflare R2** — $7.50/month for 500GB, no egress fees
- **Backblaze B2** — $2.50/month for 500GB
- **Direct MP4 URL** — paste any CDN URL in the admin panel

---

## 🛡️ Security notes

This is a **web app**, so absolute screenshot prevention is impossible (only
native apps with `FLAG_SECURE` can truly block screenshots). What we do:

1. **Blackout overlay** — when the tab loses focus, video pauses + screen goes black
2. **Violation detection** — PrintScreen, screenshot combos, devtools → account disabled
3. **No native controls** — students can't right-click → "Save video as"
4. **Watermarks** — every frame has the student's identity overlaid
5. **HTTPS + httpOnly cookies** — sessions can't be stolen via XSS
6. **OTP-gated login** — even with a password, no one logs in without the owner's code

For **true** screenshot blocking, package this PWA with **Capacitor** + **Android
FLAG_SECURE** for a native app. The web code stays the same.

---

## 📱 Make it installable (PWA)

The app is already a PWA — users can "Add to Home Screen" on Android/iOS. The
manifest is at `public/manifest.json` and the service worker at `public/sw.js`.

---

## 🆘 Troubleshooting

| Problem | Fix |
|---------|-----|
| Registration not working | Run `bun run scripts/seed.ts` to ensure DB is set up |
| Videos not playing | Make sure YouTube videos are "Unlisted" (not private) |
| Admin can't login | Click logo 5 times fast, check `scripts/seed.ts` for credentials |
| Database errors on Vercel | Use Vercel Postgres, not SQLite (see Step 3 above) |

---

Made with 🦷 for dental academies.
