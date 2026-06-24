# Cheng Bai Personal Website

Public personal website for `https://chengbai.github.io/`.

This site is built with Astro, Tailwind CSS, MDX, Pagefind, RSS, and Sitemap. The homepage follows an academic-profile structure inspired by `alrightlone.github.io`: sidebar profile card, biography, news, education, experiences, selected knowledge assets, honors, and contact.

## Local Development

```bash
npm install
npm run dev
```

Local address:

```text
http://127.0.0.1:4321/
```

## Production Build

```bash
npm run build
```

The build output is written to `dist/`, and Pagefind search indexes are generated automatically.

## GitHub Pages Deployment

This repository is configured for GitHub Pages through `.github/workflows/deploy.yml`.

1. Create a public repository named `chengbai.github.io` under the GitHub account `chengbai`.
2. Push this project to the repository's `main` branch.
3. In GitHub, open `Settings -> Pages`.
4. Set `Build and deployment -> Source` to `GitHub Actions`.
5. Push again or manually run the `Deploy to GitHub Pages` workflow.

The workflow will install dependencies, run `npm run build`, upload `dist/`, and deploy it to GitHub Pages.

## Content Structure

```text
src/content/articles      Selected essays and short articles
src/content/books         Long-form book projects and chapters
src/content/collections   Topic collections
src/content/daily         Daily principles and reflections
src/pages                 Routes and page templates
```

## Important Files

```text
astro.config.mjs                Site URL and Astro integrations
src/site.config.ts              Site name, description, focus tags, and navigation
src/pages/index.astro           Academic-profile homepage
.github/workflows/deploy.yml    GitHub Pages deployment workflow
public/robots.txt               Sitemap location for crawlers
```

## Add a New Article

Create a new `.mdx` file in `src/content/articles`:

```mdx
---
title: "Article title"
description: "One-sentence summary."
pubDate: 2026-06-24
tags:
  - AIVC
  - AI for Biology
collection: "AI for Science"
featured: true
draft: false
---

## Start writing

Article body goes here.
```

Set `featured: true` for high-quality pieces that should appear prominently on the homepage.
