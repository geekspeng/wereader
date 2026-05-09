# 扩展精简实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 wereader 扩展精简为只保留护眼色主题和解除右键限制两个核心功能。

**Architecture:** 删除所有不需要的模块、页面入口和依赖，只保留 content 脚本作为唯一入口。精简后的 content-theme.ts 和 content-rightClick.ts 不再依赖 sweetalert2、common/ 等外部模块。

**Tech Stack:** TypeScript、Webpack 5、jQuery、arrive.js

---

### Task 1: 精简 content-rightClick.ts

**Files:**
- Modify: `src/content/modules/content-rightClick.ts`

将文件重写为只保留 contextmenu 事件拦截，移除所有导入和多余逻辑。

- [ ] **Step 1: 重写 content-rightClick.ts**

将文件内容替换为：

```ts
function initRightClick() {
    console.log('initRightClick')
    window.addEventListener('contextmenu', function (e) {
        e.stopImmediatePropagation()
    }, true)
}

export { initRightClick }
```

- [ ] **Step 2: 提交**

```bash
git add src/content/modules/content-rightClick.ts
git commit -m "refactor: 精简 content-rightClick，只保留解除右键限制功能"
```

---

### Task 2: 精简 content-utils.ts

**Files:**
- Modify: `src/content/modules/content-utils.ts`

只保留 `loadCSS` 和 `unloadCSS`，移除 `copy`、`mySweetAlert`、`simulateClick`、`sleep`、`alertMsgType` 和 sweetalert2 依赖。

- [ ] **Step 1: 重写 content-utils.ts**

将文件内容替换为：

```ts
import $ from 'jquery'

function unloadCSS(elementId: string) {
    if (elementId && document.getElementById(elementId)) $('#' + elementId).remove()
}

/**
 * 通过 link 元素加载样式文件到网页
 * @param file 文件路径
 * @param elementId 设置给 link 元素的 id 值
 * @returns 返回插入后的元素
 */
function loadCSS(file: string, elementId?: string | undefined) {
    const filePath = chrome.runtime.getURL(file)
    const link = document.createElement('link')
    link.type = 'text/css'
    link.rel = 'stylesheet'
    link.href = filePath
    const extId = filePath.match(/(?<=\/\/)([^/]*)/)![0]!
    link.classList.add(extId)
    if (elementId) unloadCSS(elementId)
    if (elementId) link.id = elementId
    document.getElementsByTagName('head')[0].appendChild(link)
    return link
}

export {
    loadCSS,
    unloadCSS
}
```

- [ ] **Step 2: 提交**

```bash
git add src/content/modules/content-utils.ts
git commit -m "refactor: 精简 content-utils，只保留 loadCSS 和 unloadCSS"
```

---

### Task 3: 精简 content-theme.ts

**Files:**
- Modify: `src/content/modules/content-theme.ts`

移除 sweetalert2 依赖，将错误处理改为 `console.error`。

- [ ] **Step 1: 修改 content-theme.ts**

移除以下导入行：

```ts
import Swal from 'sweetalert2'
```

将 `addThemeBtn` 函数中 try/catch 块里的 Swal.fire 调用（约第 140-144 行）：

```ts
Swal.fire({
    title: 'Oops...', text: '似乎出了点问题，刷新一下试试吧~', icon: 'error', confirmButtonText: 'OK'
})
```

替换为：

```ts
console.error('主题切换出错：', error)
```

- [ ] **Step 2: 提交**

```bash
git add src/content/modules/content-theme.ts
git commit -m "refactor: 移除 content-theme 对 sweetalert2 的依赖"
```

---

### Task 4: 重写 content.ts 入口

**Files:**
- Modify: `src/content.ts`

重写入口文件，只初始化 theme 和 rightClick。

- [ ] **Step 1: 重写 content.ts**

将文件内容替换为：

```ts
import './content/static/css/readerControls.css'
import './content/static/css/content-theme-switch.css'
import './content/static/css/common.css'

import { initTheme } from './content/modules/content-theme'
import { initRightClick } from './content/modules/content-rightClick'

initTheme()
initRightClick()
```

- [ ] **Step 2: 提交**

```bash
git add src/content.ts
git commit -m "refactor: 重写 content 入口，只保留主题和右键功能"
```

---

### Task 5: 删除不需要的 content 模块

