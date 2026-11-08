import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1>找不到这个页面</h1>
      <p>
        文章可能尚未发布或已下线。<Link href="/search/">浏览全部文章</Link>
      </p>
    </>
  );
}
