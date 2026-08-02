# CHMarkDown

CHMarkDown 是一个 Windows 本地 Markdown 编辑与笔记工具。内容和插入的图片都保存在本机，不需要账号或网络服务。

## 功能

- 新建、编辑和删除笔记
- 打开本地 `.md` / `.markdown` 文件，并保存回原文件或另存为
- 最近文件列表、清除记录以及失效文件提示
- 拖放 Markdown 文件到窗口直接打开
- 支持命令行文件路径和 Windows“打开方式”入口
- 重启后恢复上次打开的文档、列表顺序和当前选中项
- 本地笔记与已打开的外部文件统一显示在左侧文档列表
- 可从列表关闭外部文件；删除本地笔记前会进行确认
- Markdown 实时预览
- 编辑区与预览区双向定位
- 切换分栏编辑与纯预览模式时保持当前阅读位置
- 插入或粘贴本地图片，并调整图片显示尺寸
- 导出 Markdown；包含本地图片时导出 ZIP
- 未保存修改提示与关闭前保存保护
- 笔记列表宽度和折叠状态持久化

## 文件快捷键

- `Ctrl+O`：打开 Markdown 文件
- `Ctrl+S`：保存当前文档
- `Ctrl+Shift+S`：将当前文档另存为 Markdown 文件

## 技术栈

- Electron 28
- Vue 3
- TypeScript
- Vite 5
- markdown-it
- DOMPurify
- Vitest

## 开发

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run build
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

## 数据位置

笔记保存在 Electron 的应用用户数据目录中：

- `notes.json`
- `recent-files.json`
- `session.json`（仅记录打开状态，不保存未保存正文）
- `images/`

外部 Markdown 文件仅在用户执行保存或另存为时写入用户选择的位置。

渲染进程不直接访问文件系统，所有本地读写均通过 preload 和 IPC 完成。
