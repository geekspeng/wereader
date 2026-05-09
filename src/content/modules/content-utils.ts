import $ from 'jquery'

function unloadCSS(elementId: string) {
    if (elementId && document.getElementById(elementId)) $('#' + elementId).remove()
}

/**
 * 通过 link 元素加载样式文件到网页
 * @param file 文件路径
 * @param elementId 设置给 link 元素的 id 值
 * @returns 返回插入后的元素
 */
function loadCSS(file: string, elementId?: string | undefined) {
    const filePath = chrome.runtime.getURL(file)
    const link = document.createElement('link')
    link.type = 'text/css'
    link.rel = 'stylesheet'
    link.href = filePath
    const extId = filePath.match(/(?<=\/\/)([^/]*)/)![0]!
    link.classList.add(extId)
    if (elementId) unloadCSS(elementId)
    if (elementId) link.id = elementId
    document.getElementsByTagName('head')[0].appendChild(link)
    return link
}

export {
    loadCSS,
    unloadCSS
}
