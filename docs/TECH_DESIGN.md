# FlowDesk 技术设计

## 1. 技术方案

### 桌面应用

使用 Electron。

### 前端

- Vue 3
- TypeScript
- Vite
- 原生 CSS

### Markdown

- markdown-it：将 Markdown 转换为 HTML
- DOMPurify：清理 Markdown 预览内容

### 数据保存

第一版使用本地 JSON 文件：

- `todos.json`
- `notes.json`

图片复制到应用自己的 `images` 文件夹。

第一版不使用后端和数据库。

## 2. 项目结构

```text
flowdesk/
├── AGENTS.md
├── docs/
│   ├── RESEARCH.md
│   ├── PRD.md
│   ├── TECH_DESIGN.md
│   └── TASKS.md
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   └── services/
├── src/
│   ├── components/
│   ├── views/
│   ├── types/
│   ├── App.vue
│   └── main.ts
├── package.json
└── vite.config.ts
```

## 3. 数据模型

### Todo

```ts
interface Todo {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  dueDate: string | null
  completed: boolean
  createdAt: string
  updatedAt: string
}
```

### Note

```ts
interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}
```

## 4. 数据读写

- Vue 页面不直接读写本地文件
- Vue 通过 Electron preload 提供的接口操作数据
- Electron 主进程负责读写 JSON 文件和图片
- 所有数据保存在应用自己的用户数据目录中

## 5. 图片处理

1. 用户点击插入图片
2. 选择电脑中的图片
3. 应用将图片复制到自己的图片目录
4. 在 Markdown 中插入图片引用
5. 即使原图片被移动，应用中的图片仍然可以显示

## 6. 页面设计

### 待办页面

- 新增待办区域
- 待办列表
- 编辑、完成和删除操作

### 灵感记录页面

- 左侧显示笔记列表
- 右侧显示标题、Markdown 编辑区和预览区
- 提供新建、保存、插入图片和删除按钮

## 7. Electron 安全要求

- 启用 `contextIsolation`
- 渲染进程不能直接使用 Node.js
- 本地文件操作通过 preload 和 IPC 完成
- Markdown 预览内容需要清理

## 8. 启动和构建

预期使用：

```bash
npm install
npm run dev
npm run build
```

具体命令由项目初始化时确定。
