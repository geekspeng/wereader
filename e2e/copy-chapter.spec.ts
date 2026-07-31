import path from 'path'
import { test, expect, chromium } from '@playwright/test'

const TEST_URL = 'https://weread.qq.com/web/reader/52e320c0813ab9edeg01750fkc0c320a0232c0c7c76d365a'
const EXTENSION_PATH = path.resolve(__dirname, '..', 'dist')
const PROFILE_DIR = `${process.env.HOME}/.wereader-e2e-profile`
// 1.6「深入剖析GPT架构」正文中的特征片段,用于校验复制到的是真实章节正文(而非封面/简介)
const EXPECTED_BODY_SNIPPETS = ['自监督学习', '下一单词预测', 'Radford']
// content-hook 把捕获的章节分片写进这个 DOM 元素(JSON)。e2e 用它判断分片是否就绪。
const STORE_ID = '__weread_chapter_data'

test('复制当前章节为 Markdown', async () => {
    // 必须用 Playwright 自带 Chromium(无 channel):稳定版 Chrome 151+ 在 Playwright
    // 的 CDP 控制下会强制关闭开发者模式、拒绝 --load-extension 加载未打包扩展,
    // chrome://policy 却查不到任何实际策略。自带 Chromium 不受此限制。
    const context = await chromium.launchPersistentContext(PROFILE_DIR, {
        headless: false,
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`
        ]
    })
    const page = await context.newPage()
    try {
        await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
        // 扩展是否成功加载:content.js(document_idle)注入的 toast 样式。
        // 用 waitForFunction 带超时轮询,避开 domcontentloaded 后立即检查的竞态。
        const loaded = await page.waitForFunction(
            () => Array.from(document.querySelectorAll('style'))
                .some((s) => s.textContent.includes('wereader-copy-toast')),
            { timeout: 15000 }
        ).then(() => true).catch(() => false)
        test.skip(!loaded, '扩展未加载。请用 bundled Chromium(无 channel)运行,或在真实 Chrome 中 chrome://extensions → 开发者模式 → 加载已解压的扩展程序 → 选 dist/ 手动验证')
        // 等待复制按钮注入(arrive 链路)
        const btn = page.locator('.readerControls_item.copy')
        await expect(btn).toBeVisible({ timeout: 30000 })
        // weread 正文被反爬降级成 canvas(DOM 无文本),复制改走 content-hook 被动捕获的
        // 章节 XHTML 分片。等分片就绪(当前章至少捕获到一个分片)再点击复制。
        await expect.poll(async () => page.evaluate((id) => {
            const el = document.getElementById(id)
            if (!el || !el.textContent) return 0
            try {
                const store = JSON.parse(el.textContent) as { current: string, chapters: { [k: string]: unknown } }
                const cur = store.current ? store.chapters[store.current] : null
                return cur && typeof cur === 'object' ? Object.keys(cur as object).length : 0
            } catch (e) {
                return 0
            }
        }, STORE_ID), { timeout: 30000, intervals: [1000] }).toBeGreaterThan(0)
        // 授权剪贴板并点击复制
        await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
            origin: 'https://weread.qq.com'
        })
        await btn.click()
        // 复制是异步的(分片拼装 → DOMParser → Markdown → 写剪贴板 → toast),
        // 等 toast 出现确认写入完成,再读剪贴板,避免竞态读到空/旧内容。
        await expect(page.locator('.wereader-copy-toast')).toBeVisible({ timeout: 5000 })
        const clip = await page.evaluate(() => navigator.clipboard.readText())
        const title = await page.evaluate(() => {
            const el = document.querySelector('.readerTopBar_title_chapter') as HTMLElement | null
                || document.querySelector('.renderTargetPageInfo_header') as HTMLElement | null
            return el ? (el.textContent || '').replace(/^\s+|\s+$/g, '') : ''
        })
        expect(clip.length).toBeGreaterThan(0)
        if (title) expect(clip).toContain(title.trim())
        // 校验复制到的是 1.6 章节真实正文,而非封面/简介
        for (const snippet of EXPECTED_BODY_SNIPPETS) {
            expect(clip).toContain(snippet)
        }
    } finally {
        await context.close()
    }
})
