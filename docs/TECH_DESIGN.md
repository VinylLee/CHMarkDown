# CHMarkDown 技术设计

## 1. 技术方案

- 桌面应用：Electron 43
- 前端：Vue 3、TypeScript、Vite 8、原生 CSS
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
│   ├── main.ts                        # Electron 主进程入口
│   ├── preload.ts                     # preload 脚本，暴露安全 API
│   ├── fileOpenRequest.ts             # 文件打开请求处理
│   ├── windowClosePolicy.ts           # 窗口关闭策略
│   ├── windowCloseCoordinator.ts      # 窗口关闭协调
│   └── services/
│       ├── markdownFileService.ts     # Markdown 文件读写
│       ├── noteService.ts             # 本地笔记服务
│       ├── recentFileService.ts       # 最近文件记录
│       ├── sessionService.ts          # 会话状态保存
│       ├── settingsService.ts         # 偏好设置服务
│       └── documentExportService.ts   # 文档与图片导出
├── src/
│   ├── components/
│   │   ├── ConfirmDialog.vue          # 确认弹窗
│   │   ├── DocumentOutline.vue        # Markdown 标题大纲
│   │   ├── DocumentSearchPanel.vue    # 查找与替换面板
│   │   ├── ImageSizeControl.vue       # 图片尺寸调整控件
│   │   ├── NoteEditor.vue             # Markdown 编辑器
│   │   ├── NoteList.vue               # 左侧文档列表
│   │   ├── ResizeHandle.vue           # 分栏拖拽分隔线
│   │   ├── SettingsDialog.vue         # 偏好设置弹窗
│   │   └── Toast.vue                  # 操作提示
│   ├── composables/
│   │   ├── useAppCloseGuard.ts        # 应用关闭守卫
│   │   ├── useAppSettings.ts          # 应用设置管理
│   │   ├── useConfirm.ts              # 确认弹窗逻辑
│   │   ├── useLocalStorage.ts         # localStorage 封装
│   │   ├── useNoteListPanel.ts        # 文档列表面板状态
│   │   ├── useRecentFilesSection.ts   # 最近文件折叠与高度状态
│   │   ├── useResizable.ts            # 可调宽度面板
│   │   ├── useScrollSync.ts           # 编辑/预览同步滚动
│   │   ├── useSplitPane.ts            # 分栏宽度管理
│   │   ├── useToast.ts               # 提示逻辑
│   │   └── useVerticalResizable.ts   # 纵向拖拽高度调整
│   ├── types/
│   │   └── index.ts                   # 共享类型定义
│   ├── utils/
│   │   ├── documentCloseRange.ts      # 范围关闭目标计算
│   │   ├── documentOrder.ts           # 文档顺序调整
│   │   ├── documentSearch.ts          # 文档查找替换
│   │   ├── documentStats.ts           # 文档字数统计
│   │   ├── droppedMarkdownFile.ts     # 拖放文件处理
│   │   ├── editorHistory.ts           # 撤销/恢复历史
│   │   ├── externalFileImages.ts      # 外部文件图片处理
│   │   ├── keyboardShortcut.ts        # 快捷键映射
│   │   ├── lineClipboard.ts           # 行式剪贴板
│   │   ├── listContinuation.ts        # 列表自动续行
│   │   ├── markdownImageReferences.ts # 图片引用解析
│   │   ├── markdownImageSize.ts       # 图片尺寸解析
│   │   ├── markdownOutline.ts         # 标题大纲提取
│   │   ├── markdownSourceMap.ts       # 编辑/预览位置映射
│   │   ├── openMarkdownFiles.ts       # 已打开文件状态
│   │   ├── resolveUnsavedChanges.ts   # 未保存修改处理
│   │   ├── sessionState.ts            # 会话状态管理
│   │   └── workspaceBootstrap.ts      # 启动数据加载
│   ├── views/
│   │   └── NotesView.vue              # 主页面
│   ├── App.vue
│   ├── main.ts
│   └── env.d.ts
├── resources/
│   ├── chmarkdown.png                 # 高分辨率源图
│   └── chmarkdown.ico                 # Windows 多尺寸图标
├── scripts/
│   ├── measure-startup.ps1            # 启动性能测量
│   └── test-release-smoke.ps1         # 发行包烟雾测试
├── docs/
│   ├── PRD.md                         # 产品需求文档
│   ├── ROADMAP.md                     # 开发路线图
│   ├── TECH_DESIGN.md                 # 技术设计（本文档）
│   └── PROJECT_OVERVIEW.md            # 项目概要与版本历史
├── package.json
├── vite.config.mts
└── CHANGELOG.md                       # 面向用户的版本变更日志
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
- 外部文档相对图片路径按第 14 节规则预览和保存；暂不检测其他程序对文件的并发修改
- 文档列表条目提供右键菜单：按列表顺序关闭上方、下方或除目标外的文档；外部文件支持在资源管理器中打开所在文件夹，由主进程 `shell.showItemInFolder` 完成

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
`resources/chmarkdown.png`，当前源图来自用户提供的
`resources/ChatGPT Image 2026年8月2日 20_24_25.png`。Windows ICO 包含
16、20、24、32、40、48、64、128 和 256 像素尺寸，便于窗口、任务栏和资源管理器按需选择。

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
- 最近文件区域折叠状态保存到 `localStorage` 的 `chmarkdown:recent-files:collapsed`，不改变 `recent-files.json`
- 拖放文件路径由 preload 调用 Electron `webUtils.getPathForFile(file)` 取得；不再读取 Electron 32 已移除的 `File.path`
- `webUtils` 只通过受限的 `getPathForFile` 包装暴露，继续保持 `contextIsolation: true` 和 `nodeIntegration: false`
- 主进程从首次启动参数和 `second-instance` 参数中筛选 `.md` / `.markdown` 路径
- `requestSingleInstanceLock` 保证“打开方式”复用现有窗口；渲染进程未就绪时路径进入内存队列
- 单实例锁在应用就绪前获取；获取失败的后续进程立即调用 `app.quit()`，不创建 BrowserWindow
- `second-instance` 事件统一调用 `focusMainWindow()`，可恢复最小化窗口或显示托盘中隐藏的窗口
- 后续实例携带的 Markdown 路径继续交给现有窗口；窗口尚未就绪时复用待打开路径队列
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
- 查找面板显示当前匹配序号和总数；没有新文档选区时，`Ctrl+F` 切换查找开关，`Ctrl+R` 切换替换开关；Enter 和 Shift+Enter 切换匹配
- 下一个匹配以当前编辑器选区末端为起点向后查找，上一个以选区起点向前查找，到达边界后循环
- 纯预览模式优先使用切换模式前保留的编辑器选区，没有历史选区时从文首或文末开始
- 左侧文档列表使用 `Ctrl+B` 折叠或展开，不再占用 `Ctrl+Shift+B`
- 快捷键处理前优先读取预览容器内的浏览器非空选区，其次读取当前聚焦 textarea 的非空选区，并使用选中文字作为查询词
- 文档存在新选区时，`Ctrl+F` 保持当前查找/替换面板状态并更新查询，`Ctrl+R` 更新查询并显示替换区域；没有新选区时保留原有开关规则
- 纯预览模式触发查找或替换快捷键时，先复用模式切换逻辑恢复到分栏编辑及相同阅读位置，再打开、更新或关闭相应面板
- 预览选区只允许来自当前预览容器，排除查找输入框、标题输入框和应用外部选区；读取后清除浏览器选区，避免后续快捷键重复使用旧选区
- 查询计算完成后用选区起止偏移匹配结果，将当前序号定位到用户实际选中的那一处
- 空选区不会覆盖已有查询；聚焦查找输入框后仍保留 textarea 的原选区作为后续方向导航基准
- 定位匹配时切换到分栏编辑，选中准确原文范围，并复用源码行映射同步定位预览
- 大纲通过 markdown-it token 提取 h1–h6 和源码行号，支持 ATX 与 Setext 标题，并自动忽略代码块中的伪标题
- 大纲直接从当前编辑草稿计算，标题编辑后立即更新；点击条目复用现有编辑/预览滚动与高亮能力
- 大纲按标题层级支持折叠与展开：带子标题的条目显示箭头，Shift+点击可批量操作同一层级；折叠状态保存在组件内，不写入文档或本地数据

