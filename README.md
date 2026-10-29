# Jonsercrate Demon List — automatic saving

Three public ranked lists, player point leaderboard, level verification links, and a password-protected moderator editor. **Save Level**, **Record completion**, **Remove**, and **Delete** automatically commit `data.json` to GitHub. The public GitHub Pages site updates after Pages rebuilds (usually a minute or two).

## 1. Create the GitHub Pages site

1. Create a **public** GitHub repository named `jonsercrate-demon-list`.
2. Upload `index.html` and `data.json` to its root (the `worker` folder can be in the repo too).
3. In **Settings → Pages**, select **Deploy from a branch**, `main`, `/ (root)`.
4. Site URL: `https://YOUR_GITHUB_USERNAME.github.io/jonsercrate-demon-list/`.

## 2. Create a fine-grained GitHub token

GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
Select **only** the `jonsercrate-demon-list` repository, grant **Contents: Read and write**, and set an expiration date you can renew. Copy the token. **Never put it in the website or commit it to GitHub.**

## 3. Deploy a free Cloudflare Worker

Create a free Cloudflare account. In Workers & Pages create a Worker (or use `npx wrangler deploy` from the `worker/` directory). Copy `worker/index.js` as its code if using the dashboard. Configure the following under Worker **Settings → Variables and Secrets**:

- **Secrets** (encrypted): `MOD_PASSWORD` (your chosen strong moderator password), `GITHUB_TOKEN` (token from step 2).
- **Plain variables**: `REPO_OWNER` (your GitHub username), `REPO_NAME` (`jonsercrate-demon-list`), `BRANCH` (`main`), `ALLOWED_ORIGIN` (`https://YOUR_GITHUB_USERNAME.github.io`, **no trailing slash or repository path**).

If using Wrangler, edit `worker/wrangler.toml` with your username, deploy, and add secrets with `npx wrangler secret put MOD_PASSWORD` and `npx wrangler secret put GITHUB_TOKEN`.

Your Worker URL looks like `https://jonsercrate-list-admin.YOUR-SUBDOMAIN.workers.dev`.

## 4. Connect the website

In `index.html`, replace `REPLACE_WITH_YOUR_WORKER_URL` with your exact Worker URL. Commit the change. Open the site, go to **Moderator**, enter your password, and click **Unlock moderator controls**. Adding a level or completion and clicking Save now publishes automatically to GitHub. **No manual JSON upload needed.**

## Security and practical notes

- Password and GitHub token stay in Cloudflare Worker secrets; never store them in the public site. All calls use HTTPS. The Worker checks the password before updating GitHub. Use a unique password.
- This is lightweight family-project authentication, **not** an enterprise admin system. No account lockout or rate limiting is included; consider enabling Cloudflare rate limiting if the site becomes widely shared.
- Only one moderator should edit at a time. Changes are written to `data.json` using GitHub's current file SHA; concurrent edits can overwrite one another. Refresh before editing.
- **Video upload**: host verification and completion videos on YouTube (unlisted is fine) or another video platform, then paste the links. Direct video-file upload is not implemented.
- **Points**: Main and Challenge levels use `max(1, round(100 × 0.965^(rank−1)))`. Impossible levels award 0 points. Each player scores once per level. Adjust `points()` in `index.html` to change the formula.
- The `worker/` folder is backend code, not part of the GitHub Pages frontend. Deploy it separately to Cloudflare.

## Google Drive verification videos

1. Upload a video to Google Drive.
2. Open **Share → General access → Anyone with the link → Viewer**.
3. Copy the Drive sharing link (for example `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`).
4. In Moderator, paste it into **Verification video URL** and click **Save level**.

The level detail page embeds a Google Drive preview player and offers a direct **Watch verification on Google Drive** link. YouTube video links also embed. If embedding is restricted by Google or the file owner, visitors can open the direct link instead. Completion-video links can also be Google Drive links, but remain clickable links rather than embedded players. Videos stay in your Google Drive; this website does not upload or store video files.
