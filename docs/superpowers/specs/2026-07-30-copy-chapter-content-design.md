# 一键复制当前章节内容为 Markdown — 设计文档

- 日期: 2026-07-30
- 状态: 已批准,待实现
- 测试页面: https://weread.qq.com/web/reader/52e320c0813ab9edeg01750fkc0c320a0232c0c7c76d365a

## 1. 目标与范围

为微信读书网页版阅读页(`*://weread.qq.com/web/reader/*`)增加「一键复制当前整章内容为 Markdown」功能。

- **复制范围**: 当前所在章节的全部正文(`.readerChapterContent` 下所有内容),不是当前可见的一屏,也不是跨章的已加载 DOM。
- **输出格式**: Markdown,保留章节标题、加粗、斜体、删除线、图片、代码块、引用、链接、列表等结构。
- **触发方式**: 在右下角竖向控制栏(`.readerControls`)新增一个「复制本章」按钮,单击触发。

## 2. 方案选择与理由

经三方案对比,选定 **方案 A:防御式 DOM 遍历 → Markdown,零新依赖**。

### 2.1 三方案对照(按「抗 DOM 变化稳定性」)

| 失效场景 | A 自研遍历(朴素) | B Turndown | C 走 API |
| --- | --- | --- | --- |
| weread 改 `.readerChapterContent` 选择器 | 坏 | 坏 | 无关 |
| weread 把 `<p>` 换成 `<div>`/`<span>` | 坏(按标签写死) | 容忍任意标签 | 无关 |
| weread 改图片懒加载属性 `data-src` | 图丢 | 图丢 | 无关 |
| 字体反爬的书 | 乱码 | 乱码 | API 响应也可能带字体加密 |
| 分页/懒加载导致内容不全 | 整章在 DOM,基本不受影响 | 同左 | 一次返回全章 |
| weread 改 API 路径/加签名 | 无关 | 无关 | 坏 |
| 登录态/Cookie 失效 | 无关 | 无关 | 坏 |
| 重新引入刚删掉的复杂度 | 无 | +1 依赖 | 大量代码(worker/API 客户端/权限) |

### 2.2 选择 A 的依据

- 纯论「DOM 怎么变都不受影响」C 最稳,但 C 把风险从 DOM 换成「API 稳定性 + 登录态 + 签名反爬」,且要把本项目刚精简掉的 Wereader API 客户端、worker、bookId/userVid 解析全部加回来,代价远超收益。
- 真正的稳定性差距不在 A vs B(两者都依赖同一个容器选择器、都吃字体反爬),而在写法是否防御。Turndown 多一个依赖、结构容忍度与防御式遍历持平、却不解决字体反爬这个真问题,性价比不高。
- 防御式遍历能扛住 weread 实际最常见的 DOM 变更类型(改版、换标签、换 class),只有连根选择器都改名才会挂——而那种程度的改版 API 也大概率同步变。

### 2.3 字体反爬风险(已实测)

微信读书对正文有字体加密防护:DOM 的 `textContent` 可能是 PUA 私有区乱码,浏览器靠自定义 woff 字体才渲染成正常文字。

**已用 Playwright 实测测试页**(未登录,封面/简介视图): `.readerChapterContent` 文本的 PUA 私有区字符占比 ≈ 0.1%,**无字体反爬**。方案 A 对本书成立。代码内仍保留 PUA 占比检测作为运行时兜底告警(见 §6.5),应对其他可能启用字体反爬的书。

> 注:未登录只能看到封面/扉页/简介 + `wr_horizontal_reader_needPay_container`(需付费)提示,1.6 章正文需登录 + 会员。因此正文 DOM 的内部结构需在登录态下再做一次确认(见 §3 末与实现计划「登录态 DOM 勘探」任务)。

## 3. 关键 DOM 事实(实测 + 删除前代码)

**实测(Playwright,未登录封面视图)**得到当前 weread reader 的真实结构,以下已验证:

