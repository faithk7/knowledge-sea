import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadContent } from "../src/lib/content/load";

let root: string;

const file = (path: string, content: string) => {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
};

const article = (slug: string, extra = "", body = "正文", fm: Record<string, string> = {}) => {
  const base: Record<string, string> = {
    slug,
    title: `标题 ${slug}`,
    summary: "摘要",
    topics: "[agents]",
    language: "zh",
    status: "published",
    access: "free",
    published_at: "2026-09-15",
    ...fm,
  };
  const head = Object.entries(base).map(([k, v]) => `${k}: ${v}`).join("\n");
  file(`content/articles/${slug}/index.md`, `---\n${head}\n${extra}\n---\n\n${body}\n`);
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ks-"));
  file("content/taxonomy.yml", "topics:\n  - {id: agents, label: Agent}\ntags:\n  - {id: setup, label: 安装}\n");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const errorsOf = async () => (await loadContent(root)).errors.join("\n");

describe("loadContent", () => {
  it("publishes free articles and renders markdown", async () => {
    article("a", "tags: [setup]", "# 标题\n\n段落 **加粗**");
    const c = await loadContent(root);
    expect(c.errors).toEqual([]);
    expect(c.articles).toHaveLength(1);
    expect(c.articles[0]!.html).toContain("<strong>加粗</strong>");
    expect(c.articles[0]!.html).not.toContain("<h1");
  });

  it("keeps drafts, archived and their assets out of the public result", async () => {
    article("pub");
    article("draft", "", "![x](./assets/d.svg)", { status: "draft" });
    article("old", "", "正文", { status: "archived" });
    file("content/articles/draft/assets/d.svg", "<svg xmlns='http://www.w3.org/2000/svg'/>");
    const c = await loadContent(root);
    expect(c.errors).toEqual([]);
    expect(c.articles.map((a) => a.slug)).toEqual(["pub"]);
    expect(c.assets).toEqual([]);
    expect(c.unpublishedCount).toBe(2);
  });

  it("copies and rewrites assets referenced by published articles", async () => {
    article("a", "", "![图](./assets/p.png)");
    file("content/articles/a/assets/p.png", "png-bytes");
    const c = await loadContent(root);
    expect(c.errors).toEqual([]);
    expect(c.assets).toHaveLength(1);
    expect(c.articles[0]!.html).toContain(`/media/${c.assets[0]!.name}`);
  });

  it("rejects paid, missing access, duplicate slug and missing published_at", async () => {
    article("paid", "", "x", { access: "paid" });
    article("noaccess", "", "x", { access: "" });
    article("nodate", "", "x", { published_at: "null" });
    file("content/articles/dup-dir/index.md", "---\nslug: nodate\ntitle: t\nsummary: s\ntopics: [agents]\nlanguage: zh\nstatus: draft\naccess: free\n---\n");
    const errors = await errorsOf();
    expect(errors).toContain("access: paid");
    expect(errors).toContain("noaccess");
    expect(errors).toContain("必须有 published_at");
    expect(errors).toContain("重复");
  });

  it("rejects invalid dates and unknown fields", async () => {
    article("a", "preview: standard", "x", { published_at: "2026-02-30" });
    const errors = await errorsOf();
    expect(errors).toContain("ISO 8601");
    expect(errors).toContain("preview");
  });

  it("rejects unknown terms and bad related", async () => {
    article("a", "tags: [nope]\nrelated: [ghost]", "x", { topics: "[zzz]" });
    const errors = await errorsOf();
    expect(errors).toContain("「nope」不在 taxonomy.yml");
    expect(errors).toContain("「zzz」不在 taxonomy.yml");
    expect(errors).toContain("related 中的文章「ghost」不存在");
  });

  it("rejects raw HTML and unsafe link protocols", async () => {
    article("a", "", '<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n[y](java&#x0A;script:alert(1))\n\n[z](data:text/html,hi)');
    const errors = await errorsOf();
    expect(errors).toContain("不允许原始 HTML");
    expect(errors.match(/不允许的链接协议/g)!.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects path traversal, symlink escape, missing and non-image assets", async () => {
    article("a", "", "![a](../../taxonomy.yml)\n\n![b](./assets/link.png)\n\n![c](./assets/none.png)\n\n![d](./assets/x.txt)\n\n![e](./assets/%2e%2e/index.md)");
    file("outside.png", "secret");
    file("content/articles/a/assets/x.txt", "t");
    symlinkSync(join(root, "outside.png"), join(root, "content/articles/a/assets/link.png"));
    const errors = await errorsOf();
    expect(errors).toContain("必须位于本文章的 assets/");
    expect(errors).toContain("资源文件不存在");
    expect(errors).toContain("仅支持图片");
    expect((errors.match(/必须位于本文章的 assets\//g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("rejects scripted SVG", async () => {
    article("a", "", "![a](./assets/bad.svg)");
    file("content/articles/a/assets/bad.svg", "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");
    expect(await errorsOf()).toContain("SVG 含脚本");
  });

  it("validates internal article links", async () => {
    article("a", "", "[ok](/articles/b/) [bad](/articles/ghost/) [other](/admin)");
    article("b");
    const errors = await errorsOf();
    expect(errors).toContain("文章 ghost 不存在或未发布");
    expect(errors).toContain("站内链接只支持");
    expect(errors).not.toContain("文章 b ");
  });

  it("rejects stray files and symlinked index.md", async () => {
    file("content/articles/loose.md", "x");
    file("content/real.md", "---\nslug: s\n---\n");
    mkdirSync(join(root, "content/articles/linked"), { recursive: true });
    symlinkSync(join(root, "content/real.md"), join(root, "content/articles/linked/index.md"));
    const errors = await errorsOf();
    expect(errors).toContain("loose.md");
    expect(errors).toContain("linked");
  });

  it("checks redirects", async () => {
    article("new");
    file("content/redirects.yml", "old: new\nnew: new\nghost-from: ghost\n");
    const errors = await errorsOf();
    expect(errors).toContain("new 仍是公开文章");
    expect(errors).toContain("ghost-from → ghost");
    expect(errors).not.toContain("old → new");
  });

  it("reports the real file line for body errors", async () => {
    article("a", "", "第一行\n\n<b>x</b>");
    expect(await errorsOf()).toMatch(/第 1[0-9] 行/);
  });
});
