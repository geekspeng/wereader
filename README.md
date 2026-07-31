<h2 align="center"><img src="res/README/icon128.png" height="100" alt="Wereader"><br>Wereader</h2>

<p align="center">一个精简的微信读书浏览器扩展，提供<strong>护眼色主题切换</strong>与<strong>解除右键限制</strong>两项核心功能。</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-blue" alt="Manifest V3">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT">
</p>

## 简介

Wereader 是一个面向[微信读书](https://weread.qq.com/)网页版的浏览器扩展（Manifest V3，适用于 Chrome / Edge 等 Chromium 浏览器）。本仓库为精简版本，移除了笔记导出、书架管理等原有功能，只聚焦于提升阅读体验的两项能力：

- 🎨 **护眼色主题** —— 在绿色 / 橙色 / 暗色 / 白色四种主题间切换，并记住你的偏好。
- 🖱️ **解除右键限制** —— 恢复浏览器原生的右键上下文菜单。

## 功能

### 护眼色主题

- 在阅读页右下角控制栏中提供主题切换面板；
- 支持四种主题：绿色、橙色（护眼色）、暗色、白色；
- 通过 `chrome.storage.sync` 自动记住上次选择的主题；
- 适配水平阅读模式。

### 解除右键限制

- 拦截微信读书网页对 `contextmenu` 事件的屏蔽；
- 恢复浏览器原生右键菜单，方便复制文字、查询等操作。

### 复制本章

- 在阅读页右下角控制栏新增「复制本章」按钮；
- 点击后遍历当前章节正文，转为 Markdown（保留标题、加粗、图片、代码块、引用等）写入剪贴板；
- 对检测到字体加密的章节会给出乱码告警。

## 安装

### 方式一：从源码构建

```bash
# 安装依赖
npm install

# 开发构建（输出到 dist/）
npm run build-dev
```

构建完成后，在浏览器中加载 `dist/` 目录：

1. 在地址栏输入 `chrome://extensions/` 回车，进入扩展管理页面；
2. 打开右上角的「开发者模式」；
3. 点击「加载已解压的扩展程序」，选择项目下的 `dist/` 文件夹。

详见[安装演示](./res/README/install.gif)。

### 方式二：使用打包文件

下载仓库根目录的 [`wereader.zip`](./wereader.zip)，解压后按上述步骤加载解压得到的文件夹即可。

> 注意：手动安装的扩展不会自动更新。

## 开发

### 环境要求

- Node.js 16（见 [`.nvmrc`](./.nvmrc)）

### 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run lint` | 检查 ESLint 问题 |
| `npm run lint-fix` | 自动修复 ESLint 问题 |
| `npm run build-dev` | 开发构建（输出到 `dist/`） |
| `npm run build` | 生产构建 |
| `npm run pack-zip` | 将 `dist/` 打包为 `wereader.zip` |
| `npm test` | 运行 Jest 测试 |

> 修改代码后，请确保 `npm run lint` 无错误、`npm run build-dev` 构建成功后再提交。

### 技术栈

- Manifest V3 内容脚本
- TypeScript（strict 模式）
- Webpack 5 + ts-loader + babel-loader
- jQuery + [arrive](https://github.com/uzairfarooq/arrive)（DOM 变动监听）
- Jest + [@playwright/test](https://playwright.dev)（单元测试与 e2e 测试）

## 项目结构

```
src/
├── content.ts                          # 内容脚本入口
└── content/
    ├── modules/
    │   ├── content-theme.ts            # 主题切换
    │   ├── content-rightClick.ts       # 解除右键限制
    │   ├── content-copy.ts             # 复制本章按钮与剪贴板
    │   ├── content-markdown.ts         # DOM → Markdown 纯转换
    │   └── content-utils.ts            # CSS 加载工具（loadCSS / unloadCSS）
    └── static/css/
        ├── common.css                  # 通用样式
        ├── content-theme-switch.css    # 主题切换面板样式
        ├── content-copy.css            # 复制本章按钮样式
        ├── readerControls.css          # 阅读控制栏样式
        └── theme/                      # 各主题样式（green / orange / dark / white）
public/
├── manifest.json                       # 扩展清单
└── extension-icons/                    # 扩展图标
webpack/                                # 构建配置（base / dev / production）
```

## 工作原理

扩展以内容脚本（`content.js`）形式注入到 `*://weread.qq.com/web/reader/*`，在 `document_idle` 阶段运行：

- **主题切换**：监听阅读控制栏按钮，通过动态注入 / 卸载对应 CSS 文件实现主题切换，主题偏好通过 `chrome.storage.sync` 持久化；
- **解除右键**：在捕获阶段监听 `contextmenu` 事件并调用 `stopImmediatePropagation()`，阻止页面脚本禁用右键菜单。

## 致谢

本项目基于以下开源项目精简而来：

- [Higurashi-kagome/wereader](https://github.com/Higurashi-kagome/wereader) —— 本仓库的前身；
- [arry-lee/wereader](https://github.com/arry-lee/wereader) —— 最初的起源项目。

## 声明

本项目仅供学习与个人使用，请勿侵犯微信读书及书籍作者的权益。本项目与微信读书官方无任何关联。

## License

[MIT](./LICENSE)
