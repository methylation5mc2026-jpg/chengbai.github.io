import { defineCollection, z } from "astro:content";

const articles = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    collection: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false)
  })
});

const topicCollections = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().default(0),
    cover: z.string().optional()
  })
});

const books = defineCollection({
  type: "content",
  schema: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("book"),
      title: z.string(),
      description: z.string(),
      order: z.number().default(0),
      updatedDate: z.coerce.date(),
      tags: z.array(z.string()).default([])
    }),
    z.object({
      type: z.literal("chapter"),
      title: z.string(),
      description: z.string(),
      bookSlug: z.string(),
      order: z.number(),
      pubDate: z.coerce.date(),
      tags: z.array(z.string()).default([])
    })
  ])
});

const daily = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([])
  })
});

export const collections = {
  articles,
  collections: topicCollections,
  books,
  daily
};