**Files:**
- Delete: `src/content/modules/content-alert.ts`
- Delete: `src/content/modules/content-confirm.ts`
- Delete: `src/content/modules/content-copy.ts`
- Delete: `src/content/modules/content-deleteBookmarks.ts`
- Delete: `src/content/modules/content-getChapters.ts`
- Delete: `src/content/modules/content-hide.ts`
- Delete: `src/content/modules/content-key-ctrl.ts`
- Delete: `src/content/modules/content-key-esc.ts`
- Delete: `src/content/modules/content-keyBind.ts`
- Delete: `src/content/modules/content-markedData.ts`
- Delete: `src/content/modules/content-mask.ts`
- Delete: `src/content/modules/content-mousemove.ts`
- Delete: `src/content/modules/content-notesMenu.ts`
- Delete: `src/content/modules/content-scroll-bar.ts`
- Delete: `src/content/modules/content-searchNote.ts`
- Delete: `src/content/modules/content-select-action.ts`
- Delete: `src/content/modules/content-thought-edit.ts`
- Delete: `src/content/modules/content-wereader-api.ts`
- Delete: `src/content/modules/fancybox.ts`
- Delete: `src/content/modules/__tests__/` 目录
- Delete: `src/content/types/` 目录（Code、Footnote、Img 类型，仅被 content-markedData 使用）

- [ ] **Step 1: 删除所有不需要的 content 模块文件**

```bash
rm src/content/modules/content-alert.ts \
   src/content/modules/content-confirm.ts \
   src/content/modules/content-copy.ts \
   src/content/modules/content-deleteBookmarks.ts \
   src/content/modules/content-getChapters.ts \
   src/content/modules/content-hide.ts \
   src/content/modules/content-key-ctrl.ts \
   src/content/modules/content-key-esc.ts \
   src/content/modules/content-keyBind.ts \
   src/content/modules/content-markedData.ts \
   src/content/modules/content-mask.ts \
   src/content/modules/content-mousemove.ts \
   src/content/modules/content-notesMenu.ts \
   src/content/modules/content-scroll-bar.ts \
   src/content/modules/content-searchNote.ts \
   src/content/modules/content-select-action.ts \
   src/content/modules/content-thought-edit.ts \
   src/content/modules/content-wereader-api.ts \
   src/content/modules/fancybox.ts
```

```bash
rm -rf src/content/modules/__tests__
rm -rf src/content/types
```

- [ ] **Step 2: 删除不需要的 CSS 文件**

```bash
rm src/content/static/css/notes-menu.css \
   src/content/static/css/fancybox.css \
   src/content/static/css/showScroll.css \
   src/content/static/css/content-hideScroll.css \
   src/content/static/css/rankChapter.css
```

- [ ] **Step 3: 提交**

```bash
git add -A src/content/
git commit -m "refactor: 删除不需要的 content 模块和 CSS 文件"
```

---

### Task 6: 删除页面入口目录

**Files:**
- Delete: `src/popup/` 目录
- Delete: `src/popup.ts`
- Delete: `src/options/` 目录
- Delete: `src/options.ts`
- Delete: `src/statistics/` 目录
- Delete: `src/mpwx/` 目录
- Delete: `src/offscreen/` 目录
- Delete: `src/offscreen.ts`
- Delete: `src/sandbox/` 目录
- Delete: `src/sandbox.ts`
- Delete: `src/worker.ts`
- Delete: `src/worker/` 目录
- Delete: `src/test/` 目录（测试 setup 和配置）

- [ ] **Step 1: 删除所有页面入口**

```bash
rm -rf src/popup/ src/popup.ts
rm -rf src/options/ src/options.ts
rm -rf src/statistics/
rm -rf src/mpwx/
rm -rf src/offscreen/ src/offscreen.ts
rm -rf src/sandbox/ src/sandbox.ts
rm -rf src/worker.ts src/worker/
rm -rf src/test/
```

- [ ] **Step 2: 提交**

```bash
git add -A src/
git commit -m "refactor: 删除所有页面入口（popup/options/statistics/mp/offscreen/sandbox/worker）"
```

---

### Task 7: 清理 common 目录

**Files:**
- Delete: `src/common/sender.ts`
- Delete: `src/common/renderer.ts`
- Delete: `src/common/logger.ts`
- Delete: `src/common/is.ts`
- Delete: `src/common/utils.ts`
- Delete: `src/common/constants.ts`
- Delete: `src/common/__tests__/` 目录

精简后 content-theme.ts 和 content-rightClick.ts 不再依赖 common 目录中的任何文件，全部删除。

- [ ] **Step 1: 删除 common 目录**

```bash
rm -rf src/common/
```

- [ ] **Step 2: 提交**

```bash
git add -A src/common/
git commit -m "refactor: 删除 common 目录（不再需要）"
```

---

### Task 8: 精简 Webpack 配置

**Files:**
- Modify: `webpack/webpack.config.base.js`

