import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "../../../components/ArticleCard";
import { formatDate } from "../../../lib/format";
import { toMeta } from "../../../lib/meta";
import { relatedTo } from "../../../lib/recommend";
import { getSite, labelMap } from "../../../lib/site";

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { articles, redirects } = await getSite();
  return [...articles.map((a) => a.slug), ...Object.keys(redirects)].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { articles, redirects } = await getSite();
  if (slug in redirects) return { title: "页面已移动", robots: { index: false } };
  const article = articles.find((a) => a.slug === slug);
  return article ? { title: article.title, description: article.summary } : {};
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const { articles, redirects, taxonomy } = await getSite();

  const target = redirects[slug];
  if (target) {
    const to = `/articles/${target}/`;
    return (
      <>
        <meta httpEquiv="refresh" content={`0;url=${to}`} />
        <h1>页面已移动</h1>
        <p>
          这篇文章已移到 <Link href={to}>{to}</Link>。
        </p>
      </>
    );
  }

  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();

  const labels = labelMap([taxonomy.topics, taxonomy.tags]);
  const related = relatedTo(article, articles.map(toMeta));

  return (
    <>
      <article lang={article.language === "zh" ? "zh-CN" : "en"}>
        <header>
          <h1>{article.title}</h1>
          <p className="summary">{article.summary}</p>
          <p className="meta">
            <time dateTime={article.publishedAt}>发布于 {formatDate(article.publishedAt)}</time>
            {article.updatedAt && (
              <>
                {" · "}
                <time dateTime={article.updatedAt}>更新于 {formatDate(article.updatedAt)}</time>
              </>
            )}
          </p>
          <ul className="chips" aria-label="主题与标签">
            {[
              ...article.topics.map((id) => ["topic", id] as const),
              ...article.tags.map((id) => ["tag", id] as const),
            ].map(([param, id]) => (
              <li key={`${param}:${id}`}>
                <Link href={`/search/?${param}=${encodeURIComponent(id)}`}>{labels[id] ?? id}</Link>
              </li>
            ))}
          </ul>
        </header>
        <div className="prose" dangerouslySetInnerHTML={{ __html: article.html }} />
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related">
          <h2 id="related">相关阅读</h2>
          <div className="list">
            {related.map((a) => (
              <ArticleCard key={a.slug} article={a} labels={labels} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
