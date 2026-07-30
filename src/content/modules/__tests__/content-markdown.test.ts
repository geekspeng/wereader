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

describe('domToMarkdown 内联格式', () => {
    test('加粗/斜体/删除/链接', () => {
        const root = document.createElement('div')
        root.innerHTML = '<div><strong>b</strong> <em>i</em> <del>d</del> <a href="u">l</a></div>'
        expect(domToMarkdown(root).trim()).toBe('**b** *i* ~~d~~ [l](u)')
    })
})

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
