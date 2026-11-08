import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadContent } from "../src/lib/content/load";

const content = await loadContent();

if (content.errors.length > 0) {
  console.error(`内容校验失败（${content.errors.length} 个问题），已中止构建，上一版网站保持不变：\n`);
  for (const e of content.errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

const mediaDir = join(process.cwd(), "public", "media");
rmSync(mediaDir, { recursive: true, force: true });
mkdirSync(mediaDir, { recursive: true });
for (const a of content.assets) copyFileSync(a.src, join(mediaDir, a.name));

console.log(`内容校验通过：${content.articles.length} 篇公开文章，${content.assets.length} 个资源。`);
