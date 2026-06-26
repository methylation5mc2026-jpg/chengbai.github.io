import rss from "@astrojs/rss";
import { cleanSlug, getArticles, getDailyEntries } from "../lib/content";
import { siteConfig } from "../site.config";

export async function GET(context) {
  const articles = await getArticles();
  const daily = await getDailyEntries();
  const items = [
    ...articles.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.pubDate,
      link: `/articles/${cleanSlug(article.id)}/`
    })),
    ...daily.map((entry) => ({
      title: `Daily: ${entry.data.title}`,
      description: entry.data.description,
      pubDate: entry.data.pubDate,
      link: `/daily/${cleanSlug(entry.id)}/`
    }))
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: siteConfig.title,
    description: `${siteConfig.name} personal homepage RSS`,
    site: context.site,
    items,
    customData: `<language>en</language>`
  });
}