- 容器层级: `.readerChapterContent` > `.renderTargetContainer`(+ `.preRenderContainer`、`.reader_float_font_panel`、`.readerMemberCardTipsNew`、`.readerControls`、书评面板等 UI chrome)
- **真实正文容器**: `.renderTargetContainer`(在 `.readerChapterContent` 内)。未登录时其内为封面/扉页/简介;登录态下应为章节正文(待确认)
- `.readerChapterContent` 内含 `<style>` 块(CSS),遍历必须 skip
- `.readerControls`(**控制栏,按钮注入目标**)位于 `.readerChapterContent` 内,含 7 个 `.readerControls_item`,文字「目录 Ai 问书 笔记…」——抽取时必须排除,否则按钮文字漏进 Markdown
- 章节标题: 删除前代码用的 `.readerTopBar_title_chapter` **已不存在**。书名在 `.readerTopBar_title`;章节/小节标题候选为 `.renderTargetPageInfo_header`(实测为「1.6 深入剖析GPT架构」),登录态确认
- 正文叶节点为 `<p>`(class 如 `wr_flyleaf_page_bookIntro_content`、`introDialog_content_intro_para`),防御式遍历(按节点类型)可覆盖

**来自删除前代码、尚未在登录态复核的**(图片/脚注/代码/分页/目录,登录态正文视图复核):
- 图片: `img.wr_readerImage_opacity`,真实地址在 `data-src`(非 `src`,懒加载);`h-pic` 类表行内图片
- 脚注: `.reader_footer_note.js_readerFooterNote`,内容在 `data-wr-footernote` 属性
- 代码块: `pre`
- 控制栏按钮: `.readerControls_item`(`.readerControls_item.catalog`、`.white`、`.dark`、`.isHorizontalReader`、`.isNormalReader`)
- 分页按钮: `.readerFooter_button`(`title` 为「下一页」)
- 章节目录项: `.readerCatalog_list_item`,标题在 `.readerCatalog_list_item_title_text`

## 4. 模块结构

- 新建 `src/content/modules/content-copy.ts`,导出 `initCopy()`
- `src/content.ts` 入口追加:
  ```ts
  import { initCopy } from './content/modules/content-copy'
  initCopy()
  ```
  与 `initTheme`/`initRightClick` 并列
- 新建 `src/content/static/css/content-copy.css`,在 `content.ts` 顶部集中 `import`(沿用现有主题 CSS 的集中导入模式)
- **不新增任何 npm 依赖**;CSS 由 webpack `style-loader` 打包,无需改 manifest 的 `web_accessible_resources`
- **不新增任何权限**: 复制由用户点击触发,`navigator.clipboard` 在 https 的 weread 上可用

### 4.1 模块职责边界

`content-copy.ts` 内部分为两层,保证可测性:

- **纯函数层**: `domToMarkdown(root: HTMLElement): string` —— 接收 DOM 根节点,返回 Markdown 字符串。无副作用,供单元测试。
- **副作用层**: `initCopy()` —— 等待控制栏、注入按钮、绑定点击、调用 `domToMarkdown`、写剪贴板、弹 toast。仅此层接触 DOM 事件与剪贴板。

## 5. 按钮与提示 UI

### 5.1 复制按钮

沿用主题按钮那套 `arrive` 等待 + 注入机制,在 `.readerControls` 工具栏新增一项:

```ts
const btn = $('<button title="复制本章" class="readerControls_item copy"></button>')
btn.append($('<span>复制</span>'))
$('.readerControls').append(btn)
```

- 继承 weread 原生 `.readerControls_item` 工具栏样式,与「主题」按钮同款
- `readerControls.css` 中已有的 `.readerControls_item>span{font-size:12px}` 自动生效
- 点击 → 触发抽取 + 复制
- 用 `document.arrive('.readerControls_item', { onceOnly: true }, ...)` 等待控制栏出现后再注入,与 `initTheme` 一致

### 5.2 提示 toast

自建轻量浮层(**不**回退到 sweetalert2,该依赖已被项目主动移除):

```html
<div class="wereader-copy-toast">已复制本章内容</div>
```

- 固定在右上角(`position: fixed; top: ...; right: ...`)
- 1.8s 后自动移除
- 样式写在 `content-copy.css`
- 三种文案变体: 成功 / 失败 / 警告(字体加密)

## 6. Markdown 转换(核心)

### 6.1 定位正文容器(带兜底,收窄到正文子容器)

- 首选 `.renderTargetContainer`(真实正文容器,在 `.readerChapterContent` 内),缺失时回退 `.readerChapterContent`,再回退 `.app_content`
- 都没有 → toast「未找到章节内容」,中止
- 收窄根是为了避开 `.readerChapterContent` 内的 UI chrome(控制栏、字体面板、书评面板),这些在 §6.3 还会做排除兜底

