# Knowledge Sea

围绕开源软件与编程 Agent 的精选阅读网站。

当前首版只做公开 Markdown 文章的发布、阅读、搜索、标签筛选与推荐。账户、付费试读、兑换码、支付和管理员功能延后。

范围与验收以 [MVP.md](MVP.md) 为准。[原规格](spec.md)及[原计划](specs/001-oss-agent-reading-site/plan.md)保留为后续设计参考。

## 使用

需要 Node.js 22+ 和 pnpm。无需登录、支付或模型服务凭据。

```bash
pnpm install
pnpm validate   # 只校验内容，失败时列出所有问题
pnpm build      # 校验 + 生成静态站点到 out/（校验失败则不构建，out/ 保持上一版）
pnpm preview    # 在 http://localhost:4173 预览 out/（找不到的页面返回 404）
pnpm dev        # 本地开发，改动文章后需重启以刷新图片
pnpm test
```

## 写文章

每篇文章一个目录：`content/articles/<目录>/index.md`，图片放同目录 `assets/`，用相对路径引用。头部元数据：

```yaml
---
slug: kimi-code-getting-started   # 小写字母、数字、连字符，URL 为 /articles/<slug>/
title: 标题
summary: 摘要
topics: [kimi-code]               # 必填，须在 content/taxonomy.yml 中登记
tags: [setup]                     # 可选，同上，最多 8 个
language: zh                      # zh | en
status: published                 # draft | published | archived
access: free                      # 首版只发布 free；paid 会让校验失败
published_at: 2026-09-15          # published 必填，ISO 8601
updated_at: 2026-09-16            # 可选
recommended: false                # 首页精选
related: [other-slug]             # 可选，文章页相关阅读优先项
---
```

- 正文开头的 `# 一级标题` 会被省略（页面标题取自 `title`）。
- 不允许原始 HTML 和 `javascript:` 等链接协议；站内链接写 `/articles/<slug>/`，目标须已公开。
- 只有被公开文章引用的图片才会发布。草稿、已归档文章不进入构建产物，URL 返回 404。
- 公开文章改 slug 时，在 `content/redirects.yml` 添加 `旧slug: 新slug`。
- 默认 `noindex` 且 `robots.txt` 禁止收录；确定允许收录后，构建时设置 `PUBLIC_INDEXING=true`。

`content/` 下现有文章是示例，发布前请替换。部署方式尚未选定，构建产物是 `out/` 下的纯静态文件，部署和回退说明待托管方式确定后补充。

