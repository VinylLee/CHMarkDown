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
│   ├── fileOpenRequest.ts
│   ├── services/
│   │   ├── markdownFileService.ts
│   │   ├── recentFileService.ts
│   │   ├── sessionService.ts
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

## 9. Windows 发行包与启动性能

- v0.2.0 使用 NSIS 压缩应用文件，每次启动都需要先解压到临时目录
- v0.2.1 将 electron-builder 的 `compression` 设置为 `store`
- 继续使用单文件 portable 形式，但避免启动时的解压缩 CPU 开销
- 通过 `electronLanguages` 只保留 `zh-CN` 和 `en-US`，减少无关语言资源
- 该方案以更大的本地 EXE 体积换取更快的启动速度，不改变运行时功能
- v0.2.1 同时增加 Windows x64 ZIP 目标，打包时单独将 `compression` 覆盖为
  `maximum`，降低下载体积
- ZIP 版完整解压后直接启动 `CHMarkDown.exe`，不产生 portable 每次启动前的
  自解压等待
- portable 与 ZIP 都携带版本匹配的 Chromium 和 Node.js，不复用或依赖系统中的
  Edge、Chrome、WebView2 或 Node.js
- ZIP 只降低传输体积，不降低解压后的运行目录体积
- 性能测试从启动 portable EXE 开始，到主窗口标题 `CHMarkDown` 出现为止
- 所有对比数据必须在同一设备、相同代码和相同测量脚本下取得

v0.2.1 实测数据：

| 版本 | 5 次启动时间（秒） | 中位时间 | 相对改善 |
|------|--------------------|----------|----------|
| v0.2.0 | 3.666、3.648、3.689、3.846、3.860 | 3.689 秒 | 基线 |
| v0.2.1 | 2.843、1.023、1.093、1.021、0.872 | 1.023 秒 | 72.3% |

最终 v0.2.1 portable 文件大小为 241.2 MiB。体积增加是取消二次压缩的明确
取舍；轻量下载 ZIP 使用最高压缩级别后为 96.1 MiB，比 portable 小 60.2%。
应用功能、ASAR 封装、窗口图标和 Electron 安全配置保持不变。

## 10. 编辑与预览模式位置保持

- 模式切换前，以当前滚动容器视口上方约三分之一处作为阅读锚点
- 编辑区根据 `scrollTop`、行高和内边距计算锚点对应的 Markdown 行
- 预览区从带有 `data-source-line` 的渲染元素中选择最接近锚点的源码行
- DOM 完成模式切换后，将目标源码行恢复到新视图的相同锚点附近
- 位于文档顶部或底部时优先保持边界，无法取得源码行时使用滚动比例回退
- 从纯预览返回分栏时，同时对齐编辑区和预览区
- 切换前保存 textarea 的光标、选区和选区方向，返回编辑模式后恢复
- 位置状态只服务于当前即时切换，不写入本地数据，也不跨应用重启保存

## 11. 最近文件与外部打开入口

- 最近文件记录由主进程维护在用户数据目录的 `recent-files.json`
- 单条记录包含规范化绝对路径、文件名和最后打开时间，最多保存 12 条
- Windows 路径比较忽略大小写；重复打开会更新时间并移动到列表顶部
- 最近记录只在文件已成功读取且用户允许离开当前文档后更新
- 拖放事件只从 Electron 提供的 `File.path` 取得路径，实际读取继续通过 preload 和 IPC
- 主进程从首次启动参数和 `second-instance` 参数中筛选 `.md` / `.markdown` 路径
- `requestSingleInstanceLock` 保证“打开方式”复用现有窗口；渲染进程未就绪时路径进入内存队列
- 渲染进程串行处理菜单、最近文件、拖放和系统入口，共用未保存修改保护
- 文件不存在、扩展名不支持、记录损坏或读写失败时显示用户可感知提示
- portable 构建包含 Markdown 文件关联元数据，但不静默修改 Windows 默认应用设置

## 12. 上次会话恢复

- 主进程在用户数据目录的 `session.json` 中保存会话状态，渲染进程只通过 preload 和 IPC 读写
- 会话条目只包含本地笔记 ID 或外部 Markdown 文件绝对路径，并记录列表顺序和当前选中项
- 不保存编辑器草稿、标题、正文或图片内容，未保存修改仍由现有离开与退出确认负责
- 启动时先读取本地笔记，再按会话顺序逐个从磁盘重新读取外部文件
- 外部文件 ID 继续使用忽略 Windows 路径大小写的稳定 ID
- 已删除的本地笔记和无法读取的外部文件会被跳过；单个失败不影响其他条目恢复
- 会话 JSON 格式严格校验，文件损坏时由渲染进程回退到安全状态并显示错误提示
- 文档新建、打开、保存、另存为、关闭、删除和切换选中项后更新会话快照
- 窗口真正关闭前等待已有写入并再次保存最终快照；写入失败时取消退出，避免无提示丢失恢复状态

## 13. 当前文档查找、替换与大纲

- 查找与替换完全在渲染进程的当前编辑器草稿中完成，不增加文件系统权限或后端服务
- 搜索词按字面量匹配，正则特殊字符不会改变含义；可选 Unicode 字母、数字和下划线边界的全词匹配
- 匹配结果保存原文起止偏移量，单个替换按当前偏移修改，全部替换从末尾向前执行以避免位置漂移
- 查找面板显示当前匹配序号和总数，`Ctrl+F` 打开查找，`Ctrl+H` 打开替换，Enter 和 Shift+Enter 切换匹配
- 定位匹配时切换到分栏编辑，选中准确原文范围，并复用源码行映射同步定位预览
- 大纲通过 markdown-it token 提取 h1–h6 和源码行号，支持 ATX 与 Setext 标题，并自动忽略代码块中的伪标题
- 大纲直接从当前编辑草稿计算，标题编辑后立即更新；点击条目复用现有编辑/预览滚动与高亮能力
