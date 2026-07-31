# 一键复制当前章节为 Markdown — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 weread 阅读页控制栏新增「复制本章」按钮,点击后把当前章节正文遍历转换为 Markdown 并写入剪贴板。

**Architecture:** 纯函数 `domToMarkdown(root)` 按节点类型递归遍历 DOM 转 Markdown(防御式,不写死标签),与副作用层 `initCopy()`(arrive 等待 + 注入按钮 + 剪贴板 + toast)分离。CSS 由 webpack 打包,不新增运行时依赖、不新增权限。

**Tech Stack:** TypeScript(strict)、Webpack 5 + ts-loader、jQuery + arrive、Jest + ts-jest + jsdom(单测)、@playwright/test(e2e,真实 Chrome headed)。

## Global Constraints

(摘自 spec §10 与 `CLAUDE.md`,每个任务隐式遵守)

- TypeScript strict;ESLint 继承 `airbnb-base/legacy` + `@typescript-eslint`;4 空格缩进;**不使用分号**(`semi: ['error','never']`);`chrome`/`JQuery` 为 readonly 全局。
- 匿名函数表达式需具名(回调一律用 `function nameX(){}` 或箭头函数——func-names 不约束箭头函数)。
- 不新增运行时 npm 依赖;仅新增测试依赖 `@playwright/test`。
- 不新增 manifest 权限;CSS 由 `style-loader` 打包,不改 `web_accessible_resources`。
- 每个代码任务结束前:`npm run lint` 无错、`npm run build-dev` 构建成功。
- 单测命令:`npx jest src/content/modules/__tests__/content-markdown.test.ts`(jest 配置见 `jest.config.js`,ts-jest + jsdom,testMatch 含 `__tests__/**`)。

---

## File Structure

| 文件 | 责任 |
| --- | --- |
| `src/content/modules/content-markdown.ts` | **纯**: `domToMarkdown(root)`、`isLikelyFontObfuscated(text)`、常量 `BLOCK_TAGS`/`EXCLUDE_SELECTOR`。无副作用 import,可单测。 |
| `src/content/modules/content-copy.ts` | **副作用**: `initCopy()`(arrive 等待→`addCopyButton`→点击→`getChapterRoot`→`domToMarkdown`→`copyToClipboard`→`showToast`)。import jquery + arrive + content-markdown。 |
| `src/content/static/css/content-copy.css` | 按钮 toast 样式。 |
| `src/content.ts`(改) | 集中 import 上述 CSS + 调用 `initCopy()`。 |
| `src/content/modules/__tests__/content-markdown.test.ts` | `domToMarkdown`/`isLikelyFontObfuscated` 单测(jsdom)。 |
| `playwright.config.ts` + `e2e/copy-chapter.spec.ts` | Playwright e2e(真实 Chrome headed,持久 profile)。 |
| `package.json`(改) | 新增 devDep `@playwright/test`、script `test:e2e`。 |

接口契约(后续任务据此衔接):

- `content-markdown.ts` 导出:`domToMarkdown(root: HTMLElement): string`、`isLikelyFontObfuscated(text: string): boolean`。
- `content-copy.ts` 导出:`initCopy(): void`;内部 `getChapterRoot(): HTMLElement | null` 选择器链 `.renderTargetContainer → .readerChapterContent → .app_content`;`getChapterTitle(): string` 选择器 `.renderTargetPageInfo_header → .readerTopBar_title_chapter`。

---

### Task 1: 纯转换骨架 + 文本/块级基线 + CSS + 入口接线

**Files:**
- Create: `src/content/modules/content-markdown.ts`
- Create: `src/content/static/css/content-copy.css`
- Modify: `src/content.ts`(顶部加 CSS import + 调用 `initCopy`,但 `initCopy` 在 Task 7 才实现;本任务先只接 CSS 与一个空 `initCopy` 占位会破坏 import——故本任务**只**接 CSS,`initCopy` 接线放 Task 7)
- Test: `src/content/modules/__tests__/content-markdown.test.ts`

**Interfaces:**
- Produces: `domToMarkdown(root: HTMLElement): string`(本任务支持 TextNode、`P`/`DIV` 块级 + `#text`)。

