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
