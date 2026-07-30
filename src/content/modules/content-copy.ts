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
    return el ? (el.textContent || '').replace(/^\s+|\s+$/g, '') : ''
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