> 说明:为避免本任务 import 未实现的 `initCopy`,本任务**只**创建 `content-markdown.ts` + CSS 文件,不动 `content.ts`。`content.ts` 接线在 Task 7 一次完成。

- [ ] **Step 1: 写失败测试**

`src/content/modules/__tests__/content-markdown.test.ts`:
```ts
import { domToMarkdown } from '../content-markdown'

describe('domToMarkdown 基线', () => {
    test('单个段落 div 转为纯文本', () => {
        const root = document.createElement('div')
        root.innerHTML = '<div>hello world</div>'
        expect(domToMarkdown(root).trim()).toBe('hello world')
    })

    test('多个段落之间空行分隔', () => {
        const root = document.createElement('div')
        root.innerHTML = '<p>第一段</p><p>第二段</p>'
        expect(domToMarkdown(root).trim()).toBe('第一段\n\n第二段')
    })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx jest src/content/modules/__tests__/content-markdown.test.ts`
Expected: FAIL,`domToMarkdown is not a function` 或模块不存在。

- [ ] **Step 3: 写最小实现**

`src/content/modules/content-markdown.ts`:
```ts
const BLOCK_TAGS = new Set([
    'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'PRE', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'BR',
    'FIGURE', 'SECTION', 'ARTICLE'
])

const EXCLUDE_SELECTOR = [
    '.readerControls',
    '.reader_float_font_panel',
    '.reader_float_review_with_range_panel_wrapper',
    '.reader_float_top_reviews_panel_wrapper',
    '.readerMemberCardTipsNew',
    '.renderTarget_pager',
    '.preRenderContainer'
].join(',')

function walkChildren(el: HTMLElement): string {
    return Array.from(el.childNodes).map((node) => walkNode(node)).join('')
}

function walkNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
        return (node.nodeValue || '').replace(/\s+/g, ' ')
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as HTMLElement
    const tag = el.tagName
    if (tag === 'BR') return '\n'
    const inner = walkChildren(el)
    if (BLOCK_TAGS.has(tag)) {
        return inner.trim() ? `${inner}\n\n` : ''
    }
    return inner
}

function domToMarkdown(root: HTMLElement): string {
    const clone = root.cloneNode(true) as HTMLElement
    clone.querySelectorAll('style,script,noscript').forEach((el) => el.remove())
    clone.querySelectorAll(EXCLUDE_SELECTOR).forEach((el) => el.remove())
    return walkNode(clone)
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+\n/g, '\n')
        .trim()
}

function isLikelyFontObfuscated(_text: string): boolean {
    return false
}

export { domToMarkdown, isLikelyFontObfuscated }
```

`src/content/static/css/content-copy.css`:
```css
.wereader-copy-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    padding: 10px 16px;
    border-radius: 6px;
    background: #323232;
    color: #fff;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    animation: wereader-toast-in 0.2s ease forwards;
}
@keyframes wereader-toast-in {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
}
```

