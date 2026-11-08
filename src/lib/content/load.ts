import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { type ArticleMeta, byNewest } from "../meta";
import { type Asset, renderMarkdown } from "./markdown";
import {
  type FrontMatter,
  type Redirects,
  type Taxonomy,
  formatIssues,
  frontMatterSchema,
  redirectsSchema,
  taxonomySchema,
} from "./schema";

export type Article = ArticleMeta & {
  updatedAt: string | null;
  html: string;
};

export type Content = {
  /** 仅含公开发布的文章，按发布时间降序、slug 升序 */
  articles: Article[];
  taxonomy: Taxonomy;
  redirects: Redirects;
  /** 公开文章实际引用的资源，需要复制到 public/media/ */
  assets: Asset[];
  /** 非公开文章数量（草稿、已归档），仅用于校验报告 */
  unpublishedCount: number;
  errors: string[];
};

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;

function readYaml(path: string, errors: string[], optional = false): unknown {
  if (!existsSync(path)) {
    if (!optional) errors.push(`${path}：文件不存在`);
    return undefined;
  }
  try {
    return parseYaml(readFileSync(path, "utf8"));
  } catch (e) {
    errors.push(`${path}：YAML 解析失败：${(e as Error).message}`);
    return undefined;
  }
}

function parseWith<T>(schema: z.ZodType<T>, data: unknown, where: string, errors: string[]) {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  for (const msg of formatIssues(r.error)) errors.push(`${where}：${msg}`);
  return undefined;
}

type Parsed = { fm: FrontMatter; dir: string; file: string; body: string; lineOffset: number };

function readArticles(articlesDir: string, errors: string[]): Parsed[] {
  if (!existsSync(articlesDir)) {
    errors.push(`${articlesDir}：目录不存在`);
    return [];
  }
  const parsed: Parsed[] = [];
  for (const entry of readdirSync(articlesDir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const dir = join(articlesDir, entry.name);
    if (!entry.isDirectory()) {
      errors.push(`${dir}：文章必须放在 content/articles/<目录>/index.md，不支持单文件或符号链接`);
      continue;
    }
    const file = join(dir, "index.md");
    if (!existsSync(file) || !lstatSync(file).isFile()) {
      errors.push(`${dir}：缺少 index.md（不能是符号链接）`);
      continue;
    }
    const m = FRONT_MATTER.exec(readFileSync(file, "utf8").replace(/^﻿/, ""));
    if (!m) {
      errors.push(`${file}：缺少以 --- 包围的头部元数据`);
      continue;
    }
    let raw: unknown;
    try {
      raw = parseYaml(m[1]!);
    } catch (e) {
      errors.push(`${file}：头部元数据 YAML 解析失败：${(e as Error).message}`);
      continue;
    }
    const fm = parseWith(frontMatterSchema, raw, file, errors);
    if (fm) {
      const lineOffset = m[1]!.split("\n").length + 2;
      parsed.push({ fm, dir, file, body: m[2] ?? "", lineOffset });
    }
  }
  return parsed;
}

export async function loadContent(root = process.cwd()): Promise<Content> {
  const errors: string[] = [];
  const contentDir = join(root, "content");

  const taxonomy = parseWith(
    taxonomySchema,
    readYaml(join(contentDir, "taxonomy.yml"), errors),
    "content/taxonomy.yml",
    errors,
  ) ?? { topics: [], tags: [] };
  const redirects =
    parseWith(
      redirectsSchema,
      readYaml(join(contentDir, "redirects.yml"), errors, true) ?? {},
      "content/redirects.yml",
      errors,
    ) ?? {};

  const topicIds = new Set(taxonomy.topics.map((t) => t.id));
  const tagIds = new Set(taxonomy.tags.map((t) => t.id));
  const seenTerms = new Set<string>();
  for (const t of [...taxonomy.topics, ...taxonomy.tags]) {
    if (seenTerms.has(t.id)) errors.push(`content/taxonomy.yml：id「${t.id}」重复（主题与标签的 id 不能相同）`);
    seenTerms.add(t.id);
  }

  const parsed = readArticles(join(contentDir, "articles"), errors);

  const bySlug = new Map<string, Parsed>();
  for (const p of parsed) {
    const dup = bySlug.get(p.fm.slug);
    if (dup) errors.push(`${p.file}：slug「${p.fm.slug}」与 ${dup.file} 重复`);
    else bySlug.set(p.fm.slug, p);
  }

  const publishing: Parsed[] = [];
  for (const p of parsed) {
    const { fm, file } = p;
    for (const t of fm.topics) if (!topicIds.has(t)) errors.push(`${file}：主题「${t}」不在 taxonomy.yml 中`);
    for (const t of fm.tags) if (!tagIds.has(t)) errors.push(`${file}：标签「${t}」不在 taxonomy.yml 中`);
    for (const r of fm.related) {
      if (r === fm.slug) errors.push(`${file}：related 不能包含自身`);
      else if (!bySlug.has(r)) errors.push(`${file}：related 中的文章「${r}」不存在`);
    }
    if (fm.status !== "published") continue;
    if (fm.access !== "free") {
      errors.push(`${file}：access: ${fm.access} 的文章不能发布（首版只发布 access: free，请改为 free 或设为 draft）`);
    } else if (!fm.published_at) {
      errors.push(`${file}：已发布文章必须有 published_at`);
    } else {
      publishing.push(p);
    }
  }

  const publicSlugs = new Set(publishing.map((p) => p.fm.slug));
  for (const [from, to] of Object.entries(redirects)) {
    if (publicSlugs.has(from)) errors.push(`content/redirects.yml：${from} 仍是公开文章，不能作为重定向来源`);
    if (!publicSlugs.has(to)) errors.push(`content/redirects.yml：${from} → ${to}，目标不是公开文章`);
  }

  const assets = new Map<string, Asset>();
  const articles: Article[] = [];
  for (const p of publishing) {
    const found: Asset[] = [];
    const before = errors.length;
    const html = await renderMarkdown(p.body, {
      articleDir: p.dir,
      lineOffset: p.lineOffset,
      articleSlugs: new Set([...publicSlugs, ...Object.keys(redirects)]),
      errors,
      assets: found,
    });
    for (let i = before; i < errors.length; i++) errors[i] = `${p.file}：${errors[i]}`;
    for (const a of found) assets.set(a.name, a);
    const { fm } = p;
    articles.push({
      slug: fm.slug,
      title: fm.title,
      summary: fm.summary,
      topics: fm.topics,
      tags: fm.tags,
      language: fm.language,
      publishedAt: fm.published_at!,
      updatedAt: fm.updated_at ?? null,
      recommended: fm.recommended,
      related: fm.related,
      html,
    });
  }
  articles.sort(byNewest);

  return {
    articles,
    taxonomy,
    redirects,
    assets: [...assets.values()],
    unpublishedCount: parsed.length - publishing.length,
    errors,
  };
}
