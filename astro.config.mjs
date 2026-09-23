import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import remarkGfm from "remark-gfm";

export default defineConfig({
  site: "https://methylation5mc2026-jpg.github.io",
  base: "/chengbai.github.io",
  // Keep scripts external so the static Pages CSP can reject inline JavaScript.
  vite: { build: { assetsInlineLimit: 0 } },
  integrations: [
    mdx(),
    sitemap()
  ],
  markdown: {
    processor: unified({ remarkPlugins: [remarkGfm] }),
    shikiConfig: {
      theme: "github-dark"
    }
  }
});
