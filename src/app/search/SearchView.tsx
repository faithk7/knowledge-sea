"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArticleCard } from "../../components/ArticleCard";
import { SearchForm } from "../../components/SearchForm";
import type { ArticleMeta } from "../../lib/meta";
import { parseQuery, searchArticles, toSearchString } from "../../lib/search";

type Term = { id: string; label: string };

export function SearchView({
  index,
  topics,
  tags,
}: {
  index: ArticleMeta[];
  topics: Term[];
  tags: Term[];
}) {
  const params = useSearchParams();
  const query = parseQuery(new URLSearchParams(params.toString()));
  const { items, total, page, pageCount } = searchArticles(index, query);
  const labels = Object.fromEntries([...topics, ...tags].map((t) => [t.id, t.label]));
  const filtered = query.q || query.topics.length || query.tags.length;
  const href = (p: number) => `/search/${toSearchString({ ...query, page: p })}`;

  return (
    <>
      <SearchForm key={toSearchString({ ...query, page: 1 })} query={query} topics={topics} tags={tags} />
      <p role="status" aria-live="polite" className="status">
        共 {total} 篇{filtered ? "符合条件的文章" : "文章"}
        {filtered ? (
          <>
            {" "}
            · <Link href="/search/">清除所有条件</Link>
          </>
        ) : null}
      </p>
      {items.length === 0 ? (
        <p>没有找到符合条件的文章，请减少关键词或取消部分筛选。</p>
      ) : (
        <div className="list">
          {items.map((a) => (
            <ArticleCard key={a.slug} article={a} labels={labels} />
          ))}
        </div>
      )}
      {pageCount > 1 && (
        <nav aria-label="分页" className="pager">
          {page > 1 ? <Link href={href(page - 1)} rel="prev">上一页</Link> : <span aria-hidden="true" />}
          <span>
            第 {page} / {pageCount} 页
          </span>
          {page < pageCount ? <Link href={href(page + 1)} rel="next">下一页</Link> : <span aria-hidden="true" />}
        </nav>
      )}
    </>
  );
}
