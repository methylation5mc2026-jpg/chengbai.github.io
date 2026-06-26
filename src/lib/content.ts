import { getCollection } from "astro:content";

const PUBLIC_BOOK_SLUGS = new Set(["aivc-whitepaper"]);
const SHOW_DAILY_NOTES = false;

export function isPublicBookSlug(slug: string) {
  return PUBLIC_BOOK_SLUGS.has(cleanSlug(slug));
}

export async function getArticles() {
  const entries = await getCollection("articles", ({ data }) => !data.draft);
  return entries.sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime()
  );
}

export async function getTopicCollections() {
  const entries = await getCollection("collections");
  return entries.sort((a, b) => a.data.order - b.data.order);
}

export async function getBooks() {
  const entries = await getCollection("books");
  const books = entries.filter((entry) => entry.data.type === "book" && isPublicBookSlug(entry.id));
  return books.sort((a, b) => a.data.order - b.data.order);
}

export async function getBookChapters(bookSlug: string) {
  const entries = await getCollection("books");
  const normalizedBookSlug = cleanSlug(bookSlug);
  if (!isPublicBookSlug(normalizedBookSlug)) {
    return [];
  }
  return entries
    .filter((entry) => entry.data.type === "chapter" && entry.data.bookSlug === normalizedBookSlug)
    .sort((a, b) => a.data.order - b.data.order);
}

export async function getDailyEntries() {
  if (!SHOW_DAILY_NOTES) {
    return [];
  }
  const entries = await getCollection("daily");
  return entries.sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime()
  );
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function getWordCount(text: string) {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const latinWordCount = text
    .replace(/[\u4e00-\u9fff]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return chineseChars + latinWordCount;
}

export function groupArticlesByYear<T extends { data: { pubDate: Date } }>(entries: T[]) {
  return entries.reduce<Record<string, T[]>>((acc, entry) => {
    const year = entry.data.pubDate.getFullYear().toString();
    acc[year] ??= [];
    acc[year].push(entry);
    return acc;
  }, {});
}

export function cleanSlug(id: string) {
  return id.replace(/\.mdx?$/, "");
}

export function getLeafSlug(id: string) {
  return cleanSlug(id.split("/").pop() ?? id);
}

export function getChapterDisplayNumber(
  entry: { data?: { bookSlug?: string; title?: string; order?: number } },
  index: number
) {
  if (entry.data?.bookSlug === "aivc-whitepaper") {
    if (entry.data.title?.startsWith("前言")) {
      return "00";
    }
    if (typeof entry.data.order === "number" && entry.data.order > 1) {
      return String(entry.data.order - 1).padStart(2, "0");
    }
  }

  return String(index + 1).padStart(2, "0");
}

export function tagToSlug(tag: string) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getTaggedEntries() {
  const articles = await getArticles();
  const daily = await getDailyEntries();
  const books = await getCollection("books");
  const bookEntries = books.filter((entry) => entry.data.type === "book" && isPublicBookSlug(entry.id));
  const chapterEntries = books.filter((entry) => entry.data.type === "chapter" && isPublicBookSlug(entry.data.bookSlug));

  return [
    ...articles.map((entry) => ({
      kind: "Article",
      title: entry.data.title,
      description: entry.data.description,
      tags: entry.data.tags,
      date: entry.data.updatedDate ?? entry.data.pubDate,
      href: `/articles/${cleanSlug(entry.id)}/`
    })),
    ...daily.map((entry) => ({
      kind: "Daily",
      title: entry.data.title,
      description: entry.data.description,
      tags: entry.data.tags,
      date: entry.data.updatedDate ?? entry.data.pubDate,
      href: `/daily/${cleanSlug(entry.id)}/`
    })),
    ...bookEntries.map((entry) => ({
      kind: "Book",
      title: entry.data.title,
      description: entry.data.description,
      tags: entry.data.tags,
      date: entry.data.updatedDate,
      href: `/books/${cleanSlug(entry.id)}/`
    })),
    ...chapterEntries.map((entry) => ({
      kind: "Chapter",
      title: entry.data.title,
      description: entry.data.description,
      tags: entry.data.tags,
      date: entry.data.pubDate,
      href: `/books/${entry.data.bookSlug}/${getLeafSlug(entry.id)}/`
    }))
  ].filter((entry) => entry.tags.length > 0);
}

export function groupTaggedEntriesByTag(entries: Awaited<ReturnType<typeof getTaggedEntries>>) {
  return entries.reduce<Record<string, typeof entries>>((acc, entry) => {
    for (const tag of entry.tags) {
      acc[tag] ??= [];
      acc[tag].push(entry);
    }
    return acc;
  }, {});
}
