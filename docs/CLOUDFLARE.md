# Cloudflare setup (done by the owner in the dashboard)

**Not yet checked against the Cloudflare docs.** The session that wrote this (30-09-2026) could not open developers.cloudflare.com (blocked by the environment's network policy), so button and menu names are from memory and may differ slightly. The build settings themselves were run and pass locally. Allow that host in the environment's network settings and ask a session to verify this page.

## 1. Site: a Pages project connected to GitHub
1. Workers & Pages → **Create application** → the **Pages** option (it may sit under "Looking to deploy Pages?") → **Import an existing Git repository** → GitHub. Give Cloudflare access to `rsplenum/Finance_tools` only, select it, **Begin setup**.
2. Build settings:

   | Field | Value |
   |---|---|
   | Project name | `finance-tools` (gives `finance-tools.pages.dev`) |
   | Production branch | `main` |
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `site/dist` |
   | Root directory (advanced) | leave empty: the build needs the root `package.json` |
   | Environment variables | none; Node 22 comes from `.node-version` (if the build log shows an older Node, add `NODE_VERSION` = `22`) |

3. **Save and Deploy.**
4. Previews per branch: project → **Settings** → **Builds** → **Branch control**: production branch `main` with automatic deployments on; preview branches **All non-production branches**. Each push to another branch then builds `https://<branch>.finance-tools.pages.dev`, and the link appears on the GitHub pull request.
5. Check: the home page and `/dscr/` open, typing `70 L` shows `Rs. 70,00,000`, and the theme button cycles Auto → Light → Dark.

## 2. Worker (can wait until the payment session)
1. **Storage & databases** → **D1** → create database `finance-tools` (location automatic) → copy its Database ID.
2. **Storage & databases** → **KV** → create namespace `finance-tools` → copy its ID.
3. Give both IDs to the next session (they are not secrets) to replace the placeholders in `worker/wrangler.jsonc`. Until then a deploy fails, so connect the Worker only after that.
4. Workers & Pages → **Create application** → **Import a repository** → `rsplenum/Finance_tools`:

   | Field | Value |
   |---|---|
   | Worker name | `finance-tools-api` (must match `name` in `worker/wrangler.jsonc`) |
   | Build command | empty |
   | Deploy command | `npx wrangler deploy -c worker/wrangler.jsonc` |
   | Non-production branch deploy command | `npx wrangler versions upload -c worker/wrangler.jsonc` |
   | Root directory | `/` |
   | Builds for non-production branches | on |

5. Check: `https://finance-tools-api.<your-subdomain>.workers.dev/health` shows `{"ok":true,"missing":[]}`.

Secrets (Razorpay keys, later) go in the Worker's **Settings → Variables and Secrets**, never in the repo.
