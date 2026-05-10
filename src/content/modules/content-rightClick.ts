function initRightClick() {
    console.log('initRightClick')
    window.addEventListener('contextmenu', function handleContextMenu(e) {
        e.stopImmediatePropagation()
    }, true)
}

export { initRightClick }
