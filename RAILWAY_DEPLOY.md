# Deploying yotweek to Railway

## The most important thing to understand

`NEXT_PUBLIC_API_URL` is **baked into the frontend JavaScript bundle at build time**.
This means:

- ✅ You set it as a Railway **Variable** on the frontend service → it gets baked in correctly
- ❌ You forget to set it → the bundle contains nothing, all API calls silently fail
- ❌ You set it *after* the build → the old build still has the wrong/empty value

**Every time you change `NEXT_PUBLIC_API_URL`, you must redeploy the frontend.**

---

## Step-by-step setup (do this in order)

### 1. Push to GitHub
Railway deploys from Git. Push the project root to a GitHub repo.

### 2. Create the Railway project and database
1. [railway.app](https://railway.app) → **New Project** → **Provision PostgreSQL**
2. Open the Postgres service → **Connect** tab → copy the **Public URL** (needed for migration)

### 3. Run migrations from your laptop (one-time)
```bash
cd backend
cp .env.example .env
# Set DATABASE_URL to the PUBLIC Postgres URL from step 2
# Set JWT_SECRET to a random string
npm install
npx prisma migrate deploy
npx ts-node prisma/seed.ts   # optional — creates admin@yotweek.com / Password123!
git add prisma/migrations
git commit -m "migrations" && git push
```

### 4. Deploy the backend service
1. Railway → **New** → **GitHub Repo** → your repo
2. **Settings → Root Directory** → `backend`
3. **Variables** → add:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `JWT_SECRET` | output of `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `JWT_EXPIRES_IN` | `7d` |
   | `FRONTEND_URL` | leave blank for now |

4. **Settings → Networking → Generate Domain**
5. Wait for deploy. Test: `https://YOUR-BACKEND.up.railway.app/health` → `{"status":"ok"}`

### 5. Deploy the frontend service
1. Railway → **New** → **GitHub Repo** → same repo
2. **Settings → Root Directory** → `frontend`
3. **Variables** → add:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://YOUR-BACKEND.up.railway.app/api` ← **use the URL from step 4** |

   > ⚠️ This is the variable that was missing. Without it the frontend calls `localhost:4000`.

4. **Settings → Networking → Generate Domain** → note `https://YOUR-FRONTEND.up.railway.app`
5. Deploy. If `NEXT_PUBLIC_API_URL` is not set the **build will fail immediately** with a clear error.

### 6. Wire up CORS (backend ↔ frontend)
Go back to the **backend** service → **Variables** → add/update:

```
FRONTEND_URL=https://YOUR-FRONTEND.up.railway.app
```

Then **Redeploy** the backend. Without this the browser gets a CORS error.

### 7. Custom domain (optional)
Add your domain on each service under **Settings → Networking → Custom Domain**.
Then update:
- `FRONTEND_URL` on the backend (→ redeploy backend)
- `NEXT_PUBLIC_API_URL` on the frontend to `https://api.yourdomain.com/api` (→ **rebuild** frontend)

---

## Verifying it works

Open DevTools → Network tab. API calls should go to `https://YOUR-BACKEND.up.railway.app/api/...`

If they still go to `localhost:4000`, the frontend was built without the variable. Go to
**Frontend service → Deployments → Redeploy** (or trigger a new deploy by pushing a commit).

---

## Running locally

```bash
# Requires: Node 20+, PostgreSQL
bash start-dev.sh
```

Local URLs:
- Frontend: http://localhost:3000
- Backend:  http://localhost:4000/health
- Admin:    admin@yotweek.com / Password123!

---

## Error reference

| Error in browser console | Cause | Fix |
|---|---|---|
| `ERR_CONNECTION_REFUSED localhost:4000` | Frontend baked in localhost (missing env var) | Set `NEXT_PUBLIC_API_URL` on Railway frontend service and **redeploy** |
| `ERR_BLOCKED_BY_CLIENT` | Ad blocker blocking a request | Not a code bug — harmless |
| `favicon.ico 404` | Fixed — favicon is at `public/favicon.svg` | Pull latest code |
| `CORS error` | Backend doesn't allow frontend origin | Set `FRONTEND_URL` on backend service and redeploy backend |
| `401 Unauthorized` | JWT expired or wrong secret | Check `JWT_SECRET` is the same on all backend instances |
| `prisma: Can't reach database` | Wrong `DATABASE_URL` | Use `${{Postgres.DATABASE_URL}}` on Railway, not the public URL |
