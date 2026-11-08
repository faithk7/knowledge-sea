import { z } from "zod";

export const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const DATE_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;

/** 严格解析 ISO 8601（日期或带时区的时间），返回 UTC ISO 字符串；非法返回 null。 */
export function parseIsoDate(value: string): string | null {
  const m = DATE_RE.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4] ?? "0", m[5] ?? "0", m[6] ?? "0"].map(
    Number,
  ) as [number, number, number, number, number, number];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
  if (h > 23 || mi > 59 || s > 59) return null;
  const date = new Date(m[7] ? value : `${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const id = z.string().regex(ID_RE, "只能使用小写字母、数字和连字符（如 coding-agent）");
const isoDate = z
  .string()
  .refine((v) => parseIsoDate(v) !== null, "必须是有效的 ISO 8601 日期（如 2026-09-15）")
  .transform((v) => parseIsoDate(v)!);
const idList = (max: number) =>
  z
    .array(id)
    .max(max)
    .refine((a) => new Set(a).size === a.length, "不能包含重复项");

export const frontMatterSchema = z
  .object({
    slug: id.max(80),
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().min(1).max(300),
    topics: idList(8).refine((a) => a.length > 0, "至少需要一个主题"),
    tags: idList(8).default([]),
    language: z.enum(["zh", "en"]),
    status: z.enum(["draft", "published", "archived"]),
    access: z.enum(["free", "paid"]),
    published_at: isoDate.nullable().optional(),
    updated_at: isoDate.nullable().optional(),
    recommended: z.boolean().default(false),
    related: idList(20).default([]),
  })
  .strict();

export type FrontMatter = z.infer<typeof frontMatterSchema>;

const term = z.object({ id, label: z.string().trim().min(1) }).strict();
export const taxonomySchema = z
  .object({ topics: z.array(term), tags: z.array(term) })
  .strict();
export type Taxonomy = z.infer<typeof taxonomySchema>;

export const redirectsSchema = z.record(id, id);
export type Redirects = z.infer<typeof redirectsSchema>;

export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.join(".") || "(根)"}：${i.message}`);
}