> `isLikelyFontObfuscated` 先占位返回 `false`,Task 6 实现。`_text` 前缀下划线避免未用参数告警(`no-unused-vars` 对 `_` 前缀豁免;`@typescript-eslint/no-unused-vars` 默认豁免 `^_`)。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx jest src/content/modules/__tests__/content-markdown.test.ts`
Expected: PASS(2 个用例)。

- [ ] **Step 5: lint + build 确认**

Run: `npm run lint && npm run build-dev`
Expected: 无错;构建成功。

- [ ] **Step 6: 提交**

```bash
git add src/content/modules/content-markdown.ts src/content/static/css/content-copy.css src/content/modules/__tests__/content-markdown.test.ts
git commit -m "feat(copy): 新增纯转换 domToMarkdown 骨架与 CSS"
```

---

### Task 2: 内联格式(strong / em / del / a)

**Files:**
- Modify: `src/content/modules/content-markdown.ts`(扩展 `walkNode`)
- Test: `src/content/modules/__tests__/content-markdown.test.ts`(追加用例)

**Interfaces:**
- Consumes: Task 1 的 `walkNode`/`walkChildren`。
- Produces: `domToMarkdown` 对 `STRONG/B`→`**x**`、`EM/I`→`*x*`、`DEL/S`→`~~x~~`、`A`→`[x](href)`。

- [ ] **Step 1: 写失败测试**

追加到 `content-markdown.test.ts`:
```ts
describe('domToMarkdown 内联格式', () => {
    test('加粗/斜体/删除/链接', () => {
        const root = document.createElement('div')
        root.innerHTML = '<div><strong>b</strong> <em>i</em> <del>d</del> <a href="u">l</a></div>'
        expect(domToMarkdown(root).trim()).toBe('**b** *i* ~~d~~ [l](u)')
    })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx jest src/content/modules/__tests__/content-markdown.test.ts -t "内联格式"`
Expected: FAIL(当前 `walkNode` 把 `STRONG` 当未知内联,直接拼 `b`,得 `b i d l`)。

- [ ] **Step 3: 写实现**

在 `walkNode` 的 `if (tag === 'BR') return '\n'` 之后、`const inner = walkChildren(el)` 之前插入内联分支:
```ts
    switch (tag) {
    case 'STRONG': case 'B':
        return `**${walkChildren(el)}**`
    case 'EM': case 'I':
        return `*${walkChildren(el)}*`
    case 'DEL': case 'S':
        return `~~${walkChildren(el)}~~`
    case 'A': {
        const href = el.getAttribute('href') || ''
        return `[${walkChildren(el)}](${href})`
    }
    default:
        break
    }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx jest src/content/modules/__tests__/content-markdown.test.ts -t "内联格式"`
Expected: PASS。

- [ ] **Step 5: lint + build**

Run: `npm run lint && npm run build-dev`
Expected: 无错;构建成功。

- [ ] **Step 6: 提交**

```bash
git add src/content/modules/content-markdown.ts src/content/modules/__tests__/content-markdown.test.ts
git commit -m "feat(copy): 内联格式转 Markdown(加粗/斜体/删除/链接)"
```

---

### Task 3: 标题 / BR / 代码块

**Files:**
- Modify: `src/content/modules/content-markdown.ts`
- Test: `src/content/modules/__tests__/content-markdown.test.ts`

**Interfaces:**
- Produces: `H1`~`H6`→`#`×n、`BR`→`\n`(已在 Task1,本任务验证)、`PRE`→` ``` ` 围栏代码块。

- [ ] **Step 1: 写失败测试**

追加:
```ts
describe('domToMarkdown 标题与代码', () => {
    test('h2 转 ##', () => {
        const root = document.createElement('div')
        root.innerHTML = '<h2>标题二</h2>'
        expect(domToMarkdown(root).trim()).toBe('## 标题二')
    })

    test('pre 转围栏代码块', () => {
        const root = document.createElement('div')
        root.innerHTML = '<pre>let x = 1</pre>'
        expect(domToMarkdown(root).trim()).toBe('```\nlet x = 1\n```')
    })

    test('br 转换行', () => {
        const root = document.createElement('div')
        root.innerHTML = '<p>甲<br>乙</p>'
        expect(domToMarkdown(root).trim()).toBe('甲\n乙')
    })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx jest src/content/modules/__tests__/content-markdown.test.ts -t "标题与代码"`
Expected: FAIL(`h2` 被当块级 `DIV` 处理得 `标题二`(无 `##`);`pre` 同样无围栏)。

- [ ] **Step 3: 写实现**

在 `walkNode` 内联 `switch` 之后、`const inner = walkChildren(el)` 之前加入:
```ts
    if (tag === 'PRE') {
        return `\n\`\`\`\n${el.textContent || ''}\n\`\`\`\n`
    }
    if (/^H[1-6]$/.test(tag)) {
        const level = parseInt(tag.charAt(1), 10)
        return `\n${'#'.repeat(level)} ${walkChildren(el).trim()}\n\n`
    }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx jest src/content/modules/__tests__/content-markdown.test.ts -t "标题与代码"`
Expected: PASS。

- [ ] **Step 5: lint + build**

Run: `npm run lint && npm run build-dev`
Expected: 无错;构建成功。

- [ ] **Step 6: 提交**

```bash
git add src/content/modules/content-markdown.ts src/content/modules/__tests__/content-markdown.test.ts
git commit -m "feat(copy): 标题与代码块转 Markdown"
```

---

### Task 4: 图片 / 引用 / 列表 / 脚注属性

**Files:**
- Modify: `src/content/modules/content-markdown.ts`
- Test: `src/content/modules/__tests__/content-markdown.test.ts`

**Interfaces:**
- Produces: `IMG`→`![alt](data-src||src)`、`BLOCKQUOTE`→`> ` 前缀、`LI`→`- `、`data-wr-footernote` 元素→`（注：{属性值}）`。

- [ ] **Step 1: 写失败测试**

追加:
```ts
describe('domToMarkdown 图片/引用/列表/脚注', () => {
    test('img 取 data-src', () => {
        const root = document.createElement('div')
        root.innerHTML = '<img data-src="http://e/a.jpg" alt="图">'
        expect(domToMarkdown(root).trim()).toBe('![图](http://e/a.jpg)')
    })

    test('img 无 data-src 时取 src', () => {
        const root = document.createElement('div')
        root.innerHTML = '<img src="http://e/b.jpg">'
        expect(domToMarkdown(root).trim()).toBe('![b.jpg](http://e/b.jpg)')
    })

    test('blockquote 每行加 > 前缀', () => {
        const root = document.createElement('div')
        root.innerHTML = '<blockquote>第一行<br>第二行</blockquote>'
        expect(domToMarkdown(root).trim()).toBe('> 第一行\n> 第二行')
    })

    test('li 转 - 项', () => {
        const root = document.createElement('div')
        root.innerHTML = '<ul><li>甲</li><li>乙</li></ul>'
        expect(domToMarkdown(root).trim()).toBe('- 甲\n- 乙')
    })

    test('data-wr-footernote 元素内联脚注', () => {
        const root = document.createElement('div')
        root.innerHTML = '<span data-wr-footernote="注内容">注</span>'
        expect(domToMarkdown(root).trim()).toBe('注（注：注内容）')
    })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx jest src/content/modules/__tests__/content-markdown.test.ts -t "图片/引用/列表/脚注"`
Expected: FAIL。

- [ ] **Step 3: 写实现**

新增 `imgMarkdown` 与 `footnoteMarkdown` 辅助,并在 `walkNode` 内联 `switch` 后、`PRE` 分支前加入 `IMG`;在 `BLOCK_TAGS` 判断前加入 `BLOCKQUOTE`/`LI` 特殊处理;脚注拼接到内联/块级结果末尾。

在文件中(`walkChildren` 之前)加入:
```ts
function imgMarkdown(el: HTMLElement): string {
    const src = el.getAttribute('data-src') || el.getAttribute('src') || ''
    const alt = el.getAttribute('alt') || (src.split('/').pop() || '')
    return `\n![${alt}](${src})\n`
}

function footnoteMarkdown(el: HTMLElement): string {
    const note = el.getAttribute('data-wr-footernote')
    return note ? `（注：${note}）` : ''
}
```

在 `walkNode` 的 `switch` 内加 `IMG` 分支,并在 `switch` 后、`PRE`/`H` 判断之前加 `BLOCKQUOTE`/`LI`:
```ts
    case 'IMG':
        return imgMarkdown(el)
    case 'BLOCKQUOTE': {
        const inner = walkChildren(el).trim()
        return inner.split('\n').map((l) => `> ${l}`).join('\n') + '\n\n'
    }
    case 'LI':
        return `- ${walkChildren(el).trim()}\n`
    default:
        break
```

并把通用块级/内联返回改为附带脚注:
```ts
    const inner = walkChildren(el)
    const foot = footnoteMarkdown(el)
    const content = inner + foot
    if (BLOCK_TAGS.has(tag)) {
        return content.trim() ? `${content}\n\n` : ''
    }
    return content
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx jest src/content/modules/__tests__/content-markdown.test.ts -t "图片/引用/列表/脚注"`
Expected: PASS。

- [ ] **Step 5: lint + build**

Run: `npm run lint && npm run build-dev`
Expected: 无错;构建成功。

- [ ] **Step 6: 提交**

```bash
git add src/content/modules/content-markdown.ts src/content/modules/__tests__/content-markdown.test.ts
git commit -m "feat(copy): 图片/引用/列表/脚注转 Markdown"
```

---

### Task 5: 跳过 style/script + 排除 UI chrome(集成测试)

**Files:**
- Test: `src/content/modules/__tests__/content-markdown.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `EXCLUDE_SELECTOR` 与 `domToMarkdown` 中 `style/script` remove 逻辑。

> 本任务不改实现(Task 1 已实现 skip + exclude),只补集成用例固化行为,防止后续回归。

- [ ] **Step 1: 写测试**

追加:
```ts
describe('domToMarkdown 剔除 UI 与样式', () => {
    test('style 块不进入输出', () => {
        const root = document.createElement('div')
        root.innerHTML = '<style>.a{color:red}</style><p>正文</p>'
        expect(domToMarkdown(root).trim()).toBe('正文')
    })

    test('readerControls 控制栏文字不进入输出', () => {
        const root = document.createElement('div')
        root.innerHTML = '<div class="readerControls"><button>目录</button><button>笔记</button></div><p>正文</p>'
        expect(domToMarkdown(root).trim()).toBe('正文')
    })

    test('3+ 连续换行压成 2', () => {
        const root = document.createElement('div')
        root.innerHTML = '<p>甲</p><p>乙</p>'
        expect(domToMarkdown(root)).not.toMatch(/\n{3,}/)
    })
})
```

- [ ] **Step 2: 跑测试**

Run: `npx jest src/content/modules/__tests__/content-markdown.test.ts -t "剔除 UI 与样式"`
Expected: PASS(Task 1 已实现)。若失败,补实现到 `domToMarkdown`。

- [ ] **Step 3: lint + build**

Run: `npm run lint && npm run build-dev`
Expected: 无错;构建成功。

- [ ] **Step 4: 提交**

```bash
git add src/content/modules/__tests__/content-markdown.test.ts
git commit -m "test(copy): 固化 style 跳过与 UI 排除行为"
```

---

### Task 6: 字体反爬检测(PUA 占比)

**Files:**
- Modify: `src/content/modules/content-markdown.ts`(实现 `isLikelyFontObfuscated`)
- Test: `src/content/modules/__tests__/content-markdown.test.ts`

**Interfaces:**
- Produces: `isLikelyFontObfuscated(text: string): boolean`——PUA(U+E000–F8FF)占非空白字符 >30% 时返回 `true`。

- [ ] **Step 1: 写失败测试**

追加:
```ts
import { isLikelyFontObfuscated } from '../content-markdown'

describe('isLikelyFontObfuscated', () => {
    test('正常中文返回 false', () => {
        expect(isLikelyFontObfuscated('这是一段正常的中文正文')).toBe(false)
    })

    test('PUA 占比高返回 true', () => {
        // PUA 区字符
        const pua = String.fromCharCode(0xE000) + String.fromCharCode(0xE001) + String.fromCharCode(0xE002)
        expect(isLikelyFontObfuscated(`${pua}${pua}${pua}正`)).toBe(true)
    })

    test('空字符串返回 false', () => {
        expect(isLikelyFontObfuscated('')).toBe(false)
    })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx jest src/content/modules/__tests__/content-markdown.test.ts -t "isLikelyFontObfuscated"`
Expected: FAIL(占位返回 `false`,PUA 用例不通过)。

- [ ] **Step 3: 写实现**

替换 `isLikelyFontObfuscated`:
```ts
function isLikelyFontObfuscated(text: string): boolean {
    const nonSpace = text.replace(/\s/g, '')
    if (!nonSpace) return false
    let pua = 0
    for (const ch of nonSpace) {
        const code = ch.codePointAt(0) || 0
        if (code >= 0xE000 && code <= 0xF8FF) pua += 1
    }
    return pua / nonSpace.length > 0.3
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx jest src/content/modules/__tests__/content-markdown.test.ts -t "isLikelyFontObfuscated"`
Expected: PASS。

- [ ] **Step 5: lint + build**

Run: `npm run lint && npm run build-dev`
Expected: 无错;构建成功。

- [ ] **Step 6: 提交**

```bash
git add src/content/modules/content-markdown.ts src/content/modules/__tests__/content-markdown.test.ts
git commit -m "feat(copy): 字体反爬 PUA 占比检测"
```

---

### Task 7: 副作用层 initCopy(按钮 / 剪贴板 / toast)+ 入口接线

**Files:**
- Create: `src/content/modules/content-copy.ts`
- Modify: `src/content.ts`(import CSS + 调用 `initCopy`)

**Interfaces:**
- Consumes: Task 1-6 的 `domToMarkdown`、`isLikelyFontObfuscated`。
- Produces: `initCopy(): void`。

> 副作用层不写单测(导入 `arrive` 在 jsdom 不可靠;按 spec §9.1,副作用层由 Task 8 的 e2e 覆盖)。

- [ ] **Step 1: 写实现**

`src/content/modules/content-copy.ts`:
```ts
import 'arrive'
import $ from 'jquery'
import { domToMarkdown, isLikelyFontObfuscated } from './content-markdown'

const tag = 'content-copy: '

function getChapterRoot(): HTMLElement | null {
    return document.querySelector('.renderTargetContainer')
        || document.querySelector('.readerChapterContent')
        || document.querySelector('.app_content')
}

function getChapterTitle(): string {
    const el = document.querySelector('.renderTargetPageInfo_header')
        || document.querySelector('.readerTopBar_title_chapter')
    return el ? el.textContent.replace(/^\s+|\s+$/g, '') : ''
}

async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch (err) {
        console.error(tag, 'clipboard.writeText 失败,降级 execCommand', err)
        try {
            const ta = document.createElement('textarea')
            ta.value = text
            ta.style.position = 'fixed'
            ta.style.opacity = '0'
            document.body.appendChild(ta)
            ta.select()
            const ok = document.execCommand('copy')
            document.body.removeChild(ta)
            return ok
        } catch (err2) {
            console.error(tag, 'execCommand 复制失败', err2)
            return false
        }
    }
}

function showToast(msg: string): void {
    const old = document.querySelector('.wereader-copy-toast')
    if (old) old.remove()
    const toast = document.createElement('div')
    toast.className = 'wereader-copy-toast'
    toast.textContent = msg
    document.body.appendChild(toast)
    setTimeout(function removeToast() { toast.remove() }, 1800)
}

async function handleCopy(): Promise<void> {
    const root = getChapterRoot()
    if (!root) { showToast('未找到章节内容'); return }
    const title = getChapterTitle()
    const body = domToMarkdown(root)
    if (!body) { showToast('本章无文本内容'); return }
    const md = title ? `# ${title}\n\n${body}` : body
    const ok = await copyToClipboard(md)
    if (!ok) { showToast('复制失败,请重试'); return }
    if (isLikelyFontObfuscated(md)) {
        showToast('已复制本章内容(检测到字体加密,结果可能为乱码)')
    } else {
        showToast('已复制本章内容')
    }
}

function addCopyButton(): void {
    if ($('.readerControls_item.copy').length) return
    const btn = $('<button title="复制本章" class="readerControls_item copy"></button>')
    btn.append($('<span>复制</span>'))
    btn.on('click', function onClick(e) {
        e.stopPropagation()
        handleCopy().catch(function onErr(err) { console.error(tag, err) })
    })
    $('.readerControls').append(btn)
}

function initCopy(): void {
    console.log(tag, 'initCopy')
    document.arrive('.readerControls_item', { onceOnly: true }, function handleArrive() {
        addCopyButton()
    })
}

export { initCopy }
```

修改 `src/content.ts`,在现有 CSS import 下方加一行、在 `initRightClick()` 下加调用:
```ts
import './content/static/css/content-copy.css'

import { initCopy } from './content/modules/content-copy'
```
并在文件末尾 `initRightClick()` 之后加 `initCopy()`。

- [ ] **Step 2: lint + build**

Run: `npm run lint && npm run build-dev`
Expected: 无错;构建成功(`content.js` 含新模块)。

- [ ] **Step 3: 手动冒烟(在测试页)**

加载 `dist/` 到 Chrome,打开测试页,确认右下角控制栏出现「复制」按钮。本步可选,完整验证在 Task 8 e2e。

- [ ] **Step 4: 提交**

```bash
git add src/content/modules/content-copy.ts src/content.ts
git commit -m "feat(copy): initCopy 注入复制按钮并接通剪贴板与 toast"
```

---

### Task 8: Playwright e2e 测试

**Files:**
- Modify: `package.json`(devDep `@playwright/test`、script `test:e2e`)
- Create: `playwright.config.ts`
- Create: `e2e/copy-chapter.spec.ts`

**Interfaces:**
- Consumes: Task 7 的 `dist/` 构建产物与 `.readerControls_item.copy` 按钮、`.renderTargetPageInfo_header` 标题、`.renderTargetContainer` 正文容器。

**前置(关键约束):**
- weread 测试页需微信登录,CI 无法登录。e2e 用 `chromium.launchPersistentContext` + 持久 profile(`~/.wereader-e2e-profile`),**用户需在该 profile 登录微信读书一次**,后续复用。
- 未登录时(检测到 `.readerTopBar` 内可见「登录」链接)→ `test.skip`。
- 需先 `npx playwright install chrome`(本机已执行)。

- [ ] **Step 1: 加 devDep 与 script**

`package.json` 的 `devDependencies` 加:
```json
    "@playwright/test": "^1.48.0"
```
`scripts` 加:
```json
    "test:e2e": "npm run build-dev && playwright test"
```

运行 `npm install`(安装 `@playwright/test`)。

- [ ] **Step 2: 写 playwright.config.ts**

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './e2e',
    timeout: 90000,
    use: {
        headless: false,
        channel: 'chrome',
        viewport: { width: 1280, height: 900 }
    }
})
```

- [ ] **Step 3: 写 e2e 用例**

`e2e/copy-chapter.spec.ts`:
```ts
import path from 'path'
import { test, expect, chromium } from '@playwright/test'

const TEST_URL = 'https://weread.qq.com/web/reader/52e320c0813ab9edeg01750fkc0c320a0232c0c7c76d365a'
const EXTENSION_PATH = path.resolve(__dirname, '..', 'dist')
const PROFILE_DIR = `${process.env.HOME}/.wereader-e2e-profile`

test('复制当前章节为 Markdown', async () => {
    const context = await chromium.launchPersistentContext(PROFILE_DIR, {
        channel: 'chrome',
        headless: false,
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`
        ]
    })
    const page = await context.newPage()
    try {
        await page.goto(TEST_URL)
        // 未登录则 skip
        const loginLink = page.locator('.readerTopBar_link', { hasText: '登录' })
        if (await loginLink.count() > 0 && await loginLink.first().isVisible()) {
            test.skip(true, '未登录,请在持久 profile 中登录微信读书后重试')
        }
        // 等待复制按钮注入(arrive 链路)
        const btn = page.locator('.readerControls_item.copy')
        await expect(btn).toBeVisible({ timeout: 30000 })
        // 字体反爬判定
        const obfuscated = await page.evaluate(() => {
            const el = document.querySelector('.renderTargetContainer')
                || document.querySelector('.readerChapterContent')
            if (!el) return false
            const t = el.textContent || ''
            const ns = t.replace(/\s/g, '')
            if (!ns) return false
            let pua = 0
            for (const ch of ns) {
                const c = ch.codePointAt(0) || 0
                if (c >= 0xE000 && c <= 0xF8FF) pua += 1
            }
            return pua / ns.length > 0.3
        })
        test.skip(obfuscated, '字体加密,需改走方案 C')
        // 授权剪贴板并点击复制
        await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
            origin: 'https://weread.qq.com'
        })
        await btn.click()
        const clip = await page.evaluate(() => navigator.clipboard.readText())
        const title = await page.locator('.renderTargetPageInfo_header').first().textContent()
        expect(clip.length).toBeGreaterThan(0)
        if (title) expect(clip).toContain(title.trim())
    } finally {
        await context.close()
    }
})
```

- [ ] **Step 4: 跑 e2e**

Run: `npm run test:e2e`
Expected: 首次需在弹出的 Chrome 登录微信读书;登录后再次运行应 PASS(剪贴板含章节标题)。未登录则 skip。

- [ ] **Step 5: lint + build 确认(e2e 文件不被 eslint 扫到)**

`.eslintrc.js` 的 `ignorePatterns` 不含 `e2e/`、`playwright.config.ts`,会被 lint。若 lint 报错,按提示修(常见:`import/order`、`import/no-extraneous-dependency` 因 `@playwright/test` 已在 devDep 应通过)。
Run: `npm run lint && npm run build-dev`
Expected: 无错;构建成功。

> 若 lint 对 e2e 目录不便,可在 `.eslintrc.js` 的 `ignorePatterns` 追加 `'e2e/'`、`'playwright.config.ts'`。

- [ ] **Step 6: 提交**

```bash
git add package.json package-lock.json playwright.config.ts e2e/copy-chapter.spec.ts
git commit -m "test(copy): Playwright e2e 验证复制本章链路"
```

---

### Task 9: 文档与最终验证

**Files:**
- Modify: `README.md`(功能列表新增「复制本章」)
- Modify: `CLAUDE.md`(模块结构新增 `content-copy.ts`/`content-markdown.ts` 与 `npm run test:e2e`)

- [ ] **Step 1: 更新 README**

在 `## 功能` 下 `### 解除右键限制` 之后新增一节:
```markdown
### 复制本章

- 在阅读页右下角控制栏新增「复制本章」按钮;
- 点击后遍历当前章节正文,转为 Markdown(保留标题、加粗、图片、代码块、引用等)写入剪贴板;
- 对检测到字体加密的章节会给出乱码告警。
```
并在「项目结构」与「技术栈」补 `content-copy`/`content-markdown` 与 `@playwright/test`。

