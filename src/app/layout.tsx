import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { INDEXING_ENABLED } from "../lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Knowledge Sea", template: "%s · Knowledge Sea" },
  description: "围绕开源软件与编程 Agent 的精选阅读网站",
  robots: INDEXING_ENABLED ? undefined : { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <a href="#main" className="skip">跳到正文</a>
        <header className="site">
          <Link href="/" className="brand">Knowledge Sea</Link>
          <nav aria-label="主导航">
            <Link href="/">首页</Link>
            <Link href="/search/">文章库</Link>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="site">Knowledge Sea · 开源软件与编程 Agent 精选阅读</footer>
      </body>
    </html>
  );
}
