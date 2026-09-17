# Deploy — GitHub, Cloudflare Pages and your domain

## 1. Push to GitHub

Create an **empty** private repo on GitHub called `keretaku` (no README, no .gitignore — this
project already has both). Then, in the project folder:

```bash
git init
git add .
git commit -m "Initial commit: KeretaKu vehicle service tracker"
git branch -M main
git remote add origin https://github.com/<your-username>/keretaku.git
git push -u origin main
```

`.env.local` is gitignored, so your Supabase keys stay off GitHub. If Git asks who you are:

```bash
git config --global user.name "Danish Haikal"
git config --global user.email "you@example.com"
```

The included GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint, format check, tests and
a build on every push and pull request.

### Day-to-day

```bash
git checkout -b feature/whatever   # branch for a change
git add -A && git commit -m "Add X"
git push -u origin feature/whatever
```

Open a pull request, let CI go green, merge. Cloudflare deploys `main` automatically.

## 2. Deploy to Cloudflare Pages

1. <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Authorise GitHub and pick the `keretaku` repo.
3. Build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. **Environment variables** — add both, for Production _and_ Preview:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. **Save and Deploy**. You'll get `keretaku-xxx.pages.dev`.

Client-side routing works out of the box: Pages serves `index.html` for unknown paths as long as the
project has no top-level `404.html`, which it doesn't.

Every push to `main` redeploys. Pull requests get their own preview URL.

## 3. Point your domain at it

First find where your domain's DNS lives: run `nslookup -type=NS yourdomain.com`, or check the
registrar you bought it from (Namecheap, GoDaddy, Exabytes, Cloudflare…).

### If the domain is already on Cloudflare

Pages project → **Custom domains** → **Set up a domain** → enter `keretaku.yourdomain.com` →
**Activate**. The DNS record is created for you; HTTPS is ready within a couple of minutes.

### If the domain is at another registrar

Two options:

**A. Move DNS to Cloudflare (recommended).** Cloudflare dashboard → **Add a site** → enter your
domain → free plan → Cloudflare scans your existing records → it gives you two nameservers → set
those as the nameservers at your registrar. Propagation usually takes under an hour. After that,
follow the Cloudflare instructions above.

**B. Keep DNS where it is.** In Pages → **Custom domains**, add `keretaku.yourdomain.com`; Cloudflare
shows a `CNAME` target like `keretaku-xxx.pages.dev`. Add that CNAME at your registrar. A subdomain
works fine this way; an apex domain (`yourdomain.com` with no prefix) usually needs option A.

A subdomain like `keretaku.yourdomain.com` is the easiest choice and leaves the root domain free.

## 4. Tell Supabase about the domain

KeretaKu uses email + password sign-in, so there's no redirect link to configure. It's still good
practice to point Supabase at the real domain — **Authentication → URL Configuration** → **Site
URL**: `https://keretaku.yourdomain.com` — since that's what any future password-reset or
notification email will link back to.

## 5. Install it on your phone

Open the site in Chrome on Android (or Safari on iOS) → menu → **Add to Home screen**. The
web manifest gives it an icon and opens it without browser chrome, so it behaves like an app.

## Cost

Supabase free tier and Cloudflare Pages free tier cover a household's usage comfortably. The only
recurring cost is the domain itself.

> Supabase pauses free projects after a week with no activity. Opening the app wakes it, but if the
> family uses it rarely, the paid tier (or a scheduled ping) avoids the wait.
