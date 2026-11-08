export type ArticleMeta = {
  slug: string;
  title: string;
  summary: string;
  topics: string[];
  tags: string[];
  language: "zh" | "en";
  publishedAt: string;
  recommended: boolean;
  related: string[];
};

/** 发布时间从新到旧，相同时按 slug 稳定排序 */
export function byNewest(a: ArticleMeta, b: ArticleMeta): number {
  if (a.publishedAt !== b.publishedAt) return a.publishedAt < b.publishedAt ? 1 : -1;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

export function toMeta<T extends ArticleMeta>(a: T): ArticleMeta {
  const { slug, title, summary, topics, tags, language, publishedAt, recommended, related } = a;
  return { slug, title, summary, topics, tags, language, publishedAt, recommended, related };
}