- [ ] **Step 2: 更新 CLAUDE.md**

在「内容脚本模块」补:
```
- `src/content/modules/content-markdown.ts` — DOM → Markdown 纯转换
- `src/content/modules/content-copy.ts` — 复制本章按钮与剪贴板
```
在「命令」补:
```bash
npm run test:e2e   # Playwright e2e(需登录态持久 profile)
```
在「CSS」补 `src/content/static/css/content-copy.css`。

- [ ] **Step 3: 全量验证**

Run: `npm run lint && npm run build-dev && npm test`
Expected: 无错;构建成功;单测全绿。

- [ ] **Step 4: 提交**

```bash
git add README.md CLAUDE.md
git commit -m "docs: README 与 CLAUDE.md 补充复制本章功能"
```

---

## Self-Review

**1. Spec coverage:**
- §1 范围(整章/Markdown/控制栏按钮)→ Task 1-7 全覆盖。
- §2.3 字体反爬检测 → Task 6 + Task 8 e2e 复核。
- §3 DOM 事实(选择器链、排除 UI、skip style)→ Task 1(实现)、Task 5(固化)、Task 7(副作用使用)、Task 8(登录态复核)。
- §4 模块结构(两文件分层、CSS 集中 import、无新依赖/权限)→ Task 1/7。
- §5 按钮 + toast → Task 7 + Task 1 CSS。
- §6 Markdown 转换(容器兜底/标题/遍历表/后处理/字体检测)→ Task 1-6 + Task 7 副作用。
- §7 剪贴板策略(navigator + execCommand 兜底)→ Task 7。
- §8 错误处理与降级(未找到/空/失败/成功/字体告警)→ Task 7 `handleCopy`。
- §9 测试(Jest 单测 + Playwright e2e)→ Task 1-6 单测、Task 8 e2e。
- §10 代码风格 → Global Constraints + 各任务 lint/build。
- §11 登录态确认 → Task 8 e2e。
- §12 不做的事 → 未引入 API/worker/popup,未改 manifest。

**2. Placeholder scan:** 无 TBD/TODO;每个代码步骤含完整代码。

**3. Type consistency:**
- `domToMarkdown(root: HTMLElement): string`——Task 1 定义,Task 7 `handleCopy` 调用,签名一致。
- `isLikelyFontObfuscated(text: string): boolean`——Task 1 占位、Task 6 实现、Task 7 与 Task 8(内联 evaluate 复刻算法)使用,一致。
- `getChapterRoot`/`getChapterTitle` 选择器链与 spec §6.1/§6.2 一致(`.renderTargetContainer → .readerChapterContent → .app_content`、`.renderTargetPageInfo_header → .readerTopBar_title_chapter`)。
- `EXCLUDE_SELECTOR` 常量与 spec §6.3 排除列表一致。
