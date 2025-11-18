# Personal HQ

Modern personal site + blog with a hidden admin workspace. The frontend is static (great for Netlify, Vercel, GitHub Pages), while a lightweight Express API handles publishing/deleting posts and validating your admin token. Markdown still lives in the repo, so you always have a versioned history of your writing.

## Highlights

- Full portfolio layout (hero, stats, about, resume, projects, blog, contact) with animated glassmorphism styling.
- GitHub projects load dynamically (set `githubUsername` in `data/profile.json`) with search + stack filters.
- Blog posts live in `content/posts/*.md`; `data/posts.json` is generated for fast rendering.
- Admin mode (toggle with `Ctrl + Shift + A`) reveals the composer, Copy Markdown buttons, LinkedIn share links, and publish/delete controls powered by the backend.

## Project layout

```
.
|- index.html             # main document shell
|- css/styles.css         # design system + layout
|- js/app.js              # frontend logic (fetches API, handles admin UI)
|- data/profile.json      # profile/config content (admin hint only)
|- data/posts.json        # generated blog feed (commit after running build script)
|- content/posts/*.md     # Markdown sources (edit when writing)
|- automation/publish.js  # CLI to rebuild data/posts.json
|- lib/posts.js           # shared Markdown helpers (used by CLI + API)
|- assets/                # images, resume, favicons, etc.
|- server.js              # Express API (deploy separately from the static site)
|- package.json           # npm scripts
```

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the sample env file and set a strong admin token:
   ```bash
   cp .env.example .env
   # edit .env and set ADMIN_TOKEN=super-secret-phrase
   ```
3. Generate the initial blog feed:
   ```bash
   npm run build:posts
   ```
4. Run the combined API + frontend locally:
   ```bash
   npm run dev
   ```
   Visit `http://localhost:4000`, press `Ctrl + Shift + A`, click **Admin**, and enter the same `ADMIN_TOKEN` to unlock the composer.

## Writing workflow

1. Create/edit Markdown files inside `content/posts/` using this front matter:
   ```yaml
   ---
   title: "Ship Systems, Not Just Features"
   date: "2025-02-02"
   summary: "Snapshot text for cards."
   tags: ["Product", "Systems"]
   heroImage: "https://example.com/hero.jpg"
   canonicalUrl: "https://yourdomain.com/blog/ship-systems"
   ---
   ```
2. Preview locally using the composer’s **Load draft preview** button (drafts are visible only to you).
3. When you’re happy, either publish via the admin composer (which calls the API to write the Markdown file) or manually drop the `.md` file into `content/posts/`.
4. Run `npm run build:posts` before deploying so `data/posts.json` stays in sync.

## Admin mode

1. Set `ADMIN_TOKEN` on your API host. In `data/profile.json`, the `admin.hint` field can remind you of the token but never stores it.
2. Press `Ctrl + Shift + A` → click **Admin** → enter the token. On success:
   - Blog cards show admin badges, Copy Markdown buttons, LinkedIn share shortcuts, and delete controls.
   - The **Blog Composer** panel appears above the posts grid with buttons to Publish, Preview, Copy, Download, and Reset.
3. Deleting a draft removes it from your browser. Deleting a published post calls the API, removes the Markdown file server-side, regenerates `data/posts.json`, and refreshes the list.
4. Log out to hide everything again.

## Deploying

### 1. Host the API
Deploy `server.js` somewhere that runs Node 18+ (Render, Railway, Fly.io, Heroku, VPS, etc.).

- Build command: `npm install && npm run build:posts`
- Start command: `npm run start`
- Env vars: `ADMIN_TOKEN`, plus optional `PORT`/`HOST`
- The API serves `index.html` too, so you can keep a combined deployment if you prefer.

### 2. Host the static frontend
For a CDN-first setup (Netlify, Vercel, GitHub Pages):

1. Run `npm run build:posts` locally.
2. Upload the entire repo (including `data/posts.json` and `content/posts`). No build command required.
3. Before the `<script type="module" src="js/app.js"></script>` tag in `index.html`, set the API base URL so the static site knows where to send requests:
   ```html
   <script>
     window.__API_BASE__ = 'https://your-api-host.com/api';
   </script>
   ```
   When you deploy the API + frontend together (e.g., on Render), you can omit this line and the default `/api` will work.

Whenever you add/edit posts:
1. Update Markdown → `npm run build:posts`
2. Redeploy the API (if Markdown lives there) and redeploy the static site (if you’re hosting them separately).

## Tips

- Keep `content/posts` and `data/posts.json` in version control for rollback/preview builds.
- To test on another device, run the server with `HOST=0.0.0.0` and open `http://<your-ip>:<port>`.
- For analytics or forms, drop your preferred scripts/forms (Plausible, Fathom, Formspree, etc.) into `index.html`.

With this split setup you get a blazing-fast static frontend, a convenient admin workflow, and a backend you can host anywhere.*** End Patch
