import type { Query } from "../lib/search";

type Term = { id: string; label: string };

export function SearchForm({
  query,
  topics,
  tags,
}: {
  query?: Query;
  topics?: Term[];
  tags?: Term[];
}) {
  const group = (name: "topic" | "tag", legend: string, terms: Term[] = [], picked: string[] = []) =>
    terms.length > 0 && (
      <fieldset>
        <legend>{legend}</legend>
        {terms.map((t) => (
          <label key={t.id} className="check">
            <input type="checkbox" name={name} value={t.id} defaultChecked={picked.includes(t.id)} />
            {t.label}
          </label>
        ))}
      </fieldset>
    );

  return (
    <form action="/search/" method="get" role="search" className="search">
      <label htmlFor="q">按标题搜索</label>
      <div className="row">
        <input id="q" name="q" type="search" maxLength={80} defaultValue={query?.q ?? ""} placeholder="标题关键词，支持中英文" />
        <button type="submit">搜索</button>
      </div>
      {group("topic", "主题", topics, query?.topics)}
      {group("tag", "标签", tags, query?.tags)}
      {(topics?.length || tags?.length) ? (
        <p className="hint">标题关键词、主题和标签同时选择时，文章须全部满足（AND）。</p>
      ) : null}
    </form>
  );
}
