# 扩展精简设计文档

日期：2026-05-09

## 目标

将 wereader 扩展精简为两个核心功能：
1. **护眼色主题** — 切换绿色/橙色/暗色/白色阅读主题
2. **解除右键限制** — 恢复浏览器右键上下文菜单

移除所有其他功能。

## 方案

**方案 A：精简现有代码库**（已选定）

删除所有不需要的代码，只保留服务于两个核心功能的模块。简化剩余模块，移除对已删除代码的依赖。

## Content 脚本变更

### 保留

| 文件 | 处理方式 |
|------|---------|
| `content.ts` | 重写入口，只初始化 theme 和 rightClick |
| `content-theme.ts` | 完整保留（护眼色/橙色/暗色/白色切换） |
| `content-rightClick.ts` | 精简：只保留 contextmenu 事件拦截，移除 jQuery、mouseMoveTarget 和 chrome.runtime.onMessage 监听 |
| `content-utils.ts` | 精简：只保留 `loadCSS`、`unloadCSS`；移除 `copy`、`mySweetAlert`、`simulateClick`、`sleep` |
| `content/static/css/theme/` | 保留所有主题 CSS 文件（green.css, green-two.css, orange.css, orange-two.css, dark.css, white.css） |
| `content/static/css/common.css` | 保留 |
| `content/static/css/content-theme-switch.css` | 保留 |
| `content/static/css/readerControls.css` | 保留 |

### 移除（全部删除的 content 模块）

`content-alert`、`content-confirm`、`content-copy`、`content-deleteBookmarks`、`content-getChapters`、`content-hide`、`content-key-ctrl`、`content-key-esc`、`content-keyBind`、`content-markedData`、`content-mask`、`content-mousemove`、`content-notesMenu`、`content-scroll-bar`、`content-searchNote`、`content-select-action`、`content-thought-edit`、`content-wereader-api`、`fancybox`

同时移除关联 CSS：`notes-menu.css`、`fancybox.css`、`showScroll.css`、`content-hideScroll.css`、`rankChapter.css`

### 重写后的 `content.ts`

```ts
import './content/static/css/readerControls.css'
import './content/static/css/content-theme-switch.css'
import './content/static/css/common.css'

import { initTheme } from './content/modules/content-theme'
import { initRightClick } from './content/modules/content-rightClick'

initTheme()
initRightClick()
```

### 精简后的 `content-rightClick.ts`

移除 jQuery 依赖、mouseMoveTarget 导入和 chrome.runtime.onMessage 监听，只保留核心的 contextmenu 事件拦截：

```ts
function initRightClick() {
    console.log('initRightClick')
    window.addEventListener('contextmenu', function (e) {
        e.stopImmediatePropagation()
    }, true)
}

export { initRightClick }
```

## 页面入口 — 全部移除

| 入口 | 目录/文件 | 操作 |
|------|----------|------|
| popup | `src/popup/` | 全部删除 |
| options | `src/options/` | 全部删除 |
| statistics | `src/statistics/` | 全部删除 |
| 公众号页 | `src/mpwx/` | 全部删除 |
| offscreen | `src/offscreen/` | 全部删除 |
| sandbox | `src/sandbox/` | 全部删除 |
| service worker | `src/worker.ts` + `src/worker/` | 全部删除 |

## Webpack 配置变更

`webpack.config.base.js` 变更：
- **entry**：只保留 `content`
- **移除所有 HTMLWebpackPlugin 实例**（popup、statistics、mp、options、offscreen、sandbox）
- **CopyPlugin**：移除 popup/options/statistics 相关的复制规则，保留 `manifest.json` 和 `extension-icons`
- **移除 `string-replace-loader` 规则**（不再需要 worker-vars.ts）

## manifest.json 精简

- 移除 `background` 字段（无 service worker）
- 移除 `options_page`
- 移除 `action.default_popup`
- 权限：只保留 `storage` + `weread.qq.com` 的 `host_permissions`
- `content_scripts`：只保留 content.js 注入

## common 目录

- `constants.ts` — 精简，只保留 rightClick 所需的常量（可能为空则删除）
- `sender.ts` — 删除（不再需要消息传递）
- `renderer.ts` — 删除
- `logger.ts` — 评估后删除
- `is.ts` — 评估后删除
- `utils.ts` — 精简，只保留被使用的部分

## NPM 依赖

**移除：**
- `react`、`react-dom` — popup 已删除
- `sweetalert2` — theme 中的错误处理改为 console.error
- `lodash` — searchNote 已删除
- `jquery-mousewheel` — fancybox 已删除
- 其他仅被已删除模块使用的依赖

**保留：**
- `jquery` — content-theme 使用
- `arrive` — content-theme 的 DOM 观察使用
- webpack 工具链（webpack、ts-loader、babel-loader、postcss、less-loader 等）
- TypeScript 工具链

## 最终项目结构

```
src/
├── content.ts
├── content/
│   ├── modules/
│   │   ├── content-theme.ts
│   │   ├── content-rightClick.ts
│   │   └── content-utils.ts
│   └── static/css/
│       ├── common.css
│       ├── content-theme-switch.css
│       ├── readerControls.css
│       └── theme/
│           ├── green.css
│           ├── green-two.css
│           ├── orange.css
│           ├── orange-two.css
│           ├── dark.css
│           └── white.css
├── common/
│   └── constants.ts（精简后）
public/
├── manifest.json（精简后）
└── extension-icons/
webpack/
└── webpack.config.base.js（精简后）
```
