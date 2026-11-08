import { type ArticleMeta, byNewest } from "./meta";

export const LIMITS = { q: 80, terms: 5, pageSize: 20 } as const;

export type Query = { q: string; topics: string[]; tags: string[]; page: number };

const uniq = (values: string[]) => [...new Set(values)].slice(0, LIMITS.terms);

export function parseQuery(params: URLSearchParams): Query {
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  return {
    q: (params.get("q") ?? "").trim().slice(0, LIMITS.q),
    topics: uniq(params.getAll("topic")),
    tags: uniq(params.getAll("tag")),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function toSearchString(query: Query): string {
  const p = new URLSearchParams();
  if (query.q) p.set("q", query.q);
  for (const t of query.topics) p.append("topic", t);
  for (const t of query.tags) p.append("tag", t);
  if (query.page > 1) p.set("page", String(query.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

const norm = (s: string) => s.normalize("NFKC").toLowerCase();

export function searchArticles(index: ArticleMeta[], query: Query) {
  const needle = norm(query.q);
  const matched = index
    .filter(
      (a) =>
        norm(a.title).includes(needle) &&
        query.topics.every((t) => a.topics.includes(t)) &&
        query.tags.every((t) => a.tags.includes(t)),
    )
    .sort(byNewest);
  const pageCount = Math.max(1, Math.ceil(matched.length / LIMITS.pageSize));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * LIMITS.pageSize;
  return { items: matched.slice(start, start + LIMITS.pageSize), total: matched.length, page, pageCount };
}
