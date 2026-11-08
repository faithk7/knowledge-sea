import { describe, expect, it } from "vitest";
import type { ArticleMeta } from "../src/lib/meta";
import { featured, relatedTo } from "../src/lib/recommend";
import { LIMITS, parseQuery, searchArticles, toSearchString } from "../src/lib/search";

const a = (slug: string, o: Partial<ArticleMeta> = {}): ArticleMeta => ({
  slug,
  title: slug,
  summary: "",
  topics: [],
  tags: [],
  language: "zh",
  publishedAt: "2026-01-01T00:00:00.000Z",
  recommended: false,
  related: [],
  ...o,
});

const q = (s: string) => parseQuery(new URLSearchParams(s));

describe("search", () => {
  const index = [
    a("kimi", { title: "Kimi Code 入门", topics: ["kimi-code"], tags: ["setup", "agent"] }),
    a("codex", { title: "Codex 评审工作流", topics: ["codex"], tags: ["agent"], publishedAt: "2026-02-01T00:00:00.000Z" }),
    a("zh-only", { title: "代理配置", tags: ["setup"] }),
  ];

  it("matches title substrings case-insensitively, including Chinese without spaces", () => {
    expect(searchArticles(index, q("q=%20KIMI%20")).items.map((x) => x.slug)).toEqual(["kimi"]);
    expect(searchArticles(index, q("q=" + encodeURIComponent("评审"))).items.map((x) => x.slug)).toEqual(["codex"]);
  });

  it("ANDs query, topics and tags", () => {
    expect(searchArticles(index, q("tag=setup&tag=agent")).items.map((x) => x.slug)).toEqual(["kimi"]);
    expect(searchArticles(index, q("tag=agent&topic=codex")).items.map((x) => x.slug)).toEqual(["codex"]);
    expect(searchArticles(index, q("tag=agent&topic=codex&q=kimi")).total).toBe(0);
  });

  it("sorts newest first with slug tie-break", () => {
    const r = searchArticles([a("b"), a("a"), a("c", { publishedAt: "2026-03-01T00:00:00.000Z" })], q(""));
    expect(r.items.map((x) => x.slug)).toEqual(["c", "a", "b"]);
  });

  it("limits query length and term count, and clamps pages", () => {
    const parsed = q(`q=${"x".repeat(200)}&tag=1&tag=2&tag=3&tag=4&tag=5&tag=6&page=abc`);
    expect(parsed.q).toHaveLength(LIMITS.q);
    expect(parsed.tags).toHaveLength(LIMITS.terms);
    expect(parsed.page).toBe(1);
    const many = Array.from({ length: 45 }, (_, i) => a(`s${String(i).padStart(2, "0")}`));
    const r = searchArticles(many, q("page=99"));
    expect(r.pageCount).toBe(3);
    expect(r.page).toBe(3);
    expect(r.items).toHaveLength(5);
  });

  it("round-trips the query through the URL", () => {
    const query = q("q=%E4%B8%AD+%26&topic=a&tag=b&tag=c&page=2");
    expect(parseQuery(new URLSearchParams(toSearchString(query)))).toEqual(query);
  });
});

describe("recommendations", () => {
  it("puts recommended articles first, then fills with newest, max 6", () => {
    const index = [
      a("old-pick", { recommended: true, publishedAt: "2025-01-01T00:00:00.000Z" }),
      ...Array.from({ length: 8 }, (_, i) => a(`n${i}`, { publishedAt: `2026-02-0${i + 1}T00:00:00.000Z` })),
    ];
    const r = featured(index).map((x) => x.slug);
    expect(r).toHaveLength(6);
    expect(r[0]).toBe("old-pick");
    expect(r[1]).toBe("n7");
  });

  it("uses explicit related first, then shared terms by overlap and recency, excluding self and duplicates", () => {
    const self = a("self", { topics: ["t"], tags: ["x", "y"], related: ["manual", "manual", "self", "ghost"] });
    const index = [
      self,
      a("manual"),
      a("two", { topics: ["t"], tags: ["x"], publishedAt: "2026-01-01T00:00:00.000Z" }),
      a("one-new", { tags: ["x"], publishedAt: "2026-05-01T00:00:00.000Z" }),
      a("one-old", { tags: ["y"], publishedAt: "2026-02-01T00:00:00.000Z" }),
      a("none"),
    ];
    expect(relatedTo(self, index).map((x) => x.slug)).toEqual(["manual", "two", "one-new", "one-old"]);
  });
});
