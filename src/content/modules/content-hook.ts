/*
 * 此文件由 manifest 以 world:"MAIN" + document_start 注入,运行在页面主世界。
 * 职责:在 weread 阅读器拉取章节分片前包装 window.fetch 与 XMLHttpRequest,
 * 被动捕获已签名的 /web/book/chapter/e_{N} 响应(weread 实测走 XHR),
 * 解码后写入 DOM 中的 <script id="__weread_chapter_data" type="application/json">
 * 供 content-copy 读取。
 *
 * 用 world:"MAIN" 直接运行,避开内联 <script> 注入时机问题与 CSP。无 CSS、无 jQuery。
 */

const DATA_ID = '__weread_chapter_data'
const MARK = '/web/book/chapter/e_'

interface ChapterStore {
    current: string
    chapters: { [chapterId: string]: { [index: number]: string } }
}

function decodeChunk(body: string): string {
    try {
        const bin = atob(body.slice(33))
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
        return new TextDecoder('utf-8').decode(bytes)
    } catch (e) {
        return ''
    }
}

function readStore(): ChapterStore {
    const el = document.getElementById(DATA_ID) as HTMLScriptElement | null
    if (!el || !el.textContent) return { current: '', chapters: {} }
    try {
        return JSON.parse(el.textContent) as ChapterStore
    } catch (e) {
        return { current: '', chapters: {} }
    }
}

function writeStore(store: ChapterStore): void {
    let el = document.getElementById(DATA_ID) as HTMLScriptElement | null
    if (!el) {
        el = document.createElement('script')
        el.id = DATA_ID
        el.type = 'application/json'
        const root = document.head || document.documentElement
        root.appendChild(el)
    }
    el.textContent = JSON.stringify(store)
}

function chapterIndexFromUrl(url: string): number {
    const at = url.indexOf(MARK)
    if (at === -1) return -1
    const tail = url.slice(at + MARK.length)
    let n = ''
    for (let i = 0; i < tail.length; i += 1) {
        const c = tail.charCodeAt(i)
        if (c >= 48 && c <= 57) n += tail[i]
        else break
    }
    return n ? parseInt(n, 10) : -1
}

function chapterIdFromBody(body: unknown): string {
    if (typeof body !== 'string' || !body) return ''
    try {
        const parsed = JSON.parse(body) as { c?: string }
        return parsed.c || ''
    } catch (e) {
        return ''
    }
}

function processChunk(url: string, reqBody: unknown, responseText: string): void {
    const idx = chapterIndexFromUrl(url)
    if (idx < 0) return
    const cid = chapterIdFromBody(reqBody)
    const h = decodeChunk(responseText)
    if (!h || h.indexOf('<') === -1) return // 丢弃 CSS / 空分片
    const store = readStore()
    if (!store.chapters[cid]) store.chapters[cid] = {}
    store.chapters[cid][idx] = h
    store.current = cid
    writeStore(store)
}

function requestUrl(input: unknown): string {
    if (typeof input === 'string') return input
    if (input instanceof URL) return input.href
    if (input) return (input as Request).url
    return ''
}

/* ---- fetch hook(fallback;weread 实测主要走 XHR) ---- */
const origFetch = window.fetch
window.fetch = async function hookFetch(input, init) {
    const res = await origFetch.call(this, input, init)
    try {
        const url = requestUrl(input)
        if (url.indexOf(MARK) !== -1) {
            res.clone().text().then(function onText(t) {
                processChunk(url, init && init.body, t)
            }).catch(function onErr() { /* ignore */ })
        }
    } catch (e) { /* ignore */ }
    return res
}

/* ---- XHR hook(weread 阅读器用 XHR 拉章节) ---- */
type HookXHR = XMLHttpRequest & { __chUrl?: string }
const origOpen = XMLHttpRequest.prototype.open
XMLHttpRequest.prototype.open = function hookOpen(this: HookXHR, ...args: unknown[]) {
    const url = args[1]
    this.__chUrl = typeof url === 'string' ? url : String(url)
    return Reflect.apply(origOpen, this, args)
} as typeof XMLHttpRequest.prototype.open
const origSend = XMLHttpRequest.prototype.send
XMLHttpRequest.prototype.send = function hookSend(this: HookXHR, ...args: unknown[]) {
    const xhr = this
    const body = args[0]
    if (xhr.__chUrl && xhr.__chUrl.indexOf(MARK) !== -1) {
        xhr.addEventListener('load', function onLoad() {
            try {
                processChunk(xhr.__chUrl || '', body, xhr.responseText)
            } catch (e) { /* ignore */ }
        })
    }
    return Reflect.apply(origSend, this, args)
} as typeof XMLHttpRequest.prototype.send
