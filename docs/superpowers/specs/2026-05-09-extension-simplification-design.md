# Extension Simplification Design

Date: 2026-05-09

## Goal

Strip the wereader extension down to two core features:
1. **Eye-friendly theme** (护眼色主题) — switch between green/orange/dark/white reading themes
2. **Remove right-click restriction** (解除右键限制) — restore browser right-click context menu

All other features are removed.

## Approach

**Option A: Prune existing codebase** (chosen)

Delete everything not needed. Keep only the modules that serve the two core features. Simplify remaining modules by removing dependencies on deleted code.

## Content Script Changes

### Keep

| File | Treatment |
|------|-----------|
| `content.ts` | Rewrite entry point — only init theme and rightClick |
| `content-theme.ts` | Keep as-is (full theme switching: green/orange/dark/white) |
| `content-rightClick.ts` | Simplify: only contextmenu event interception, remove jQuery, mouseMoveTarget, and chrome.runtime.onMessage listener |
| `content-utils.ts` | Simplify: keep only `loadCSS`, `unloadCSS`; remove `copy`, `mySweetAlert`, `simulateClick`, `sleep` |
| `content/static/css/theme/` | Keep all theme CSS files (green.css, green-two.css, orange.css, orange-two.css, dark.css, white.css) |
| `content/static/css/common.css` | Keep |
| `content/static/css/content-theme-switch.css` | Keep |
| `content/static/css/readerControls.css` | Keep |

### Remove (all content modules)

`content-alert`, `content-confirm`, `content-copy`, `content-deleteBookmarks`, `content-getChapters`, `content-hide`, `content-key-ctrl`, `content-key-esc`, `content-keyBind`, `content-markedData`, `content-mask`, `content-mousemove`, `content-notesMenu`, `content-scroll-bar`, `content-searchNote`, `content-select-action`, `content-thought-edit`, `content-wereader-api`, `fancybox`

Remove associated CSS: `notes-menu.css`, `fancybox.css`, `showScroll.css`, `content-hideScroll.css`, `rankChapter.css`

### Rewritten `content.ts`

```ts
import './content/static/css/readerControls.css'
import './content/static/css/content-theme-switch.css'
import './content/static/css/common.css'

import { initTheme } from './content/modules/content-theme'
import { initRightClick } from './content/modules/content-rightClick'

initTheme()
initRightClick()
```

### Simplified `content-rightClick.ts`

Remove jQuery dependency, mouseMoveTarget import, and chrome.runtime.onMessage listener. Keep only the core contextmenu event stopImmediatePropagation:

```ts
function initRightClick() {
    console.log('initRightClick')
    window.addEventListener('contextmenu', function (e) {
        e.stopImmediatePropagation()
    }, true)
}

export { initRightClick }
```

## Page Entry Points — All Removed

| Entry | Directory/Files | Action |
|-------|----------------|--------|
| popup | `src/popup/` | Delete entirely |
| options | `src/options/` | Delete entirely |
| statistics | `src/statistics/` | Delete entirely |
| mp (WeChat public account) | `src/mpwx/` | Delete entirely |
| offscreen | `src/offscreen/` | Delete entirely |
| sandbox | `src/sandbox/` | Delete entirely |
| service worker | `src/worker.ts` + `src/worker/` | Delete entirely |

## Webpack Configuration

`webpack.config.base.js` changes:
- **entry**: Only `content` remains
- **Remove all HTMLWebpackPlugin instances** (popup, statistics, mp, options, offscreen, sandbox)
- **CopyPlugin**: Remove popup/options/statistics related copy patterns; keep `manifest.json` and `extension-icons`
- **Remove `string-replace-loader` rule** for `worker-vars.ts` (no more worker)

## manifest.json Simplification

- Remove `background` field (no service worker)
- Remove `options_page`
- Remove `action.default_popup`
- Permissions: keep only `storage` + `host_permissions` for `weread.qq.com`
- `content_scripts`: keep only content.js injection

## Common Directory

- `constants.ts` — simplify, keep only what rightClick needs (may become empty and be removed)
- `sender.ts` — delete (no more message passing)
- `renderer.ts` — delete
- `logger.ts` — evaluate; likely delete
- `is.ts` — evaluate; likely delete
- `utils.ts` — simplify; keep only what's used

## NPM Dependencies

**Remove:**
- `react`, `react-dom` — popup deleted
- `sweetalert2` — replace theme error handling with console.error
- `lodash` — searchNote deleted
- `jquery-mousewheel` — fancybox deleted
- Any other deps only used by deleted modules

**Keep:**
- `jquery` — used by content-theme
- `arrive` — used by content-theme for DOM observation
- webpack toolchain (webpack, ts-loader, babel-loader, postcss, less-loader, etc.)
- TypeScript toolchain

## Final Project Structure

```
src/
├── content.ts
├── content/
│   ├── modules/
│   │   ├── content-theme.ts
│   │   ├── content-rightClick.ts
│   │   └── content-utils.ts
│   └── static/css/
│       ├── common.css
│       ├── content-theme-switch.css
│       ├── readerControls.css
│       └── theme/
│           ├── green.css
│           ├── green-two.css
│           ├── orange.css
│           ├── orange-two.css
│           ├── dark.css
│           └── white.css
├── common/
│   └── constants.ts (simplified)
public/
├── manifest.json (simplified)
└── extension-icons/
webpack/
└── webpack.config.base.js (simplified)
```
