# Cloudflare setup (done by the owner in the dashboard)

**§1 worked: the first preview deployed on 30-09-2026. §2's Worker steps were checked against Cloudflare's docs on 19-10-2026 (Workers Builds pages dated 15-10-2026); the D1 Console tab and Retry deployment are not in those docs, so they are from memory.**

## 1. Site: a Pages project connected to GitHub
1. Workers & Pages → **Create application** → the **Pages** option (it may sit under "Looking to deploy Pages?") → **Import an existing Git repository** → GitHub. Give Cloudflare access to `rsplenum/Finance_tools` only, select it, **Begin setup**.
2. Build settings:

   | Field | Value |
   |---|---|
   | Project name | `finance-tools` (the address became `finance-tools-9if.pages.dev`: Cloudflare adds a suffix when a name is taken) |
   | Production branch | `main` |
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `site/dist` |
   | Root directory (advanced) | leave empty: the build needs the root `package.json` |
   | Environment variables | none; Node 22 comes from `.node-version` (if the build log shows an older Node, add `NODE_VERSION` = `22`) |

3. **Save and Deploy.**
4. Previews per branch: project → **Settings** → **Builds** → **Branch control**: production branch `main` with automatic deployments on; preview branches **All non-production branches**. Each push to another branch then builds `https://<branch>.finance-tools-9if.pages.dev`, and the link appears on the GitHub pull request.
5. Check: the home page and `/dscr/` open, typing `70 L` shows `Rs. 70,00,000`, and the theme button cycles Auto → Light → Dark.

## 2. Worker (DEP1, D-TECH-38)
1. Done 19-10-2026: the D1 database `finance-tools` and the KV namespace `finance-tools`; their IDs are in `worker/wrangler.jsonc` (merged to `main` before step 3, or the first deploy fails).
2. **The events table, once:** **Storage & databases** → **D1 SQL database** → `finance-tools` → **Console** → paste all of `worker/migrations/0001_events.sql` → **Execute**. It is `IF NOT EXISTS`, so a later `npx wrangler d1 migrations apply finance-tools --remote -c worker/wrangler.jsonc` (which a pasted run does not record) re-runs it harmlessly. Check: `SELECT name FROM sqlite_master WHERE type = 'table';` lists `events`.
3. **Connect the Worker:** **Workers & Pages** → **Create application** → **GitHub** → the repository `rsplenum/Finance_tools`:

   | Field | Value |
   |---|---|
   | Project (Worker) name | `finance-tools-api` (must match `name` in `worker/wrangler.jsonc`, or the build fails) |
   | Build command | empty |
   | Deploy command | `npx wrangler deploy -c worker/wrangler.jsonc` |
   | Preview command (older screens: Non-production branch deploy command) | `npx wrangler versions upload -c worker/wrangler.jsonc` |
   | Root directory | `/` |

   **Save and Deploy**; the build log ends with the Worker's address, `https://finance-tools-api.<your subdomain>.workers.dev` (also under the Worker's **Settings → Domains & Routes**).
4. **Check:** that address with `/health` shows `{"ok":true,"missing":[]}`; a 503 names the missing binding.
5. **Point the site at it:** **Workers & Pages** → `finance-tools` (the Pages project) → **Settings** → **Variables and Secrets** → **Production** → **Add** → Type **Text**, name `PUBLIC_API_URL`, value the address from step 3 (a trailing slash is trimmed) → **Save**. Production only: previews would mix test clicks into the counts. Then **Deployments** → the top Production deployment → **⋯** → **Retry deployment** (if it is not there, the next merge to `main` does the same): the rebuild turns recording on and the footer's line about what is counted.
6. **Check a batch:** open the live site's `/dscr/`, change a field, switch to another tab, then in the D1 console: `SELECT at, page, kind, name FROM events ORDER BY at DESC LIMIT 5;`. `npm run usage` prints the funnels; from a session it needs `CLOUDFLARE_API_TOKEN` (D1 Edit, this account only) and `CLOUDFLARE_ACCOUNT_ID` in the environment's secrets, and `api.cloudflare.com` allowed. With a custom domain, add it to `READ_ORIGINS` in `worker/wrangler.jsonc`, or the Worker refuses its batches.

Secrets (Razorpay keys, later) go in the Worker's **Settings → Variables and Secrets**, never in the repo.
