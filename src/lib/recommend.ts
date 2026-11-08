import { type ArticleMeta, byNewest } from "./meta";

export const FEATURED_LIMIT = 6;
export const RELATED_LIMIT = 4;

export function featured(index: ArticleMeta[], limit = FEATURED_LIMIT): ArticleMeta[] {
  const sorted = [...index].sort(byNewest);
  const picked = sorted.filter((a) => a.recommended);
  const rest = sorted.filter((a) => !a.recommended);
  return [...picked, ...rest].slice(0, limit);
}

export function relatedTo(
  article: ArticleMeta,
  index: ArticleMeta[],
  limit = RELATED_LIMIT,
): ArticleMeta[] {
  const bySlug = new Map(index.map((a) => [a.slug, a]));
  const chosen = new Map<string, ArticleMeta>();
  for (const slug of article.related) {
    const a = bySlug.get(slug);
    if (a && a.slug !== article.slug) chosen.set(a.slug, a);
  }

  const shared = (a: ArticleMeta) =>
    a.topics.filter((t) => article.topics.includes(t)).length +
    a.tags.filter((t) => article.tags.includes(t)).length;
  const filler = index
    .filter((a) => a.slug !== article.slug && !chosen.has(a.slug) && shared(a) > 0)
    .sort((a, b) => shared(b) - shared(a) || byNewest(a, b));

  return [...chosen.values(), ...filler].slice(0, limit);
}
