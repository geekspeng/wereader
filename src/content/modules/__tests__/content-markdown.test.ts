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
