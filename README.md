# CHMarkDown

CHMarkDown 是一个 Windows 本地 Markdown 编辑与笔记工具。特点是可以插入图片，导出压缩包。内容和插入的图片都保存在本机，不需要账号或网络服务。

当前稳定版：**1.0.1**。详细变化见 [更新日志](CHANGELOG.md)。

## 功能

- 新建、编辑和删除笔记
- 打开本地 `.md` / `.markdown` 文件，并保存回原文件或另存为
- 最近文件列表、清除记录以及失效文件提示
- 最近文件区域可以点击标题折叠或展开，并保存最后使用的状态
- 拖放 Markdown 文件到窗口直接打开
- 支持命令行文件路径和 Windows“打开方式”入口
- 重启后恢复上次打开的文档、列表顺序和当前选中项
- 本地笔记与已打开的外部文件统一显示在左侧文档列表
- 可从列表关闭外部文件；删除本地笔记前会进行确认
- Markdown 实时预览
- Markdown 编辑区支持 `Ctrl+Z` 撤销和 `Ctrl+Y` 恢复，最多保留 100 步编辑历史
- 当前文档查找与替换，支持区分大小写和全词匹配
- 根据 Markdown 标题实时生成大纲并点击跳转
- 编辑区与预览区双向定位
- 切换分栏编辑与纯预览模式时保持当前阅读位置
- 分栏模式下可左右拖动中间分隔线，并保存编辑区与预览区的宽度比例
- 本地笔记和外部 Markdown 文件都可插入、粘贴并预览本地图片
- 新插入图片统一使用 Markdown 图片语法，旧版 HTML 图片在导出时自动转换
- 统一导出当前文档；存在图片引用时导出包含本地资源的 ZIP，否则导出 Markdown
- 编辑器偏好设置：浅色/深色/跟随系统主题、字体、字号、默认模式和自动换行
- 可配置外部 Markdown 新插入图片使用的资源目录名称
- 可配置系统托盘图标；开启时关闭窗口会隐藏到托盘，托盘菜单可恢复窗口或退出
- 全局保持单实例运行；重复启动只恢复并聚焦现有窗口，不会创建多个编辑器进程窗口
- 启动关键路径按需加载导出和非首屏界面，并行读取笔记、会话及外部文件
- 未保存修改提示与关闭前保存保护
- 笔记列表宽度和折叠状态持久化

## 文件快捷键

- `Ctrl+O`：打开 Markdown 文件
- `Ctrl+S`：保存当前文档
- `Ctrl+Shift+S`：将当前文档另存为 Markdown 文件
- `Ctrl+Z`：撤销编辑区上一次修改
- `Ctrl+Y`：恢复刚撤销的编辑区修改
- `Ctrl+F`：查找当前文档
- `Ctrl+R`：查找并替换当前文档
- `Ctrl+B`：折叠或展开左侧文档列表

在 Markdown 编辑区没有选中文字时，`Ctrl+C` 和 `Ctrl+X` 会复制或剪切光标所在的
完整行。随后在无选区状态按 `Ctrl+V`，该行会插入到当前行上方；普通文本复制、
有选区的复制剪切以及来自其他应用的剪贴板内容仍使用系统默认行为。

在 Markdown 编辑区或预览区选中文字后按 `Ctrl+F`，选中文字会自动成为查找内容并立即统计匹配；查找面板已打开时也会直接更新，而不会关闭。`Ctrl+R` 对选中文字采用相同规则，并打开替换区域。没有新选区时，再次按对应快捷键可以关闭已经打开的查找或替换面板。在纯预览模式使用这两个快捷键会先进入分栏编辑模式。

## 技术栈

- Electron 43
- Vue 3
- TypeScript
- Vite 8
- markdown-it
- DOMPurify
- Vitest 4

## 下载

请从 [GitHub Releases](https://github.com/VinylLee/CHMarkDown/releases/latest) 下载：

- `CHMarkDown-1.0.0-portable-x64.exe`：单文件便携版，直接运行。
- `CHMarkDown-1.0.0-win-x64.zip`：下载体积较小，完整解压后运行其中的 `CHMarkDown.exe`。

## 开发

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run build
npm run measure:startup
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-release-smoke.ps1
```

## 打包

```bash
npm run package:portable
npm run package:zip
```

产物输出到 `release/`。

同一个版本提供两种 Windows x64 发行包：

- `portable-x64.exe`：单文件快速便携版。应用文件不进行二次压缩，优先减少每次启动时的自解压等待。
- `win-x64.zip`：轻量下载版。下载体积较小，完整解压一次后运行其中的 `CHMarkDown.exe`。

两种发行包都包含 Electron 运行时，不依赖电脑预装 Edge、Chrome、WebView2 或
Node.js，并且只保留简体中文和英文 Electron 语言资源。ZIP 版减少的是下载体积，
解压后的磁盘占用不会明显减少；不要直接在压缩包内运行程序。

在同一台测试设备上，v0.2.1 的 5 次启动中位时间为 1.023 秒，v0.2.0 为
3.689 秒，改善约 72.3%。v0.2.1 的 ZIP 为 96.1 MiB，相比 241.2 MiB 的
快速便携 EXE 减少约 60.2%。

1.0.0 更新到仍处于安全维护范围内的 Electron 43 后，便携版为 327.46 MiB，
ZIP 为 127.75 MiB；同机 5 次启动中位时间分别为 1.138 秒和 0.386 秒。完整数据、
安全检查及 SHA-256 见 [更新日志](CHANGELOG.md)。

## 数据位置

笔记保存在 Electron 的应用用户数据目录中：

- `notes.json`
- `recent-files.json`
- `session.json`（仅记录打开状态，不保存未保存正文）
- `settings.json`（编辑器偏好设置）
- `images/`

外部 Markdown 文件仅在用户执行保存或另存为时写入用户选择的位置。

渲染进程不直接访问文件系统，所有本地读写均通过 preload 和 IPC 完成。
