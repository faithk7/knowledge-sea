import Link from "next/link";
import { formatDate } from "../lib/format";
import type { ArticleMeta } from "../lib/meta";

export function ArticleCard({
  article,
  labels,
}: {
  article: ArticleMeta;
  labels: Record<string, string>;
}) {
  const terms = [
    ...article.topics.map((id) => ({ id, param: "topic" })),
    ...article.tags.map((id) => ({ id, param: "tag" })),
  ];
  return (
    <article className="card" lang={article.language === "zh" ? "zh-CN" : "en"}>
      <h3>
        <Link href={`/articles/${article.slug}/`}>{article.title}</Link>
      </h3>
      <p>{article.summary}</p>
      <div className="meta">
        <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
        {terms.length > 0 && (
          <ul className="chips" aria-label="主题与标签">
            {terms.map((t) => (
              <li key={`${t.param}:${t.id}`}>
                <Link href={`/search/?${t.param}=${encodeURIComponent(t.id)}`}>
                  {labels[t.id] ?? t.id}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
