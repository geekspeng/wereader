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
npm run test:e2e    # Playwright e2e（需登录态持久 profile）
```

## 架构

### 扩展入口

- `src/content.ts` — 内容脚本，注入到 `weread.qq.com/web/reader/*`，初始化主题和右键模块

### 内容脚本模块

- `src/content/modules/content-theme.ts` — 主题切换（护眼色/橙色/暗色/白色）
- `src/content/modules/content-rightClick.ts` — 解除右键限制
- `src/content/modules/content-markdown.ts` — DOM → Markdown 纯转换
- `src/content/modules/content-copy.ts` — 复制本章按钮与剪贴板
- `src/content/modules/content-utils.ts` — CSS 加载工具（loadCSS/unloadCSS）

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