### 6.2 章节标题

- 首选 `.renderTargetPageInfo_header`(实测为「1.6 深入剖析GPT架构」),trim 后作为 `# 标题\n\n` 置顶
- 回退 `.readerTopBar_title_chapter`(旧选择器,可能已废弃)
- 取不到则省略标题,不报错
- 登录态确认最终选择器(见实现计划「登录态 DOM 勘探」)

### 6.3 防御式遍历 `domToMarkdown(root)`

按**节点类型**递归,不写死标签。inline 文本跨多个 span 拆分时**只拼接、不加分隔**,避免把一个词切断。

**遍历前先剔除**根节点内的以下节点(克隆后 remove,避免污染原 DOM):
- `style` / `script` / `noscript`(实测 `.readerChapterContent` 内有 `<style>` 块,否则 CSS 文本会漏进输出)
- UI chrome 容器: `.readerControls`、`.reader_float_font_panel`、`.reader_float_review_with_range_panel_wrapper`、`.reader_float_top_reviews_panel_wrapper`、`.readerMemberCardTipsNew`、`.renderTarget_pager`、`.preRenderContainer`

| 节点 | 处理 |
| --- | --- |
| `TextNode` | 拼接 `nodeValue`,折叠空白 |
| `PRE` | ` ``` \n{text}\n``` ` 代码块 |
| `H1`~`H6` | `#`×n + 内容 + `\n\n` |
| `P` / `DIV` 等块级 | 递归 inline + 段后 `\n\n`(空内容则不加) |
| `BR` | `\n` |
| `IMG` | `![alt](src)`,src 取 `data-src` 兜底 `currentSrc`/`src`(应对懒加载) |
| `STRONG`/`B` | `**x**` |
| `EM`/`I` | `*x*` |
| `DEL`/`S` | `~~x~~` |
| `BLOCKQUOTE` | 每行前缀 `> ` |
| `A` | `[x](href)` |
| `UL`/`OL`/`LI` | 列表项 |
| `data-wr-footernote` 元素 | 内联输出 `（注：{属性内容}）`(脚注正文在属性里,纯遍历读不到) |
| `SPAN` 等内联未知标签 | 递归拼接,绝不丢内容 |
| 未知块级标签 | 递归 + 尾换行 |

**未知标签默认按内联处理**(只拼接、不加分隔、不丢内容)。已知块级标签集合为 `P`/`DIV`/`H1`~`H6`/`PRE`/`BLOCKQUOTE`/`UL`/`OL`/`LI`/`BR`/`FIGURE`/`SECTION`/`ARTICLE`,其余一律内联。这是防御式的核心:换标签/加包裹层都不影响输出。

**防御式关键**: weread 把 `<p>` 换成 `<div>`/`<span>`、或加包裹层,都不影响;只有连根选择器都改名才会挂。

### 6.4 后处理

- 3+ 连续换行压成 2
- 去行尾空格
- 整体 trim

### 6.5 字体反爬检测(兜底)

- 统计 PUA 私有区(U+E000–F8FF)字符占非空白字符的比例
- 占比 > 30% → toast 追加「检测到字体加密,结果可能为乱码」
- 仍照常复制(不阻断),如实告知而非静默给出乱码

## 7. 剪贴板策略

```ts
async function copyToClipboard(text: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(text)
    } catch {
        // 兜底: 临时 textarea + execCommand('copy')
    }
}
```

- 点击手势触发 → `navigator.clipboard` 应可用
- 失败降级到 `execCommand`,双保险

## 8. 错误处理与降级

| 情况 | 行为 |
| --- | --- |
| 找不到正文容器 | toast「未找到章节内容」 |
| 抽取结果为空 | toast「本章无文本内容」 |
| 复制(两种方式)均失败 | toast「复制失败,请重试」 |
| 成功 | toast「已复制本章内容」 |
| 字体反爬检测命中 | toast 追加「检测到字体加密,结果可能为乱码」,仍复制 |

所有错误路径均 `console.error` 记录,与现有模块的日志风格一致(`console.log(tag, ...)` / `console.error`)。

## 9. 测试

