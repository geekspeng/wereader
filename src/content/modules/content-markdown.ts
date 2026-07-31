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

/* eslint-disable no-use-before-define */
function imgMarkdown(el: HTMLElement): string {
    const src = el.getAttribute('data-src') || el.getAttribute('src') || ''
    const alt = el.getAttribute('alt') || (src.split('/').pop() || '')
    return `\n![${alt}](${src})\n`
}

function footnoteMarkdown(el: HTMLElement): string {
    const note = el.getAttribute('data-wr-footernote')
    return note ? `（注：${note}）` : ''
}

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
    case 'SPAN': {
        // weread 章节正文用 <span class="bold|italic|strikethrough|..."> 表示行内格式
        const cls = typeof el.className === 'string' ? el.className : ''
        let inner = walkChildren(el)
        if (/\bbold\b/.test(cls)) inner = `**${inner}**`
        else if (/\bitalic\b/.test(cls)) inner = `*${inner}*`
        else if (/\b(strikethrough|strike|del)\b/.test(cls)) inner = `~~${inner}~~`
        return inner + footnoteMarkdown(el)
    }
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
    }
    if (tag === 'PRE') {
        return `\n\`\`\`\n${el.textContent || ''}\n\`\`\`\n`
    }
    if (/^H[1-6]$/.test(tag)) {
        const level = parseInt(tag.charAt(1), 10)
        return `\n${'#'.repeat(level)} ${walkChildren(el).trim()}\n\n`
    }
    const inner = walkChildren(el)
    const foot = footnoteMarkdown(el)
    const content = inner + foot
    if (BLOCK_TAGS.has(tag)) {
        return content.trim() ? `${content}\n\n` : ''
    }
    return content
}
/* eslint-enable no-use-before-define */

function domToMarkdown(root: HTMLElement): string {
    const clone = root.cloneNode(true) as HTMLElement
    clone.querySelectorAll('style,script,noscript').forEach((el) => el.remove())
    clone.querySelectorAll(EXCLUDE_SELECTOR).forEach((el) => el.remove())
    return walkNode(clone)
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+\n/g, '\n')
        .trim()
}

function isLikelyFontObfuscated(text: string): boolean {
    const nonSpace = text.replace(/\s/g, '')
    if (!nonSpace) return false
    const pua = Array.from(nonSpace).filter((ch) => {
        const code = ch.codePointAt(0) || 0
        return code >= 0xE000 && code <= 0xF8FF
    }).length
    return pua / nonSpace.length > 0.3
}

export { domToMarkdown, isLikelyFontObfuscated }
