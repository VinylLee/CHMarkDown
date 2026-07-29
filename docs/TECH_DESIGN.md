# CHMarkDown 技术设计

## 1. 技术方案

- 桌面应用：Electron
- 前端：Vue 3、TypeScript、Vite、原生 CSS
- Markdown：markdown-it
- 内容净化：DOMPurify
- 数据保存：本地 JSON 文件
- 图片保存：应用用户数据目录下的 `images/`

不使用后端、数据库、登录或云同步。

## 2. 项目结构

```text
CHMarkDown/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── services/noteService.ts
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
```

## 4. 数据与图片

- 笔记保存在 Electron 用户数据目录中的 `notes.json`
- 图片复制到同一用户数据目录下的 `images/`
- Vue 页面通过 preload 暴露的 API 调用 IPC
- Electron 主进程负责文件读写、图片复制和笔记导出
- 包含本地图片的笔记导出为 ZIP；否则导出为 Markdown 文件

## 5. 页面结构

- 左侧：可调整宽度和折叠的笔记列表
- 右侧：标题、Markdown 编辑区、预览区和工具栏
- 全局：操作提示、确认弹窗、关闭前未保存检查

## 6. Electron 安全

- `contextIsolation: true`
- `nodeIntegration: false`
- 渲染进程不能直接使用 Node.js
- 本地文件操作只通过 preload 和 IPC
- Markdown 渲染结果通过 DOMPurify 清理

## 7. 验证

```bash
npm test
npm run build
```

Windows 开发窗口和打包产物统一使用 `resources/chmarkdown.ico`。高分辨率源图保存在
`resources/chmarkdown.png`，便于后续继续调整图标。