## 14. 外部 Markdown 图片

- 外部文档以文档所在目录为根解析相对图片路径，渲染进程不直接读取本地文件
- 主进程为当前文档目录签发随机令牌，`chmarkdown-ext` 协议只允许访问令牌对应目录下的文件，并阻止 `..` 越界
- 插入和粘贴图片时由主进程复制到文档旁的 `images/`，Markdown 只写入相对路径
- 本地笔记的新图片同样使用 `![图片](chmarkdown://images/...)`，不再新建受管 HTML 图片标签
- 另存为外部文档时复制原文档旁的图片目录，不把图片内容写入会话 JSON
- 图片加载失败时在预览区显示明确占位状态，不影响正文继续编辑

## 15. 统一导出

- 本地笔记与外部文件共用 `files:exportDocument` IPC；渲染进程只传递已保存的标题、正文和可选源文件路径
- 使用 markdown-it token 提取真实图片引用，忽略代码块和行内代码中的伪图片语法
- 本地笔记的 `chmarkdown://images/` 地址在导出内容中改写为 ZIP 内 `images/` 路径
- 旧版受管 `<img src="chmarkdown://images/...">` 与新版 Markdown 图片使用同一解析器；导出时统一生成 Markdown 图片语法
- 外部文件的相对图片必须位于文档目录内；URL 编码路径会先解码，越界、绝对路径和未知协议会拒绝导出
- 远程和 data URL 保持原样且不下载；即使只有远程图片，存在图片引用的文档仍按产品规则导出 ZIP
- 所有本地资源在打开保存对话框前完成存在性检查，并按绝对路径去重
- 导出先写入同目录临时文件，完成后再替换目标；校验、写入或压缩失败时清理临时文件，避免留下不完整结果

