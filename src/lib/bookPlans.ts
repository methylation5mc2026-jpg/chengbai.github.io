import { cleanSlug, getBookChapters, getLeafSlug, getWordCount } from "./content";

export const bookPlans: Record<
  string,
  { status: string; goal: number; next: string; audience: string; cadence: string; promise: string }
> = {
  "aivc-whitepaper": {
    status: "Learning notes",
    goal: 12,
    next: "Continue revising chapter structure, figures, citations, and paper-reading notes.",
    audience: "Readers interested in AI Virtual Cell, AI for Biology, omics data, and model evaluation.",
    cadence: "Best read chapter by chapter; new notes will be added gradually.",
    promise: "A personal learning route for understanding AI Virtual Cell and related AI for Biology methods."
  },
  "founders-playbook": {
    status: "中英对照手册",
    goal: 9,
    next: "逐章精读，提炼 AI 原生创业的判断、动作清单与个人项目启发。",
    audience: "关注 AI 原生创业、个人创业、产品验证和极小团队杠杆的人。",
    cadence: "建议左右栏对照阅读：先读中文抓框架，再读英文学表达。",
    promise: "把 AI 原生初创公司的行动路线读成自己的创业方法论。"
  }
};

export const bookPalettes = [
  { bg: "#263f35", edge: "#17271f", fg: "#fff4dc", accent: "#d9b466" },
  { bg: "#7b2d26", edge: "#4b1714", fg: "#fff0df", accent: "#f0b36e" },
  { bg: "#1f4f75", edge: "#12304a", fg: "#edf7ff", accent: "#8fd3ff" },
  { bg: "#6b5428", edge: "#3f3117", fg: "#fff7d8", accent: "#f2cf73" },
  { bg: "#37305f", edge: "#211b3f", fg: "#f5f1ff", accent: "#c7b8ff" },
  { bg: "#173f4f", edge: "#0b2630", fg: "#ecfbff", accent: "#7ed9c7" }
];

export function getBookStyle(index: number) {
  const palette = bookPalettes[index % bookPalettes.length];
  return `--book-bg:${palette.bg};--book-edge:${palette.edge};--book-fg:${palette.fg};--book-accent:${palette.accent};`;
}

export async function getBookProjects(books: any[]) {
  return Promise.all(
    books.map(async (book, index) => {
      const slug = cleanSlug(book.id);
      const chapters = await getBookChapters(book.id);
      const plan = bookPlans[slug] ?? {
        status: "持续更新",
        goal: Math.max(chapters.length + 4, 8),
        next: "继续补充目录与章节。",
        audience: "适合对该主题感兴趣的长期读者。",
        cadence: "建议按目录阅读。",
        promise: book.data.description
      };
      const firstChapter = chapters[0];
      const readingUrl = firstChapter ? `/books/${slug}/${getLeafSlug(firstChapter.id)}/` : `/books/${slug}/`;

      return {
        book,
        chapters,
        index,
        slug,
        plan,
        readingUrl,
        progress: Math.min(100, Math.round((chapters.length / plan.goal) * 100)),
        words: chapters.reduce((sum, chapter) => sum + getWordCount(chapter.body), 0)
      };
    })
  );
}
