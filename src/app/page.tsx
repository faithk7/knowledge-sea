import Link from "next/link";
import { ArticleCard } from "../components/ArticleCard";
import { SearchForm } from "../components/SearchForm";
import { toMeta } from "../lib/meta";
import { featured } from "../lib/recommend";
import { getSite, labelMap } from "../lib/site";

const LATEST_LIMIT = 10;

export default async function HomePage() {
  const { articles, taxonomy } = await getSite();
  const index = articles.map(toMeta);
  const labels = labelMap([taxonomy.topics, taxonomy.tags]);
  const picks = featured(index);
  const picked = new Set(picks.map((a) => a.slug));
  const latest = index.filter((a) => !picked.has(a.slug)).slice(0, LATEST_LIMIT);

  return (
    <>
      <h1>围绕开源软件与编程 Agent 的精选阅读</h1>
      <SearchForm />
      <p>
        <Link href="/search/">按主题和标签筛选，或浏览全部文章</Link>
      </p>

      {index.length === 0 ? (
        <p>暂时还没有已发布的文章。</p>
      ) : (
        <>
          <section aria-labelledby="featured">
            <h2 id="featured">精选</h2>
            <div className="list">
              {picks.map((a) => (
                <ArticleCard key={a.slug} article={a} labels={labels} />
              ))}
            </div>
          </section>
          {latest.length > 0 && (
            <section aria-labelledby="latest">
              <h2 id="latest">最新文章</h2>
              <div className="list">
                {latest.map((a) => (
                  <ArticleCard key={a.slug} article={a} labels={labels} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
