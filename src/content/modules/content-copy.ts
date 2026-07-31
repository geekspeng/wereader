import 'arrive'
import $ from 'jquery'
import { domToMarkdown, isLikelyFontObfuscated } from './content-markdown'

const tag = 'content-copy: '

// content-hook.ts(document_start 运行)把捕获到的章节 XHTML 分片写入此 DOM 元素
// (JSON: { current, chapters: { chapterId: { index: html } } })。这里读取并拼装。
const DATA_ID = '__weread_chapter_data'

interface ChapterStore {
    current: string
    chapters: { [chapterId: string]: { [index: number]: string } }
}

function getChapterTitle(): string {
    const el = document.querySelector('.readerTopBar_title_chapter')
        || document.querySelector('.renderTargetPageInfo_header')
    return el ? (el.textContent || '').replace(/^\s+|\s+$/g, '') : ''
}

// 拼装当前章节各分片为一段 XHTML
function assembleChapterHtml(): string {
    const el = document.getElementById(DATA_ID)
    if (!el || !el.textContent) return ''
    let store: ChapterStore
    try {
        store = JSON.parse(el.textContent) as ChapterStore
    } catch (e) {
        return ''
    }
    const cid = store.current
    const chapter = cid ? store.chapters[cid] : null
    if (!chapter) return ''
    return Object.keys(chapter).map((k) => parseInt(k, 10))
        .sort((a, b) => a - b)
        .map((i) => chapter[i] || '')
        .join('\n')
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
            try {
                ta.select()
                return document.execCommand('copy')
            } finally {
                document.body.removeChild(ta)
            }
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
    const html = assembleChapterHtml()
    if (!html) { showToast('未捕获到本章内容(请稍候或翻到本章再试)'); return }
    const title = getChapterTitle()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    // 章节 XHTML 自带一个与标题重复的章节标题(h1/h2),去掉,避免与置顶的 # 标题重复
    if (title) {
        const first = doc.body.querySelector('h1, h2, h3')
        if (first && (first.textContent || '').replace(/^\s+|\s+$/g, '') === title) first.remove()
    }
    const body = domToMarkdown(doc.body)
    if (!body) { showToast('本章无文本内容'); return }
    const md = title ? `# ${title}\n\n${body}` : body
    const ok = await copyToClipboard(md)
    if (!ok) { showToast('复制失败,请重试'); return }
    if (isLikelyFontObfuscated(md)) {
        showToast('已复制本章内容(检测到字体加密,结果可能含乱码)')
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
