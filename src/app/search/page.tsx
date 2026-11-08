import type { Metadata } from "next";
import { Suspense } from "react";
import { toMeta } from "../../lib/meta";
import { getSite } from "../../lib/site";
import { SearchView } from "./SearchView";

export const metadata: Metadata = { title: "文章库" };

export default async function SearchPage() {
  const { articles, taxonomy } = await getSite();
  const index = articles.map(toMeta);
  const used = (key: "topics" | "tags") => new Set(index.flatMap((a) => a[key]));
  const usedTopics = used("topics");
  const usedTags = used("tags");

  return (
    <>
      <h1>文章库</h1>
      <noscript>
        <p>搜索与筛选需要启用 JavaScript。你也可以从首页浏览最新文章。</p>
      </noscript>
      <Suspense fallback={<p>加载中…</p>}>
        <SearchView
          index={index}
          topics={taxonomy.topics.filter((t) => usedTopics.has(t.id))}
          tags={taxonomy.tags.filter((t) => usedTags.has(t.id))}
        />
      </Suspense>
    </>
  );
}
