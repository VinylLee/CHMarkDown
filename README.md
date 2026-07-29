# CHMarkDown

CHMarkDown 是一个 Windows 本地 Markdown 编辑与笔记工具。内容和插入的图片都保存在本机，不需要账号或网络服务。

## 功能

- 新建、编辑和删除笔记
- 打开本地 `.md` / `.markdown` 文件，并保存回原文件或另存为
- Markdown 实时预览
- 编辑区与预览区双向定位
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
```

产物输出到 `release/`。

## 数据位置

笔记保存在 Electron 的应用用户数据目录中：

- `notes.json`
- `images/`

外部 Markdown 文件仅在用户执行保存或另存为时写入用户选择的位置。

渲染进程不直接访问文件系统，所有本地读写均通过 preload 和 IPC 完成。
