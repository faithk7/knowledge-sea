import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { Root } from "mdast";

export type Asset = { src: string; name: string };

export type RenderContext = {
  articleDir: string;
  /** 正文起始行在文件中的偏移，用于报告真实行号 */
  lineOffset: number;
  articleSlugs: Set<string>;
  errors: string[];
  assets: Asset[];
};

const IMAGE_TYPES = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);
const SAFE_SCHEMES = new Set(["http", "https", "mailto"]);
const SVG_UNSAFE = /<script|<foreignObject|\son[a-z]+\s*=|javascript:|<iframe|<embed|<object/i;

function resolveAsset(rawUrl: string, ctx: RenderContext): Asset | string {
  let rel: string;
  try {
    rel = decodeURIComponent(rawUrl.split(/[?#]/)[0]!);
  } catch {
    return "资源路径编码无效";
  }
  if (rel.includes("\\") || rel.includes("\0")) return "资源路径含非法字符";

  let assetsRoot: string;
  try {
    assetsRoot = realpathSync(resolve(ctx.articleDir, "assets"));
  } catch {
    return "文章目录下没有 assets/ 目录";
  }
  let real: string;
  try {
    real = realpathSync(resolve(ctx.articleDir, rel));
  } catch {
    return "资源文件不存在";
  }
  if (!real.startsWith(assetsRoot + sep)) return "资源必须位于本文章的 assets/ 目录内";
  if (!statSync(real).isFile()) return "资源不是普通文件";
  const ext = extname(real).toLowerCase();
  if (!IMAGE_TYPES.has(ext)) return `不支持的资源类型 ${ext || "(无扩展名)"}，仅支持图片`;

  const data = readFileSync(real);
  if (ext === ".svg" && SVG_UNSAFE.test(data.toString("utf8"))) {
    return "SVG 含脚本或外部嵌入，不允许发布";
  }
  const name = `${createHash("sha256").update(data).digest("hex").slice(0, 32)}${ext}`;
  return { src: real, name };
}

type UrlCheck = "ok" | "asset" | { error: string };

function checkUrl(url: string, isImage: boolean, ctx: RenderContext): UrlCheck {
  // 去掉空白和控制字符后再判断协议，防止 "java\nscript:" 之类的绕过
  const compact = url.replace(/[\u0000- \u007f]/g, "");
  if (compact.startsWith("#")) return "ok";
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(compact)?.[1]?.toLowerCase();
  if (scheme) {
    if (!SAFE_SCHEMES.has(scheme)) return { error: `不允许的链接协议 ${scheme}:` };
    return isImage && scheme === "mailto" ? { error: "图片不能使用 mailto:" } : "ok";
  }
  if (compact.startsWith("//")) return { error: "不允许协议相对链接" };
  if (compact.startsWith("/")) {
    const slug = /^\/articles\/([^/?#]+)\/?(?:[?#].*)?$/.exec(compact)?.[1];
    if (isImage || !slug) return { error: "站内链接只支持 /articles/<slug>/" };
    return ctx.articleSlugs.has(slug) ? "ok" : { error: `链接的文章 ${slug} 不存在或未发布` };
  }
  return "asset";
}

function transform(ctx: RenderContext) {
  return (tree: Root) => {
    const first = tree.children[0];
    if (first?.type === "heading" && first.depth === 1) tree.children.shift();

    const at = (n: { position?: { start: { line: number } } }) =>
      `第 ${(n.position?.start.line ?? 1) + ctx.lineOffset} 行`;

    visit(tree, (node) => {
      if (node.type === "html") {
        ctx.errors.push(`${at(node)}：不允许原始 HTML（含 HTML 注释），请改用 Markdown 语法`);
        return;
      }
      if (node.type !== "link" && node.type !== "image" && node.type !== "definition") return;
      const isImage = node.type === "image";
      const check = checkUrl(node.url, isImage, ctx);
      if (typeof check === "object") {
        ctx.errors.push(`${at(node)}：${check.error}（${node.url}）`);
      } else if (check === "asset") {
        const asset = resolveAsset(node.url, ctx);
        if (typeof asset === "string") {
          ctx.errors.push(`${at(node)}：${asset}（${node.url}）`);
        } else {
          ctx.assets.push(asset);
          node.url = `/media/${asset.name}`;
        }
      }
    });
  };
}

export async function renderMarkdown(body: string, ctx: RenderContext): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(() => transform(ctx))
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(body);
  return String(file);
}