## 16. 编辑器偏好设置

- 主进程在 Electron 用户数据目录的 `settings.json` 中保存设置，渲染进程只通过 preload 和 IPC 读写
- 设置包含主题、编辑器字体与字号、默认打开模式、自动换行、外部图片资源目录名称和托盘图标开关
- 设置对象使用版本号和严格类型校验；读取失败时返回安全默认值及警告，由界面显示错误提示
- 设置写入使用同目录临时文件后重命名，失败时清理临时文件并保留原设置
- 主题由根元素的 `data-theme` 和 CSS 变量驱动；跟随系统时监听 `prefers-color-scheme` 变化
- 编辑器模式统一为 `edit`、`split` 和 `preview`，切换时继续复用源码行锚点及光标选区恢复；默认打开模式为仅预览（`preview`）
- 字体、字号和自动换行直接作用于 Markdown textarea，不修改文档正文
- 图片目录名称只允许安全的单层文件夹名称；外部图片选择和粘贴仍由主进程写入文档目录内
- 设置修改后立即更新当前窗口；默认打开模式也会立即应用到当前文档

## 17. 系统托盘与窗口关闭

- 主进程根据 `settings.json` 中的 `showTrayIcon` 创建或销毁 Electron `Tray`，默认值为 `true`
- 托盘复用 `resources/chmarkdown.ico`，单击恢复并聚焦现有主窗口，不创建第二个窗口
- 托盘菜单只提供“打开 CHMarkDown”和“退出”，设置保存后立即同步托盘状态
- 普通关闭请求在托盘可用时隐藏窗口；托盘关闭或创建失败时，关闭请求走真正退出流程
- “文件 > 退出”和托盘“退出”设置明确退出状态，再复用现有未保存修改与会话写入检查
- 关闭确认被取消后清除明确退出状态，使后续普通关窗继续遵循当前托盘设置
- Windows `query-session-end` 直接放行，避免未保存确认阻止注销或关机
- 关闭决策提取为纯函数并单独测试；托盘创建失败时显示错误且安全回退为正常退出

## 18. 分栏宽度调整

- 分栏模式使用独立的 9 px 拖拽热区，中间可见线保持 1 px，悬停、聚焦或拖动时使用主题强调色
- 拖动位置按编辑工作区宽度换算为比例，而不是保存固定像素，窗口尺寸变化后仍保持相同布局倾向
- 编辑区比例限制为 20%–80%，避免任一侧被完全拖没；预览区占用剩余宽度
- 拖动结束后将比例保存到 `localStorage` 的 `chmarkdown:editor:split-ratio`，默认值为 50%
- 分隔线使用 `separator` 语义及垂直方向 ARIA 属性，左右方向键每次调整 2%，按住 Shift 调整 10%
- 双击分隔线恢复 50:50；离开组件时移除文档级拖动监听并恢复光标、文本选择状态
- 仅分栏模式应用自定义比例；纯编辑和纯预览继续占满可用编辑工作区