测试分两层: Jest 单元测试覆盖转换逻辑,Playwright e2e 覆盖真实链路。

### 9.1 单元测试(Jest)

- 项目已有 Jest + ts-jest + `jest-environment-jsdom`,新增 `src/content/modules/__tests__/content-copy.test.ts`
- 对**纯函数** `domToMarkdown` 做单元测试: 用 jsdom 构造 `<p>`/`<strong>`/`<img data-src>`/`<pre>`/`<h2>`/`<blockquote>`/`data-wr-footernote` fixture,断言输出 Markdown
- 归入 `npm test`,可在 CI 运行,无需登录

### 9.2 Playwright e2e 测试

端到端验证「点击按钮 → 剪贴板含正确 Markdown」的真实链路,并**顺带自动完成 §2.3 的字体反爬验证**。

**新增 devDep**: `@playwright/test`

**新增文件**:

- `playwright.config.ts` —— `channel: 'chrome'`(用真实 Chrome 以可靠支持 `--load-extension`,Playwright 自带 chromium 对扩展支持不稳)、`headless: false`(扩展在 headless 不生效)、持久化 user-data-dir
- `e2e/copy-chapter.spec.ts` —— 测试用例
- npm 脚本: `test:e2e`(与 `npm test` 分离,不进 CI)

**前置条件(关键约束)**:

- weread 测试页需要微信登录,CI 无法登录。测试使用 `launchPersistentContext` + 持久化 profile,**用户需在该 profile 中登录微信读书一次**,后续运行复用登录态。
- 未登录时测试 skip 并提示「需先登录」,不判失败。

**启动**: `launchPersistentContext` headed,带 `--load-extension=dist --disable-extensions-except=dist` 加载最新 `npm run build-dev` 产物,确保每次跑的是当前代码。

**用例步骤**:

1. `npm run build-dev` 构建 `dist/`(测试前置)
2. 启动带扩展的 Chrome,navigate 到测试 URL
3. `page.waitForSelector('.readerControls_item.copy', { timeout })` 等待按钮注入(验证 `arrive` + 注入链路)
4. 读 `.readerChapterContent.textContent`,统计 PUA 占比: 若 >30% 则 skip 并标记「字体加密,需改走方案 C」(把 §2.3/§11 的字体验证自动化)
5. `grantPermissions(['clipboard-read','clipboard-write'], { origin: 'https://weread.qq.com' })`
6. 点击 `.readerControls_item.copy`
7. `page.evaluate(() => navigator.clipboard.readText())` 读剪贴板
8. 断言: 剪贴板以 `# {章节标题}`(`.readerTopBar_title_chapter`)开头,且含段落/至少一个 Markdown 结构标记

**限制与降级**:

- 真实页面依赖登录态,且 weread 可能检测自动化浏览器。若被拦截,降级为手动验证(测试 skip 并打印提示),不阻断。
- 不做 fixture 页面 e2e: 内容脚本 `matches` 为 `*://weread.qq.com/web/reader/*`,对 `file://`/`localhost` fixture 不会注入,需要改 manifest 或直接注入脚本,代价大于收益。真实链路由 9.1 的 jsdom 单测 + 本节登录态 e2e 覆盖。

## 10. 代码风格约束

遵循 `CLAUDE.md` 与现有代码:

- TypeScript strict 模式
- ESLint 继承 `airbnb-base/legacy` + TypeScript 支持
- 4 空格缩进
- 不使用分号
- 全局变量 `chrome` 和 `JQuery` 为 readonly
- 匿名函数表达式需具名(修复 `func-names` 警告,见提交 `7c52f4f`)
- 修改后必须 `npm run lint` 无错且 `npm run build-dev` 构建成功

## 11. 实现阶段需在测试页确认的点(非设计阻塞)

- `.readerChapterContent` 内部实际标签结构 —— 防御式遍历不依赖具体标签;正文是否字体反爬由 §9.2 e2e 第 4 步自动判定
- 按钮 append 进 `.readerControls` 后的视觉效果,必要时微调 CSS

## 12. 不做的事(Out of Scope)

- 不复制跨章/已加载 DOM 的全部内容(仅当前章)
- 不导出标注/想法/书签(已删功能的范畴)
- 不重新引入 weread API 客户端、worker、popup/options 等已精简模块
- 不新增 npm 依赖、不新增 manifest 权限
