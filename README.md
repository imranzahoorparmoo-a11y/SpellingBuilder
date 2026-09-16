# Spellbound — Spelling Learning App

A clean, minimalist spelling practice app with a purple gradient theme.
Three sections: **Practice Mode**, **Stats**, and **Settings** (Profile + About).

No build step, no framework — plain HTML, CSS, and JavaScript, so it runs
directly on GitHub Pages.

## How it works

- `index.html` — app shell and the three screens
- `style.css` — purple gradient, minimalist styling
- `app.js` — quiz logic, stats tracking, settings (saved in the browser's `localStorage`)
- `words-general.json` — everyday word list (the "General" category)
- `words-legal.json` — legal terminology word list (the "Legal" category)

Both word files are the "backend": Practice Mode has a **General / Legal**
switcher at the top, and the app fetches the matching file at runtime. Add or
edit words by editing whichever file matches, then push to GitHub — no code
changes needed. Want a third category? Duplicate one of these files (e.g.
`words-medical.json`) and add a matching button in `index.html`'s
`#categorySwitch` with `data-category="medical"`.

All files sit in the same folder on purpose — no subfolders — so uploading
via GitHub's drag-and-drop web UI always works, even in browsers that don't
preserve folder structure on drag-and-drop.

### Adding words

Open `words-general.json` or `words-legal.json` (whichever category fits) and add an entry like this:

```json
{ "word": "necessary", "hint": "Required or essential", "level": "medium",
  "options": ["necessary", "neccessary", "necesary", "neccesary"] }
```

- `word` — the correct spelling
- `hint` — shown to the learner instead of a definition-free blank
- `level` — `easy`, `medium`, or `hard` (used by the Settings → Difficulty filter)
- `options` — 4 choices, correct spelling plus 3 realistic misspellings

## Better voices with ResponsiveVoice (optional)

The app is wired up to use [ResponsiveVoice.js](https://responsivevoice.org) for
more natural-sounding AI voices, with a graceful fallback to your device's
own built-in voices if it isn't set up.

1. Go to https://responsivevoice.org/register/ and sign up for a **free**
   account, then add your GitHub Pages domain (e.g. `your-username.github.io`)
   as a site in their dashboard.
2. On your site's dashboard, ResponsiveVoice shows a ready-made snippet with
   your `apiKey` filled in — copy it.
3. Open `index.html`, find this block near the bottom:
   ```html
   <script src="https://cdn.responsivevoice.org/sdk/latest/responsivevoice.js"></script>
   <script>
     if (typeof responsiveVoice !== "undefined") {
       responsiveVoice.init({ "apiKey": "OjeLXBKE" });
     }
   </script>
   ```
   Replace `"OjeLXBKE"` with your own key from step 2, commit, and push.
4. In the app's Settings → Voice, you'll now see an "AI Voices (ResponsiveVoice)"
   group at the top of the dropdown — pick one and hit Preview.

If you skip this, the app still works fine using your browser/device's
built-in voices (listed under "Device Voices" in the same dropdown).

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
