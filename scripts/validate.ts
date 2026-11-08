import { loadContent } from "../src/lib/content/load";

const content = await loadContent();

if (content.errors.length > 0) {
  console.error(`内容校验失败（${content.errors.length} 个问题），不会发布：\n`);
  for (const e of content.errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(
  `内容校验通过：${content.articles.length} 篇公开发布，${content.unpublishedCount} 篇草稿／已归档不会发布。`,
);
