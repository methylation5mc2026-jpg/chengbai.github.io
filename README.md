# Zeheng Shen Personal Website

Personal website of Zeheng Shen.

Built with Astro, Tailwind CSS, MDX, Pagefind, RSS, and Sitemap.

## Development

```bash
npm ci
npm run dev
npm run build
```

Use Node.js 22.18+ or 24. After edits, run `npm run check`, `npm test`,
`npm run build`, `npm run verify:dist`, and `npm audit`. The build verifier
checks links, RSS/Sitemap URLs, browser security policies, and excluded assets.

GitHub Pages ignores `public/_headers`. The HTML layout supplies the active
CSP and referrer policy, and scripts must stay external (`assetsInlineLimit: 0`).
Inline styles remain permitted for article formatting and code highlighting;
Pagefind requires `wasm-unsafe-eval`. Header-only protections such as
`frame-ancestors`, X-Frame-Options, and nosniff require hosting/proxy support.
The `_headers` file is only for alternative hosts which implement that format.

Only assets intended for publication belong in `public/`. Source assets for
unpublished books live in `unpublished-assets/` and are not deployed. They are
still readable in this public Git repository and its history: this is a
publication boundary, not access control for confidential material. Update the
public-book allowlists in `src/lib/content.ts` and `scripts/verify-dist.mjs`
together when intentionally publishing another book.

The security contact is under the project path `/.well-known/security.txt`.
RFC discovery at the origin root requires a separate user-site repository or
custom-domain configuration; this project cannot supply that root path.
