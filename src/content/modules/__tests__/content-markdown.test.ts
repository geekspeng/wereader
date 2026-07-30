import { domToMarkdown, isLikelyFontObfuscated } from '../content-markdown'

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

describe('domToMarkdown 图片/引用/列表/脚注', () => {
    test('img 取 data-src', () => {
        const root = document.createElement('div')
        root.innerHTML = '<img data-src="http://e/a.jpg" alt="图">'
        expect(domToMarkdown(root).trim()).toBe('![图](http://e/a.jpg)')
    })

    test('img 无 data-src 时取 src', () => {
        const root = document.createElement('div')
        root.innerHTML = '<img src="http://e/b.jpg">'
        expect(domToMarkdown(root).trim()).toBe('![b.jpg](http://e/b.jpg)')
    })

    test('blockquote 每行加 > 前缀', () => {
        const root = document.createElement('div')
        root.innerHTML = '<blockquote>第一行<br>第二行</blockquote>'
        expect(domToMarkdown(root).trim()).toBe('> 第一行\n> 第二行')
    })

    test('li 转 - 项', () => {
        const root = document.createElement('div')
        root.innerHTML = '<ul><li>甲</li><li>乙</li></ul>'
        expect(domToMarkdown(root).trim()).toBe('- 甲\n- 乙')
    })

    test('data-wr-footernote 元素内联脚注', () => {
        const root = document.createElement('div')
        root.innerHTML = '<span data-wr-footernote="注内容">注</span>'
        expect(domToMarkdown(root).trim()).toBe('注（注：注内容）')
    })
})

describe('domToMarkdown 剔除 UI 与样式', () => {
    test('style 块不进入输出', () => {
        const root = document.createElement('div')
        root.innerHTML = '<style>.a{color:red}</style><p>正文</p>'
        expect(domToMarkdown(root).trim()).toBe('正文')
    })

    test('readerControls 控制栏文字不进入输出', () => {
        const root = document.createElement('div')
        root.innerHTML = '<div class="readerControls"><button>目录</button><button>笔记</button></div><p>正文</p>'
        expect(domToMarkdown(root).trim()).toBe('正文')
    })

    test('3+ 连续换行压成 2', () => {
        const root = document.createElement('div')
        root.innerHTML = '<p>甲</p><p>乙</p>'
        expect(domToMarkdown(root)).not.toMatch(/\n{3,}/)
    })
})

describe('isLikelyFontObfuscated', () => {
    test('正常中文返回 false', () => {
        expect(isLikelyFontObfuscated('这是一段正常的中文正文')).toBe(false)
    })

    test('PUA 占比高返回 true', () => {
        // PUA 区字符
        const pua = String.fromCharCode(0xE000)
            + String.fromCharCode(0xE001)
            + String.fromCharCode(0xE002)
        expect(isLikelyFontObfuscated(`${pua}${pua}${pua}正`)).toBe(true)
    })

    test('空字符串返回 false', () => {
        expect(isLikelyFontObfuscated('')).toBe(false)
    })
})
