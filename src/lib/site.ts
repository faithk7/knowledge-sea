import { type Content, loadContent } from "./content/load";

export const INDEXING_ENABLED = process.env.PUBLIC_INDEXING === "true";

let memo: Promise<Content> | undefined;

async function loadOrThrow(): Promise<Content> {
  const content = await loadContent();
  if (content.errors.length > 0) {
    throw new Error(`内容校验失败：\n${content.errors.map((e) => `  ✗ ${e}`).join("\n")}`);
  }
  return content;
}

/** 开发模式下每次重新读取，方便边写边看；构建时只读一次 */
export function getSite(): Promise<Content> {
  if (process.env.NODE_ENV !== "production") return loadOrThrow();
  return (memo ??= loadOrThrow());
}

export type Term = { id: string; label: string };

export function labelMap(terms: Term[][]): Record<string, string> {
  return Object.fromEntries(terms.flat().map((t) => [t.id, t.label]));
}
