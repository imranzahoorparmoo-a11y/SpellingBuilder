# Spellbound — Spelling Learning App

A clean, minimalist spelling practice app with a purple gradient theme.
Three sections: **Practice Mode**, **Stats**, and **Settings** (Profile + About).

No build step, no framework — plain HTML, CSS, and JavaScript, so it runs
directly on GitHub Pages.

## How it works

- `index.html` — app shell and the three screens
- `style.css` — purple gradient, minimalist styling
- `app.js` — quiz logic, stats tracking, settings (saved in the browser's `localStorage`)
- `words.json` — the word list. This is the "backend": the app fetches
  it at runtime, so you can add or edit words by editing this one file and
  pushing to GitHub — no code changes needed.

All files sit in the same folder on purpose — no subfolders — so uploading
via GitHub's drag-and-drop web UI always works, even in browsers that don't
preserve folder structure on drag-and-drop.

### Adding words

Open `words.json` and add an entry like this:

```json
{ "word": "necessary", "hint": "Required or essential", "level": "medium",
  "options": ["necessary", "neccessary", "necesary", "neccesary"] }
```

- `word` — the correct spelling
- `hint` — shown to the learner instead of a definition-free blank
- `level` — `easy`, `medium`, or `hard` (used by the Settings → Difficulty filter)
- `options` — 4 choices, correct spelling plus 3 realistic misspellings

## Put it on GitHub

```bash
cd spelling-app
git init
git add .
git commit -m "Initial commit: Spellbound spelling app"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## Turn on GitHub Pages (free hosting)

1. On GitHub, open your repo → **Settings** → **Pages**
2. Under **Build and deployment**, set **Source** to `Deploy from a branch`
3. Branch: `main`, folder: `/ (root)` → **Save**
4. After a minute, your app is live at:
   `https://<your-username>.github.io/<your-repo>/`

That's it — since the word list is fetched over HTTP from `data/words.json`,
updating words later is just: edit the file, commit, push.
