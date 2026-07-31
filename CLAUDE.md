# Claude 开发指南

## 项目概述

这是一个面向微信读书的 Chrome/Firefox 扩展（Manifest V3），提供以下功能：
- 护眼色主题切换（绿色/橙色/暗色/白色）
- 解除右键限制（恢复浏览器右键上下文菜单）

## 命令

```bash
# 代码检查
npm run lint        # 检查 ESLint 问题
npm run lint-fix    # 自动修复 ESLint 问题

# 构建
npm run build-dev   # 开发构建（输出到 dist/）
npm run build       # 生产构建

# 测试
npm run test:e2e    # Playwright e2e（bundled Chromium；需先在 ~/.wereader-e2e-profile 用同款 Chromium 登录微信读书一次）
```

## 架构

### 扩展入口

- `src/content.ts` — 内容脚本，注入到 `weread.qq.com/web/reader/*`，初始化主题和右键模块

### 内容脚本模块

- `src/content/modules/content-theme.ts` — 主题切换（护眼色/橙色/暗色/白色）
- `src/content/modules/content-rightClick.ts` — 解除右键限制
- `src/content/modules/content-markdown.ts` — DOM/XHTML → Markdown 纯转换（防御式遍历；支持 weread 的 `<span class="bold">` 等）
- `src/content/modules/content-copy.ts` — 复制本章按钮：从 content-hook 捕获的章节 XHTML 分片拼装 → DOMParser → Markdown → 剪贴板 + toast
- `src/content/modules/content-hook.ts` — **主世界（`world:"MAIN"`）document_start 注入**，hook `fetch`/`XMLHttpRequest`，被动捕获 weread 已签名的 `/web/book/chapter/e_{N}` 响应（weread 正文被反爬降级成 canvas，DOM 无文本，只能从阅读器自身的章节接口响应里截）。解码后写入 `#__weread_chapter_data` DOM 元素供 content-copy 读取
- `src/content/modules/content-utils.ts` — CSS 加载工具（loadCSS/unloadCSS）

### 复制本章的实现要点

- weread 对自动化浏览器把正文渲染成 `<canvas>`（DOM 无可选取文本），且 `--load-extension` 在稳定版 Chrome 151+ 的 Playwright CDP 下被拒。故 e2e 用 **bundled Chromium**（无 `channel`）。
- 章节正文经 content-hook 被动捕获（XHR，签名由 weread 自身完成，扩展不伪造）；响应是 `33 位前缀 + base64(章节 XHTML)`，解码后 `domToMarkdown` 转 Markdown。
- 本书有字体加密：少量字符在响应里是无效 UTF-8 字节（≈0.5%），解码成 U+FFFD，属已知限制。

### CSS

- `src/content/static/css/theme/` — 主题样式表（green, orange, dark, white）
- `src/content/static/css/common.css` — 通用样式
- `src/content/static/css/content-theme-switch.css` — 主题切换 UI 样式
- `src/content/static/css/content-copy.css` — 复制本章按钮样式
- `src/content/static/css/readerControls.css` — 阅读控制栏样式

### 构建系统

- **Webpack 5** + ts-loader + babel-loader 处理 TypeScript
- 输出到 `dist/` 目录

## 代码风格

- TypeScript strict 模式
- ESLint 继承 `airbnb-base/legacy` + TypeScript 支持
- 4 空格缩进
- 不使用分号
- 全局变量：`chrome` 和 `JQuery` 为 readonly

## 代码修改后的必要检查

修改代码后请执行：

```bash
npm run lint        # ESLint 检查
npm run build-dev   # 构建验证
```

确保 ESLint 无错误且构建成功后再提交。
