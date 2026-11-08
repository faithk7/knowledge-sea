---
slug: kimi-code-getting-started
title: 示例：Kimi Code 入门
summary: 示例文章。演示安装配置说明与第一个实用工作流，可替换为真实内容。
topics: [kimi-code]
tags: [setup, coding-agent]
language: zh
status: published
access: free
published_at: 2026-09-15
updated_at: 2026-09-16
recommended: true
related: [codex-review-workflow]
---

# 示例：Kimi Code 入门

这是一篇示例文章，用来演示站点的渲染效果。发布真实内容前请删除或改写它。

## 工作流概览

![编写、校验、发布三个步骤的示意图](./assets/workflow.svg)

1. 在 `content/articles/` 下新建目录，写 `index.md`。
2. 运行 `pnpm validate` 检查元数据与资源。
3. 构建并部署。

## 代码与表格

```bash
pnpm validate
pnpm build
```

| 命令 | 作用 |
| --- | --- |
| `pnpm validate` | 只做内容校验 |
| `pnpm build` | 校验并生成静态站点 |

延伸阅读：[Codex 评审工作流](/articles/codex-review-workflow/)。
