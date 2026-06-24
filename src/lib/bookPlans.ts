import { cleanSlug, getBookChapters, getLeafSlug, getWordCount } from "./content";

export const bookPlans: Record<
  string,
  { status: string; goal: number; next: string; audience: string; cadence: string; promise: string }
> = {
  "aivc-whitepaper": {
    status: "重点推进",
    goal: 12,
    next: "扩写 AIVC 的定义、技术路线、虚拟细胞、计算蛋白质设计和科研创业机会。",
    audience: "关注 AI for Science、AI4Bio、科研创业和未来产业机会的人。",
    cadence: "建议按章节连续阅读，后续会持续追加。",
    promise: "理解 AI Virtual Cell、计算蛋白质设计与科研创业机会。"
  },
  "bioinformatics-roadmap": {
    status: "底座课程",
    goal: 18,
    next: "补齐计算机、编程、Python、AI 工具链与普通人真实项目路线。",
    audience: "想从零进入计算机与人工智能世界的普通学习者。",
    cadence: "适合从第一章开始顺序读。",
    promise: "让普通人从零开始进入计算机与人工智能世界。"
  },
  "ai-science-reading-book": {
    status: "研究白皮书",
    goal: 10,
    next: "沉淀 AI4Bio 的论文地图、技术路线、关键公司与产业判断。",
    audience: "关注生物学与人工智能交叉方向的学生、研究者和创业者。",
    cadence: "建议配合论文和专题页一起读。",
    promise: "跟踪生物学与人工智能交叉处正在发生的结构性变化。"
  },
  "everyone-can-business": {
    status: "新书占位",
    goal: 10,
    next: "从需求、产品、销售、内容、增长、现金流和长期复利开始写。",
    audience: "想理解商业、创业和个人影响力的人。",
    cadence: "目录会先建立，再逐章扩写。",
    promise: "把商业常识写成普通人能读懂、能实践的长期教程。"
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
