# CHMarkDown 技术设计

## 1. 技术方案

- 桌面应用：Electron
- 前端：Vue 3、TypeScript、Vite、原生 CSS
- Markdown：markdown-it
- 内容净化：DOMPurify
- 数据保存：本地 JSON 文件
- 外部文档：UTF-8 Markdown 文件
- 图片保存：应用用户数据目录下的 `images/`

不使用后端、数据库、登录或云同步。

## 2. 项目结构

```text
CHMarkDown/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── services/
│   │   ├── markdownFileService.ts
│   │   └── noteService.ts
│   └── windowCloseCoordinator.ts
├── src/
│   ├── components/
│   ├── composables/
│   ├── utils/
│   ├── views/NotesView.vue
│   ├── App.vue
│   └── main.ts
├── resources/
│   ├── chmarkdown.png
│   └── chmarkdown.ico
├── docs/
├── package.json
└── vite.config.ts
```

## 3. 数据模型

```ts
interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

interface MarkdownFileDocument {
  filePath: string
  fileName: string
  content: string
}

interface OpenMarkdownFile extends MarkdownFileDocument {
  id: string
  openedAt: string
}
```

## 4. 数据与图片

- 笔记保存在 Electron 用户数据目录中的 `notes.json`
- 外部 `.md` / `.markdown` 文件以 UTF-8 读取和保存
- 图片复制到同一用户数据目录下的 `images/`
- Vue 页面通过 preload 暴露的 API 调用 IPC
- Electron 主进程负责文件读写、图片复制和笔记导出
- 包含本地图片的笔记导出为 ZIP；否则导出为 Markdown 文件

## 5. 外部文件工作流

- “文件 > 打开”由主进程显示系统文件对话框，并读取用户选中的 Markdown 文件
- 渲染进程只保存文件路径、文件名和编辑内容，不直接调用 Node.js
- “保存”通过 IPC 写回当前外部文件；本地笔记仍写入 `notes.json`
- “另存为”显示系统保存对话框，成功后将当前编辑器切换到新文件路径
- 已打开的外部文件保存在渲染进程的会话状态中，并与本地笔记合并显示
- 外部文件使用忽略路径大小写的稳定 ID，同一路径重复打开时刷新原条目而不重复添加
- 关闭外部文件只清除会话条目；关闭本地笔记等同于删除，必须经过确认
- 打开其他内容或关闭应用前，复用统一的未保存修改检查
- 本版本不解析外部文档中的相对图片路径，也不检测其他程序对文件的并发修改

## 6. 页面结构

- 左侧：可调整宽度和折叠的文档列表，统一展示本地笔记和已打开的外部文件
- 右侧：标题、Markdown 编辑区、预览区和工具栏
- 全局：操作提示、确认弹窗、关闭前未保存检查

## 7. Electron 安全

- `contextIsolation: true`
- `nodeIntegration: false`
- 渲染进程不能直接使用 Node.js
- 本地文件操作只通过 preload 和 IPC
- Markdown 渲染结果通过 DOMPurify 清理

## 8. 验证

```bash
npm test
npm run build
```

Windows 开发窗口和打包产物统一使用 `resources/chmarkdown.ico`。高分辨率源图保存在
`resources/chmarkdown.png`，便于后续继续调整图标。