只保留 content 入口，移除所有 HTMLWebpackPlugin 实例、多余的 CopyPlugin 规则和 string-replace-loader 规则。

- [ ] **Step 1: 重写 webpack.config.base.js**

将文件内容替换为：

```js
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const cssLoaders = [
    "style-loader",
    "css-loader",
    {
        loader: "postcss-loader",
        options: {
            postcssOptions: {
                plugins: [
                    [
                        "postcss-preset-env",
                        {
                            browsers: 'last 2 versions'
                        }
                    ]
                ]
            }
        }
    }
]

const lessLoaders = cssLoaders.concat(["less-loader"])

const babelLoader = {
    loader: "babel-loader",
    options: {
        presets: [
            [
                "@babel/preset-env",
                {
                    targets: "defaults",
                    corejs: "3",
                    useBuiltIns: "usage"
                }
            ]
        ]
    }
}

module.exports = {
    entry: {
        content: path.resolve(__dirname, "..", "src", "content.ts"),
    },

    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: "[name].js"
    },

    resolve: {
        extensions: [".ts", ".js", ".tsx"],
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/i,
                use: [
                    babelLoader,
                    'ts-loader'
                ],
                exclude: /node-modules/
            },
            {
                test: /\.less$/i,
                use: lessLoaders
            },
            {
                test: /\.css$/i,
                use: cssLoaders
            },
        ]
    },

    plugins: [
        new CleanWebpackPlugin(),
        new CopyPlugin({
            patterns: [
                { from: "manifest.json", to: ".", context: "public" },
                { from: "extension-icons", to: "./icons/extension-icons", context: "public" },
                { from: "content/static/css", to: "./content/static/css", context: "src" },
            ]
        }),
    ]
}
```

- [ ] **Step 2: 提交**

```bash
git add webpack/webpack.config.base.js
git commit -m "refactor: 精简 webpack 配置，只保留 content 入口"
```

---

### Task 9: 精简 manifest.json

**Files:**
- Modify: `public/manifest.json`

移除 background、options_page、options_ui、sandbox、default_popup、多余权限。

- [ ] **Step 1: 重写 manifest.json**

将文件内容替换为：

```json
{
    "manifest_version": 3,
    "name": "微信读书笔记助手",
    "version": "0.0.0",
    "description": "一个还不错的微信读书笔记工具，方便你导出书本标注等内容，对常使用 Markdown 做笔记的用户比较有帮助。",
    "icons": {
        "16": "icons/extension-icons/icon16.png",
        "48": "icons/extension-icons/icon48.png",
        "128": "icons/extension-icons/icon128.png"
    },
    "action": {
        "default_icon": {
            "16": "icons/extension-icons/icon16.png",
            "24": "icons/extension-icons/icon24.png",
            "32": "icons/extension-icons/icon32.png"
        },
        "default_title": "wereader"
    },
    "content_scripts": [
        {
            "matches": [
                "*://weread.qq.com/web/reader/*"
            ],
            "js": [
                "content.js"
            ],
            "css": [],
            "run_at": "document_idle"
        }
    ],
    "web_accessible_resources": [
        {
            "resources": [
                "content/static/css/theme/*.css",
                "content/static/css/*.css"
            ],
            "matches": [
                "*://weread.qq.com/*"
            ]
        }
    ],
    "homepage_url": "https://github.com/Higurashi-kagome/wereader",
    "permissions": [
        "storage"
    ],
    "host_permissions": [
        "*://weread.qq.com/*"
    ]
}
```

- [ ] **Step 2: 提交**

```bash
git add public/manifest.json
git commit -m "refactor: 精简 manifest.json，移除多余权限和页面入口"
```

---

### Task 10: 清理 package.json 依赖

**Files:**
- Modify: `package.json`

移除不再需要的 npm 依赖。

- [ ] **Step 1: 从 devDependencies 中移除以下包**

需要移除的包（被已删除模块使用或不再需要）：
- `@testing-library/dom` — 测试库，测试目录已删除
- `@testing-library/jest-dom` — 同上
- `@types/chart.js` — statistics 页已删除
- `@types/jquery-mousewheel` — fancybox 已删除
- `@types/lodash.escaperegexp` — 已删除
- `@types/react` — popup 已删除
- `@types/react-dom` — popup 已删除
- `chart.js` — statistics 页已删除
- `chrome-webstore-upload-cli` — 部署工具，评估保留
- `jquery-mousewheel` — fancybox 已删除
- `lodash.escaperegexp` — 已删除
- `python-shell` — 非核心
- `react` — popup 已删除
- `react-dom` — popup 已删除
- `sweetalert2` — 已从 content-theme 移除
- `string-replace-loader` — worker-vars 已删除

