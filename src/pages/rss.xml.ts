import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { cleanSlug, getArticles, getDailyEntries } from "../lib/content";
import { siteConfig } from "../site.config";

export async function GET(context: APIContext) {
  const siteUrl = new URL(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/`, context.site ?? siteConfig.url);
  const articles = await getArticles();
  const daily = await getDailyEntries();
  const items = [
    ...articles.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.pubDate,
      link: new URL(`articles/${cleanSlug(article.id)}/`, siteUrl).href
    })),
    ...daily.map((entry) => ({
      title: `Daily: ${entry.data.title}`,
      description: entry.data.description,
      pubDate: entry.data.pubDate,
      link: new URL(`daily/${cleanSlug(entry.id)}/`, siteUrl).href
    }))
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: siteConfig.title,
    description: `${siteConfig.name} personal homepage RSS`,
    site: siteUrl,
    items,
    customData: `<language>en</language>`
  });
}
