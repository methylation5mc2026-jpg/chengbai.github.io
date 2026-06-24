import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import remarkGfm from "remark-gfm";

export default defineConfig({
  site: "https://chengbai.github.io",
  integrations: [
    tailwind({ applyBaseStyles: false }),
    mdx({ remarkPlugins: [remarkGfm] }),
    sitemap()
  ],
  markdown: {
    shikiConfig: {
      theme: "github-dark"
    }
  }
});
