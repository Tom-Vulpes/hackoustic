# Hackoustic website

Static site for GitHub Pages. No build step. All content lives in `data/*.json`.

## One-time setup (about 10 minutes)

1. **Create the repo** `hackoustic` under `tom-vulpes` on GitHub (public), and upload everything in this folder
   (keep the hidden `.github` and `.nojekyll` files). If you use a different repo/user name, edit `REPO` at the top of `js/app.js`.
2. **Turn on Pages:** Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
3. **Let the workflow commit:** Settings → Actions → General → Workflow permissions → *Read and write permissions*.
4. **Create the labels** (Issues → Labels → New label): `approved`, `new-practitioner`, `new-workshop`, `new-resource`.
5. **Add Tim** as a collaborator (Settings → Collaborators) with *Write* access.

## Adding things (you or Tim)

Anyone with a GitHub account can fill in a form (the "+ Suggest…" buttons on the site, or Issues → New issue).
Nothing appears until you or Tim review it and **add the `approved` label** to the issue. The workflow then adds the entry
to the right JSON file, publishes it (live in a minute or two), comments on the issue and closes it.
If something's wrong (missing field, duplicate), the bot says so in a comment and leaves the issue open — edit it and re-apply `approved`.

Only people with write access can apply labels, and the workflow double-checks that.

**Images:** drag a photo into the Image box of the form. For artists already in `artists.json`, upload files into `images/`
(Add file → Upload files) and set `"image": "images/name.jpg"`.

## Editing directly

Open any file in `data/` on GitHub, click the pencil, edit, commit. Keep it valid JSON.
Workshops: `date` is `YYYY-MM-DD`; dated entries disappear after that day, blank-date entries stay as "Ongoing".
The Learn flowchart is `data/learn.json` (nodes with `options` → `next`, or a `result` listing resource ids from `resources.json`).

## Testing locally

```
python3 -m http.server   # then open http://localhost:8000
python3 scripts/add_entry.py --body-file issue.md --labels new-practitioner
```
(Opening index.html straight from disk won't work — browsers block loading JSON from file://.)
