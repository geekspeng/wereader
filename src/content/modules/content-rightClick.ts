function initRightClick() {
    console.log('initRightClick')
    window.addEventListener('contextmenu', function (e) {
        e.stopImmediatePropagation()
    }, true)
}

export { initRightClick }