从 dependencies 中移除：
- `@types/lodash` — 已删除
- `@types/nunjucks` — worker 已删除
- `lodash` — 已删除
- `nunjucks` — worker 已删除

运行命令：

```bash
npm uninstall @testing-library/dom @testing-library/jest-dom @types/chart.js @types/jquery-mousewheel @types/lodash.escaperegexp @types/react @types/react-dom chart.js jquery-mousewheel lodash.escaperegexp python-shell react react-dom sweetalert2 string-replace-loader
npm uninstall @types/lodash @types/nunjucks lodash nunjucks
```

- [ ] **Step 2: 同时移除不再需要的 devDependencies（继续）**

```bash
npm uninstall chrome-webstore-upload-cli dot-json
```

- [ ] **Step 3: 提交**

```bash
git add package.json package-lock.json
git commit -m "refactor: 清理不再需要的 npm 依赖"
```

---

### Task 11: 清理其他配置文件

**Files:**
- Check and possibly delete: `.github/` CI 配置（如存在）
- Check and possibly delete: `scripts/` 目录中的构建脚本
- Delete: `public/template/` 目录（nunjucks 模板，worker 已删除）
- Delete: `public/donate/` 目录（捐赠图片）
- Modify: `tsconfig.json`（如需要，移除对已删除文件的引用）

- [ ] **Step 1: 删除 public/template 和 public/donate 目录**

```bash
rm -rf public/template/ public/donate/
```

- [ ] **Step 2: 检查 scripts/ 目录内容并决定是否保留**

```bash
ls scripts/
```

`scripts/zip.js` 是构建打包脚本，保留。如有其他脚本（如部署脚本），评估是否保留。

- [ ] **Step 3: 提交**

```bash
git add -A public/ scripts/
git commit -m "refactor: 清理 public 目录中的模板和捐赠文件"
```

---

### Task 12: 验证构建

**Files:**
- 无文件修改

- [ ] **Step 1: 运行 ESLint 检查**

```bash
npm run lint
```

预期：无错误（或仅有已知的非阻塞警告）。修复任何报错。

- [ ] **Step 2: 运行开发构建**

```bash
npm run build-dev
```

预期：构建成功，`dist/` 目录中生成 `content.js`、`manifest.json`、CSS 文件和图标。不再有 `worker.js`、`popup.html` 等文件。

- [ ] **Step 3: 检查 dist/ 输出**

```bash
ls dist/
```

预期输出应包含：`content.js`、`manifest.json`、`content/` 目录（含 CSS）、`icons/` 目录。不应包含 `popup.html`、`worker.js`、`options.html` 等。

- [ ] **Step 4: 运行生产构建验证**

```bash
npm run build
```

预期：构建成功。

---

### Task 13: 更新 CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

更新项目文档以反映精简后的架构。

- [ ] **Step 1: 更新 CLAUDE.md**

用以下内容替换整个文件（保留精简后的项目描述）：

```markdown
# CLAUDE.md

## Project Overview

This is a Chrome/Firefox extension (Manifest V3) for WeChat Reading (微信读书). It provides:
- Eye-friendly theme switching (green/orange/dark/white)
- Right-click context menu restoration

## Commands

```bash
# Linting
npm run lint        # Check ESLint issues
npm run lint-fix    # Auto-fix ESLint issues

# Build
npm run build-dev   # Development build (outputs to dist/)
npm run build       # Production build
```

## Architecture

### Extension Entry Point

- `src/content.ts` - Content script injected into `weread.qq.com/web/reader/*`, initializes theme and right-click modules

### Content Script Modules

- `src/content/modules/content-theme.ts` - Theme switching (护眼色/橙色/暗色/白色)
- `src/content/modules/content-rightClick.ts` - Remove right-click restriction
- `src/content/modules/content-utils.ts` - CSS loading utilities (loadCSS/unloadCSS)

### CSS

- `src/content/static/css/theme/` - Theme stylesheets (green, orange, dark, white)
- `src/content/static/css/common.css` - Common styles
- `src/content/static/css/content-theme-switch.css` - Theme switcher UI styles
- `src/content/static/css/readerControls.css` - Reader controls styles

### Build System

- **Webpack 5** with ts-loader + babel-loader for TypeScript
- Output goes to `dist/` directory

## Code Style

- TypeScript with strict mode enabled
- ESLint extends `airbnb-base/legacy` with TypeScript support
- 4-space indentation
- No semicolons
- Globals: `chrome` and `JQuery` are readonly
```

- [ ] **Step 2: 提交**

```bash
git add CLAUDE.md
git commit -m "docs: 更新 CLAUDE.md 反映精简后的项目结构"
```
