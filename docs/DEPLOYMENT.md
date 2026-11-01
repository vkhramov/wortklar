# Deploying Wortklar

## Local use (recommended)

```bash
npm install
npm run vocab:generate   # if rebuilding the dictionary
npm run vocab:validate
npm run dev              # development
# or
npm run build && npm run preview
```

Open the URL shown in the terminal. Progress stays in the browser’s local storage.

## Static hosting (free)

1. `npm run build`
2. Upload the `dist/` folder to any static host:
   - Cloudflare Pages
   - Netlify drag-and-drop
   - GitHub Pages (set Vite `base` if serving from a subpath)
   - Any nginx/`python -m http.server` static root

No server, database, or API keys are required.

### GitHub Pages subpath

If the site is at `https://user.github.io/wortklar/`, set in `vite.config.ts`:

```ts
export default defineConfig({
  base: '/wortklar/',
  plugins: [react()],
})
```

## Maintenance

| Task | Command / action |
| --- | --- |
| Regenerate dictionary | `npm run vocab:generate` |
| Validate dictionary | `npm run vocab:validate` |
| Unit checks | `npm run test:unit` |
| Production build | `npm run build` |
| Full QA gate | `npm run qa` |

Edit seed modules under `scripts/seeds/`, regenerate, validate, then rebuild.

## Privacy

No accounts, no telemetry in the default build. Learners should export backups before clearing browser data.
