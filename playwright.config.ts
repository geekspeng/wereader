import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './e2e',
    timeout: 90000,
    use: {
        headless: false,
        viewport: { width: 1280, height: 900 }
    }
})
